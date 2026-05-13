import type { LLMEvent, LLMStopReason, LLMTextBlock, LLMToolUseBlock } from './types';

export type AnthropicRawStreamEvent =
  | { readonly type: 'message_start'; readonly message: { readonly id: string } }
  | {
      readonly type: 'content_block_start';
      readonly index: number;
      readonly content_block:
        | { readonly type: 'text'; readonly text: string }
        | { readonly type: 'tool_use'; readonly id: string; readonly name: string; readonly input: unknown };
    }
  | {
      readonly type: 'content_block_delta';
      readonly index: number;
      readonly delta:
        | { readonly type: 'text_delta'; readonly text: string }
        | { readonly type: 'input_json_delta'; readonly partial_json: string };
    }
  | { readonly type: 'content_block_stop'; readonly index: number }
  | {
      readonly type: 'message_delta';
      readonly delta: { readonly stop_reason: LLMStopReason | null };
    }
  | { readonly type: 'message_stop' };

const STOP_REASONS: ReadonlySet<LLMStopReason> = new Set([
  'end_turn',
  'tool_use',
  'max_tokens',
  'stop_sequence',
]);

function isStopReason(value: unknown): value is LLMStopReason {
  return typeof value === 'string' && STOP_REASONS.has(value as LLMStopReason);
}

export function translateAnthropicEvent(
  raw: AnthropicRawStreamEvent,
  state: { stopReason: LLMStopReason },
): LLMEvent | null {
  switch (raw.type) {
    case 'message_start':
      return null;
    case 'content_block_start': {
      const cb = raw.content_block;
      const block: LLMTextBlock | LLMToolUseBlock =
        cb.type === 'text'
          ? { type: 'text', text: cb.text }
          : { type: 'tool_use', id: cb.id, name: cb.name, input: cb.input };
      return { kind: 'content_block_start', index: raw.index, block };
    }
    case 'content_block_delta':
      if (raw.delta.type === 'text_delta') {
        return { kind: 'text_delta', index: raw.index, text: raw.delta.text };
      }
      return {
        kind: 'input_json_delta',
        index: raw.index,
        partialJson: raw.delta.partial_json,
      };
    case 'content_block_stop':
      return { kind: 'content_block_stop', index: raw.index };
    case 'message_delta':
      if (isStopReason(raw.delta.stop_reason)) {
        state.stopReason = raw.delta.stop_reason;
      }
      return null;
    case 'message_stop':
      return { kind: 'message_stop', stopReason: state.stopReason };
  }
}

export async function* translateAnthropicEvents(
  source: AsyncIterable<AnthropicRawStreamEvent>,
): AsyncIterable<LLMEvent> {
  const state = { stopReason: 'end_turn' as LLMStopReason };
  for await (const raw of source) {
    const translated = translateAnthropicEvent(raw, state);
    if (translated !== null) yield translated;
  }
}
