import { expect, test, type Page } from '@playwright/test';

// Phase 12 slice E (issue #235) — Split view (side-by-side diagrams).
//
// A 'Split right' (⇆) action on a diagram tab opens a second canvas pane
// beside the primary one, hosting the chosen diagram. The two panes share
// the same model so edits in one reflect in the other. The split state is
// persisted to layout storage and rehydrated on reload.

const SEED_PROJECT_ID = 'p-split-view';

const SEED_ELEMENTS = [
  {
    id: 'sv-block-alpha',
    kind: 'PartDefinition',
    name: 'Alpha',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  },
  {
    id: 'sv-block-beta',
    kind: 'PartDefinition',
    name: 'Beta',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  },
];

const SEED_DIAGRAMS = [
  {
    id: 'd-bdd-primary',
    viewpointId: 'bdd',
    name: 'Main BDD',
    positions: {
      'sv-block-alpha': { x: 140, y: 140 },
      'sv-block-beta': { x: 380, y: 140 },
    },
  },
  {
    id: 'd-bdd-secondary',
    viewpointId: 'bdd',
    name: 'Aux BDD',
    positions: {
      'sv-block-alpha': { x: 160, y: 160 },
      'sv-block-beta': { x: 400, y: 160 },
    },
  },
];

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, elements, diagrams }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const now = '2026-05-14T10:00:00.000Z';
      sessionStorage.setItem(
        key,
        JSON.stringify({
          id: projectId,
          name: 'Split View',
          createdAt: now,
          modifiedAt: now,
          elements,
          edges: [],
          diagrams,
          history: { undo: [], redo: [] },
          conversations: [],
        }),
      );
    },
    {
      projectId: SEED_PROJECT_ID,
      elements: SEED_ELEMENTS,
      diagrams: SEED_DIAGRAMS,
    },
  );
}

test.describe('Phase 12 slice E — Split view (issue #235)', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();
  });

  test('Split → on a non-active tab opens secondary pane; close restores single pane', async ({
    page,
  }) => {
    // Initially only one diagram panel is visible.
    const container = page.getByTestId('canvas-split-container');
    await expect(container).toHaveAttribute('data-split', 'false');
    await expect(page.getByTestId('secondary-canvas-pane')).toHaveCount(0);

    // Click split on the Aux BDD tab.
    await page.getByTestId('split-tab-d-bdd-secondary').click();
    await expect(container).toHaveAttribute('data-split', 'true');
    const secondary = page.getByTestId('secondary-canvas-pane');
    await expect(secondary).toBeVisible();
    // Secondary pane shows the chosen diagram.
    await expect(secondary).toContainText('Aux BDD');
    const secondaryPanel = page.getByTestId('secondary-diagram-panel');
    await expect(secondaryPanel).toHaveAttribute(
      'data-diagram-id',
      'd-bdd-secondary',
    );

    // Both panes render the same model — Alpha + Beta should be visible in
    // both. The primary canvas renders bdd-block-* nodes; the secondary
    // ReactFlow instance also renders the same node ids. Scope by pane.
    await expect(
      page.getByTestId('diagram-panel').getByTestId('bdd-block-sv-block-alpha'),
    ).toBeVisible();
    await expect(
      secondary.getByTestId('bdd-block-sv-block-alpha'),
    ).toBeVisible();
    await expect(
      secondary.getByTestId('bdd-block-sv-block-beta'),
    ).toBeVisible();

    // Closing the split removes the secondary pane.
    await page.getByTestId('close-split').click();
    await expect(container).toHaveAttribute('data-split', 'false');
    await expect(page.getByTestId('secondary-canvas-pane')).toHaveCount(0);
  });

  test('Edits in primary pane reflect in secondary pane (shared model)', async ({
    page,
  }) => {
    // Open split with the aux diagram in secondary.
    await page.getByTestId('split-tab-d-bdd-secondary').click();
    const secondary = page.getByTestId('secondary-canvas-pane');
    await expect(secondary).toBeVisible();

    // Both panes start at 2 logical blocks (alpha + beta) — the
    // [data-element-id] attribute deduplicates React Flow's internal
    // multi-render of each node.
    const primaryBlocks = page
      .getByTestId('diagram-panel')
      .locator('[data-testid^="bdd-block-"][data-element-id]');
    const secondaryBlocks = secondary.locator(
      '[data-testid^="bdd-block-"][data-element-id]',
    );
    await expect(primaryBlocks).toHaveCount(2);
    await expect(secondaryBlocks).toHaveCount(2);

    // Add a new block via the canonical palette drag onto the primary canvas
    // (ADR 0015 step 3 retired the `+ Block` toolbar button). The new element
    // is added to the shared model, so it renders on both panes (the secondary
    // diagram has no explicit position for it; toFlowNodes places it at the
    // default 0,0).
    const group = page.getByTestId('project-tree-group-PartDefinition');
    const primaryCanvas = page
      .getByTestId('diagram-panel')
      .getByTestId('canvas-drop-target');
    await group.dragTo(primaryCanvas, { targetPosition: { x: 240, y: 200 } });

    await expect(primaryBlocks).toHaveCount(3);
    await expect(secondaryBlocks).toHaveCount(3);
  });

  test('Split state persists across reload', async ({ page }) => {
    await page.getByTestId('split-tab-d-bdd-secondary').click();
    await expect(page.getByTestId('secondary-canvas-pane')).toBeVisible();

    // Reload the page; seed init-script runs again but only writes when key
    // is absent, so the existing project + layout storage stick.
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();

    // Secondary pane is restored with the previously chosen diagram.
    const secondary = page.getByTestId('secondary-canvas-pane');
    await expect(secondary).toBeVisible();
    await expect(page.getByTestId('secondary-diagram-panel')).toHaveAttribute(
      'data-diagram-id',
      'd-bdd-secondary',
    );
  });

  test('Activating the diagram currently in the secondary pane auto-closes the split', async ({
    page,
  }) => {
    await page.getByTestId('split-tab-d-bdd-secondary').click();
    await expect(page.getByTestId('secondary-canvas-pane')).toBeVisible();

    // Clicking the Aux BDD tab promotes it to primary and closes the split.
    await page.getByTestId('diagram-tab-d-bdd-secondary').click();
    await expect(page.getByTestId('secondary-canvas-pane')).toHaveCount(0);
    await expect(page.getByTestId('canvas-split-container')).toHaveAttribute(
      'data-split',
      'false',
    );
  });
});
