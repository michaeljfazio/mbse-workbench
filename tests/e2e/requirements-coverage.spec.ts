import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const SEED_PROJECT_ID = 'p-requirements-coverage';

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript((projectId) => {
    const key = `mbse:v1:project:${projectId}`;
    if (sessionStorage.getItem(key)) return;
    const project = {
      id: projectId,
      name: 'Requirements Coverage Seed',
      createdAt: '2026-05-13T10:00:00.000Z',
      modifiedAt: '2026-05-13T10:05:00.000Z',
      elements: [
        {
          id: 'b-controller',
          kind: 'PartDefinition',
          name: 'Controller',
        },
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
          status: 'approved',
        },
        {
          id: 'r-old',
          kind: 'Requirement',
          name: 'Legacy diagnostic',
          reqId: 'LEGACY-3',
          text: 'Legacy diagnostic placeholder.',
          priority: 'low',
          status: 'draft',
        },
      ],
      edges: [
        {
          id: 'e-satisfy-stop',
          kind: 'RequirementTrace',
          sourceId: 'r-stop',
          targetId: 'b-controller',
          traceKind: 'satisfy',
        },
        {
          id: 'e-verify-stop',
          kind: 'RequirementTrace',
          sourceId: 'r-stop',
          targetId: 'b-controller',
          traceKind: 'verify',
        },
      ],
      diagrams: [
        {
          id: 'd-requirements',
          viewpointId: 'requirements',
          name: 'System Requirements',
          positions: {
            'r-stop': { x: 40, y: 40 },
            'r-log': { x: 40, y: 220 },
            'r-old': { x: 40, y: 400 },
          },
        },
      ],
      history: { undo: [], redo: [] },
    };
    sessionStorage.setItem(key, JSON.stringify(project));
  }, SEED_PROJECT_ID);
}

async function openCoverageTab(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('surface-tab-requirements').click();
  await expect(page.getByTestId('requirements-surface')).toBeVisible();
  await page.getByTestId('requirements-tab-coverage-button').click();
  await expect(page.getByTestId('requirements-coverage-panel')).toBeVisible();
}

test.describe('Requirements coverage tab (slice 3 of #176)', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
  });

  test('shows satisfied/verified counts and gap rows for the seeded model', async ({
    page,
  }) => {
    await openCoverageTab(page);
    await expect(
      page.getByTestId('requirements-coverage-satisfied-count'),
    ).toHaveText('1 / 3');
    await expect(
      page.getByTestId('requirements-coverage-verified-count'),
    ).toHaveText('1 / 3');
    await expect(
      page.getByTestId('requirements-coverage-unsatisfied-row-r-log'),
    ).toBeVisible();
    await expect(
      page.getByTestId('requirements-coverage-unsatisfied-row-r-old'),
    ).toBeVisible();
    await expect(
      page.getByTestId('requirements-coverage-unverified-row-r-log'),
    ).toBeVisible();
  });

  test('clicking a gap row selects the requirement and switches back to the Editor tab', async ({
    page,
  }) => {
    await openCoverageTab(page);
    await page
      .getByTestId('requirements-coverage-unsatisfied-row-r-log')
      .click();
    await expect(
      page.getByTestId('requirements-editor-tabpanel'),
    ).toBeVisible();
    await expect(page.getByTestId('requirements-form-reqId')).toHaveValue(
      'OPS-2',
    );
  });

  test('approved-only toggle narrows totals to in-scope requirements', async ({
    page,
  }) => {
    await openCoverageTab(page);
    await page.getByTestId('requirements-coverage-approved-only').check();
    await expect(
      page.getByTestId('requirements-coverage-satisfied-count'),
    ).toHaveText('1 / 2');
    await expect(
      page.getByTestId('requirements-coverage-unsatisfied-row-r-old'),
    ).toHaveCount(0);
  });

  test('@a11y populated coverage tab has no serious/critical violations', async ({
    page,
  }) => {
    await openCoverageTab(page);
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

  test('@visual requirements-coverage-populated baseline', async ({ page }) => {
    await openCoverageTab(page);
    await page.mouse.move(0, 0);
    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map((a) => a.finished));
    });
    await expect(page).toHaveScreenshot(
      'requirements-coverage-populated.png',
      { fullPage: false },
    );
  });
});
