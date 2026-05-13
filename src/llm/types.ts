import type { Command } from '../commands/types';

export type LLMRole = 'user' | 'assistant';

export interface LLMTextBlock {
  readonly type: 'text';
  readonly text: string;
}

export interface LLMToolUseBlock {
  readonly type: 'tool_use';
  readonly id: string;
  readonly name: string;
  readonly input: unknown;
}

export interface LLMToolResultBlock {
  readonly type: 'tool_result';
  readonly tool_use_id: string;
  readonly content: string;
  readonly is_error?: boolean;
}

export type LLMContentBlock = LLMTextBlock | LLMToolUseBlock | LLMToolResultBlock;

export interface LLMMessage {
  readonly role: LLMRole;
  readonly content: readonly LLMContentBlock[];
}

export interface LLMToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly input_schema: {
    readonly type: 'object';
    readonly properties: Readonly<Record<string, unknown>>;
    readonly required?: readonly string[];
    readonly additionalProperties?: boolean;
  };
}

export interface LLMRequest {
  readonly system: string;
  readonly messages: readonly LLMMessage[];
  readonly tools: readonly LLMToolDefinition[];
  readonly maxTokens: number;
}

export type LLMStopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';

export type LLMEvent =
  | { readonly kind: 'content_block_start'; readonly index: number; readonly block: LLMTextBlock | LLMToolUseBlock }
  | { readonly kind: 'text_delta'; readonly index: number; readonly text: string }
  | { readonly kind: 'input_json_delta'; readonly index: number; readonly partialJson: string }
  | { readonly kind: 'content_block_stop'; readonly index: number }
  | { readonly kind: 'message_stop'; readonly stopReason: LLMStopReason };

export interface ProposedChange {
  readonly id: string;
  readonly summary: string;
  readonly commands: readonly Command[];
}

export type ToolOutput =
  | { readonly kind: 'data'; readonly data: unknown }
  | { readonly kind: 'proposed-change'; readonly change: ProposedChange };

export interface Conversation {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly modifiedAt: string;
  readonly messages: readonly LLMMessage[];
}
