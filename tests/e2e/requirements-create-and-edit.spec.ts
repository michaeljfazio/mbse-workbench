import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const SEED_PROJECT_ID = 'p-requirements-create-edit';

async function seedEmptyRequirementsProject(page: Page): Promise<void> {
  // Init scripts run on every page load (including reload). Seed only when
  // sessionStorage is empty so the autosaved state survives reloads.
  await page.addInitScript((projectId) => {
    const key = `mbse:v1:project:${projectId}`;
    if (sessionStorage.getItem(key)) return;
    const project = {
      id: projectId,
      name: 'Requirements Create+Edit Seed',
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
    sessionStorage.setItem(key, JSON.stringify(project));
  }, SEED_PROJECT_ID);
}

async function gotoRequirements(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System Requirements' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Requirements Diagram',
  );
}

async function dragRequirementOntoCanvas(page: Page): Promise<void> {
  const group = page.getByTestId('project-tree-group-Requirement');
  const canvas = page.getByTestId('canvas-drop-target');
  await group.dragTo(canvas, { targetPosition: { x: 280, y: 180 } });
}

test.describe('Requirements create + edit (issue #71)', () => {
  test.beforeEach(async ({ page }) => {
    await seedEmptyRequirementsProject(page);
  });

  test('shows + Requirement toolbar button + palette item on the Requirements viewpoint', async ({
    page,
  }) => {
    await gotoRequirements(page);
    await expect(page.getByTestId('toolbar-add-requirement')).toBeVisible();
    await expect(page.getByTestId('toolbar-add-block')).toHaveCount(0);
    await expect(
      page.getByTestId('project-tree-group-Requirement'),
    ).toBeVisible();
  });

  test('drag Requirement from palette → drop on canvas → renders with default reqId, name, badges', async ({
    page,
  }) => {
    await gotoRequirements(page);
    await dragRequirementOntoCanvas(page);

    const req = page.locator(
      '[data-testid^="requirements-req-"][data-element-id]',
    );
    await expect(req).toHaveCount(1);
    const reqId = await req.first().getAttribute('data-element-id');
    await expect(
      page.getByTestId(`requirements-req-id-${reqId}`),
    ).toHaveText('R-001');
    await expect(
      page.getByTestId(`requirements-req-name-${reqId}`),
    ).toHaveText('Req1');
    await expect(
      page.getByTestId(`requirements-priority-${reqId}`),
    ).toHaveText('medium');
    await expect(
      page.getByTestId(`requirements-status-${reqId}`),
    ).toHaveText('draft');

    // The newly created Requirement is selected — inspector reflects it.
    await expect(page.getByTestId('inspector-requirement')).toBeVisible();
    await expect(page.getByTestId('inspector-req-id')).toHaveValue('R-001');
  });

  test('clicking + Requirement creates a Requirement; second click cascades id and name', async ({
    page,
  }) => {
    await gotoRequirements(page);
    await page.getByTestId('toolbar-add-requirement').click();
    await page.getByTestId('toolbar-add-requirement').click();

    const reqs = page.locator(
      '[data-testid^="requirements-req-"][data-element-id]',
    );
    await expect(reqs).toHaveCount(2);
    const idA = (await reqs.nth(0).getAttribute('data-element-id'))!;
    const idB = (await reqs.nth(1).getAttribute('data-element-id'))!;
    await expect(page.getByTestId(`requirements-req-id-${idA}`)).toHaveText(
      'R-001',
    );
    await expect(page.getByTestId(`requirements-req-id-${idB}`)).toHaveText(
      'R-002',
    );
    await expect(page.getByTestId(`requirements-req-name-${idA}`)).toHaveText(
      'Req1',
    );
    await expect(page.getByTestId(`requirements-req-name-${idB}`)).toHaveText(
      'Req2',
    );
  });

  test('edit reqId / priority / status / text / rationale via inspector → reflected on the node + persisted across reload', async ({
    page,
  }) => {
    await gotoRequirements(page);
    await page.getByTestId('toolbar-add-requirement').click();
    const reqs = page.locator(
      '[data-testid^="requirements-req-"][data-element-id]',
    );
    await expect(reqs).toHaveCount(1);
    const reqId = (await reqs.first().getAttribute('data-element-id'))!;

    await page.getByTestId('inspector-req-id').fill('SAFETY-42');
    await page.getByTestId('inspector-req-id').blur();
    await expect(page.getByTestId(`requirements-req-id-${reqId}`)).toHaveText(
      'SAFETY-42',
    );

    await page
      .getByTestId('inspector-req-priority')
      .selectOption('critical');
    await expect(
      page.getByTestId(`requirements-priority-${reqId}`),
    ).toHaveText('critical');

    await page
      .getByTestId('inspector-req-status')
      .selectOption('approved');
    await expect(page.getByTestId(`requirements-status-${reqId}`)).toHaveText(
      'approved',
    );

    await page
      .getByTestId('inspector-req-text')
      .fill('The system shall stop on red.');
    await page.getByTestId('inspector-req-text').blur();
    await expect(
      page.getByTestId(`requirements-req-text-${reqId}`),
    ).toContainText('The system shall stop on red.');

    await page
      .getByTestId('inspector-req-rationale')
      .fill('Compliance with EN-50128');
    await page.getByTestId('inspector-req-rationale').blur();

    // Reload — assert the seeded sessionStorage persisted everything.
    await page.reload();
    await page.getByRole('tab', { name: 'System Requirements' }).click();
    await expect(
      page.getByTestId(`requirements-req-id-${reqId}`),
    ).toHaveText('SAFETY-42');
    await expect(
      page.getByTestId(`requirements-priority-${reqId}`),
    ).toHaveText('critical');
    await expect(
      page.getByTestId(`requirements-status-${reqId}`),
    ).toHaveText('approved');
    await expect(
      page.getByTestId(`requirements-req-text-${reqId}`),
    ).toContainText('The system shall stop on red.');

    // Reselect from project tree leaf and assert rationale survived.
    await page.locator(`[data-testid="project-tree-leaf-${reqId}"]`).click();
    await expect(page.getByTestId('inspector-req-rationale')).toHaveValue(
      'Compliance with EN-50128',
    );
  });

  test('double-click name on the node enters edit mode and Enter commits', async ({
    page,
  }) => {
    await gotoRequirements(page);
    await page.getByTestId('toolbar-add-requirement').click();
    const reqs = page.locator(
      '[data-testid^="requirements-req-"][data-element-id]',
    );
    await expect(reqs).toHaveCount(1);
    const reqId = (await reqs.first().getAttribute('data-element-id'))!;

    const label = page.getByTestId(`requirements-req-name-${reqId}`);
    await label.dblclick();
    const input = page.getByTestId(`requirements-req-input-${reqId}`);
    await input.fill('Stop on red');
    await input.press('Enter');
    await expect(label).toHaveText('Stop on red');
  });

  test('Requirement leaf in project tree shows the reqId subtitle', async ({
    page,
  }) => {
    await gotoRequirements(page);
    await page.getByTestId('toolbar-add-requirement').click();
    const reqs = page.locator(
      '[data-testid^="requirements-req-"][data-element-id]',
    );
    await expect(reqs).toHaveCount(1);
    const reqId = (await reqs.first().getAttribute('data-element-id'))!;
    await expect(
      page.getByTestId(`project-tree-leaf-subtitle-${reqId}`),
    ).toHaveText('R-001');
  });

  test('@a11y Requirements canvas with one Requirement + populated inspector has no serious/critical violations', async ({
    page,
  }) => {
    await gotoRequirements(page);
    await page.getByTestId('toolbar-add-requirement').click();
    await page.getByTestId('inspector-req-text').fill('shall do X');
    await page.getByTestId('inspector-req-text').blur();
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

  test('@visual requirements-one-requirement baseline', async ({ page }) => {
    await gotoRequirements(page);
    await page.getByTestId('toolbar-add-requirement').click();
    // Clear selection so the node-selected ring is not in the baseline.
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('requirements-one-requirement.png', {
      fullPage: false,
    });
  });

  test('@visual requirements-three-requirements baseline (auto-layout)', async ({
    page,
  }) => {
    await gotoRequirements(page);
    await page.getByTestId('toolbar-add-requirement').click();
    await page.getByTestId('toolbar-add-requirement').click();
    await page.getByTestId('toolbar-add-requirement').click();
    await page.getByTestId('toolbar-auto-layout').click();
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('requirements-three-requirements.png', {
      fullPage: false,
    });
  });

  test('@visual inspector-requirement-selected baseline', async ({ page }) => {
    await gotoRequirements(page);
    await page.getByTestId('toolbar-add-requirement').click();
    await page.getByTestId('inspector-req-priority').selectOption('high');
    await page.getByTestId('inspector-req-status').selectOption('approved');
    await page
      .getByTestId('inspector-req-text')
      .fill('The system shall stop on a red signal.');
    await page.getByTestId('inspector-req-text').blur();
    await page
      .getByTestId('inspector-req-rationale')
      .fill('Required by EN-50128 §6.4.');
    await page.getByTestId('inspector-req-rationale').blur();
    await page.evaluate(async () => {
      await Promise.allSettled(document.getAnimations().map((a) => a.finished));
    });
    await expect(page).toHaveScreenshot('inspector-requirement-selected.png', {
      fullPage: false,
    });
  });
});
