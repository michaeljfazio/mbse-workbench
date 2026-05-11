import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Seeds a project that already carries a Requirements diagram so the canvas
// can show it. There is no UI yet for creating Requirements diagrams (#70
// only registers the viewpoint); later children surface the user-facing
// entry point. Tests inject via the same sessionStorage key the repository
// reads — `mbse:v1:project:<id>` — so the workspace bootstrap loads the
// seeded project on first goto.
const SEEDED_PROJECT_ID = 'p-requirements-seed';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((projectId) => {
    const project = {
      id: projectId,
      name: 'Requirements Seed',
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
          id: 'd-requirements',
          viewpointId: 'requirements',
          name: 'System Requirements',
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

test.describe('Requirements viewpoint (issue #70)', () => {
  test('renders a Requirements tab and switches to the empty canvas', async ({
    page,
  }) => {
    await page.goto('/');

    // Both tabs are present from the seeded project.
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await expect(tablist.getByRole('tab', { name: 'Main BDD' })).toBeVisible();
    await expect(
      tablist.getByRole('tab', { name: 'System Requirements' }),
    ).toBeVisible();

    // Activate the Requirements tab.
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    await expect(
      tablist.getByRole('tab', { name: 'System Requirements', selected: true }),
    ).toBeVisible();

    // Canvas toolbar shows the Requirements viewpoint label.
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Requirements Diagram',
    );

    // The Requirements viewpoint has no palette yet (#71 adds Requirement),
    // so the BDD-only "+ Block" button is hidden.
    await expect(page.getByTestId('toolbar-add-block')).toHaveCount(0);

    // Canvas mounts with the Requirements viewpoint id.
    await expect(page.getByTestId('diagram-panel')).toHaveAttribute(
      'data-viewpoint-id',
      'requirements',
    );
  });

  test('@a11y empty Requirements canvas has no serious or critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Requirements Diagram',
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

  test('@visual requirements-empty canvas baseline', async ({ page }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Requirements Diagram',
    );
    // Stabilize before the screenshot.
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('requirements-empty.png', {
      fullPage: false,
    });
  });
});
