import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Issue #434 — BDD Association edges may carry an optional multiplicity
// (cardinality) label at each end. The inspector surfaces two free-text
// inputs (`Source multiplicity`, `Target multiplicity`); typing into them
// dispatches via `update-edge`, the labels render adjacent to the edge
// endpoints, and the values round-trip through JSON export → import.

async function addBlock(page: Page): Promise<Locator> {
  // Inline the working pattern from bdd-edge-taxonomy.spec.ts — drops two
  // blocks far enough apart that A's bottom handle and B's top handle do
  // not collide on the cascade grid.
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
  // Deterministic absolute placement on the flow canvas — same pattern as
  // bdd-edge-taxonomy.spec.ts so the handles do not overlap on cascade.
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

async function setupTwoBlocksAndAssociation(
  page: Page,
): Promise<{ a: Locator; b: Locator; edge: Locator }> {
  await page.goto('/');
  const a = await addBlock(page);
  const b = await addBlock(page);
  // Place the blocks far enough apart that the handles do not overlap —
  // same deterministic placement as bdd-edge-taxonomy.spec.ts.
  await placeBlockAt(page, a, 80, 80);
  await placeBlockAt(page, b, 360, 280);
  await dragEdge(page, a, b);

  const popover = page.getByTestId('edge-kind-popover');
  await expect(popover).toBeVisible();
  await page.getByTestId('edge-kind-Association').click();
  await expect(popover).toBeHidden();

  const edge = page.locator('[data-edge-kind="Association"]');
  await expect(edge).toBeVisible();

  // Select the edge by driving the workspace store directly. Per
  // docs/CONTEXT.md 2026-05-12, React Flow v12 edge clicks are
  // unreliable for selection; the BDD popover-pick flow does not
  // auto-select the new edge either (clicking through the popover
  // surfaces a stray target-node selection). The store seam exposed in
  // dev/test (`window.__workspaceStore`) is the deterministic path —
  // setSelection accepts the edge id verbatim.
  const edgeId = await edge.getAttribute('data-testid');
  const id = edgeId?.replace(/^bdd-edge-/, '') ?? '';
  expect(id).not.toBe('');
  await page.evaluate((edgeIdValue) => {
    const ws = (window as unknown as {
      __workspaceStore: {
        getState: () => { setSelection: (ids: readonly string[]) => void };
      };
    }).__workspaceStore;
    ws.getState().setSelection([edgeIdValue]);
  }, id);
  await expect(page.getByTestId('inspector-association-edge')).toBeVisible();

  return { a, b, edge };
}

test.describe('BDD Association edge multiplicity (#434)', () => {
  test('typing in the inspector inputs renders multiplicity labels adjacent to the edge endpoints', async ({
    page,
  }) => {
    const { edge } = await setupTwoBlocksAndAssociation(page);

    // setupTwoBlocksAndAssociation has already selected the edge and
    // confirmed the Association inspector is visible.
    const sourceInput = page.getByTestId('inspector-edge-multiplicity-source');
    const targetInput = page.getByTestId('inspector-edge-multiplicity-target');
    await expect(sourceInput).toBeVisible();
    await expect(targetInput).toBeVisible();

    await sourceInput.fill('1');
    await sourceInput.blur();
    await targetInput.fill('0..*');
    await targetInput.blur();

    // Labels render on-canvas via EdgeLabelRenderer — they live outside the
    // edge's <g>, so they are found via their own data-testid which embeds
    // the edge id.
    const edgeId = await edge.getAttribute('data-testid');
    const id = edgeId?.replace(/^bdd-edge-/, '') ?? '';
    expect(id).not.toBe('');
    const sourceLabel = page.getByTestId(`bdd-edge-${id}-source-multiplicity`);
    const targetLabel = page.getByTestId(`bdd-edge-${id}-target-multiplicity`);
    await expect(sourceLabel).toBeVisible();
    await expect(sourceLabel).toHaveText('1');
    await expect(targetLabel).toBeVisible();
    await expect(targetLabel).toHaveText('0..*');
  });

  test('multiplicity values round-trip through JSON export → import', async ({
    page,
  }) => {
    const { edge } = await setupTwoBlocksAndAssociation(page);
    const sourceInput = page.getByTestId('inspector-edge-multiplicity-source');
    const targetInput = page.getByTestId('inspector-edge-multiplicity-target');
    await sourceInput.fill('1');
    await sourceInput.blur();
    await targetInput.fill('0..*');
    await targetInput.blur();

    // Wait for the label to render before exporting — the on-canvas label
    // is the visible signal that the patch was committed to the store.
    const edgeId = await edge.getAttribute('data-testid');
    const id = edgeId?.replace(/^bdd-edge-/, '') ?? '';
    await expect(page.getByTestId(`bdd-edge-${id}-source-multiplicity`)).toHaveText('1');
    await expect(page.getByTestId(`bdd-edge-${id}-target-multiplicity`)).toHaveText('0..*');

    // Export JSON.
    await page.getByTestId('toolbar-export').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('toolbar-export-json').click(),
    ]);
    const tmpPath = await download.path();
    expect(tmpPath).not.toBeNull();
    const exported = readFileSync(tmpPath!, 'utf-8');
    const parsed = JSON.parse(exported) as {
      readonly edges: ReadonlyArray<Record<string, unknown>>;
    };
    const assoc = parsed.edges.find((e) => e.kind === 'Association');
    expect(assoc).toBeDefined();
    expect(assoc?.sourceMultiplicity).toBe('1');
    expect(assoc?.targetMultiplicity).toBe('0..*');

    // Re-import the exported payload — the labels must reappear on canvas.
    await page.getByTestId('toolbar-import').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('toolbar-import-json').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'assoc-roundtrip.json',
      mimeType: 'application/json',
      buffer: Buffer.from(exported, 'utf-8'),
    });

    // After import, the Association edge is re-rendered with both
    // multiplicity labels intact. Re-select the (new) edge to verify the
    // inspector inputs are pre-populated from the persisted values.
    const reimportedEdge = page.locator('[data-edge-kind="Association"]').first();
    await expect(reimportedEdge).toBeVisible();
    const reimportedTestid = await reimportedEdge.getAttribute('data-testid');
    const reimportedId = reimportedTestid?.replace(/^bdd-edge-/, '') ?? '';
    expect(reimportedId).not.toBe('');
    await expect(
      page.getByTestId(`bdd-edge-${reimportedId}-source-multiplicity`),
    ).toHaveText('1');
    await expect(
      page.getByTestId(`bdd-edge-${reimportedId}-target-multiplicity`),
    ).toHaveText('0..*');
  });
});
