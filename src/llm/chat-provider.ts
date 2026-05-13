/**
 * Provider selection seam for ChatPane.
 *
 * In production, ChatPane calls getChatProvider(apiKey) which returns an
 * AnthropicProvider. In tests (unit or e2e), call setChatProviderOverride
 * before the component renders; ChatPane will prefer the override when set.
 *
 * Playwright sets the override via page.evaluate(() => {
 *   window.__setChatProviderOverride(fixtureProvider);
 * }) before interacting with the Chat tab.
 *
 * This module is documented in src/llm/CONTEXT.md.
 */

import { createAnthropicProvider } from './anthropic';
import type { LLMProvider } from './provider';

const DEFAULT_MODEL = 'claude-sonnet-4-6';

let override: LLMProvider | null = null;

/** Inject a test provider. Pass null to restore production behaviour. */
export function setChatProviderOverride(provider: LLMProvider | null): void {
  override = provider;
}

/** Returns the overridden provider if set, otherwise creates an AnthropicProvider. */
export function getChatProvider(apiKey: string): LLMProvider {
  if (override !== null) return override;
  return createAnthropicProvider({ apiKey, model: DEFAULT_MODEL });
}
