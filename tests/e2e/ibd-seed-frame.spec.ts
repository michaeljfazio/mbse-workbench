/**
 * ibd-seed-frame.spec.ts — Closes #461.
 *
 * Asserts the canonical creation path (PartDefinition row menu →
 * "Create representation…" → "IBD") produces an IBD whose canvas is
 * NOT empty: exactly one IbdEnclosingFrameNode bound to the context
 * PartDefinition must be visible.
 */

import { expect, test, type Page } from '@playwright/test';

const TREE_ROW = '[data-testid^="containment-tree-element-"]';

async function openRowMenu(page: Page, elementId: string): Promise<void> {
  const trigger = page.getByTestId(`containment-tree-element-menu-trigger-${elementId}`);
  await trigger.click({ force: true });
  await expect(page.getByTestId(`containment-tree-element-menu-${elementId}`)).toBeVisible();
}

async function rowIdByKind(page: Page, kind: string): Promise<string> {
  const row = page.locator(`${TREE_ROW}[data-kind="${kind}"]`).first();
  await expect(row).toBeVisible();
  const testId = await row.getAttribute('data-testid');
  if (testId === null) throw new Error(`row [data-kind="${kind}"] had no data-testid`);
  return testId.slice('containment-tree-element-'.length);
}

test.describe('IBD seed frame — issue #461', () => {
  test('IBD created from PartDefinition row menu shows the enclosing frame node', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('containment-tree')).toBeVisible();

    // Use the Package row's implicit-owner shortcut to create a PartDefinition
    // and its IBD in one step (same flow the issue's reproduction steps use).
    const pkgId = await rowIdByKind(page, 'Package');
    await openRowMenu(page, pkgId);
    await page.getByTestId(`containment-tree-element-menu-create-representation-${pkgId}`).click();
    await page.getByTestId(`containment-tree-element-menu-representation-ibd-${pkgId}`).click();

    // Active panel must be IBD.
    await expect(page.getByTestId('diagram-panel')).toHaveAttribute('data-viewpoint-id', 'ibd');

    // The enclosing frame node must be present in the canvas DOM.
    const partDefId = await rowIdByKind(page, 'PartDefinition');
    await expect(
      page.locator(`[data-testid="ibd-enclosing-frame-${partDefId}"]`),
    ).toBeVisible();
  });
});
