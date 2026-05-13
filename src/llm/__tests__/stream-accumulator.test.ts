import { describe, expect, it, vi } from 'vitest';
import type { LLMEvent } from '../types';
import { accumulateStream } from '../stream-accumulator';

async function* makeStream(events: LLMEvent[]): AsyncIterable<LLMEvent> {
  for (const e of events) yield e;
}

describe('accumulateStream', () => {
  it('calls onTextDelta for each text_delta event', async () => {
    const onTextDelta = vi.fn();
    const onStop = vi.fn();

    const events: LLMEvent[] = [
      { kind: 'content_block_start', index: 0, block: { type: 'text', text: '' } },
      { kind: 'text_delta', index: 0, text: 'Hi' },
      { kind: 'text_delta', index: 0, text: ' there' },
      { kind: 'text_delta', index: 0, text: '.' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'end_turn' },
    ];

    await accumulateStream(makeStream(events), onTextDelta, onStop);

    expect(onTextDelta).toHaveBeenCalledTimes(3);
    expect(onTextDelta).toHaveBeenNthCalledWith(1, 'Hi');
    expect(onTextDelta).toHaveBeenNthCalledWith(2, ' there');
    expect(onTextDelta).toHaveBeenNthCalledWith(3, '.');
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('calls onStop on message_stop', async () => {
    const onTextDelta = vi.fn();
    const onStop = vi.fn();

    const events: LLMEvent[] = [
      { kind: 'message_stop', stopReason: 'end_turn' },
    ];

    await accumulateStream(makeStream(events), onTextDelta, onStop);

    expect(onStop).toHaveBeenCalledOnce();
    expect(onTextDelta).not.toHaveBeenCalled();
  });

  it('ignores content_block_start, content_block_stop, and input_json_delta', async () => {
    const onTextDelta = vi.fn();
    const onStop = vi.fn();

    const events: LLMEvent[] = [
      { kind: 'content_block_start', index: 0, block: { type: 'tool_use', id: 'tu_1', name: 'query', input: {} } },
      { kind: 'input_json_delta', index: 0, partialJson: '{}' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'tool_use' },
    ];

    await accumulateStream(makeStream(events), onTextDelta, onStop);

    expect(onTextDelta).not.toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('handles a full realistic fixture sequence and concatenates deltas correctly', async () => {
    const collected: string[] = [];
    let stopped = false;

    const events: LLMEvent[] = [
      { kind: 'content_block_start', index: 0, block: { type: 'text', text: '' } },
      { kind: 'text_delta', index: 0, text: 'Hi' },
      { kind: 'text_delta', index: 0, text: ' there.' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'end_turn' },
    ];

    await accumulateStream(
      makeStream(events),
      (d) => collected.push(d),
      () => { stopped = true; },
    );

    expect(collected.join('')).toBe('Hi there.');
    expect(stopped).toBe(true);
  });
});
