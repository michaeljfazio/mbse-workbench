import { expect, test, type Locator, type Page } from '@playwright/test';

// Issue #430 — expand BDD edge taxonomy to 5 kinds (Composition, Aggregation,
// Generalization, Association, Dependency). Each kind's popover entry,
// resulting `[data-edge-kind="X"]` element, and (where applicable) the SVG
// marker on the path are exercised here.

async function addBlock(page: Page): Promise<Locator> {
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
  // Deterministic absolute placement on the flow canvas. The label button
  // carries `nodrag`, so grab from the stereotype area in the top 16 px of
  // the block. The flow viewport starts at identity transform on first load,
  // so canvas-relative pixels equal flow coords.
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

async function setupTwoBlocks(page: Page): Promise<{ a: Locator; b: Locator }> {
  // Walk-11 pre-drag pattern (#430): two blocks placed far enough apart that
  // A's bottom handle and B's top handle don't overlap on the cascade grid.
  // Auto-layout would also work here but the deterministic placement keeps
  // the test stable across rank-spacing tweaks.
  await page.goto('/');
  const a = await addBlock(page);
  const b = await addBlock(page);
  await placeBlockAt(page, a, 80, 80);
  await placeBlockAt(page, b, 360, 280);
  return { a, b };
}

const KINDS = [
  {
    kind: 'Composition',
    markerSelector: 'marker[id^="bdd-composition-diamond-"] path',
  },
  {
    kind: 'Aggregation',
    markerSelector: 'marker[id^="bdd-aggregation-diamond-"] path',
  },
  {
    kind: 'Generalization',
    markerSelector: 'marker[id^="bdd-generalization-triangle-"] path',
  },
  {
    kind: 'Association',
    markerSelector: null, // plain line — no marker
  },
  {
    kind: 'Dependency',
    markerSelector: 'marker[id^="bdd-dependency-arrow-"] path',
  },
] as const;

test.describe('BDD edge taxonomy (issue #430) — all 5 SysML BDD edge kinds', () => {
  test('Edge-kind popover surfaces all 5 kinds after dragging between two blocks', async ({
    page,
  }) => {
    const { a, b } = await setupTwoBlocks(page);
    await dragEdge(page, a, b);

    const popover = page.getByTestId('edge-kind-popover');
    await expect(popover).toBeVisible();
    for (const { kind } of KINDS) {
      await expect(page.getByTestId(`edge-kind-${kind}`)).toBeVisible();
    }
  });

  for (const { kind, markerSelector } of KINDS) {
    test(`drag-create a ${kind} edge renders [data-edge-kind="${kind}"]${
      markerSelector ? ' with its SVG marker' : ' as a plain line'
    }`, async ({ page }) => {
      const { a, b } = await setupTwoBlocks(page);
      await dragEdge(page, a, b);

      const popover = page.getByTestId('edge-kind-popover');
      await expect(popover).toBeVisible();
      await page.getByTestId(`edge-kind-${kind}`).click();
      await expect(popover).toBeHidden();

      const edge = page.locator(`[data-edge-kind="${kind}"]`);
      await expect(edge).toBeVisible();

      if (markerSelector) {
        const marker = edge.locator(markerSelector);
        await expect(marker).toHaveCount(1);
      } else {
        // Association has no marker. Verify the path is rendered.
        const path = edge.locator('path.react-flow__edge-path');
        await expect(path).toHaveCount(1);
      }
    });
  }
});
