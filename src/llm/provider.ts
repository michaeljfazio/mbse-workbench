import type { LLMEvent, LLMRequest } from './types';

export interface LLMProvider {
  stream(request: LLMRequest): AsyncIterable<LLMEvent>;
}
