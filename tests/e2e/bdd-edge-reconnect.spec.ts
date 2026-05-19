import { expect, test, type Page } from '@playwright/test';

// Issue #562 — BDD composition endpoint reconnect via React Flow v12
// edgesReconnectable / onReconnect.
//
// Scenario: a BDD with two PartDefinitions (BlockA, BlockB) linked by a
// Composition edge, plus a third (BlockC). The test:
//   (a) selects the edge and drags its source edgeupdater handle to BlockC;
//   (b) verifies the model's sourceId now points at BlockC;
//   (c) reloads and verifies the new endpoint persists;
//   (d) Cmd-Z restores the original sourceId.
//
// Handle type note: BDD blocks have top handle (type="target") and bottom
// handle (type="source"). In ConnectionMode.Strict the source edgeupdater
// must be dropped on a source-typed handle, so we target BlockC's bottom
// handle (.react-flow__handle-bottom) not its top handle.

const SEED_PROJECT_ID = 'p-bdd-edge-reconnect';
const BDD_DIAGRAM_ID = 'd-bdd-reconnect';
const BLOCK_A_ID = 'block-a';
const BLOCK_B_ID = 'block-b';
const BLOCK_C_ID = 'block-c';
const EDGE_ID = 'edge-a-b';

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({
      projectId,
      diagramId,
      blockAId,
      blockBId,
      blockCId,
      edgeId,
    }: {
      projectId: string;
      diagramId: string;
      blockAId: string;
      blockBId: string;
      blockCId: string;
      edgeId: string;
    }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      // Three blocks arranged so source/target handles are clearly separated:
      //   BlockA at (80, 80)   — source of the Composition edge
      //   BlockB at (80, 400)  — original target
      //   BlockC at (500, 80)  — reconnect destination
      // The edgeupdater circle at the source end will be near BlockA's bottom
      // handle; we drag it to BlockC's bottom handle (type="source").
      const rootId = 'root-pkg-reconnect';
      const project = {
        id: projectId,
        name: 'BDD Reconnect Seed',
        createdAt: '2026-05-19T00:00:00.000Z',
        modifiedAt: '2026-05-19T00:00:00.000Z',
        rootId,
        elements: [
          { id: rootId, kind: 'Package', name: 'Root', ownerId: null, ownerRole: 'member', ownerIndex: 0 },
          { id: blockAId, kind: 'PartDefinition', name: 'BlockA', isAbstract: false, ownerId: rootId, ownerRole: 'member', ownerIndex: 0 },
          { id: blockBId, kind: 'PartDefinition', name: 'BlockB', isAbstract: false, ownerId: rootId, ownerRole: 'member', ownerIndex: 1 },
          { id: blockCId, kind: 'PartDefinition', name: 'BlockC', isAbstract: false, ownerId: rootId, ownerRole: 'member', ownerIndex: 2 },
        ],
        edges: [
          {
            id: edgeId,
            kind: 'Composition',
            sourceId: blockAId,
            targetId: blockBId,
          },
        ],
        diagrams: [
          {
            id: diagramId,
            viewpointId: 'bdd',
            name: 'Reconnect Test BDD',
            positions: {
              [blockAId]: { x: 80, y: 80 },
              [blockBId]: { x: 80, y: 400 },
              [blockCId]: { x: 500, y: 80 },
            },
          },
        ],
        history: { undo: [], redo: [] },
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      diagramId: BDD_DIAGRAM_ID,
      blockAId: BLOCK_A_ID,
      blockBId: BLOCK_B_ID,
      blockCId: BLOCK_C_ID,
      edgeId: EDGE_ID,
    },
  );
}

async function gotoBdd(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Reconnect Test BDD' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText('Block Definition Diagram');
  await expect(
    page.locator('[data-testid^="bdd-block-"][data-element-id]'),
  ).toHaveCount(3);
}

async function selectEdge(page: Page, edgeId: string): Promise<void> {
  await page.evaluate((id) => {
    const ws = (window as unknown as {
      __workspaceStore: {
        getState: () => { setSelection: (ids: readonly string[]) => void };
      };
    }).__workspaceStore;
    ws.getState().setSelection([id]);
  }, edgeId);
}

async function getEdgeSourceId(page: Page, edgeId: string): Promise<string | null> {
  return page.evaluate((id) => {
    const ws = (window as unknown as {
      __workspaceStore: {
        getState: () => { edges: ReadonlyArray<{ id: string; sourceId: string; targetId: string }> };
      };
    }).__workspaceStore;
    const state = ws.getState();
    const edge = state.edges.find((e) => e.id === id);
    return edge?.sourceId ?? null;
  }, edgeId);
}

