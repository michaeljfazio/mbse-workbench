import { expect, test, type Page } from '@playwright/test';

// T-13.37 — Diagram tabs strip tracks the currently OPEN diagrams as a
// transient working set, separately from the full diagram list shown in
// the containment tree (every diagram appears in the tree as a `⌬`
// representation row under its context element). Closing a tab leaves
// the representation in the tree; clicking the tree row re-opens the tab.
//
// Cold-load default: when no LayoutSnapshot has been persisted yet
// (fresh session / seeded test project), the open-tabs working set
// defaults to every project diagram. Once the user closes any tab the
// curated set persists across reloads — that's the load-bearing T-13.37
// behavior. The "every diagram is a tab" cold-load default is what 40+
// pre-existing e2e seed patterns depend on (they seed
// `mbse:v1:project:<id>` directly and immediately click tabs by name);
// see store.ts `bootstrap` and docs/CONTEXT.md 2026-05-16 entry.

const SEED_PROJECT_ID = 'p-tabs-open-close';

const SEED_ELEMENTS = [
  {
    id: 'tt-block-alpha',
    kind: 'PartDefinition',
    name: 'Alpha',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  },
  {
    id: 'tt-block-beta',
    kind: 'PartDefinition',
    name: 'Beta',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  },
];

const SEED_DIAGRAMS = [
  {
    id: 'd-bdd-one',
    viewpointId: 'bdd',
    name: 'First BDD',
    positions: { 'tt-block-alpha': { x: 140, y: 140 } },
  },
  {
    id: 'd-bdd-two',
    viewpointId: 'bdd',
    name: 'Second BDD',
    positions: { 'tt-block-beta': { x: 160, y: 160 } },
  },
];

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, elements, diagrams }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const now = '2026-05-16T10:00:00.000Z';
      sessionStorage.setItem(
        key,
        JSON.stringify({
          id: projectId,
          name: 'Tabs Open Close',
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

test.describe('T-13.37 — Diagram tabs open/close (issue #330)', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();
  });

  test('every project diagram renders as a tab AND as a tree representation row', async ({
    page,
  }) => {
    // Cold-load semantics: the project ships two diagrams and no
    // LayoutSnapshot has been persisted yet, so the open-tabs working
    // set defaults to "every project diagram" (see store.ts
    // `bootstrap`). The first diagram is active by default.
    const tabOne = page.getByTestId('diagram-tab-d-bdd-one');
    const tabTwo = page.getByTestId('diagram-tab-d-bdd-two');
    await expect(tabOne).toBeVisible();
    await expect(tabTwo).toBeVisible();
    await expect(tabOne).toHaveAttribute('aria-selected', 'true');
    await expect(tabTwo).toHaveAttribute('aria-selected', 'false');

    // Each diagram also lives in the containment tree as a `⌬`
    // representation row under its context element — the tree is the
    // permanent home; the tab strip is the transient working set.
    await expect(
      page.getByTestId('containment-tree-diagram-d-bdd-one'),
    ).toBeVisible();
    await expect(
      page.getByTestId('containment-tree-diagram-d-bdd-two'),
    ).toBeVisible();
  });

  test('clicking close on a tab removes it from the strip but keeps the tree row', async ({
    page,
  }) => {
    // Both tabs are open on cold load. Activate the second by clicking
    // its tab so the close action targets the active tab.
    await page.getByTestId('diagram-tab-d-bdd-two').click();
    const tabTwo = page.getByTestId('diagram-tab-d-bdd-two');
    await expect(tabTwo).toHaveAttribute('aria-selected', 'true');

    // Close the second tab.
    await page.getByTestId('diagram-tab-close-d-bdd-two').click();

    // Tab is gone from the strip; tree row remains.
    await expect(page.getByTestId('diagram-tab-d-bdd-two')).toHaveCount(0);
    await expect(
      page.getByTestId('containment-tree-diagram-d-bdd-two'),
    ).toBeVisible();

    // Closing the active tab activated the next remaining tab (the first).
    await expect(page.getByTestId('diagram-tab-d-bdd-one')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('clicking a closed diagram in the tree re-opens its tab and activates it', async ({
    page,
  }) => {
    // Close the second tab first so the tree-row click has work to do
    // (cold-load opens every diagram as a tab; the test exercises the
    // re-open path, so we must reach the closed state first).
    await page.getByTestId('diagram-tab-close-d-bdd-two').click();
    await expect(page.getByTestId('diagram-tab-d-bdd-two')).toHaveCount(0);

    // Click the tree row.
    await page.getByTestId('containment-tree-diagram-d-bdd-two').click();

    // Tab appears and is active; first tab is no longer active.
    const tabTwo = page.getByTestId('diagram-tab-d-bdd-two');
    await expect(tabTwo).toBeVisible();
    await expect(tabTwo).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('diagram-tab-d-bdd-one')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  test('reload preserves the set of open tabs', async ({ page }) => {
    // Open the second diagram so the strip has both tabs.
    await page.getByTestId('containment-tree-diagram-d-bdd-two').click();
    await expect(page.getByTestId('diagram-tab-d-bdd-two')).toBeVisible();

    // Close the FIRST tab — leaves only the second open.
    await page.getByTestId('diagram-tab-close-d-bdd-one').click();
    await expect(page.getByTestId('diagram-tab-d-bdd-one')).toHaveCount(0);

    // Reload. Layout snapshot was persisted, so only the second tab returns.
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();
    await expect(page.getByTestId('diagram-tab-d-bdd-two')).toBeVisible();
    await expect(page.getByTestId('diagram-tab-d-bdd-one')).toHaveCount(0);
    // First diagram still lives in the tree.
    await expect(
      page.getByTestId('containment-tree-diagram-d-bdd-one'),
    ).toBeVisible();
  });
});
