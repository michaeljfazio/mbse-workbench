import { expect, test, type Page } from '@playwright/test';

// Issue #566 — Per-edge stroke-style (solid / dashed / dotted) and stroke
// color picker surfaced in the Inspector.
//
// Scenario: a BDD with two PartDefinitions linked by a Composition edge.
// The test:
//   (a) selects the edge and opens the Inspector;
//   (b) verifies the default stroke style (solid) is reflected as
//       aria-pressed="true" on the segmented control;
//   (c) clicks "Dashed" → verifies the model field is set to 'dashed';
//   (d) reloads and verifies the value persists;
//   (e) tests the color picker changes strokeColor in the model.
//
// @a11y

const SEED_PROJECT_ID = 'p-edge-stroke-style';
const BDD_DIAGRAM_ID = 'd-stroke-style';
const BLOCK_A_ID = 'sst-block-a';
const BLOCK_B_ID = 'sst-block-b';
const EDGE_ID = 'sst-edge-ab';

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
      const rootId = 'sst-root-pkg';
      const project = {
        id: projectId,
        name: 'Stroke Style Seed',
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
            name: 'Stroke Style BDD',
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
  await page.getByRole('tab', { name: 'Stroke Style BDD' }).click();
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

async function getEdgeStrokeStyle(page: Page, edgeId: string): Promise<string | undefined> {
  return page.evaluate((id) => {
    const ws = (window as unknown as {
      __workspaceStore: {
        getState: () => { edges: ReadonlyArray<{ id: string; strokeStyle?: string }> };
      };
    }).__workspaceStore;
    const state = ws.getState();
    const edge = state.edges.find((e) => e.id === id);
    return edge?.strokeStyle;
  }, edgeId);
}

async function getEdgeStrokeColor(page: Page, edgeId: string): Promise<string | undefined> {
  return page.evaluate((id) => {
    const ws = (window as unknown as {
      __workspaceStore: {
        getState: () => { edges: ReadonlyArray<{ id: string; strokeColor?: string }> };
      };
    }).__workspaceStore;
    const state = ws.getState();
    const edge = state.edges.find((e) => e.id === id);
    return edge?.strokeColor;
  }, edgeId);
}

test.describe('per-edge stroke style inspector (issue #566) @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
  });

  test('default stroke style (solid) is shown as active in the inspector', async ({
    page,
  }) => {
    await gotoCanvas(page);
    await selectEdge(page, EDGE_ID);

    const control = page.getByTestId('edge-stroke-style');
    await expect(control).toBeVisible();

    // bdd-composition default is solid
    await expect(page.getByTestId('edge-stroke-style-solid')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('edge-stroke-style-dashed')).toHaveAttribute('aria-pressed', 'false');
  });

  test('clicking Dashed sets strokeStyle to dashed in the model', async ({
    page,
  }) => {
    await gotoCanvas(page);
    await selectEdge(page, EDGE_ID);

    await expect(page.getByTestId('edge-stroke-style')).toBeVisible();
    await page.getByTestId('edge-stroke-style-dashed').click();

    const value = await getEdgeStrokeStyle(page, EDGE_ID);
    expect(value).toBe('dashed');

    await expect(page.getByTestId('edge-stroke-style-dashed')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('edge-stroke-style-solid')).toHaveAttribute('aria-pressed', 'false');
  });

  test('stroke style persists through save+reload', async ({ page }) => {
    await gotoCanvas(page);
    await selectEdge(page, EDGE_ID);

    await expect(page.getByTestId('edge-stroke-style')).toBeVisible();
    await page.getByTestId('edge-stroke-style-dashed').click();
    expect(await getEdgeStrokeStyle(page, EDGE_ID)).toBe('dashed');

    await page.reload();
    await page.getByRole('tab', { name: 'Stroke Style BDD' }).click();
    await expect(
      page.locator('[data-testid^="bdd-block-"][data-element-id]'),
    ).toHaveCount(2);

    expect(await getEdgeStrokeStyle(page, EDGE_ID)).toBe('dashed');
  });

  test('color picker control is present and accessible', async ({ page }) => {
    await gotoCanvas(page);
    await selectEdge(page, EDGE_ID);

    const colorPicker = page.getByTestId('edge-stroke-color');
    await expect(colorPicker).toBeVisible();
    await expect(colorPicker).toHaveAttribute('type', 'color');
    await expect(colorPicker).toHaveAttribute('aria-label', 'Edge stroke color');
  });

  test('Cmd-Z after setting stroke style restores undefined (kind default)', async ({
    page,
  }) => {
    await gotoCanvas(page);
    await selectEdge(page, EDGE_ID);

    await expect(page.getByTestId('edge-stroke-style')).toBeVisible();
    await page.getByTestId('edge-stroke-style-dotted').click();
    expect(await getEdgeStrokeStyle(page, EDGE_ID)).toBe('dotted');

    await page.keyboard.press('Meta+z');

    const value = await getEdgeStrokeStyle(page, EDGE_ID);
    expect(value).toBeUndefined();
  });

  test('strokeColor set via store round-trips through reload', async ({ page }) => {
    await gotoCanvas(page);

    // Set strokeColor directly through the store (color picker interactions
    // are OS-native and unreliable in headless Playwright).
    await page.evaluate(
      ([id, color]) => {
        const ws = (window as unknown as {
          __workspaceStore: {
            getState: () => { setEdgeStrokeColor: (id: string, color: string) => void };
          };
        }).__workspaceStore;
        ws.getState().setEdgeStrokeColor(id, color);
      },
      [EDGE_ID, '#ff0000'],
    );

    expect(await getEdgeStrokeColor(page, EDGE_ID)).toBe('#ff0000');

    await page.reload();
    await page.getByRole('tab', { name: 'Stroke Style BDD' }).click();
    await expect(
      page.locator('[data-testid^="bdd-block-"][data-element-id]'),
    ).toHaveCount(2);

    expect(await getEdgeStrokeColor(page, EDGE_ID)).toBe('#ff0000');
  });
});
