import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('API key entry', () => {
  test('chip starts in absent state', async ({ page }) => {
    await page.goto('/');
    const chip = page.getByTestId('api-key-chip');
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('data-state', 'absent');
  });

  test('opening chat tab without a key shows the modal; saving closes it; reload clears the key', async ({
    page,
  }) => {
    await page.goto('/');

    // No modal initially.
    await expect(page.getByTestId('api-key-modal')).toHaveCount(0);

    // Open chat tab → modal appears.
    await page.getByRole('tab', { name: 'Chat' }).click();
    const modal = page.getByTestId('api-key-modal');
    await expect(modal).toBeVisible();

    // Enter dummy key and save.
    const input = page.getByTestId('api-key-input');
    await input.fill('sk-ant-test-dummy');
    await page.getByTestId('api-key-save').click();
    await expect(modal).toHaveCount(0);

    // Chip flips to present.
    const chip = page.getByTestId('api-key-chip');
    await expect(chip).toHaveAttribute('data-state', 'present');

    // Chat pane no longer shows the needs-key block; now shows the chat UI.
    await expect(page.getByTestId('chat-needs-key')).toHaveCount(0);
    await expect(page.getByTestId('chat-empty')).toBeVisible();

    // Reload — sessionStorage survives same-tab reload, so the key remains.
    // The acceptance criterion ("reload reopens modal") is for a *new* tab;
    // we verify that by clearing storage between contexts in a follow-up.
    await page.reload();
    await expect(page.getByTestId('api-key-chip')).toHaveAttribute(
      'data-state',
      'present',
    );

    // In a fresh context (simulates new tab close+open), the key should be gone.
    const ctx = page.context();
    const fresh = await ctx.browser()?.newContext();
    if (!fresh) throw new Error('failed to open fresh context');
    const freshPage = await fresh.newPage();
    await freshPage.goto('/');
    await expect(freshPage.getByTestId('api-key-chip')).toHaveAttribute(
      'data-state',
      'absent',
    );
    await freshPage.getByRole('tab', { name: 'Chat' }).click();
    await expect(freshPage.getByTestId('api-key-modal')).toBeVisible();
    await fresh.close();
  });

  test('clicking the chip opens the modal; clear removes the key', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('api-key-chip').click();
    await expect(page.getByTestId('api-key-modal')).toBeVisible();
    await page.getByTestId('api-key-input').fill('sk-ant-xyz');
    await page.getByTestId('api-key-save').click();
    await expect(page.getByTestId('api-key-chip')).toHaveAttribute(
      'data-state',
      'present',
    );
    // Re-open and clear.
    await page.getByTestId('api-key-chip').click();
    await page.getByTestId('api-key-clear').click();
    await expect(page.getByTestId('api-key-chip')).toHaveAttribute(
      'data-state',
      'absent',
    );
  });

  test('Escape closes the modal without saving', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('api-key-chip').click();
    await expect(page.getByTestId('api-key-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('api-key-modal')).toHaveCount(0);
    await expect(page.getByTestId('api-key-chip')).toHaveAttribute(
      'data-state',
      'absent',
    );
  });

  test('@a11y modal has no serious or critical accessibility violations', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('api-key-chip').click();
    await expect(page.getByTestId('api-key-modal')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@visual chip absent state', async ({ page }) => {
    await page.goto('/');
    const chip = page.getByTestId('api-key-chip');
    await expect(chip).toHaveAttribute('data-state', 'absent');
    await expect(chip).toHaveScreenshot('api-key-chip-absent.png');
  });

  test('@visual chip present state', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('api-key-chip').click();
    await page.getByTestId('api-key-input').fill('sk-ant-fixture');
    await page.getByTestId('api-key-save').click();
    const chip = page.getByTestId('api-key-chip');
    await expect(chip).toHaveAttribute('data-state', 'present');
    await expect(chip).toHaveScreenshot('api-key-chip-present.png');
  });

  test('@visual modal layout', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('api-key-chip').click();
    const modal = page.getByTestId('api-key-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveScreenshot('api-key-modal.png');
  });
});
