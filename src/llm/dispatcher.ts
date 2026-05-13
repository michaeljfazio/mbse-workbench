import type { LLMProvider } from './provider';
import type { ToolRegistry } from './registry';
import type { LLMMessage } from './types';

export { createDispatcher } from './create-dispatcher';

export const DISPATCHER_ROUND_TRIP_CAP = 8;

export interface DispatcherDependencies {
  readonly provider: LLMProvider;
  readonly registry: ToolRegistry;
}

export interface DispatcherTurnRequest {
  readonly conversationId: string;
  readonly system: string;
  readonly priorMessages: readonly LLMMessage[];
  readonly userMessage: LLMMessage;
  readonly maxTokens: number;
}

export interface DispatcherTurnResult {
  readonly appendedMessages: readonly LLMMessage[];
  readonly roundTrips: number;
  readonly hitRoundTripCap: boolean;
}

export type Dispatcher = (req: DispatcherTurnRequest) => Promise<DispatcherTurnResult>;
