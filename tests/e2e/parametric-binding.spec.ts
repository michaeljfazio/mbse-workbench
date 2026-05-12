import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Seed a Parametric diagram with one ConstraintUsage and two ValueProperty
// nodes, so the spec exercises only the edge-creation path.

const SEED_PROJECT_ID = 'p-parametric-binding';
const CU_A = 'cu-a';
const CD_A = 'cd-a';
const VP_M = 'vp-m';
const VP_A = 'vp-a';

async function seed(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, cu, cd, vpm, vpa }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Parametric Binding Seed',
        createdAt: '2026-05-12T10:00:00.000Z',
        modifiedAt: '2026-05-12T10:05:00.000Z',
        elements: [
          {
            id: cd,
            kind: 'ConstraintDefinition',
            name: 'NewtonsSecondLaw',
            expression: 'F = m * a',
            parameterIds: [],
          },
          {
            id: cu,
            kind: 'ConstraintUsage',
            name: 'Newton',
            definitionId: cd,
          },
          {
            id: vpm,
            kind: 'ValueProperty',
            name: 'mass',
            valueType: 'number',
            defaultValue: 1,
          },
          {
            id: vpa,
            kind: 'ValueProperty',
            name: 'accel',
            valueType: 'number',
            defaultValue: 9.8,
          },
        ],
        edges: [],
        diagrams: [
          {
            id: 'd-parametric',
            viewpointId: 'parametric',
            name: 'System Parametrics',
            positions: {
              [cu]: { x: 220, y: 100 },
              [vpm]: { x: 80, y: 320 },
              [vpa]: { x: 360, y: 320 },
            },
          },
        ],
        history: { undo: [], redo: [] },
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    { projectId: SEED_PROJECT_ID, cu: CU_A, cd: CD_A, vpm: VP_M, vpa: VP_A },
  );
}

async function gotoParametric(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System Parametrics' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Parametric Diagram',
  );
  await expect(
    page.locator(
      '[data-testid^="parametric-constraint-"][data-element-id]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-testid^="parametric-value-"][data-element-id]'),
  ).toHaveCount(2);
}

async function handleCenter(
  handle: Locator,
): Promise<{ x: number; y: number }> {
  const box = await handle.boundingBox();
  if (!box) throw new Error('Handle bounding box unavailable');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function dragHandle(
  page: Page,
  source: Locator,
  target: Locator,
): Promise<void> {
  const start = await handleCenter(source);
  const end = await handleCenter(target);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await page.mouse.move(
      start.x + (end.x - start.x) * t,
      start.y + (end.y - start.y) * t,
    );
  }
  await page.mouse.up();
}

