import { describe, expect, it } from 'vitest';
import { createAnthropicProvider } from '../anthropic';

describe('AnthropicProvider', () => {
  it('instantiates without performing a network call', () => {
    const provider = createAnthropicProvider({
      apiKey: 'sk-test-not-real',
      model: 'claude-sonnet-4-6',
    });
    expect(typeof provider.stream).toBe('function');
  });
});
