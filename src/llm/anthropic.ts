import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider } from './provider';
import { translateAnthropicEvents, type AnthropicRawStreamEvent } from './stream-translate';
import type { LLMContentBlock, LLMEvent, LLMMessage, LLMRequest } from './types';

export interface AnthropicProviderOptions {
  readonly apiKey: string;
  readonly model: string;
}

type SdkContentBlockParam =
  | Anthropic.Messages.TextBlockParam
  | Anthropic.Messages.ToolUseBlockParam
  | Anthropic.Messages.ToolResultBlockParam;

function toSdkContent(blocks: readonly LLMContentBlock[]): SdkContentBlockParam[] {
  return blocks.map((block): SdkContentBlockParam => {
    switch (block.type) {
      case 'text':
        return { type: 'text', text: block.text };
      case 'tool_use':
        return { type: 'tool_use', id: block.id, name: block.name, input: block.input };
      case 'tool_result': {
        const out: Anthropic.Messages.ToolResultBlockParam = {
          type: 'tool_result',
          tool_use_id: block.tool_use_id,
          content: block.content,
        };
        if (block.is_error !== undefined) {
          return { ...out, is_error: block.is_error };
        }
        return out;
      }
    }
  });
}

function toSdkMessages(messages: readonly LLMMessage[]): Anthropic.Messages.MessageParam[] {
  return messages.map((m) => ({ role: m.role, content: toSdkContent(m.content) }));
}

export function createAnthropicProvider(options: AnthropicProviderOptions): LLMProvider {
  const client = new Anthropic({ apiKey: options.apiKey, dangerouslyAllowBrowser: true });
  return {
    stream(request: LLMRequest): AsyncIterable<LLMEvent> {
      const sdkStream = client.messages.stream({
        model: options.model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: toSdkMessages(request.messages),
        tools: request.tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.input_schema,
        })) as Anthropic.Messages.Tool[],
      });
      return translateAnthropicEvents(
        sdkStream as unknown as AsyncIterable<AnthropicRawStreamEvent>,
      );
    },
  };
}
