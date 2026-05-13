import type { LLMEvent, LLMMessage, LLMToolResultBlock, LLMToolUseBlock, LLMStopReason } from './types';
import type { DispatcherDependencies, DispatcherTurnRequest, DispatcherTurnResult } from './dispatcher';
import { DISPATCHER_ROUND_TRIP_CAP } from './dispatcher';

type ContentEntry =
  | { readonly kind: 'text'; readonly index: number; readonly text: string }
  | { readonly kind: 'tool_use'; readonly index: number; readonly block: LLMToolUseBlock };

interface StreamResult {
  readonly orderedContent: readonly ContentEntry[];
  readonly toolUseBlocks: readonly LLMToolUseBlock[];
  readonly stopReason: LLMStopReason;
}

async function consumeStream(events: AsyncIterable<LLMEvent>): Promise<StreamResult> {
  // Accumulators keyed by block index
  const textByIndex = new Map<number, string>();
  const toolAccByIndex = new Map<number, { id: string; name: string; partialJson: string }>();
  const blockOrder: number[] = [];
  const blockType = new Map<number, 'text' | 'tool_use'>();
  let stopReason: LLMStopReason = 'end_turn';

  for await (const event of events) {
    switch (event.kind) {
      case 'content_block_start':
        blockOrder.push(event.index);
        if (event.block.type === 'text') {
          blockType.set(event.index, 'text');
          textByIndex.set(event.index, event.block.text);
        } else {
          blockType.set(event.index, 'tool_use');
          toolAccByIndex.set(event.index, {
            id: event.block.id,
            name: event.block.name,
            partialJson: '',
          });
        }
        break;
      case 'text_delta': {
        const prev = textByIndex.get(event.index) ?? '';
        textByIndex.set(event.index, prev + event.text);
        break;
      }
      case 'input_json_delta': {
        const acc = toolAccByIndex.get(event.index);
        if (acc !== undefined) {
          toolAccByIndex.set(event.index, { ...acc, partialJson: acc.partialJson + event.partialJson });
        }
        break;
      }
      case 'content_block_stop':
      case 'message_stop':
        if (event.kind === 'message_stop') {
          stopReason = event.stopReason;
        }
        break;
    }
  }

  // Build ordered content entries (deduplicate indices that appeared multiple times)
  const seen = new Set<number>();
  const orderedContent: ContentEntry[] = [];
  const toolUseBlocks: LLMToolUseBlock[] = [];

  for (const idx of blockOrder) {
    if (seen.has(idx)) continue;
    seen.add(idx);

    const type = blockType.get(idx);
    if (type === 'text') {
      const text = textByIndex.get(idx) ?? '';
      if (text.length > 0) {
        orderedContent.push({ kind: 'text', index: idx, text });
      }
    } else if (type === 'tool_use') {
      const acc = toolAccByIndex.get(idx);
      if (acc !== undefined) {
        let parsedInput: unknown;
        try {
          parsedInput = JSON.parse(acc.partialJson) as unknown;
        } catch {
          // Malformed JSON: sentinel null so caller generates is_error
          parsedInput = null;
        }
        const tub: LLMToolUseBlock = {
          type: 'tool_use',
          id: acc.id,
          name: acc.name,
          input: parsedInput,
        };
        orderedContent.push({ kind: 'tool_use', index: idx, block: tub });
        toolUseBlocks.push(tub);
      }
    }
  }

  return { orderedContent, toolUseBlocks, stopReason };
}

export function createDispatcher(
  deps: DispatcherDependencies,
): (req: DispatcherTurnRequest) => Promise<DispatcherTurnResult> {
  const { provider, registry, resolveProposal } = deps;

  return async function dispatch(req: DispatcherTurnRequest): Promise<DispatcherTurnResult> {
    const appendedMessages: LLMMessage[] = [];
    const tools = [...registry.values()].map((e) => e.definition);

    // Seed the appended list with the user message
    appendedMessages.push(req.userMessage);

    let currentMessages: readonly LLMMessage[] = [...req.priorMessages, req.userMessage];

    let roundTrips = 0;
    let hitRoundTripCap = false;

    while (roundTrips < DISPATCHER_ROUND_TRIP_CAP) {
      const stream = provider.stream({
        system: req.system,
        messages: currentMessages,
        tools,
        maxTokens: req.maxTokens,
      });

      const { orderedContent, toolUseBlocks, stopReason } = await consumeStream(stream);
      roundTrips++;

      // Build the assistant message content in stream order
      const assistantContent: LLMMessage['content'][number][] = orderedContent.map((entry) =>
        entry.kind === 'text' ? { type: 'text', text: entry.text } : entry.block,
      );

      const assistantMessage: LLMMessage = { role: 'assistant', content: assistantContent };
      appendedMessages.push(assistantMessage);
      currentMessages = [...currentMessages, assistantMessage];

      if (stopReason !== 'tool_use' || toolUseBlocks.length === 0) {
        break;
      }

      // Dispatch each tool call and collect results
      const toolResultBlocks: LLMToolResultBlock[] = [];

      for (const tub of toolUseBlocks) {
        const entry = registry.get(tub.name);

        if (entry === undefined) {
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: tub.id,
            content: `Unknown tool: ${tub.name}`,
            is_error: true,
          });
          continue;
        }

        // Malformed JSON is represented as null input
        if (tub.input === null) {
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: tub.id,
            content: 'Tool input JSON could not be parsed.',
            is_error: true,
          });
          continue;
        }

        let parsedInput: unknown;
        try {
          parsedInput = entry.inputSchema.parse(tub.input);
        } catch (parseErr: unknown) {
          const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: tub.id,
            content: `Invalid tool input: ${msg}`,
            is_error: true,
          });
          continue;
        }

        try {
          const output = await entry.handler(parsedInput, { conversationId: req.conversationId });
          let content: string;
          if (output.kind === 'data') {
            content = JSON.stringify(output.data);
          } else if (resolveProposal !== undefined) {
            const resolution = await resolveProposal(output.change);
            content =
              resolution.kind === 'accepted'
                ? JSON.stringify({ accepted: true, appliedSummary: resolution.appliedSummary })
                : JSON.stringify({ accepted: false, reason: resolution.reason ?? 'rejected by user' });
          } else {
            content = JSON.stringify({ proposedChange: output.change.summary });
          }
          toolResultBlocks.push({ type: 'tool_result', tool_use_id: tub.id, content });
        } catch (handlerErr: unknown) {
          const msg = handlerErr instanceof Error ? handlerErr.message : String(handlerErr);
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: tub.id,
            content: `Tool handler error: ${msg}`,
            is_error: true,
          });
        }
      }

      const toolResultMessage: LLMMessage = { role: 'user', content: toolResultBlocks };
      appendedMessages.push(toolResultMessage);
      currentMessages = [...currentMessages, toolResultMessage];
    }

    if (roundTrips >= DISPATCHER_ROUND_TRIP_CAP) {
      hitRoundTripCap = true;
    }

    return { appendedMessages, roundTrips, hitRoundTripCap };
  };
}
