import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FIXTURE_PATH = resolve(
  process.cwd(),
  'tests/fixtures/llm/explain-diagram-round-trip.json',
);

function loadFixtureJson(): unknown {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
}

async function injectApiKey(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    sessionStorage.setItem('mbse-workbench:anthropic-api-key', 'sk-ant-test-fixture');
  });
}

async function injectMultiRoundFixtureProvider(
  page: import('@playwright/test').Page,
): Promise<void> {
  const fixture = loadFixtureJson();
  await page.evaluate((f) => {
    const llm = (window as unknown as Record<string, unknown>)['__llm'] as
      | {
          createMultiRoundFixtureProvider: (fixture: unknown) => unknown;
          setChatProviderOverride: (provider: unknown) => void;
        }
      | undefined;
    if (!llm) throw new Error('__llm seam not found on window');
    llm.setChatProviderOverride(llm.createMultiRoundFixtureProvider(f));
  }, fixture);
}

test.describe('Chat tools — slice D', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectApiKey(page);
    await page.reload();
  });

  test('explain_diagram: tool_use card appears, tool_result card appears, final text streams in', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await expect(page.getByTestId('chat-empty')).toBeVisible();

    await injectMultiRoundFixtureProvider(page);

    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();

    await page.getByTestId('chat-composer').fill('explain this diagram');
    await page.getByTestId('chat-send').click();

    // Wait for user message
    await expect(
      page.locator('[data-testid="chat-message"][data-role="user"]').first(),
    ).toBeVisible();

    // Wait for streaming to complete
    await expect(
      page.locator('[data-testid="chat-message"][data-streaming="true"]'),
    ).toHaveCount(0, { timeout: 15000 });

    // tool_use card should be visible (collapsed)
    await expect(page.locator('[data-testid="tool-use-card"]').first()).toBeVisible();

    // tool_result card should be visible
    await expect(page.locator('[data-testid="tool-result-card"]').first()).toBeVisible();

    // Final assistant text should appear
    await expect(
      page.locator('[data-testid="chat-message"][data-role="assistant"]').last(),
    ).toContainText('active diagram');

    // Expand the tool_use card and verify it shows input
    await page.locator('[data-testid="tool-use-card"]').first().locator('button').click();
    await expect(page.locator('[data-testid="tool-use-input"]').first()).toBeVisible();
  });

  test('Cmd+Enter also works with tool round-trip', async ({ page }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectMultiRoundFixtureProvider(page);

    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();

    await page.getByTestId('chat-composer').fill('explain this diagram');
    await page.getByTestId('chat-composer').press('Meta+Enter');

    await expect(
      page.locator('[data-testid="chat-message"][data-role="user"]').first(),
    ).toBeVisible();

    await expect(
      page.locator('[data-testid="chat-message"][data-streaming="true"]'),
    ).toHaveCount(0, { timeout: 15000 });

    await expect(page.locator('[data-testid="tool-use-card"]').first()).toBeVisible();
  });

  test('@a11y chat with tool cards has no serious accessibility violations', async ({ page }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectMultiRoundFixtureProvider(page);

    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();

    await page.getByTestId('chat-composer').fill('explain this diagram');
    await page.getByTestId('chat-send').click();

    await expect(
      page.locator('[data-testid="chat-message"][data-streaming="true"]'),
    ).toHaveCount(0, { timeout: 15000 });

    const results = await new AxeBuilder({ page })
      .include('[data-testid="sidebar-panel"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@visual chat with tool-use and tool-result cards', async ({ page }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    await injectMultiRoundFixtureProvider(page);

    const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
    await newChatBtn.click();

    await page.getByTestId('chat-composer').fill('explain this diagram');
    await page.getByTestId('chat-send').click();

    await expect(
      page.locator('[data-testid="chat-message"][data-streaming="true"]'),
    ).toHaveCount(0, { timeout: 15000 });

    await expect(page.getByTestId('sidebar-panel')).toHaveScreenshot('chat-tool-cards.png');
  });
});