test.describe('BDD edge endpoint reconnect (issue #562)', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
  });

  test('edgeupdater handles appear after selecting a Composition edge', async ({
    page,
  }) => {
    await gotoBdd(page);
    await selectEdge(page, EDGE_ID);

    // The edge updater circles are rendered by React Flow when
    // edgesReconnectable={true} and the edge is selected.
    await expect(
      page.locator('.react-flow__edgeupdater'),
    ).toHaveCount(2);
  });

  test('drag source edgeupdater to BlockC updates sourceId in the model', async ({
    page,
  }) => {
    await gotoBdd(page);
    await selectEdge(page, EDGE_ID);

    await expect(page.locator('.react-flow__edgeupdater')).toHaveCount(2);

    // The edgeupdater for the source handle is the first one (.source).
    const sourceUpdater = page.locator('.react-flow__edgeupdater-source').first();
    const blockCNode = page.locator(`[data-testid="bdd-block-${BLOCK_C_ID}"]`);

    // Target: BlockC bottom handle (type="source") — required by ConnectionMode.Strict
    // when reconnecting a source-typed endpoint.
    const blockCBottomHandle = blockCNode.locator('.react-flow__handle-bottom');

    const updaterBox = await sourceUpdater.boundingBox();
    const targetBox = await blockCBottomHandle.boundingBox();

    if (!updaterBox || !targetBox) {
      throw new Error('Bounding boxes not available');
    }

    const sx = updaterBox.x + updaterBox.width / 2;
    const sy = updaterBox.y + updaterBox.height / 2;
    const tx = targetBox.x + targetBox.width / 2;
    const ty = targetBox.y + targetBox.height / 2;

    // Slowly drag from the source edgeupdater to BlockC's bottom handle.
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 12; i += 1) {
      const t = i / 12;
      await page.mouse.move(sx + (tx - sx) * t, sy + (ty - sy) * t);
    }
    await page.mouse.up();

    // Verify the model reflects the new source.
    const newSourceId = await getEdgeSourceId(page, EDGE_ID);
    expect(newSourceId).toBe(BLOCK_C_ID);
  });

  test('reconnected endpoint persists through save+reload', async ({ page }) => {
    await gotoBdd(page);
    await selectEdge(page, EDGE_ID);

    await expect(page.locator('.react-flow__edgeupdater')).toHaveCount(2);

    const sourceUpdater = page.locator('.react-flow__edgeupdater-source').first();
    const blockCNode = page.locator(`[data-testid="bdd-block-${BLOCK_C_ID}"]`);
    const blockCBottomHandle = blockCNode.locator('.react-flow__handle-bottom');

    const updaterBox = await sourceUpdater.boundingBox();
    const targetBox = await blockCBottomHandle.boundingBox();
    if (!updaterBox || !targetBox) throw new Error('Bounding boxes not available');

    const sx = updaterBox.x + updaterBox.width / 2;
    const sy = updaterBox.y + updaterBox.height / 2;
    const tx = targetBox.x + targetBox.width / 2;
    const ty = targetBox.y + targetBox.height / 2;

    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 12; i += 1) {
      const t = i / 12;
      await page.mouse.move(sx + (tx - sx) * t, sy + (ty - sy) * t);
    }
    await page.mouse.up();

    // Confirm source updated in model before reload.
    expect(await getEdgeSourceId(page, EDGE_ID)).toBe(BLOCK_C_ID);

    // Reload and navigate back.
    await page.reload();
    await page.getByRole('tab', { name: 'Reconnect Test BDD' }).click();
    await expect(
      page.locator('[data-testid^="bdd-block-"][data-element-id]'),
    ).toHaveCount(3);

    // The reconnected endpoint must survive the reload.
    expect(await getEdgeSourceId(page, EDGE_ID)).toBe(BLOCK_C_ID);
  });

  test('Cmd-Z after reconnect restores the original sourceId', async ({ page }) => {
    await gotoBdd(page);
    await selectEdge(page, EDGE_ID);

    await expect(page.locator('.react-flow__edgeupdater')).toHaveCount(2);

    const sourceUpdater = page.locator('.react-flow__edgeupdater-source').first();
    const blockCNode = page.locator(`[data-testid="bdd-block-${BLOCK_C_ID}"]`);
    const blockCBottomHandle = blockCNode.locator('.react-flow__handle-bottom');

    const updaterBox = await sourceUpdater.boundingBox();
    const targetBox = await blockCBottomHandle.boundingBox();
    if (!updaterBox || !targetBox) throw new Error('Bounding boxes not available');

    const sx = updaterBox.x + updaterBox.width / 2;
    const sy = updaterBox.y + updaterBox.height / 2;
    const tx = targetBox.x + targetBox.width / 2;
    const ty = targetBox.y + targetBox.height / 2;

    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 12; i += 1) {
      const t = i / 12;
      await page.mouse.move(sx + (tx - sx) * t, sy + (ty - sy) * t);
    }
    await page.mouse.up();

    // Confirm reconnect happened.
    expect(await getEdgeSourceId(page, EDGE_ID)).toBe(BLOCK_C_ID);

    // Undo via Cmd-Z.
    await page.keyboard.press('Meta+z');

    // The original sourceId (BlockA) must be restored.
    const restoredSourceId = await getEdgeSourceId(page, EDGE_ID);
    expect(restoredSourceId).toBe(BLOCK_A_ID);
  });
});
