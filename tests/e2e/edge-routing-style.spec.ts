import { expect, test, type Page } from '@playwright/test';

// Issue #564 — Per-edge routing-style picker (straight / step / smooth-step /
// bezier) surfaced in the Inspector.
//
// Scenario: a BDD with two PartDefinitions linked by a Composition edge.
// The test:
//   (a) selects the edge and opens the Inspector;
//   (b) verifies the default routing style (smooth-step) is reflected as
//       aria-pressed="true" on the segmented control;
//   (c) clicks "Straight" → verifies the model field is set to 'straight';
//   (d) reloads and verifies the value persists;
//   (e) Cmd-Z restores the original value (undefined → default).
//
// @a11y

const SEED_PROJECT_ID = 'p-edge-routing-style';
const BDD_DIAGRAM_ID = 'd-routing-style';
const BLOCK_A_ID = 'rts-block-a';
const BLOCK_B_ID = 'rts-block-b';
const EDGE_ID = 'rts-edge-ab';

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({
      projectId,
      diagramId,
      blockAId,
      blockBId,
      edgeId,
    }: {
      projectId: string;
      diagramId: string;
      blockAId: string;
      blockBId: string;
      edgeId: string;
    }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const rootId = 'rts-root-pkg';
      const project = {
        id: projectId,
        name: 'Routing Style Seed',
        createdAt: '2026-05-19T00:00:00.000Z',
        modifiedAt: '2026-05-19T00:00:00.000Z',
        rootId,
        elements: [
          { id: rootId, kind: 'Package', name: 'Root', ownerId: null, ownerRole: 'member', ownerIndex: 0 },
          { id: blockAId, kind: 'PartDefinition', name: 'BlockA', isAbstract: false, ownerId: rootId, ownerRole: 'member', ownerIndex: 0 },
          { id: blockBId, kind: 'PartDefinition', name: 'BlockB', isAbstract: false, ownerId: rootId, ownerRole: 'member', ownerIndex: 1 },
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
            name: 'Routing Style BDD',
            positions: {
              [blockAId]: { x: 80, y: 80 },
              [blockBId]: { x: 80, y: 380 },
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
      edgeId: EDGE_ID,
    },
  );
}

async function gotoCanvas(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Routing Style BDD' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText('Block Definition Diagram');
  await expect(
    page.locator('[data-testid^="bdd-block-"][data-element-id]'),
  ).toHaveCount(2);
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

async function getEdgeRoutingStyle(page: Page, edgeId: string): Promise<string | undefined> {
  return page.evaluate((id) => {
    const ws = (window as unknown as {
      __workspaceStore: {
        getState: () => { edges: ReadonlyArray<{ id: string; routingStyle?: string }> };
      };
    }).__workspaceStore;
    const state = ws.getState();
    const edge = state.edges.find((e) => e.id === id);
    return edge?.routingStyle;
  }, edgeId);
}

test.describe('per-edge routing style inspector (issue #564) @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
  });

  test('default routing style is shown as active in the inspector segmented control', async ({
    page,
  }) => {
    await gotoCanvas(page);
    await selectEdge(page, EDGE_ID);

    const control = page.getByTestId('edge-routing-style');
    await expect(control).toBeVisible();

    // bdd-composition default is smooth-step
    const smoothBtn = page.getByTestId('edge-routing-style-smooth-step');
    await expect(smoothBtn).toHaveAttribute('aria-pressed', 'true');

    // Others are inactive
    await expect(page.getByTestId('edge-routing-style-straight')).toHaveAttribute('aria-pressed', 'false');
  });

  test('clicking Straight sets routingStyle to straight in the model', async ({
    page,
  }) => {
    await gotoCanvas(page);
    await selectEdge(page, EDGE_ID);

    await expect(page.getByTestId('edge-routing-style')).toBeVisible();
    await page.getByTestId('edge-routing-style-straight').click();

    const value = await getEdgeRoutingStyle(page, EDGE_ID);
    expect(value).toBe('straight');

    // The button should now show as active
    await expect(page.getByTestId('edge-routing-style-straight')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('edge-routing-style-smooth-step')).toHaveAttribute('aria-pressed', 'false');
  });

  test('routing style persists through save+reload', async ({ page }) => {
    await gotoCanvas(page);
    await selectEdge(page, EDGE_ID);

    await expect(page.getByTestId('edge-routing-style')).toBeVisible();
    await page.getByTestId('edge-routing-style-straight').click();
    expect(await getEdgeRoutingStyle(page, EDGE_ID)).toBe('straight');

    // Reload and navigate back
    await page.reload();
    await page.getByRole('tab', { name: 'Routing Style BDD' }).click();
    await expect(
      page.locator('[data-testid^="bdd-block-"][data-element-id]'),
    ).toHaveCount(2);

    expect(await getEdgeRoutingStyle(page, EDGE_ID)).toBe('straight');
  });

  test('Cmd-Z after setting routing style restores undefined (kind default)', async ({
    page,
  }) => {
    await gotoCanvas(page);
    await selectEdge(page, EDGE_ID);

    await expect(page.getByTestId('edge-routing-style')).toBeVisible();
    await page.getByTestId('edge-routing-style-straight').click();
    expect(await getEdgeRoutingStyle(page, EDGE_ID)).toBe('straight');

    await page.keyboard.press('Meta+z');

    const value = await getEdgeRoutingStyle(page, EDGE_ID);
    expect(value).toBeUndefined();
  });

  test('@visual bdd-composition-straight routing style baseline', async ({
    page,
  }) => {
    await gotoCanvas(page);
    await selectEdge(page, EDGE_ID);

    await expect(page.getByTestId('edge-routing-style')).toBeVisible();
    await page.getByTestId('edge-routing-style-straight').click();
    expect(await getEdgeRoutingStyle(page, EDGE_ID)).toBe('straight');

    // Deselect to get a clean canvas view
    await page.keyboard.press('Escape');
    await page.mouse.move(0, 0);

    const canvasLocator = page.locator('.react-flow__viewport');
    await expect(canvasLocator).toHaveScreenshot('bdd-composition-straight.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});
