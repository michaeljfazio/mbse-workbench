import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FIXTURE_PATH = resolve(
  process.cwd(),
  'tests/fixtures/llm/create-element-accept-round-trip.json',
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

async function sendChatMessage(
  page: import('@playwright/test').Page,
  text: string,
): Promise<void> {
  await page.getByRole('tab', { name: 'Chat' }).click();
  await injectMultiRoundFixtureProvider(page);
  const newChatBtn = page.getByTestId('chat-empty').locator('[data-testid="chat-new"]');
  await newChatBtn.click();
  await page.getByTestId('chat-composer').fill(text);
  await page.getByTestId('chat-send').click();
}

test.describe('Chat proposal Accept — slice E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectApiKey(page);
    await page.reload();
  });

  test('mutating tool surfaces ProposalCard; Accept applies the change and round-trip resumes', async ({
    page,
  }) => {
    await sendChatMessage(page, 'add a part called Pump');

    // The proposal card should appear in the chat sidebar.
    const proposalCard = page.locator('[data-testid="proposal-card"]').first();
    await expect(proposalCard).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="proposal-summary"]').first()).toContainText(
      'Create PartDefinition "Pump"',
    );

    // Accept the proposal.
    await proposalCard.locator('[data-testid="proposal-accept"]').click();

    // Proposal card should be cleared.
    await expect(page.locator('[data-testid="proposal-card"]')).toHaveCount(0);

    // Round 2 streams in; final assistant text appears.
    await expect(
      page.locator('[data-testid="chat-message"][data-streaming="true"]'),
    ).toHaveCount(0, { timeout: 15000 });
    await expect(
      page.locator('[data-testid="chat-message"][data-role="assistant"]').last(),
    ).toContainText('Pump has been added');

    // The new PartDefinition should now exist in the project tree.
    await expect(
      page.locator('[data-testid="project-tree"] [role="treeitem"]', { hasText: 'Pump' }).first(),
    ).toBeVisible();
  });

  test('Reject clears the proposal and resumes the dispatcher with an accepted=false result', async ({
    page,
  }) => {
    await sendChatMessage(page, 'add a part called Pump');

    const proposalCard = page.locator('[data-testid="proposal-card"]').first();
    await expect(proposalCard).toBeVisible({ timeout: 15000 });

    await proposalCard.locator('[data-testid="proposal-reject"]').click();
    await expect(page.locator('[data-testid="proposal-card"]')).toHaveCount(0);

    // The dispatcher still continues (round 2 fires); no element gets created.
    await expect(
      page.locator('[data-testid="chat-message"][data-streaming="true"]'),
    ).toHaveCount(0, { timeout: 15000 });
    await expect(
      page.locator('[data-testid="project-tree"] [role="treeitem"]', { hasText: 'Pump' }),
    ).toHaveCount(0);
  });

  test('@a11y proposal card has no serious accessibility violations', async ({ page }) => {
    await sendChatMessage(page, 'add a part called Pump');
    await expect(page.locator('[data-testid="proposal-card"]').first()).toBeVisible({
      timeout: 15000,
    });

    const results = await new AxeBuilder({ page })
      .include('[data-testid="proposal-card"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@visual proposal card pending state', async ({ page }) => {
    await sendChatMessage(page, 'add a part called Pump');
    const proposalCard = page.locator('[data-testid="proposal-card"]').first();
    await expect(proposalCard).toBeVisible({ timeout: 15000 });
    await expect(proposalCard).toHaveScreenshot('proposal-card-pending.png');
  });
});
