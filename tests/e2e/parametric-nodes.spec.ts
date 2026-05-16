import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const SEED_PROJECT_ID = 'p-parametric-nodes';

async function seedParametricProject(page: Page): Promise<void> {
  await page.addInitScript((projectId) => {
    const key = `mbse:v1:project:${projectId}`;
    if (sessionStorage.getItem(key)) return;
    const project = {
      id: projectId,
      name: 'Parametric Nodes Seed',
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
  }, SEED_PROJECT_ID);
}

async function gotoParametric(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System Parametrics' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Parametric Diagram',
  );
}

async function dragChipOntoCanvas(
  page: Page,
  kind: 'constraint' | 'value',
  targetPosition: { x: number; y: number },
): Promise<void> {
  const chip = page.getByTestId(`parametric-palette-${kind}`);
  const canvas = page.getByTestId('canvas-drop-target');
  await chip.dragTo(canvas, { targetPosition });
}

test.describe('Parametric nodes + palette + inspector (issue #136)', () => {
  test.beforeEach(async ({ page }) => {
    await seedParametricProject(page);
  });

  test('palette chips render on the Parametric viewpoint', async ({ page }) => {
    await gotoParametric(page);
    await expect(page.getByTestId('parametric-palette')).toBeVisible();
    await expect(
      page.getByTestId('parametric-palette-constraint'),
    ).toBeVisible();
    await expect(page.getByTestId('parametric-palette-value')).toBeVisible();
    // BDD-only "+ Block" must NOT appear on the Parametric viewpoint.
    await expect(page.getByTestId('toolbar-add-block')).toHaveCount(0);
  });

  test('dragging Constraint + Value chips renders both nodes', async ({
    page,
  }) => {
    await gotoParametric(page);
    await dragChipOntoCanvas(page, 'constraint', { x: 200, y: 200 });
    await dragChipOntoCanvas(page, 'value', { x: 450, y: 200 });
    await expect(
      page.locator('[data-testid^="parametric-constraint-"][data-element-id]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="parametric-value-"][data-element-id]'),
    ).toHaveCount(1);
  });

  test('inspector edits equation on ConstraintUsage and persists across reload', async ({
    page,
  }) => {
    await gotoParametric(page);
    await dragChipOntoCanvas(page, 'constraint', { x: 200, y: 200 });
    await expect(page.getByTestId('inspector-constraint')).toBeVisible();
    await page
      .getByTestId('inspector-constraint-expression')
      .fill('F = m * a');
    await page.getByTestId('inspector-constraint-expression').blur();
    await page.reload();
    await page.getByRole('tab', { name: 'System Parametrics' }).click();
    await page
      .locator('[data-testid^="parametric-constraint-"][data-element-id]')
      .first()
      .click();
    await expect(
      page.getByTestId('inspector-constraint-expression'),
    ).toHaveValue('F = m * a');
  });

  test('inspector edits valueType + defaultValue on ValueProperty', async ({
    page,
  }) => {
    await gotoParametric(page);
    await dragChipOntoCanvas(page, 'value', { x: 300, y: 200 });
    await expect(page.getByTestId('inspector-value-property')).toBeVisible();
    await page.getByTestId('inspector-value-type').selectOption('string');
    await page.getByTestId('inspector-value-default').fill('kilograms');
    await page.getByTestId('inspector-value-default').blur();
    await page.reload();
    await page.getByRole('tab', { name: 'System Parametrics' }).click();
    await page
      .locator('[data-testid^="parametric-value-"][data-element-id]')
      .first()
      .click();
    await expect(page.getByTestId('inspector-value-type')).toHaveValue('string');
    await expect(page.getByTestId('inspector-value-default')).toHaveValue(
      'kilograms',
    );
  });

  test('Cmd-Z reverts a Constraint chip drop in one step (compound command)', async ({
    page,
  }) => {
    await gotoParametric(page);
    await dragChipOntoCanvas(page, 'constraint', { x: 200, y: 200 });
    const constraints = page.locator(
      '[data-testid^="parametric-constraint-"][data-element-id]',
    );
    await expect(constraints).toHaveCount(1);
    await page.keyboard.press('Control+z');
    await expect(constraints).toHaveCount(0);
  });

  test('@a11y Parametric canvas with Constraint + Value has no serious/critical violations', async ({
    page,
  }) => {
    await gotoParametric(page);
    await dragChipOntoCanvas(page, 'constraint', { x: 200, y: 200 });
    await dragChipOntoCanvas(page, 'value', { x: 450, y: 200 });
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

  test('@visual parametric-with-constraint-and-value baseline', async ({
    page,
  }) => {
    await gotoParametric(page);
    await dragChipOntoCanvas(page, 'constraint', { x: 200, y: 200 });
    await dragChipOntoCanvas(page, 'value', { x: 450, y: 200 });
    // Edit the equation so the baseline captures rendered expression text.
    await page
      .locator('[data-testid^="parametric-constraint-"][data-element-id]')
      .first()
      .click();
    await page
      .getByTestId('inspector-constraint-expression')
      .fill('F = m * a');
    await page.getByTestId('inspector-constraint-expression').blur();
    // Clear selection so node selection rings are not in the baseline.
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(
      'parametric-with-constraint-and-value.png',
      { fullPage: false },
    );
  });
});
