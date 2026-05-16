/**
 * E2E tests — BDD block resize handles (issue #374).
 *
 * Verifies:
 * 1. Resize handles (.react-flow__resize-control) appear when a block is
 *    selected and disappear when it is deselected.
 * 2. Dragging a corner handle grows the node's bounding box.
 * 3. The new size persists after a page reload.
 * 4. @a11y — no serious/critical axe violations with the resize handle visible.
 * 5. @visual — selected-state baseline captures the resize handles.
 *
 * Refs #374
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function addBlock(page: Page): Promise<Locator> {
  const before = page.locator('[data-testid^="bdd-block-"][data-element-id]');
  const beforeCount = await before.count();
  await page.getByTestId('toolbar-add-block').click();
  await expect(before).toHaveCount(beforeCount + 1);
  return page.locator('[data-testid^="bdd-block-"][data-element-id]').nth(beforeCount);
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

async function clickBlock(page: Page, block: Locator): Promise<void> {
  const blockBox = await block.boundingBox();
  if (!blockBox) throw new Error('block bounding box missing');
  await page.mouse.click(
    blockBox.x + blockBox.width / 2,
    blockBox.y + 10,
  );
}

async function clickCanvas(page: Page): Promise<void> {
  const pane = page.locator('.react-flow__pane');
  const paneBox = await pane.boundingBox();
  if (!paneBox) throw new Error('pane not found');
  await page.mouse.click(paneBox.x + paneBox.width - 60, paneBox.y + 30);
}

test.describe('BDD block resize handles (issue #374)', () => {
  test('resize handles appear on selection and hide on deselection', async ({
    page,
  }) => {
    await page.goto('/');
    const block = await addBlock(page);
    await placeBlockAt(page, block, 200, 140);

    // Deselect (the drag may have left the block selected)
    await clickCanvas(page);

    // No resize controls visible when deselected
    const handles = page.locator('.react-flow__resize-control');
    await expect(handles).toHaveCount(0);

    // Click to select → handles appear (4 corner + 4 edge = 8 total)
    await clickBlock(page, block);
    await expect(handles.first()).toBeVisible();
    await expect(handles).toHaveCount(8);

    // Deselect by clicking empty canvas → handles disappear
    await clickCanvas(page);
    await expect(handles).toHaveCount(0);
  });

  test('dragging corner handle enlarges the block bounding box', async ({
    page,
  }) => {
    await page.goto('/');
    const block = await addBlock(page);
    await placeBlockAt(page, block, 150, 120);

    // Select the block to reveal resize handles
    await clickBlock(page, block);

    const handles = page.locator('.react-flow__resize-control');
    await expect(handles.first()).toBeVisible();

    const blockBoxBefore = await block.boundingBox();
    if (!blockBoxBefore) throw new Error('block bounding box missing before');

    // Grab the bottom-right corner handle (last handle in DOM order)
    const handleCount = await handles.count();
    const cornerHandle = handles.nth(handleCount - 1);
    const cornerBox = await cornerHandle.boundingBox();
    if (!cornerBox) throw new Error('corner handle bounding box missing');

    const cx = cornerBox.x + cornerBox.width / 2;
    const cy = cornerBox.y + cornerBox.height / 2;

    // Drag 80px right and 60px down
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 20, cy + 20, { steps: 4 });
    await page.mouse.move(cx + 80, cy + 60, { steps: 16 });
    await page.mouse.up();

    // Wait for React Flow to commit the new dimensions to the DOM by
    // polling the block's bounding-box width until it has grown.
    await expect
      .poll(async () => {
        const b = await block.boundingBox();
        return b ? b.width : 0;
      })
      .toBeGreaterThan(blockBoxBefore.width + 50);

    const blockBoxAfter = await block.boundingBox();
    if (!blockBoxAfter) throw new Error('block bounding box missing after');

    expect(blockBoxAfter.width).toBeGreaterThan(blockBoxBefore.width + 50);
    expect(blockBoxAfter.height).toBeGreaterThan(blockBoxBefore.height + 40);
  });

  test('resized block size persists after page reload', async ({ page }) => {
    await page.goto('/');
    const block = await addBlock(page);
    await placeBlockAt(page, block, 150, 120);

    // Select and resize
    await clickBlock(page, block);
    const handles = page.locator('.react-flow__resize-control');
    await expect(handles.first()).toBeVisible();

    const blockBoxBefore = await block.boundingBox();
    if (!blockBoxBefore) throw new Error('block bounding box missing before');

    const handleCount = await handles.count();
    const cornerHandle = handles.nth(handleCount - 1);
    const cornerBox = await cornerHandle.boundingBox();
    if (!cornerBox) throw new Error('corner handle bounding box missing');

    const cx = cornerBox.x + cornerBox.width / 2;
    const cy = cornerBox.y + cornerBox.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 20, cy + 20, { steps: 4 });
    await page.mouse.move(cx + 80, cy + 60, { steps: 16 });
    await page.mouse.up();
    await expect
      .poll(async () => {
        const b = await block.boundingBox();
        return b ? b.width : 0;
      })
      .toBeGreaterThan(blockBoxBefore.width + 50);

    const blockBoxAfterResize = await block.boundingBox();
    if (!blockBoxAfterResize) throw new Error('block bounding box missing after resize');

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // The block should still exist with the enlarged size
    const blockAfterReload = page
      .locator('[data-testid^="bdd-block-"][data-element-id]')
      .first();
    await expect(blockAfterReload).toBeVisible();

    const blockBoxAfterReload = await blockAfterReload.boundingBox();
    if (!blockBoxAfterReload) throw new Error('block bounding box missing after reload');

    // Allow ±5 px tolerance for rendering differences
    expect(blockBoxAfterReload.width).toBeGreaterThan(
      blockBoxBefore.width + 50,
    );
    expect(blockBoxAfterReload.height).toBeGreaterThan(
      blockBoxBefore.height + 40,
    );
  });

  test('@a11y no serious/critical axe violations with resize handles visible', async ({
    page,
  }) => {
    await page.goto('/');
    const block = await addBlock(page);
    await placeBlockAt(page, block, 200, 140);

    // Select block to make resize handles visible
    await clickBlock(page, block);
    const handles = page.locator('.react-flow__resize-control');
    await expect(handles.first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@visual bdd-block-selected-with-resize-handles baseline', async ({
    page,
  }) => {
    await page.goto('/');
    const block = await addBlock(page);
    await placeBlockAt(page, block, 200, 140);

    // Select block to reveal resize handles
    await clickBlock(page, block);
    const handles = page.locator('.react-flow__resize-control');
    await expect(handles.first()).toBeVisible();

    // Move mouse away from controls to avoid hover-state variance
    await page.mouse.move(0, 0);

    await expect(page).toHaveScreenshot(
      'bdd-block-selected-with-resize-handles.png',
      { fullPage: false },
    );
  });
});
