import { expect, test, type Locator, type Page } from '@playwright/test';

async function addBlock(page: Page): Promise<Locator> {
  // ADR 0015 step 3 (#376): `toolbar-add-block` retired. Palette drag is
  // now the canonical creation path.
  const before = page.locator('[data-testid^="bdd-block-"][data-element-id]');
  const beforeCount = await before.count();
  const group = page.getByTestId('project-tree-group-PartDefinition');
  const canvas = page.getByTestId('canvas-drop-target');
  const xOffset = 180 + (beforeCount % 2) * 260;
  const yOffset = 160 + Math.floor(beforeCount / 2) * 280;
  await group.dragTo(canvas, {
    targetPosition: { x: xOffset, y: yOffset },
  });
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

async function setupTwoLinkedBlocks(page: Page): Promise<void> {
  await page.goto('/');
  const a = await addBlock(page);
  const b = await addBlock(page);
  await placeBlockAt(page, a, 80, 80);
  await placeBlockAt(page, b, 360, 280);
  await dragEdge(page, a, b);
  await page.getByTestId('edge-kind-Composition').click();
  await expect(page.locator('[data-edge-kind="Composition"]')).toBeVisible();
}

test.describe('BDD export (issue #35)', () => {
  test('Export menu is disabled until at least one element is on the canvas', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('toolbar-export')).toBeDisabled();
    await addBlock(page);
    await expect(page.getByTestId('toolbar-export')).toBeEnabled();
  });

  test('Export PNG downloads a valid PNG of non-trivial size', async ({ page }) => {
    await setupTwoLinkedBlocks(page);
    await page.getByTestId('toolbar-export').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('toolbar-export-png').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^main-bdd\.png$/);
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

  test('Export SVG downloads a well-formed XML document with two nodes and one edge', async ({
    page,
  }) => {
    await setupTwoLinkedBlocks(page);
    await page.getByTestId('toolbar-export').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('toolbar-export-svg').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^main-bdd\.svg$/);
    const tmpPath = await download.path();
    expect(tmpPath).not.toBeNull();
    const fs = await import('node:fs');
    const xml = await fs.promises.readFile(tmpPath!, 'utf-8');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"')).toBe(true);

    const parsed = await page.evaluate((svgText) => {
      const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      return {
        parseError: doc.querySelector('parsererror') !== null,
        nodeCount: doc.getElementsByClassName('mbse-node').length,
        edgeCount: doc.getElementsByClassName('mbse-edge').length,
        rootName: doc.documentElement.nodeName,
      };
    }, xml);
    expect(parsed.parseError).toBe(false);
    expect(parsed.rootName).toBe('svg');
    expect(parsed.nodeCount).toBe(2);
    expect(parsed.edgeCount).toBe(1);
  });

  test('Export menu closes after a selection is made', async ({ page }) => {
    await setupTwoLinkedBlocks(page);
    await page.getByTestId('toolbar-export').click();
    await expect(page.getByTestId('toolbar-export-menu')).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('toolbar-export-svg').click(),
    ]);
    await download.path();
    await expect(page.getByTestId('toolbar-export-menu')).toBeHidden();
  });
});
