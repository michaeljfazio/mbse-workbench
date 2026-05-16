import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Seeds a project that already carries a Parametric diagram so the canvas
// can show it. There is no UI yet for creating Parametric diagrams (#135
// only registers the viewpoint); later children surface the user-facing
// entry point. Tests inject via the same sessionStorage key the repository
// reads — `mbse:v1:project:<id>` — so the workspace bootstrap loads the
// seeded project on first goto.
const SEEDED_PROJECT_ID = 'p-parametric-seed';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((projectId) => {
    const key = `mbse:v1:project:${projectId}`;
    if (sessionStorage.getItem(key)) return;
    const project = {
      id: projectId,
      name: 'Parametric Seed',
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
          id: 'd-parametric',
          viewpointId: 'parametric',
          name: 'System Parametrics',
          positions: {},
        },
      ],
      history: { undo: [], redo: [] },
    };
    sessionStorage.setItem(key, JSON.stringify(project));
  }, SEEDED_PROJECT_ID);
});

test.describe('Parametric viewpoint (issue #135)', () => {
  test('renders a Parametric tab and switches to the empty canvas', async ({
    page,
  }) => {
    await page.goto('/');

    // Both tabs are present from the seeded project.
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await expect(tablist.getByRole('tab', { name: 'Main BDD' })).toBeVisible();
    await expect(
      tablist.getByRole('tab', { name: 'System Parametrics' }),
    ).toBeVisible();

    // Activate the Parametric tab.
    await tablist.getByRole('tab', { name: 'System Parametrics' }).click();
    await expect(
      tablist.getByRole('tab', { name: 'System Parametrics', selected: true }),
    ).toBeVisible();

    // Canvas toolbar shows the Parametric viewpoint label.
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Parametric Diagram',
    );

    // The Parametric viewpoint has no palette yet (#136 adds nodes),
    // so the BDD-only "+ Block" button is hidden.
    await expect(page.getByTestId('toolbar-add-block')).toHaveCount(0);

    // Canvas mounts with the Parametric viewpoint id.
    await expect(page.getByTestId('diagram-panel')).toHaveAttribute(
      'data-viewpoint-id',
      'parametric',
    );
  });

  test('@a11y empty Parametric canvas has no serious or critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Parametrics' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Parametric Diagram',
    );
    // Wait for CSS transitions on the tab swap to settle. axe samples
    // computed styles directly and otherwise catches the active tab mid-
    // transition with an in-between bg/text colour pair that fails the
    // contrast check (see docs/CONTEXT.md 2026-05-12 entry).
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

  test('@visual parametric-empty canvas baseline', async ({ page }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Parametrics' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Parametric Diagram',
    );
    // Stabilize before the screenshot.
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('parametric-empty.png', {
      fullPage: false,
    });
  });
});
