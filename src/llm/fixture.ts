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
