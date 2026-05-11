import { expect, test, type Locator, type Page } from '@playwright/test';

async function addBlock(page: Page): Promise<Locator> {
  const blocks = page.locator('[data-testid^="bdd-block-"][data-element-id]');
  const beforeCount = await blocks.count();
  await page.getByTestId('toolbar-add-block').click();
  await expect(blocks).toHaveCount(beforeCount + 1);
  return blocks.nth(beforeCount);
}

async function placeBlockAt(
  page: Page,
  block: Locator,
  x: number,
  y: number,
): Promise<void> {
  const flowPane = page.locator('.react-flow__pane');
  const flowBox = await flowPane.boundingBox();
  if (!flowBox) throw new Error('react-flow pane not found');
  const blockBox = await block.boundingBox();
  if (!blockBox) throw new Error('block bounding box missing');

  const startX = blockBox.x + blockBox.width / 2;
  const startY = blockBox.y + 10;
  const targetX = flowBox.x + x + blockBox.width / 2;
  const targetY = flowBox.y + y + 10;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 4, startY + 4, { steps: 2 });
  await page.mouse.move(targetX, targetY, { steps: 16 });
  await page.mouse.up();
}

async function dragEdge(page: Page, from: Locator, to: Locator): Promise<void> {
  const sourceHandle = from.locator('.react-flow__handle-bottom');
  const targetHandle = to.locator('.react-flow__handle-top');
  const sourceBox = await sourceHandle.boundingBox();
  const targetBox = await targetHandle.boundingBox();
  if (!sourceBox || !targetBox) throw new Error('handle bounding boxes missing');

  const sx = sourceBox.x + sourceBox.width / 2;
  const sy = sourceBox.y + sourceBox.height / 2;
  const tx = targetBox.x + targetBox.width / 2;
  const ty = targetBox.y + targetBox.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 8, sy + 8, { steps: 4 });
  await page.mouse.move(tx, ty, { steps: 20 });
  await page.mouse.up();
}

test.describe('Phase 2 gate (issue #36)', () => {
  test('full slice: shell → create → link → reload → undo → redo → export PNG', async ({
    page,
    browserName,
  }) => {
    await page.goto('/');

    // 1. Three-pane shell visible. BDD tab default.
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();
    await expect(page.getByRole('tree', { name: 'Project tree' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Canvas' })).toBeVisible();
    await expect(
      page.getByRole('complementary', { name: 'Inspector and chat' }),
    ).toBeVisible();
    const activeTab = page
      .getByRole('tablist', { name: 'Diagram tabs' })
      .getByRole('tab', { selected: true });
    await expect(activeTab).toHaveText(/Main BDD/);

    // 2. Toolbar "+ Block" twice → two BlockNodes appear.
    const blockA = await addBlock(page);
    const blockB = await addBlock(page);
    const blocks = page.locator('[data-testid^="bdd-block-"][data-element-id]');
    await expect(blocks).toHaveCount(2);
    await expect(blockA).toContainText('Block 1');
    await expect(blockB).toContainText('Block 2');

    // Cascade them so handles are reachable for the edge drag.
    await placeBlockAt(page, blockA, 80, 80);
    await placeBlockAt(page, blockB, 360, 280);

    // 3. Drag from A to B with real mouse events → Composition popover → assert edge.
    await dragEdge(page, blockA, blockB);
    const popover = page.getByTestId('edge-kind-popover');
    await expect(popover).toBeVisible();
    await page.getByTestId('edge-kind-Composition').click();
    await expect(popover).toBeHidden();

    const compositionEdge = page.locator('[data-edge-kind="Composition"]');
    await expect(compositionEdge).toBeVisible();
    await expect(
      compositionEdge.locator('marker[id^="bdd-composition-diamond-"] path'),
    ).toHaveCount(1);

    // 4. Reload — both blocks and the composition edge persist.
    await page.reload();
    await expect(
      page.locator('[data-testid^="bdd-block-"][data-element-id]'),
    ).toHaveCount(2);
    await expect(page.locator('[data-edge-kind="Composition"]')).toHaveCount(1);

    // 5. Cmd-Z (or Control-Z) → composition edge disappears.
    // Click an empty area of the canvas so no input has focus before pressing the shortcut.
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });

    const modifier = browserName === 'webkit' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyZ`);
    await expect(page.locator('[data-edge-kind="Composition"]')).toHaveCount(0);

    // 6. Cmd-Shift-Z → composition edge reappears.
    await page.keyboard.press(`${modifier}+Shift+KeyZ`);
    await expect(page.locator('[data-edge-kind="Composition"]')).toHaveCount(1);

    // 7. Export PNG → intercept download → assert signature + non-trivial size.
    await page.getByTestId('toolbar-export').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('toolbar-export-png').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.png$/);
    const tmpPath = await download.path();
    expect(tmpPath).not.toBeNull();
    const fs = await import('node:fs');
    const bytes = await fs.promises.readFile(tmpPath!);
    expect(bytes.length).toBeGreaterThan(2_048);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x4e);
    expect(bytes[3]).toBe(0x47);
  });
});
