import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Seeds a project that already carries a Package diagram so the canvas
// can show it. There is no UI yet for creating Package diagrams (#154
// only registers the viewpoint); later children surface the user-facing
// entry point. Tests inject via the same sessionStorage key the
// repository reads — `mbse:v1:project:<id>` — so the workspace bootstrap
// loads the seeded project on first goto.
const SEEDED_PROJECT_ID = 'p-package-seed';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((projectId) => {
    const key = `mbse:v1:project:${projectId}`;
    if (sessionStorage.getItem(key)) return;
    const project = {
      id: projectId,
      name: 'Package Seed',
      createdAt: '2026-05-13T10:00:00.000Z',
      modifiedAt: '2026-05-13T10:05:00.000Z',
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
          id: 'd-package',
          viewpointId: 'package',
          name: 'System Packages',
          positions: {},
        },
      ],
      history: { undo: [], redo: [] },
    };
    sessionStorage.setItem(key, JSON.stringify(project));
  }, SEEDED_PROJECT_ID);
});

test.describe('Package viewpoint (issue #154)', () => {
  test('renders a Package tab and switches to the empty canvas', async ({
    page,
  }) => {
    await page.goto('/');

    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await expect(tablist.getByRole('tab', { name: 'Main BDD' })).toBeVisible();
    await expect(
      tablist.getByRole('tab', { name: 'System Packages' }),
    ).toBeVisible();

    await tablist.getByRole('tab', { name: 'System Packages' }).click();
    await expect(
      tablist.getByRole('tab', { name: 'System Packages', selected: true }),
    ).toBeVisible();

    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Package Diagram',
    );

    // The Package viewpoint has no palette yet (#155 adds the node),
    // so the BDD-only "+ Block" button is hidden.
    await expect(page.getByTestId('toolbar-add-block')).toHaveCount(0);

    await expect(page.getByTestId('diagram-panel')).toHaveAttribute(
      'data-viewpoint-id',
      'package',
    );
  });

  test('@a11y empty Package canvas has no serious or critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Packages' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Package Diagram',
    );
    // Wait for CSS transitions on the tab swap to settle. axe samples
    // computed styles directly and otherwise catches the active tab mid-
    // transition with an in-between bg/text colour pair that fails the
    // contrast check (see docs/CONTEXT.md 2026-05-12 entry).
    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map((a) => a.finished));
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@visual package-empty canvas baseline', async ({ page }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Packages' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Package Diagram',
    );
    // Stabilize before the screenshot.
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('package-empty.png', {
      fullPage: false,
    });
  });
});

// Issue #155 — seeds a project with a single Package node + member so the
// custom node + "N members" subline are visible.
test.describe('Package node visual (issue #155)', () => {
  const SEEDED_NODE_PROJECT_ID = 'p-package-node-seed';

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((projectId) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Package Node Seed',
        createdAt: '2026-05-13T10:00:00.000Z',
        modifiedAt: '2026-05-13T10:05:00.000Z',
        elements: [
          {
            id: 'block-1',
            kind: 'PartDefinition',
            name: 'Wheel',
            isAbstract: false,
            propertyIds: [],
            portIds: [],
          },
          {
            id: 'pkg-1',
            kind: 'Package',
            name: 'Vehicle',
            memberIds: ['block-1'],
          },
        ],
        edges: [],
        diagrams: [
          {
            id: 'd-package',
            viewpointId: 'package',
            name: 'System Packages',
            positions: { 'pkg-1': { x: 120, y: 80 } },
          },
        ],
        history: { undo: [], redo: [] },
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    }, SEEDED_NODE_PROJECT_ID);
  });

  test('renders the Package custom node with its member count', async ({
    page,
  }) => {
    await page.goto('/');
    const node = page.getByTestId('package-node-pkg-1');
    await expect(node).toBeVisible();
    await expect(
      page.getByTestId('package-node-label-pkg-1'),
    ).toHaveText('Vehicle');
    await expect(
      page.getByTestId('package-node-members-pkg-1'),
    ).toHaveText('1 member');
  });

  test('@visual package-one canvas baseline', async ({ page }) => {
    await page.goto('/');
    const node = page.getByTestId('package-node-pkg-1');
    await expect(node).toBeVisible();
    // Deselect by clicking empty pane.
    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    if (paneBox) {
      await page.mouse.click(paneBox.x + paneBox.width - 80, paneBox.y + 40);
    }
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('package-one.png', {
      fullPage: false,
    });
  });
});
