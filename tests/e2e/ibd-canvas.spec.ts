import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Seeds a project that already carries an IBD diagram so the canvas can show
// it. There is no UI yet for creating IBDs (#49 only registers the
// viewpoint); #53 will land cross-diagram navigation as the user-facing
// entry point. Tests inject via the same sessionStorage key the repository
// reads — `mbse:v1:project:<id>` — so the workspace bootstrap loads the
// seeded project on first goto.
const SEEDED_PROJECT_ID = 'p-ibd-seed';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((projectId) => {
    const project = {
      id: projectId,
      name: 'IBD Seed',
      createdAt: '2026-05-12T10:00:00.000Z',
      modifiedAt: '2026-05-12T10:05:00.000Z',
      elements: [],
      edges: [],
      diagrams: [
        {
          id: 'd-bdd',
          viewpointId: 'bdd',
          name: 'Main BDD',
          positions: {},
        },
        {
          id: 'd-ibd',
          viewpointId: 'ibd',
          name: 'Engine IBD',
          positions: {},
        },
      ],
      history: { undo: [], redo: [] },
    };
    sessionStorage.setItem(
      `mbse:v1:project:${projectId}`,
      JSON.stringify(project),
    );
  }, SEEDED_PROJECT_ID);
});

test.describe('IBD viewpoint (issue #49)', () => {
  test('renders an Engine IBD tab and switches to the empty IBD canvas', async ({
    page,
  }) => {
    await page.goto('/');

    // Both tabs are present from the seeded project.
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await expect(tablist.getByRole('tab', { name: 'Main BDD' })).toBeVisible();
    await expect(tablist.getByRole('tab', { name: 'Engine IBD' })).toBeVisible();

    // Activate the IBD tab.
    await tablist.getByRole('tab', { name: 'Engine IBD' }).click();
    await expect(
      tablist.getByRole('tab', { name: 'Engine IBD', selected: true }),
    ).toBeVisible();

    // Canvas toolbar shows the IBD viewpoint label.
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Internal Block Diagram',
    );

    // ADR 0015 step 3 (#376): the diagram-toolbar `+ X` buttons retired.
    // Creation is canonical via project-tree palette drag — assert the
    // PartUsage group header is draggable as a positive cross-viewpoint
    // affordance check (IBD's `acceptedElementKinds` is `['PartUsage']`).
    await expect(
      page.getByTestId('project-tree-group-PartUsage'),
    ).toHaveAttribute('draggable', 'true');

    // Canvas mounts with the IBD viewpoint id.
    await expect(page.getByTestId('diagram-panel')).toHaveAttribute(
      'data-viewpoint-id',
      'ibd',
    );
  });

  test('IBD canvas exposes the in-canvas palette with a draggable Part chip (issue #385)', async ({
    page,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });

    // BDD is the initial active tab; the IBD palette must not be visible.
    await expect(page.getByTestId('ibd-palette')).toHaveCount(0);

    await tablist.getByRole('tab', { name: 'Engine IBD' }).click();
    await expect(
      tablist.getByRole('tab', { name: 'Engine IBD', selected: true }),
    ).toBeVisible();

    // Palette strip + "Drag onto canvas" hint mirror the Activity / State
    // Machine pattern (closes the IBD discoverability gap that issue #385
    // raises against rubric dimensions 6 and 15).
    const palette = page.getByTestId('ibd-palette');
    await expect(palette).toBeVisible();
    await expect(palette).toHaveAttribute('role', 'toolbar');
    await expect(palette).toContainText('Drag onto canvas');
    await expect(palette).toContainText('Connections & Item Flows');

    const partChip = page.getByTestId('ibd-palette-PartUsage');
    await expect(partChip).toBeVisible();
    await expect(partChip).toHaveText('Part');
    await expect(partChip).toHaveAttribute('draggable', 'true');
    await expect(partChip).toHaveAttribute('data-element-kind', 'PartUsage');

    // Switch back to the BDD tab — the IBD palette must disappear so its
    // affordances do not bleed across viewpoints.
    await tablist.getByRole('tab', { name: 'Main BDD' }).click();
    await expect(page.getByTestId('ibd-palette')).toHaveCount(0);
  });

  test('@a11y empty IBD canvas has no serious or critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'Engine IBD' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Internal Block Diagram',
    );
    // Wait for CSS transitions on the tab swap to settle. axe samples
    // computed styles directly and otherwise catches the active tab mid-
    // transition with an in-between bg/text colour pair that fails the
    // contrast check.
    await page.evaluate(async () => {
      await Promise.allSettled(document.getAnimations().map((a) => a.finished));
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@visual ibd-empty canvas baseline', async ({ page }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'Engine IBD' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Internal Block Diagram',
    );
    // Stabilize before the screenshot.
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('ibd-empty.png', { fullPage: false });
  });
});
