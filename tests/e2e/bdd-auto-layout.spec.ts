import { expect, test, type Locator, type Page } from '@playwright/test';

async function addBlock(page: Page): Promise<Locator> {
  const before = page.locator('[data-testid^="bdd-block-"][data-element-id]');
  const beforeCount = await before.count();
  await page.getByTestId('toolbar-add-block').click();
  await expect(before).toHaveCount(beforeCount + 1);
  return page.locator('[data-testid^="bdd-block-"][data-element-id]').nth(beforeCount);
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

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function blockLocator(page: Page, id: string): Locator {
  // `data-element-id` is also stamped on the inspector container when the
  // block is selected, so always scope by the BDD-block test id to stay unique.
  return page.locator(`[data-testid="bdd-block-${id}"]`);
}

async function rectsByElementId(page: Page, ids: readonly string[]): Promise<Rect[]> {
  const rects: Rect[] = [];
  for (const id of ids) {
    const box = await blockLocator(page, id).boundingBox();
    if (!box) throw new Error(`block ${id} has no bounding box`);
    rects.push(box);
  }
  return rects;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

test.describe('BDD auto-layout (issue #34)', () => {
  test('Auto-layout button rearranges blocks so none overlap, and undo restores prior positions', async ({
    page,
  }) => {
    await page.goto('/');
    const a = await addBlock(page);
    const aId = (await a.getAttribute('data-element-id'))!;
    const b = await addBlock(page);
    const bId = (await b.getAttribute('data-element-id'))!;
    const c = await addBlock(page);
    const cId = (await c.getAttribute('data-element-id'))!;
    const ids: readonly string[] = [aId, bId, cId];

    await dragEdge(page, a, b);
    await page.getByTestId('edge-kind-Composition').click();
    await dragEdge(page, a, c);
    await page.getByTestId('edge-kind-Composition').click();

    const beforeRects = await rectsByElementId(page, ids);

    await page.getByTestId('toolbar-auto-layout').click();
    await expect
      .poll(async () => {
        const rects = await rectsByElementId(page, ids);
        return rects.every(
          (r, i) => r.x !== beforeRects[i]!.x || r.y !== beforeRects[i]!.y,
        );
      })
      .toBe(true);

    const laidOut = await rectsByElementId(page, ids);
    for (let i = 0; i < laidOut.length; i += 1) {
      for (let j = i + 1; j < laidOut.length; j += 1) {
        expect(rectsOverlap(laidOut[i]!, laidOut[j]!)).toBe(false);
      }
    }

    // Undo the auto-layout: every block returns to where it was before the layout.
    await page.keyboard.press('Meta+z');
    await page.keyboard.press('Control+z');
    await expect
      .poll(async () => {
        const rects = await rectsByElementId(page, ids);
        return rects.every((r, i) => {
          const before = beforeRects[i]!;
          return Math.abs(r.x - before.x) < 2 && Math.abs(r.y - before.y) < 2;
        });
      })
      .toBe(true);
  });

  test('Dragging a block after auto-layout persists across a page refresh', async ({
    page,
  }) => {
    await page.goto('/');
    const a = await addBlock(page);
    const aId = await a.getAttribute('data-element-id');
    if (!aId) throw new Error('block A has no data-element-id');
    const b = await addBlock(page);
    await dragEdge(page, a, b);
    await page.getByTestId('edge-kind-Composition').click();

    await page.getByTestId('toolbar-auto-layout').click();
    // Move block A (tracked by id, not by DOM order) to a deterministic spot
    // safely inside the canvas (avoid the right pane / toolbar).
    const blockA = blockLocator(page, aId);
    await expect(blockA).toBeVisible();
    await placeBlockAt(page, blockA, 180, 220);

    const draggedRect = await blockA.boundingBox();
    if (!draggedRect) throw new Error('dragged block has no bounding box');

    await page.reload();

    const reloadedA = blockLocator(page, aId);
    await expect(reloadedA).toBeVisible();
    const reloadedRect = await reloadedA.boundingBox();
    if (!reloadedRect) throw new Error('reloaded block has no bounding box');

    // The dragged position should round-trip through the repository within
    // a few pixels (allowing for React Flow's pan/viewport reset).
    expect(Math.abs(reloadedRect.x - draggedRect.x)).toBeLessThan(4);
    expect(Math.abs(reloadedRect.y - draggedRect.y)).toBeLessThan(4);
  });

  test('@visual bdd-three-blocks-autolayout baseline', async ({ page }) => {
    await page.goto('/');
    const a = await addBlock(page);
    const b = await addBlock(page);
    const c = await addBlock(page);
    await dragEdge(page, a, b);
    await page.getByTestId('edge-kind-Composition').click();
    await dragEdge(page, a, c);
    await page.getByTestId('edge-kind-Composition').click();

    await page.getByTestId('toolbar-auto-layout').click();
    // Deselect by clicking blank canvas area
    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    if (paneBox) {
      await page.mouse.click(paneBox.x + paneBox.width - 80, paneBox.y + 40);
    }
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('bdd-three-blocks-autolayout.png', {
      fullPage: false,
    });
  });
});
