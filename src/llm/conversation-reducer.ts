import type { Conversation, LLMMessage, LLMTextBlock } from './types';

/**
 * Pure reducer functions for Conversation mutations.
 * No React or store dependencies — safe to unit-test in isolation.
 */

function now(): string {
  return new Date().toISOString();
}

/** Append a user text message to the conversation. */
export function appendUserText(conversation: Conversation, text: string): Conversation {
  const message: LLMMessage = {
    role: 'user',
    content: [{ type: 'text', text }],
  };
  return {
    ...conversation,
    modifiedAt: now(),
    messages: [...conversation.messages, message],
  };
}

/**
 * Accumulate a streaming assistant text delta.
 * If the last message is an in-progress assistant message whose last block is
 * a text block, the delta is appended to that block. Otherwise a new assistant
 * message is started with the delta as its first text block.
 */
export function appendAssistantTextDelta(
  conversation: Conversation,
  delta: string,
): Conversation {
  const messages = conversation.messages;
  const lastMsg = messages[messages.length - 1];

  if (lastMsg !== undefined && lastMsg.role === 'assistant') {
    const content = lastMsg.content;
    const lastBlock = content[content.length - 1];
    if (lastBlock !== undefined && lastBlock.type === 'text') {
      const updatedBlock: LLMTextBlock = { type: 'text', text: lastBlock.text + delta };
      const updatedContent = [...content.slice(0, -1), updatedBlock];
      const updatedMsg: LLMMessage = { role: 'assistant', content: updatedContent };
      return {
        ...conversation,
        messages: [...messages.slice(0, -1), updatedMsg],
      };
    }
    // Last block is not text — start a new text block in the same assistant message
    const updatedMsg: LLMMessage = {
      role: 'assistant',
      content: [...content, { type: 'text', text: delta }],
    };
    return {
      ...conversation,
      messages: [...messages.slice(0, -1), updatedMsg],
    };
  }

  // No assistant message yet — start a new one
  const newMsg: LLMMessage = {
    role: 'assistant',
    content: [{ type: 'text', text: delta }],
  };
  return {
    ...conversation,
    messages: [...messages, newMsg],
  };
}

/**
 * Mark the current in-progress assistant message complete by updating modifiedAt.
 * Call this on message_stop so persisted conversations reflect completion time.
 */
export function finalizeAssistantMessage(conversation: Conversation): Conversation {
  return {
    ...conversation,
    modifiedAt: now(),
  };
}
