import type { LLMProvider } from './provider';
import { translateAnthropicEvents, type AnthropicRawStreamEvent } from './stream-translate';
import type { LLMEvent, LLMRequest } from './types';

export interface LLMFixture {
  readonly name: string;
  readonly request: {
    readonly model: string;
    readonly system: string;
    readonly messages: ReadonlyArray<{ readonly role: 'user' | 'assistant'; readonly content: unknown }>;
    readonly tools: readonly unknown[];
  };
  readonly responses: readonly AnthropicRawStreamEvent[];
}

async function* iterate(responses: readonly AnthropicRawStreamEvent[]): AsyncIterable<AnthropicRawStreamEvent> {
  for (const event of responses) yield event;
}

export function createFixtureProvider(fixture: LLMFixture): LLMProvider {
  return {
    stream(_request: LLMRequest): AsyncIterable<LLMEvent> {
      return translateAnthropicEvents(iterate(fixture.responses));
    },
  };
}

export function isLLMFixture(value: unknown): value is LLMFixture {
  if (value === null || typeof value !== 'object') return false;
  const obj = value as Partial<LLMFixture>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.request === 'object' &&
    obj.request !== null &&
    Array.isArray(obj.responses)
  );
}

/** A fixture that provides a different response stream for each round-trip call. */
export interface LLMMultiRoundFixture {
  readonly name: string;
  readonly request: LLMFixture['request'];
  readonly responseRounds: readonly (readonly AnthropicRawStreamEvent[])[];
}

/**
 * Create a provider that replays `responseRounds[N]` on the Nth call to `stream()`.
 * If there are more calls than rounds, the last round is replayed indefinitely.
 */
export function createMultiRoundFixtureProvider(fixture: LLMMultiRoundFixture): LLMProvider {
  let round = 0;
  return {
    stream(_request: LLMRequest): AsyncIterable<LLMEvent> {
      const responses =
        fixture.responseRounds[round] ??
        fixture.responseRounds[fixture.responseRounds.length - 1] ??
        [];
      round++;
      return translateAnthropicEvents(iterate(responses));
    },
  };
}

export function isLLMMultiRoundFixture(value: unknown): value is LLMMultiRoundFixture {
  if (value === null || typeof value !== 'object') return false;
  const obj = value as Partial<LLMMultiRoundFixture>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.request === 'object' &&
    obj.request !== null &&
    Array.isArray(obj.responseRounds)
  );
}
