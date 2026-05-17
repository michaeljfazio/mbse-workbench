/**
 * package-row-implicit-owner.spec.ts — Closes #368 / #369 / #370 / #371 / #411
 * per ADR 0014.
 *
 * The project-tree Package row's `Create representation…` submenu gains four
 * implicit-owner entries:
 *   - Activity (creates Action Definition)
 *   - State Machine (creates State Definition)
 *   - IBD (creates Part Definition)
 *   - Parametric…   (opens a popover prompting for owner kind)
 *
 * These shortcuts collapse the prior three-click path (create Definition →
 * find its row → use its representation submenu) into a single click for an
 * architect at the project root.
 */

import { expect, test, type Locator, type Page } from '@playwright/test';

const TREE_ROW = '[data-testid^="containment-tree-element-"]';

async function rowIdByKind(page: Page, kind: string): Promise<string> {
  const row = page.locator(`${TREE_ROW}[data-kind="${kind}"]`).first();
  await expect(row).toBeVisible();
  const testId = await row.getAttribute('data-testid');
  if (testId === null) throw new Error('row had no data-testid');
  return testId.slice('containment-tree-element-'.length);
}

async function openPackageRowMenu(page: Page): Promise<{
  packageId: string;
  menu: Locator;
}> {
  const packageId = await rowIdByKind(page, 'Package');
  const trigger = page.getByTestId(
    `containment-tree-element-menu-trigger-${packageId}`,
  );
  await trigger.click({ force: true });
  const menu = page.getByTestId(
    `containment-tree-element-menu-${packageId}`,
  );
  await expect(menu).toBeVisible();
  return { packageId, menu };
}

async function clickPackageRepresentation(
  page: Page,
  viewpointId: string,
): Promise<void> {
  const { packageId } = await openPackageRowMenu(page);
  await page
    .getByTestId(
      `containment-tree-element-menu-create-representation-${packageId}`,
    )
    .click();
  await page
    .getByTestId(
      `containment-tree-element-menu-representation-${viewpointId}-${packageId}`,
    )
    .click();
}

async function activeViewpoint(page: Page): Promise<string> {
  const v = await page
    .getByTestId('diagram-panel')
    .getAttribute('data-viewpoint-id');
  if (v === null) throw new Error('diagram-panel had no data-viewpoint-id');
  return v;
}

test.describe('Package row "Create representation…" implicit-owner entries (ADR 0014, closes #368/#369/#370/#371)', () => {
  test('Activity entry auto-creates an Action Definition and switches to the new Activity diagram', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('containment-tree')).toBeVisible();

    // Before: no Action Definition exists.
    await expect(
      page.locator(`${TREE_ROW}[data-kind="ActionDefinition"]`),
    ).toHaveCount(0);

    await clickPackageRepresentation(page, 'activity');

    // After: one Action Definition appears in the tree.
    await expect(
      page.locator(`${TREE_ROW}[data-kind="ActionDefinition"]`),
    ).toHaveCount(1);

    // The active diagram is an Activity diagram.
    expect(await activeViewpoint(page)).toBe('activity');
  });

  test('State Machine entry auto-creates a State Definition and switches to the new State Machine diagram', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('containment-tree')).toBeVisible();

    await expect(
      page.locator(`${TREE_ROW}[data-kind="StateDefinition"]`),
    ).toHaveCount(0);

    await clickPackageRepresentation(page, 'state-machine');

    await expect(
      page.locator(`${TREE_ROW}[data-kind="StateDefinition"]`),
    ).toHaveCount(1);
    expect(await activeViewpoint(page)).toBe('state-machine');
  });

  test('IBD entry auto-creates a Part Definition and switches to the new IBD', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('containment-tree')).toBeVisible();

    await expect(
      page.locator(`${TREE_ROW}[data-kind="PartDefinition"]`),
    ).toHaveCount(0);

    await clickPackageRepresentation(page, 'ibd');

    await expect(
      page.locator(`${TREE_ROW}[data-kind="PartDefinition"]`),
    ).toHaveCount(1);
    expect(await activeViewpoint(page)).toBe('ibd');
  });

  test('Parametric entry opens a popover; picking Part Definition creates the owner and switches to the Parametric diagram', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('containment-tree')).toBeVisible();

    await clickPackageRepresentation(page, 'parametric');

    // Popover appears with the owner-kind choice.
    const popover = page.getByTestId('parametric-owner-popover');
    await expect(popover).toBeVisible();
    await expect(
      page.getByTestId('parametric-owner-option-PartDefinition'),
    ).toBeVisible();

    await page.getByTestId('parametric-owner-option-PartDefinition').click();

    // Popover dismisses; one Part Definition appears; active diagram is Parametric.
    await expect(popover).toHaveCount(0);
    await expect(
      page.locator(`${TREE_ROW}[data-kind="PartDefinition"]`),
    ).toHaveCount(1);
    expect(await activeViewpoint(page)).toBe('parametric');
  });

  test('Parametric popover: Escape dismisses without creating anything', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('containment-tree')).toBeVisible();

    await clickPackageRepresentation(page, 'parametric');
    await expect(page.getByTestId('parametric-owner-popover')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByTestId('parametric-owner-popover')).toHaveCount(0);
    // No owner was created, no diagram was created.
    await expect(
      page.locator(`${TREE_ROW}[data-kind="PartDefinition"]`),
    ).toHaveCount(0);
    // Active diagram stays on the bootstrap "Main BDD".
    expect(await activeViewpoint(page)).toBe('bdd');
  });

  test('Per-Definition row menu still creates representations without the implicit-owner suffix in the label', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('containment-tree')).toBeVisible();

    // Create an Action Definition the "long" way and verify its row menu
    // still exposes "Activity" (no implicit-owner suffix) — the existing
    // per-Definition representation entries must not regress.
    await clickPackageRepresentation(page, 'activity');
    const actionDefId = await rowIdByKind(page, 'ActionDefinition');

    await page
      .getByTestId(`containment-tree-element-menu-trigger-${actionDefId}`)
      .click({ force: true });
    await page
      .getByTestId(
        `containment-tree-element-menu-create-representation-${actionDefId}`,
      )
      .click();

    const entry = page.getByTestId(
      `containment-tree-element-menu-representation-activity-${actionDefId}`,
    );
    await expect(entry).toBeVisible();
    await expect(entry).toHaveText('Activity');
  });
});
