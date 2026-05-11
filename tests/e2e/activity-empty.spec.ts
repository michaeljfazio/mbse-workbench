import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Seeds a project that already carries an Activity diagram so the canvas can
// show it. There is no UI yet for creating Activity diagrams (#87 only
// registers the viewpoint); later children surface the user-facing entry
// point. Tests inject via the same sessionStorage key the repository reads
// — `mbse:v1:project:<id>` — so the workspace bootstrap loads the seeded
// project on first goto.
const SEEDED_PROJECT_ID = 'p-activity-seed';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((projectId) => {
    const key = `mbse:v1:project:${projectId}`;
    // Per docs/CONTEXT.md 2026-05-12 entry: addInitScript fires on every
    // page load, including reloads, so guard the seed.
    if (sessionStorage.getItem(key)) return;
    const project = {
      id: projectId,
      name: 'Activity Seed',
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
          id: 'd-activity',
          viewpointId: 'activity',
          name: 'System Activity',
          positions: {},
        },
      ],
      history: { undo: [], redo: [] },
    };
    sessionStorage.setItem(key, JSON.stringify(project));
  }, SEEDED_PROJECT_ID);
});

test.describe('Activity viewpoint (issue #87)', () => {
  test('renders an Activity tab and switches to the empty canvas', async ({
    page,
  }) => {
    await page.goto('/');

    // Both tabs are present from the seeded project.
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await expect(tablist.getByRole('tab', { name: 'Main BDD' })).toBeVisible();
    await expect(
      tablist.getByRole('tab', { name: 'System Activity' }),
    ).toBeVisible();

    // Activate the Activity tab.
    await tablist.getByRole('tab', { name: 'System Activity' }).click();
    await expect(
      tablist.getByRole('tab', { name: 'System Activity', selected: true }),
    ).toBeVisible();

    // Canvas toolbar shows the Activity viewpoint label.
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Activity Diagram',
    );

    // The Activity viewpoint has no node renderers yet (#88 adds them), so
    // the BDD-only "+ Block" button is hidden on this canvas.
    await expect(page.getByTestId('toolbar-add-block')).toHaveCount(0);

    // Canvas mounts with the Activity viewpoint id.
    await expect(page.getByTestId('diagram-panel')).toHaveAttribute(
      'data-viewpoint-id',
      'activity',
    );
  });

  test('@a11y empty Activity canvas has no serious or critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Activity' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Activity Diagram',
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

  test('@visual activity-empty canvas baseline', async ({ page }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Activity' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Activity Diagram',
    );
    // Stabilize before the screenshot.
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('activity-empty.png', {
      fullPage: false,
    });
  });
});
