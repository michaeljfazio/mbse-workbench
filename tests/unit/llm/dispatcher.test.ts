import { describe, expect, it } from 'vitest';
import { createDispatcher, DISPATCHER_ROUND_TRIP_CAP } from '@/llm/dispatcher';
import type { ProposalResolver } from '@/llm/dispatcher';
import type { LLMEvent, LLMMessage, ProposedChange, ToolOutput } from '@/llm/types';
import type { LLMProvider } from '@/llm/provider';
import type { ToolRegistry, ToolContext } from '@/llm/registry';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeProvider(rounds: LLMEvent[][]): LLMProvider {
  let callCount = 0;
  return {
    stream() {
      const events = rounds[callCount++] ?? [];
      return (async function* () {
        for (const e of events) yield e;
      })();
    },
  };
}

function makeRegistry(
  name: string,
  handler: (input: unknown, ctx: ToolContext) => Promise<ToolOutput>,
): ToolRegistry {
  return new Map([
    [
      name,
      {
        definition: {
          name,
          description: 'test tool',
          input_schema: { type: 'object' as const, properties: {} },
        },
        inputSchema: { parse: (v: unknown) => v },
        mutating: false,
        handler,
      },
    ],
  ]);
}

const BASE_REQUEST = {
  conversationId: 'conv-1',
  system: 'You are a test assistant.',
  priorMessages: [] as LLMMessage[],
  userMessage: { role: 'user' as const, content: [{ type: 'text' as const, text: 'hello' }] },
  maxTokens: 512,
};

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe('createDispatcher', () => {
  it('happy path: single tool round-trip ending in end_turn', async () => {
    const toolHandler = async (_input: unknown, _ctx: ToolContext): Promise<ToolOutput> => ({
      kind: 'data',
      data: { result: 'BDD has 3 blocks' },
    });

    // Round 1: assistant requests a tool
    const round1: LLMEvent[] = [
      { kind: 'content_block_start', index: 0, block: { type: 'text', text: '' } },
      { kind: 'text_delta', index: 0, text: 'Let me check.' },
      { kind: 'content_block_stop', index: 0 },
      {
        kind: 'content_block_start',
        index: 1,
        block: { type: 'tool_use', id: 'tu_1', name: 'test_tool', input: null },
      },
      { kind: 'input_json_delta', index: 1, partialJson: '{"kind":' },
      { kind: 'input_json_delta', index: 1, partialJson: '"bdd"}' },
      { kind: 'content_block_stop', index: 1 },
      { kind: 'message_stop', stopReason: 'tool_use' },
    ];

    // Round 2: assistant gives final answer
    const round2: LLMEvent[] = [
      { kind: 'content_block_start', index: 0, block: { type: 'text', text: '' } },
      { kind: 'text_delta', index: 0, text: 'The BDD has 3 blocks.' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'end_turn' },
    ];

    const provider = makeProvider([round1, round2]);
    const registry = makeRegistry('test_tool', toolHandler);
    const dispatch = createDispatcher({ provider, registry });

    const result = await dispatch(BASE_REQUEST);

    expect(result.hitRoundTripCap).toBe(false);
    expect(result.roundTrips).toBe(2);

    // appendedMessages: [user, assistant(text+tool_use), user(tool_result), assistant(text)]
    expect(result.appendedMessages).toHaveLength(4);
    const [userMsg, assistantRound1, toolResultMsg, assistantRound2] = result.appendedMessages;

    expect(userMsg!.role).toBe('user');
    expect(userMsg!.content[0]!.type).toBe('text');

    expect(assistantRound1!.role).toBe('assistant');
    const toolUseBlock = assistantRound1!.content.find((b) => b.type === 'tool_use');
    expect(toolUseBlock).toBeDefined();
    if (toolUseBlock!.type === 'tool_use') {
      expect(toolUseBlock!.name).toBe('test_tool');
      expect(toolUseBlock!.input).toEqual({ kind: 'bdd' });
    }

    expect(toolResultMsg!.role).toBe('user');
    const trBlock = toolResultMsg!.content[0]!;
    expect(trBlock.type).toBe('tool_result');
    if (trBlock.type === 'tool_result') {
      expect(trBlock.tool_use_id).toBe('tu_1');
      expect(trBlock.is_error).toBeFalsy();
    }

    expect(assistantRound2!.role).toBe('assistant');
    const textBlock = assistantRound2!.content.find((b) => b.type === 'text');
    expect(textBlock).toBeDefined();
    if (textBlock!.type === 'text') {
      expect(textBlock!.text).toBe('The BDD has 3 blocks.');
    }
  });

  it('malformed JSON in tool input: returns is_error tool_result, conversation continues', async () => {
    const round1: LLMEvent[] = [
      {
        kind: 'content_block_start',
        index: 0,
        block: { type: 'tool_use', id: 'tu_bad', name: 'test_tool', input: null },
      },
      { kind: 'input_json_delta', index: 0, partialJson: '{invalid json' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'tool_use' },
    ];

    const round2: LLMEvent[] = [
      { kind: 'content_block_start', index: 0, block: { type: 'text', text: '' } },
      { kind: 'text_delta', index: 0, text: 'I apologize for the error.' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'end_turn' },
    ];

    const provider = makeProvider([round1, round2]);
    const registry = makeRegistry('test_tool', async () => ({
      kind: 'data' as const,
      data: { ok: true },
    }));
    const dispatch = createDispatcher({ provider, registry });

    const result = await dispatch(BASE_REQUEST);

    expect(result.hitRoundTripCap).toBe(false);
    const toolResultMsg = result.appendedMessages.find(
      (m) => m.role === 'user' && m.content.some((b) => b.type === 'tool_result'),
    );
    expect(toolResultMsg).toBeDefined();
    const trBlock = toolResultMsg!.content.find((b) => b.type === 'tool_result');
    expect(trBlock!.type).toBe('tool_result');
    if (trBlock!.type === 'tool_result') {
      expect(trBlock!.is_error).toBe(true);
    }
  });

  it('tool handler throws: caught, returned as is_error tool_result, conversation continues', async () => {
    const round1: LLMEvent[] = [
      {
        kind: 'content_block_start',
        index: 0,
        block: { type: 'tool_use', id: 'tu_throw', name: 'test_tool', input: null },
      },
      { kind: 'input_json_delta', index: 0, partialJson: '{}' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'tool_use' },
    ];

    const round2: LLMEvent[] = [
      { kind: 'content_block_start', index: 0, block: { type: 'text', text: '' } },
      { kind: 'text_delta', index: 0, text: 'Sorry about that.' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'end_turn' },
    ];

    const provider = makeProvider([round1, round2]);
    const registry = makeRegistry('test_tool', async () => {
      throw new Error('Handler exploded');
    });
    const dispatch = createDispatcher({ provider, registry });

    const result = await dispatch(BASE_REQUEST);

    expect(result.hitRoundTripCap).toBe(false);
    const toolResultMsg = result.appendedMessages.find(
      (m) => m.role === 'user' && m.content.some((b) => b.type === 'tool_result'),
    );
    expect(toolResultMsg).toBeDefined();
    const trBlock = toolResultMsg!.content.find((b) => b.type === 'tool_result');
    if (trBlock!.type === 'tool_result') {
      expect(trBlock!.is_error).toBe(true);
      expect(trBlock!.content).toContain('Handler exploded');
    }
  });

  it('proposed-change tool: accepted resolution serialises appliedSummary into tool_result', async () => {
    const change: ProposedChange = {
      id: 'pc-1',
      summary: 'Create Block "Cooling System"',
      commands: [],
    };
    const round1: LLMEvent[] = [
      {
        kind: 'content_block_start',
        index: 0,
        block: { type: 'tool_use', id: 'tu_mut', name: 'test_tool', input: null },
      },
      { kind: 'input_json_delta', index: 0, partialJson: '{}' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'tool_use' },
    ];
    const round2: LLMEvent[] = [
      { kind: 'content_block_start', index: 0, block: { type: 'text', text: '' } },
      { kind: 'text_delta', index: 0, text: 'Done.' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'end_turn' },
    ];
    const provider = makeProvider([round1, round2]);
    const registry = makeRegistry('test_tool', async () => ({
      kind: 'proposed-change' as const,
      change,
    }));
    const resolveProposal: ProposalResolver = async (pc) => {
      expect(pc.id).toBe('pc-1');
      return { kind: 'accepted', appliedSummary: 'Applied: block-42 created' };
    };

    const result = await createDispatcher({ provider, registry, resolveProposal })(BASE_REQUEST);

    const trMsg = result.appendedMessages.find(
      (m) => m.role === 'user' && m.content.some((b) => b.type === 'tool_result'),
    );
    const tr = trMsg!.content.find((b) => b.type === 'tool_result');
    expect(tr!.type).toBe('tool_result');
    if (tr!.type === 'tool_result') {
      expect(tr!.is_error).toBeFalsy();
      const parsed = JSON.parse(tr!.content) as { accepted: boolean; appliedSummary: string };
      expect(parsed.accepted).toBe(true);
      expect(parsed.appliedSummary).toBe('Applied: block-42 created');
    }
  });

  it('proposed-change tool: rejected resolution serialises reason and is not is_error', async () => {
    const change: ProposedChange = { id: 'pc-2', summary: 'no-op', commands: [] };
    const round1: LLMEvent[] = [
      {
        kind: 'content_block_start',
        index: 0,
        block: { type: 'tool_use', id: 'tu_mut2', name: 'test_tool', input: null },
      },
      { kind: 'input_json_delta', index: 0, partialJson: '{}' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'tool_use' },
    ];
    const round2: LLMEvent[] = [
      { kind: 'content_block_start', index: 0, block: { type: 'text', text: '' } },
      { kind: 'text_delta', index: 0, text: 'OK, cancelled.' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'end_turn' },
    ];
    const provider = makeProvider([round1, round2]);
    const registry = makeRegistry('test_tool', async () => ({
      kind: 'proposed-change' as const,
      change,
    }));
    const resolveProposal: ProposalResolver = async () => ({
      kind: 'rejected',
      reason: 'user clicked reject',
    });

    const result = await createDispatcher({ provider, registry, resolveProposal })(BASE_REQUEST);

    const trMsg = result.appendedMessages.find(
      (m) => m.role === 'user' && m.content.some((b) => b.type === 'tool_result'),
    );
    const tr = trMsg!.content.find((b) => b.type === 'tool_result');
    if (tr!.type === 'tool_result') {
      expect(tr!.is_error).toBeFalsy();
      const parsed = JSON.parse(tr!.content) as { accepted: boolean; reason: string };
      expect(parsed.accepted).toBe(false);
      expect(parsed.reason).toBe('user clicked reject');
    }
  });

  it('proposed-change tool with no resolver falls back to summary-only tool_result', async () => {
    const change: ProposedChange = { id: 'pc-3', summary: 'fallback summary', commands: [] };
    const round1: LLMEvent[] = [
      {
        kind: 'content_block_start',
        index: 0,
        block: { type: 'tool_use', id: 'tu_mut3', name: 'test_tool', input: null },
      },
      { kind: 'input_json_delta', index: 0, partialJson: '{}' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'tool_use' },
    ];
    const round2: LLMEvent[] = [
      { kind: 'content_block_start', index: 0, block: { type: 'text', text: '' } },
      { kind: 'text_delta', index: 0, text: '.' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'end_turn' },
    ];
    const provider = makeProvider([round1, round2]);
    const registry = makeRegistry('test_tool', async () => ({
      kind: 'proposed-change' as const,
      change,
    }));

    const result = await createDispatcher({ provider, registry })(BASE_REQUEST);

    const trMsg = result.appendedMessages.find(
      (m) => m.role === 'user' && m.content.some((b) => b.type === 'tool_result'),
    );
    const tr = trMsg!.content.find((b) => b.type === 'tool_result');
    if (tr!.type === 'tool_result') {
      const parsed = JSON.parse(tr!.content) as { proposedChange: string };
      expect(parsed.proposedChange).toBe('fallback summary');
    }
  });

  it('round-trip cap exceeded: terminates cleanly with hitRoundTripCap=true', async () => {
    const toolRound: LLMEvent[] = [
      {
        kind: 'content_block_start',
        index: 0,
        block: { type: 'tool_use', id: 'tu_inf', name: 'test_tool', input: null },
      },
      { kind: 'input_json_delta', index: 0, partialJson: '{}' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'tool_use' },
    ];

    const rounds = Array<LLMEvent[]>(DISPATCHER_ROUND_TRIP_CAP + 2).fill(toolRound);
    const provider = makeProvider(rounds);
    const registry = makeRegistry('test_tool', async () => ({ kind: 'data' as const, data: {} }));
    const dispatch = createDispatcher({ provider, registry });

    const result = await dispatch(BASE_REQUEST);

    expect(result.hitRoundTripCap).toBe(true);
    expect(result.roundTrips).toBe(DISPATCHER_ROUND_TRIP_CAP);
  });
});
