import type { LLMToolDefinition, ToolOutput } from './types';

export interface ToolContext {
  readonly conversationId: string;
}

// Structural type compatible with `z.ZodType` so the registry shape does not
// pull zod into the project until slice D (#220) installs it.
export interface ToolInputSchema<TInput> {
  parse(value: unknown): TInput;
}

export interface ToolEntry<TInput = unknown> {
  readonly definition: LLMToolDefinition;
  readonly inputSchema: ToolInputSchema<TInput>;
  readonly mutating: boolean;
  readonly handler: (input: TInput, ctx: ToolContext) => Promise<ToolOutput>;
}

export type ToolRegistry = ReadonlyMap<string, ToolEntry>;
