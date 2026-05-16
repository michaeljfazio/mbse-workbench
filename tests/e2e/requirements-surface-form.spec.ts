import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const SEED_PROJECT_ID = 'p-requirements-surface-form';

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript((projectId) => {
    const key = `mbse:v1:project:${projectId}`;
    if (sessionStorage.getItem(key)) return;
    const project = {
      id: projectId,
      name: 'Requirements Surface Seed',
      createdAt: '2026-05-13T10:00:00.000Z',
      modifiedAt: '2026-05-13T10:05:00.000Z',
      elements: [
        {
          id: 'r-stop',
          kind: 'Requirement',
          name: 'Stop on red',
          reqId: 'SAFETY-1',
          text: 'The system shall stop on a red signal.',
          priority: 'critical',
          status: 'approved',
          rationale: 'Required by EN-50128 §6.4.',
        },
        {
          id: 'r-log',
          kind: 'Requirement',
          name: 'Log faults',
          reqId: 'OPS-2',
          text: 'The system shall log faults to nonvolatile storage.',
          priority: 'medium',
          status: 'draft',
        },
      ],
      edges: [],
      diagrams: [
        {
          id: 'd-requirements',
          viewpointId: 'requirements',
          name: 'System Requirements',
          positions: { 'r-stop': { x: 40, y: 40 }, 'r-log': { x: 40, y: 220 } },
        },
      ],
      history: { undo: [], redo: [] },
    };
    sessionStorage.setItem(key, JSON.stringify(project));
  }, SEED_PROJECT_ID);
}

async function openRequirementsSurface(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('surface-tab-requirements').click();
  await expect(page.getByTestId('requirements-surface')).toBeVisible();
}

test.describe('Requirements surface — editable form pane (slice 3 of #173)', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
  });

  test('row click opens the form pane bound to the selected requirement', async ({
    page,
  }) => {
    await openRequirementsSurface(page);
    await page.getByTestId('requirements-surface-row-r-stop').click();
    await expect(page.getByTestId('requirements-surface-form')).toBeVisible();
    await expect(page.getByTestId('requirements-form-reqId')).toHaveValue(
      'SAFETY-1',
    );
    await expect(page.getByTestId('requirements-form-name')).toHaveValue(
      'Stop on red',
    );
    await expect(page.getByTestId('requirements-form-priority')).toHaveValue(
      'critical',
    );
    await expect(page.getByTestId('requirements-form-status')).toHaveValue(
      'approved',
    );
  });

  test('@a11y populated surface with a selected requirement has no serious/critical violations', async ({
    page,
  }) => {
    await openRequirementsSurface(page);
    await page.getByTestId('requirements-surface-row-r-stop').click();
    await expect(page.getByTestId('requirements-surface-form')).toBeVisible();
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

  test('@visual requirements-surface-form-populated baseline', async ({
    page,
  }) => {
    await openRequirementsSurface(page);
    await page.getByTestId('requirements-surface-row-r-stop').click();
    await expect(page.getByTestId('requirements-surface-form')).toBeVisible();
    await page.mouse.move(0, 0);
    await page.evaluate(async () => {
      await Promise.allSettled(document.getAnimations().map((a) => a.finished));
    });
    await expect(page).toHaveScreenshot(
      'requirements-surface-form-populated.png',
      { fullPage: false },
    );
  });
});
