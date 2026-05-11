import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function addBlock(page: Page): Promise<Locator> {
  const before = page.locator('[data-testid^="bdd-block-"][data-element-id]');
  const beforeCount = await before.count();
  await page.getByTestId('toolbar-add-block').click();
  await expect(before).toHaveCount(beforeCount + 1);
  return page.locator('[data-testid^="bdd-block-"][data-element-id]').nth(beforeCount);
}

async function dragGroupOntoCanvas(
  page: Page,
  groupTestId: string,
  targetX: number,
  targetY: number,
): Promise<void> {
  const group = page.getByTestId(groupTestId);
  const canvas = page.getByTestId('canvas-drop-target');
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('canvas-drop-target bounding box missing');

  await group.dragTo(canvas, {
    targetPosition: { x: targetX, y: targetY },
  });
}

test.describe('Project tree pane (issue #33)', () => {
  test('drag from Blocks group header creates a new block at the drop point and selects it', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('project-tree-group-PartDefinition')).toBeVisible();

    const beforeBlocks = page.locator('[data-testid^="bdd-block-"][data-element-id]');
    await expect(beforeBlocks).toHaveCount(0);

    await dragGroupOntoCanvas(page, 'project-tree-group-PartDefinition', 250, 180);

    const after = page.locator('[data-testid^="bdd-block-"][data-element-id]');
    await expect(after).toHaveCount(1);

    // The new block was selected by the drop handler.
    const inspectorSingle = page.getByTestId('inspector-single');
    await expect(inspectorSingle).toBeVisible();
    const newId = await after.first().getAttribute('data-element-id');
    if (!newId) throw new Error('new block has no element id');
    await expect(inspectorSingle).toHaveAttribute('data-element-id', newId);
  });

  test('clicking a leaf in the tree selects the corresponding block on the canvas', async ({
    page,
  }) => {
    await page.goto('/');
    await addBlock(page);
    const b = await addBlock(page);
    const bId = await b.getAttribute('data-element-id');
    if (!bId) throw new Error('block has no element id');

    // Two leaves now exist under the Blocks group.
    const leaves = page.locator('[data-testid^="project-tree-leaf-"]');
    await expect(leaves).toHaveCount(2);

    // Deselect canvas first by clicking on empty area.
    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    if (paneBox) {
      await page.mouse.click(paneBox.x + paneBox.width - 80, paneBox.y + paneBox.height - 40);
    }

    // Click block b's tree leaf → it should be selected and reflected in the inspector.
    await page.getByTestId(`project-tree-leaf-${bId}`).click();
    const inspectorSingle = page.getByTestId('inspector-single');
    await expect(inspectorSingle).toHaveAttribute('data-element-id', bId);
  });

  test('arrow keys move focus through visible tree items', async ({ page }) => {
    await page.goto('/');
    await addBlock(page);
    await addBlock(page);

    const group = page.getByTestId('project-tree-group-PartDefinition');
    await group.focus();
    await expect(group).toBeFocused();

    await page.keyboard.press('ArrowDown');
    const firstLeaf = page.locator('[data-testid^="project-tree-leaf-"]').first();
    await expect(firstLeaf).toBeFocused();

    await page.keyboard.press('ArrowDown');
    const secondLeaf = page.locator('[data-testid^="project-tree-leaf-"]').nth(1);
    await expect(secondLeaf).toBeFocused();

    await page.keyboard.press('ArrowUp');
    await expect(firstLeaf).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(group).toBeFocused();

    // ArrowLeft on an expanded group collapses it.
    await page.keyboard.press('ArrowLeft');
    await expect(group).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('ArrowRight');
    await expect(group).toHaveAttribute('aria-expanded', 'true');
  });

  test('@a11y populated tree has no serious or critical violations', async ({ page }) => {
    await page.goto('/');
    await addBlock(page);
    await addBlock(page);
    await expect(page.locator('[data-testid^="project-tree-leaf-"]')).toHaveCount(2);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@visual project tree populated baseline', async ({ page }) => {
    await page.goto('/');
    await addBlock(page);
    await addBlock(page);
    await expect(page.locator('[data-testid^="project-tree-leaf-"]')).toHaveCount(2);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('project-tree-populated.png', { fullPage: false });
  });
});