test.describe('Parametric ParameterBinding edges (issue #137)', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page);
  });

  test('drag from ConstraintUsage bottom to ValueProperty top creates a binding', async ({
    page,
  }) => {
    await gotoParametric(page);
    await dragHandle(
      page,
      page.getByTestId(`parametric-handle-bottom-${CU_A}`),
      page.getByTestId(`parametric-handle-top-${VP_M}`),
    );
    const edge = page.locator('[data-testid^="parametric-binding-edge-"]');
    await expect(edge).toHaveCount(1);
    // Inspector reflects the new edge.
    await expect(
      page.getByTestId('inspector-parameter-binding-edge'),
    ).toBeVisible();
    await expect(
      page.getByTestId('inspector-parameter-binding-source'),
    ).toContainText('Newton');
    await expect(
      page.getByTestId('inspector-parameter-binding-target'),
    ).toContainText('mass');
  });

  test('drag from ValueProperty up to ConstraintUsage is canonicalised to ConstraintUsage→ValueProperty', async ({
    page,
  }) => {
    await gotoParametric(page);
    await dragHandle(
      page,
      page.getByTestId(`parametric-handle-bottom-${VP_M}`),
      page.getByTestId(`parametric-handle-top-${CU_A}`),
    );
    await expect(
      page.locator('[data-testid^="parametric-binding-edge-"]'),
    ).toHaveCount(1);
    await expect(
      page.getByTestId('inspector-parameter-binding-source'),
    ).toContainText('Newton');
    await expect(
      page.getByTestId('inspector-parameter-binding-target'),
    ).toContainText('mass');
  });

  test('a duplicate drag between the same pair leaves only one edge', async ({
    page,
  }) => {
    await gotoParametric(page);
    await dragHandle(
      page,
      page.getByTestId(`parametric-handle-bottom-${CU_A}`),
      page.getByTestId(`parametric-handle-top-${VP_M}`),
    );
    await expect(
      page.locator('[data-testid^="parametric-binding-edge-"]'),
    ).toHaveCount(1);
    // Second drag (same pair, reversed) should be rejected.
    await dragHandle(
      page,
      page.getByTestId(`parametric-handle-bottom-${VP_M}`),
      page.getByTestId(`parametric-handle-top-${CU_A}`),
    );
    await expect(
      page.locator('[data-testid^="parametric-binding-edge-"]'),
    ).toHaveCount(1);
  });

  test('Cmd-Z undoes a binding creation; redo replays it', async ({ page }) => {
    await gotoParametric(page);
    await dragHandle(
      page,
      page.getByTestId(`parametric-handle-bottom-${CU_A}`),
      page.getByTestId(`parametric-handle-top-${VP_M}`),
    );
    const edge = page.locator('[data-testid^="parametric-binding-edge-"]');
    await expect(edge).toHaveCount(1);
    await page.keyboard.press('Control+z');
    await expect(edge).toHaveCount(0);
    await page.keyboard.press('Control+Shift+z');
    await expect(edge).toHaveCount(1);
  });

  test('Inspector label edit persists across reload', async ({ page }) => {
    await gotoParametric(page);
    await dragHandle(
      page,
      page.getByTestId(`parametric-handle-bottom-${CU_A}`),
      page.getByTestId(`parametric-handle-top-${VP_M}`),
    );
    await page.getByTestId('inspector-parameter-binding-label').fill('mass');
    await page.getByTestId('inspector-parameter-binding-label').press('Enter');

    await page.reload();
    await page.getByRole('tab', { name: 'System Parametrics' }).click();
    await expect(
      page.locator('[data-testid^="parametric-binding-edge-"]'),
    ).toHaveCount(1);
    const stored = await page.evaluate((projectId) => {
      const raw = sessionStorage.getItem(`mbse:v1:project:${projectId}`);
      if (!raw) return null;
      const project = JSON.parse(raw) as {
        edges: { kind: string; label?: string }[];
      };
      return project.edges.find((e) => e.kind === 'ParameterBinding')?.label;
    }, SEED_PROJECT_ID);
    expect(stored).toBe('mass');
  });

  test('@a11y Parametric canvas with a binding edge has no serious/critical violations', async ({
    page,
  }) => {
    await gotoParametric(page);
    await dragHandle(
      page,
      page.getByTestId(`parametric-handle-bottom-${CU_A}`),
      page.getByTestId(`parametric-handle-top-${VP_M}`),
    );
    await expect(
      page.locator('[data-testid^="parametric-binding-edge-"]'),
    ).toHaveCount(1);
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

  test('@visual parametric-with-binding baseline', async ({ page }) => {
    await gotoParametric(page);
    await dragHandle(
      page,
      page.getByTestId(`parametric-handle-bottom-${CU_A}`),
      page.getByTestId(`parametric-handle-top-${VP_M}`),
    );
    await dragHandle(
      page,
      page.getByTestId(`parametric-handle-bottom-${CU_A}`),
      page.getByTestId(`parametric-handle-top-${VP_A}`),
    );
    await expect(
      page.locator('[data-testid^="parametric-binding-edge-"]'),
    ).toHaveCount(2);
    // Clear selection so no selection ring is in the baseline.
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('parametric-with-binding.png', {
      fullPage: false,
    });
  });
});
