import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFixtureProvider, isLLMFixture, type LLMFixture } from '../fixture';
import type { LLMEvent, LLMRequest } from '../types';

const FIXTURE_PATH = resolve(process.cwd(), 'tests/fixtures/llm/no-tool-greeting.json');

function loadFixture(path: string): LLMFixture {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as unknown;
  if (!isLLMFixture(raw)) throw new Error(`fixture at ${path} did not match the LLMFixture shape`);
  return raw;
}

async function collect(stream: AsyncIterable<LLMEvent>): Promise<LLMEvent[]> {
  const out: LLMEvent[] = [];
  for await (const e of stream) out.push(e);
  return out;
}

const REQUEST: LLMRequest = {
  system: 'unused',
  messages: [],
  tools: [],
  maxTokens: 64,
};

describe('FixtureProvider', () => {
  it('round-trips a no-tool streamed reply into the translated LLMEvent sequence', async () => {
    const fixture = loadFixture(FIXTURE_PATH);
    const provider = createFixtureProvider(fixture);

    const events = await collect(provider.stream(REQUEST));

    expect(events).toEqual<LLMEvent[]>([
      { kind: 'content_block_start', index: 0, block: { type: 'text', text: '' } },
      { kind: 'text_delta', index: 0, text: 'Hi' },
      { kind: 'text_delta', index: 0, text: ' there.' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'end_turn' },
    ]);
  });

  it('replaying the same fixture twice produces identical event sequences', async () => {
    const fixture = loadFixture(FIXTURE_PATH);
    const provider = createFixtureProvider(fixture);

    const first = await collect(provider.stream(REQUEST));
    const second = await collect(provider.stream(REQUEST));
    expect(second).toEqual(first);
  });

  it('translates tool-use blocks and input_json_delta chunks', async () => {
    const fixture: LLMFixture = {
      name: 'inline-tool-use',
      request: { model: 'm', system: '', messages: [], tools: [] },
      responses: [
        { type: 'message_start', message: { id: 'm' } },
        {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'tool_use', id: 'tu_1', name: 'query_model', input: {} },
        },
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'input_json_delta', partial_json: '{"q":' },
        },
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'input_json_delta', partial_json: '"hi"}' },
        },
        { type: 'content_block_stop', index: 0 },
        { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
        { type: 'message_stop' },
      ],
    };

    const events = await collect(createFixtureProvider(fixture).stream(REQUEST));

    expect(events).toEqual<LLMEvent[]>([
      {
        kind: 'content_block_start',
        index: 0,
        block: { type: 'tool_use', id: 'tu_1', name: 'query_model', input: {} },
      },
      { kind: 'input_json_delta', index: 0, partialJson: '{"q":' },
      { kind: 'input_json_delta', index: 0, partialJson: '"hi"}' },
      { kind: 'content_block_stop', index: 0 },
      { kind: 'message_stop', stopReason: 'tool_use' },
    ]);
  });

  it('isLLMFixture rejects non-object and shape-incompatible inputs', () => {
    expect(isLLMFixture(null)).toBe(false);
    expect(isLLMFixture('string')).toBe(false);
    expect(isLLMFixture({ name: 'x', request: {} })).toBe(false);
    expect(isLLMFixture({ name: 'x', request: {}, responses: [] })).toBe(true);
  });
});
