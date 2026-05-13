import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FIXTURE_PATH = resolve(process.cwd(), 'tests/fixtures/llm/no-tool-greeting.json');

function loadFixtureJson(): unknown {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
}

async function injectApiKey(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    sessionStorage.setItem('mbse-workbench:anthropic-api-key', 'sk-ant-test-fixture');
  });
}

async function injectFixtureProvider(page: import('@playwright/test').Page): Promise<void> {
  const fixture = loadFixtureJson();
  await page.evaluate((f) => {
    const llm = (window as unknown as Record<string, unknown>)['__llm'] as {
      createFixtureProvider: (fixture: unknown) => unknown;
      setChatProviderOverride: (provider: unknown) => void;
    } | undefined;
    if (!llm) throw new Error('__llm seam not found on window');
    llm.setChatProviderOverride(llm.createFixtureProvider(f));
  }, fixture);
}

test.describe('Chat streaming — slice C', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first, then inject key into sessionStorage, then reload
    await page.goto('/');
    await injectApiKey(page);
    await page.reload();
  });

  test('shows empty state before a conversation is created', async ({ page }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await expect(page.getByTestId('sidebar-panel')).toBeVisible();
    await expect(page.getByTestId('chat-empty')).toBeVisible();
    await expect(page.getByTestId('chat-empty')).toContainText('Start a new conversation');
  });

  test('creates a conversation, sends a message, streams response, and persists on reload', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await expect(page.getByTestId('chat-empty')).toBeVisible();

    await injectFixtureProvider(page);

    // Create new conversation
    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();

    await expect(page.getByTestId('chat-composer')).toBeVisible();
    await expect(page.getByTestId('chat-send')).toBeVisible();
    await expect(page.getByTestId('chat-title')).toBeVisible();

    // Type and send a message
    await page.getByTestId('chat-composer').fill('Say hi.');
    await page.getByTestId('chat-send').click();

    // User message should appear
    await expect(page.locator('[data-testid="chat-message"][data-role="user"]').first()).toBeVisible();

    // At some point during streaming, data-streaming="true" may exist
    // (fast fixture may complete before we check, so we don't assert its presence)

    // Wait for assistant reply to complete (streaming ends)
    await expect(
      page.locator('[data-testid="chat-message"][data-streaming="true"]'),
    ).toHaveCount(0, { timeout: 10000 });

    // Verify the fixture text appears in the assistant message
    await expect(
      page.locator('[data-testid="chat-message"][data-role="assistant"]').first(),
    ).toContainText('Hi there.');

    // Reload and verify conversation is persisted
    await page.reload();
    await page.getByRole('tab', { name: 'Chat' }).click();

    // Should not show empty state (conversation was persisted)
    await expect(page.getByTestId('chat-empty')).toHaveCount(0);

    // Both messages should still be visible
    const persistedMessages = page.locator('[data-testid="chat-message"]');
    await expect(persistedMessages).toHaveCount(2);
    await expect(persistedMessages.first()).toContainText('Say hi.');
    await expect(persistedMessages.last()).toContainText('Hi there.');
  });

  test('Cmd+Enter sends the message', async ({ page }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectFixtureProvider(page);

    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();

    await page.getByTestId('chat-composer').fill('Hello via keyboard');
    await page.getByTestId('chat-composer').press('Meta+Enter');

    await expect(
      page.locator('[data-testid="chat-message"][data-role="user"]').first(),
    ).toBeVisible();
  });

  test('New chat button in header creates a fresh empty conversation', async ({ page }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectFixtureProvider(page);

    // Create first conversation
    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();
    await expect(page.getByTestId('chat-composer')).toBeVisible();

    // Click New from header
    await page.getByTestId('chat-new').click();

    // Should show composer for a new empty conversation (no messages)
    await expect(page.getByTestId('chat-composer')).toBeVisible();
    await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(0);
  });

  test('Clear history empties conversations and shows empty state', async ({ page }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectFixtureProvider(page);

    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();
    await expect(page.getByTestId('chat-clear')).toBeVisible();

    await page.getByTestId('chat-clear').click();

    await expect(page.getByTestId('chat-empty')).toBeVisible();
  });

  test('@a11y chat empty state has no serious or critical accessibility violations', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await expect(page.getByTestId('chat-empty')).toBeVisible();

    // Scope scan to the sidebar panel to avoid pre-existing contrast issues
    // in other workspace UI elements (e.g. inactive tab button text).
    const results = await new AxeBuilder({ page })
      .include('[data-testid="sidebar-panel"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@a11y chat with conversation has no serious or critical accessibility violations', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectFixtureProvider(page);

    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();
    await page.getByTestId('chat-composer').fill('Say hi.');
    await page.getByTestId('chat-send').click();

    await expect(
      page.locator('[data-testid="chat-message"][data-streaming="true"]'),
    ).toHaveCount(0, { timeout: 10000 });

    // Scope scan to the sidebar panel to avoid pre-existing contrast issues
    // in other workspace UI elements (e.g. inactive tab button text).
    const results = await new AxeBuilder({ page })
      .include('[data-testid="sidebar-panel"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@visual chat-empty state', async ({ page }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await expect(page.getByTestId('chat-empty')).toBeVisible();
    await expect(page.getByTestId('sidebar-panel')).toHaveScreenshot('chat-empty.png');
  });

  test('@visual chat after reply', async ({ page }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectFixtureProvider(page);

    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();
    await page.getByTestId('chat-composer').fill('Say hi.');
    await page.getByTestId('chat-send').click();

    // Wait for streaming to complete
    await expect(
      page.locator('[data-testid="chat-message"][data-streaming="true"]'),
    ).toHaveCount(0, { timeout: 10000 });

    await expect(page.getByTestId('sidebar-panel')).toHaveScreenshot('chat-after-reply.png');
  });

  test('@visual chat with history after reload', async ({ page }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectFixtureProvider(page);

    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();
    await page.getByTestId('chat-composer').fill('Say hi.');
    await page.getByTestId('chat-send').click();

    await expect(
      page.locator('[data-testid="chat-message"][data-streaming="true"]'),
    ).toHaveCount(0, { timeout: 10000 });

    await page.reload();
    await page.getByRole('tab', { name: 'Chat' }).click();
    await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(2);

    await expect(page.getByTestId('sidebar-panel')).toHaveScreenshot('chat-with-history.png');
  });
});
