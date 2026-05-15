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

test.describe('Containment-tree drag-drop move (T-13.36b)', () => {
  test('drag a PortDefinition row onto a PartDefinition row nests it under the part and survives reload', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('containment-tree')).toBeVisible();

    const rootId = await getRootId(page);
    const partId = await createChildAndRename(
      page,
      rootId,
      'PartDefinition',
      'member',
      'Pump',
    );
    const portId = await createChildAndRename(
      page,
      rootId,
      'PortDefinition',
      'member',
      'Port1',
    );

    // Before drag: both authored elements sit at depth 1 directly under root.
    await expect(
      page.getByTestId(`containment-tree-element-${partId}`),
    ).toHaveAttribute('data-depth', '1');
    await expect(
      page.getByTestId(`containment-tree-element-${portId}`),
    ).toHaveAttribute('data-depth', '1');

    // Drag the Port row onto the Part row.
    await page
      .getByTestId(`containment-tree-element-${portId}`)
      .dragTo(page.getByTestId(`containment-tree-element-${partId}`));

    // After drag: Port nests under Part (depth 2).
    await expect(
      page.getByTestId(`containment-tree-element-${portId}`),
    ).toHaveAttribute('data-depth', '2');

    // Persistence: reload and verify the move was saved.
    await page.reload();
    await expect(page.getByTestId('containment-tree')).toBeVisible();
    await expect(
      page.getByTestId(`containment-tree-element-${portId}`),
    ).toHaveAttribute('data-depth', '2');
  });
});
