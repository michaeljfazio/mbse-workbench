import { describe, expect, it } from 'vitest';
import type { Conversation } from '../types';
import {
  appendAssistantTextDelta,
  appendUserText,
  finalizeAssistantMessage,
} from '../conversation-reducer';

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    title: 'Test Conversation',
    createdAt: '2026-01-01T00:00:00.000Z',
    modifiedAt: '2026-01-01T00:00:00.000Z',
    messages: [],
    ...overrides,
  };
}

describe('appendUserText', () => {
  it('adds a user message with a text block', () => {
    const conv = makeConversation();
    const result = appendUserText(conv, 'Hello!');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toEqual({
      role: 'user',
      content: [{ type: 'text', text: 'Hello!' }],
    });
  });

  it('updates modifiedAt', () => {
    const conv = makeConversation({ modifiedAt: '2026-01-01T00:00:00.000Z' });
    const before = Date.now();
    const result = appendUserText(conv, 'test');
    const after = Date.now();
    const resultTime = new Date(result.modifiedAt).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });

  it('preserves existing messages', () => {
    const conv = makeConversation({
      messages: [{ role: 'user', content: [{ type: 'text', text: 'First' }] }],
    });
    const result = appendUserText(conv, 'Second');
    expect(result.messages).toHaveLength(2);
    expect(result.messages[1]).toMatchObject({ role: 'user' });
  });
});

describe('appendAssistantTextDelta', () => {
  it('starts a new assistant message when conversation is empty', () => {
    const conv = makeConversation();
    const result = appendAssistantTextDelta(conv, 'Hello');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toEqual({
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello' }],
    });
  });

  it('appends delta to existing assistant text block', () => {
    const conv = makeConversation({
      messages: [
        { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] },
      ],
    });
    const result = appendAssistantTextDelta(conv, ' there');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toEqual({
      role: 'assistant',
      content: [{ type: 'text', text: 'Hi there' }],
    });
  });

  it('starts a new assistant message when last message is from user', () => {
    const conv = makeConversation({
      messages: [
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      ],
    });
    const result = appendAssistantTextDelta(conv, 'Hi!');
    expect(result.messages).toHaveLength(2);
    expect(result.messages[1]).toEqual({
      role: 'assistant',
      content: [{ type: 'text', text: 'Hi!' }],
    });
  });

  it('accumulates multiple deltas', () => {
    let conv = makeConversation();
    conv = appendAssistantTextDelta(conv, 'Hi');
    conv = appendAssistantTextDelta(conv, ' there');
    conv = appendAssistantTextDelta(conv, '.');
    expect(conv.messages[0]).toEqual({
      role: 'assistant',
      content: [{ type: 'text', text: 'Hi there.' }],
    });
  });
});

describe('finalizeAssistantMessage', () => {
  it('updates modifiedAt', () => {
    const conv = makeConversation({ modifiedAt: '2026-01-01T00:00:00.000Z' });
    const before = Date.now();
    const result = finalizeAssistantMessage(conv);
    const after = Date.now();
    const resultTime = new Date(result.modifiedAt).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });

  it('does not mutate messages', () => {
    const conv = makeConversation({
      messages: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }],
    });
    const result = finalizeAssistantMessage(conv);
    expect(result.messages).toEqual(conv.messages);
  });
});
