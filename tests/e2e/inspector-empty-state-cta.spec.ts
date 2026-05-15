import { expect, test } from '@playwright/test';

test.describe('inspector empty-state CTA (T-13.07)', () => {
  test('clicking "+ New Block" on the empty BDD inspector creates and selects a Block', async ({
    page,
  }) => {
    await page.goto('/');
    // Wait for bootstrap.
    await expect(page.getByTestId('inspector-empty')).toBeVisible();

    const cta = page.getByTestId('inspector-empty-action-PartDefinition');
    await expect(cta).toHaveText('+ New Block');

    await cta.click();

    // The new block appears on the BDD canvas …
    const newBlock = page
      .locator('[data-testid^="bdd-block-"][data-element-id]')
      .first();
    await expect(newBlock).toBeVisible();

    // … and the inspector flips from empty to single-selection mode.
    await expect(page.getByTestId('inspector-single')).toBeVisible();
    await expect(page.getByTestId('inspector-name')).toHaveValue('Block 1');
  });

});
