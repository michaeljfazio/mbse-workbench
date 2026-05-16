import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Seeds a project that already carries a Use Case diagram so the canvas
// can show it. There is no UI yet for creating Use Case diagrams (#117
// only registers the viewpoint); later children surface the user-facing
// entry point. Tests inject via the same sessionStorage key the repository
// reads — `mbse:v1:project:<id>` — so the workspace bootstrap loads the
// seeded project on first goto.
const SEEDED_PROJECT_ID = 'p-use-case-seed';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((projectId) => {
    const key = `mbse:v1:project:${projectId}`;
    // Per docs/CONTEXT.md 2026-05-12 entry: addInitScript fires on every
    // page load, including reloads, so guard the seed.
    if (sessionStorage.getItem(key)) return;
    const project = {
      id: projectId,
      name: 'Use Case Seed',
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
          id: 'd-use-case',
          viewpointId: 'use-case',
          name: 'System Use Cases',
          positions: {},
        },
      ],
      history: { undo: [], redo: [] },
    };
    sessionStorage.setItem(key, JSON.stringify(project));
  }, SEEDED_PROJECT_ID);
});

test.describe('Use Case viewpoint (issue #117)', () => {
  test('renders a Use Case tab and switches to the empty canvas', async ({
    page,
  }) => {
    await page.goto('/');

    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await expect(tablist.getByRole('tab', { name: 'Main BDD' })).toBeVisible();
    await expect(
      tablist.getByRole('tab', { name: 'System Use Cases' }),
    ).toBeVisible();

    await tablist.getByRole('tab', { name: 'System Use Cases' }).click();
    await expect(
      tablist.getByRole('tab', {
        name: 'System Use Cases',
        selected: true,
      }),
    ).toBeVisible();

    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Use Case Diagram',
    );

    // The Use Case viewpoint has no node renderers yet (#118 adds them),
    // so the BDD-only "+ Block" button is hidden on this canvas.
    await expect(page.getByTestId('toolbar-add-block')).toHaveCount(0);

    await expect(page.getByTestId('diagram-panel')).toHaveAttribute(
      'data-viewpoint-id',
      'use-case',
    );
  });

  test('@a11y empty Use Case canvas has no serious or critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Use Cases' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Use Case Diagram',
    );
    // Wait for CSS transitions on the tab swap to settle. axe samples
    // computed styles directly and otherwise catches the active tab mid-
    // transition (see docs/CONTEXT.md 2026-05-12 entry).
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

  test('@visual use-case-empty canvas baseline', async ({ page }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Use Cases' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Use Case Diagram',
    );
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('use-case-empty.png', {
      fullPage: false,
    });
  });
});
