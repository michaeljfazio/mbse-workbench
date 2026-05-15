import { expect, test, type Page } from '@playwright/test';

async function getRootId(page: Page): Promise<string> {
  const root = page
    .locator('[data-testid^="containment-tree-element-"][data-depth="0"]')
    .first();
  await expect(root).toBeVisible();
  const tid = await root.getAttribute('data-testid');
  if (!tid) throw new Error('root element row missing testid');
  return tid.replace('containment-tree-element-', '');
}

async function createChildAndRename(
  page: Page,
  ownerId: string,
  kind: string,
  ownerRole: string,
  name: string,
): Promise<string> {
  await page
    .getByTestId(`containment-tree-element-menu-trigger-${ownerId}`)
    .click();
  await page
    .getByTestId(`containment-tree-element-menu-create-child-${ownerId}`)
    .click();
  await page
    .getByTestId(
      `containment-tree-element-menu-create-${kind}-${ownerRole}-${ownerId}`,
    )
    .click();
  const renameInput = page
    .locator('input[data-testid^="containment-tree-element-rename-"]')
    .first();
  await expect(renameInput).toBeVisible();
  const tid = await renameInput.getAttribute('data-testid');
  if (!tid) throw new Error('rename input missing testid');
  const newId = tid.replace('containment-tree-element-rename-', '');
  await renameInput.fill(name);
  await renameInput.press('Enter');
  await expect(
    page.locator(`input[data-testid="containment-tree-element-rename-${newId}"]`),
  ).toHaveCount(0);
  return newId;
}

test.describe('Containment-tree row menu: Duplicate + Move (T-13.33e-b)', () => {
  test('Duplicate clones the element and queues rename; Move reparents into a Package; both survive reload', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('containment-tree')).toBeVisible();

    const rootId = await getRootId(page);

    // Create a child Package "Sub" under root — this will be the move target.
    const subId = await createChildAndRename(
      page,
      rootId,
      'Package',
      'member',
      'Sub',
    );

    // Create a PartDefinition "Pump" under root — the element to duplicate.
    const pumpId = await createChildAndRename(
      page,
      rootId,
      'PartDefinition',
      'member',
      'Pump',
    );

    // Duplicate Pump via the row menu.
    await page
      .getByTestId(`containment-tree-element-menu-trigger-${pumpId}`)
      .click();
    await page
      .getByTestId(`containment-tree-element-menu-duplicate-${pumpId}`)
      .click();

    // A rename input should appear on the clone (a fresh element id, not pumpId).
    const cloneRename = page
      .locator(
        `input[data-testid^="containment-tree-element-rename-"]:not([data-testid="containment-tree-element-rename-${pumpId}"])`,
      )
      .first();
    await expect(cloneRename).toBeVisible();
    await expect(cloneRename).toBeFocused();
    const cloneTid = await cloneRename.getAttribute('data-testid');
    if (!cloneTid) throw new Error('clone rename input missing testid');
    const cloneId = cloneTid.replace('containment-tree-element-rename-', '');
    expect(cloneId).not.toBe(pumpId);

    // The clone's default name should be "Pump copy"; commit a new name.
    await expect(cloneRename).toHaveValue('Pump copy');
    await cloneRename.fill('Vessel');
    await cloneRename.press('Enter');
    await expect(
      page.locator(
        `input[data-testid="containment-tree-element-rename-${cloneId}"]`,
      ),
    ).toHaveCount(0);

    // Move the clone (Vessel) into "Sub" via the row menu.
    await page
      .getByTestId(`containment-tree-element-menu-trigger-${cloneId}`)
      .click();
    await page
      .getByTestId(`containment-tree-element-menu-move-to-package-${cloneId}`)
      .click();
    await page
      .getByTestId(
        `containment-tree-element-menu-move-to-${subId}-${cloneId}`,
      )
      .click();

    // After the move, Vessel nests under Sub (depth 2 under root at depth 0).
    await expect(
      page.getByTestId(`containment-tree-element-${cloneId}`),
    ).toHaveAttribute('data-depth', '2');

    // Reload and verify persistence.
    await page.reload();
    await expect(page.getByTestId('containment-tree')).toBeVisible();
    await expect(
      page.getByTestId(`containment-tree-element-${cloneId}`),
    ).toHaveAttribute('data-depth', '2');
    // The original Pump remained at depth 1 under root.
    await expect(
      page.getByTestId(`containment-tree-element-${pumpId}`),
    ).toHaveAttribute('data-depth', '1');
  });
});
