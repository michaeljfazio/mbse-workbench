import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Phase 8 gate spec (issue #138): one orchestrated walkthrough of the full
// Parametric Diagram vertical slice, plus three @a11y scans for the screens
// called out in the issue's acceptance criteria. Mirrors phase-4/5/6/7-gate.
//
// Walkthrough: drag Constraint chip → inline rename (Newton) → drag Value
// chip → inline rename (mass) → edit equation on Constraint via inspector →
// edit defaultValue on Value via inspector → draw ParameterBinding edge →
// reload (asserts persistence) → Cmd-Z cascade (4-signal termination per the
// iter-40 lesson) → Cmd-Shift-Z cascade.
//
// No new @visual baselines are added here — per-feature baselines from
// #136/#137 cover every persistent canvas state.

const SEED_PROJECT_ID = 'p-phase-8-gate';
const BDD_DIAGRAM_ID = 'd-bdd';
const PARAMETRIC_DIAGRAM_ID = 'd-parametric';

async function seedEmptyProject(page: Page): Promise<void> {
  // addInitScript fires on every page load including reload — guard the seed
  // so the workspace autosave survives the reload step.
  await page.addInitScript(
    ({ projectId, bddId, parametricId }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Phase 8 Gate Seed',
        createdAt: '2026-05-13T10:00:00.000Z',
        modifiedAt: '2026-05-13T10:05:00.000Z',
        elements: [],
        edges: [],
        diagrams: [
          {
            id: bddId,
            viewpointId: 'bdd',
            name: 'Main BDD',
            positions: {},
          },
          {
            id: parametricId,
            viewpointId: 'parametric',
            name: 'System Parametrics',
            positions: {},
          },
        ],
        history: { undo: [], redo: [] },
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      bddId: BDD_DIAGRAM_ID,
      parametricId: PARAMETRIC_DIAGRAM_ID,
    },
  );
}

async function gotoParametric(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System Parametrics' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Parametric Diagram',
  );
}

interface StoredElement {
  readonly id: string;
  readonly kind: string;
  readonly name?: string;
  readonly ownerId?: string | null;
  readonly expression?: string;
  readonly defaultValue?: string | number | boolean;
  readonly definitionId?: string;
}

interface StoredEdge {
  readonly id: string;
  readonly kind: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly label?: string;
}

async function readProject(
  page: Page,
): Promise<{
  readonly elements: readonly StoredElement[];
  readonly edges: readonly StoredEdge[];
}> {
  return await page.evaluate((id) => {
    const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
    if (!raw) return { elements: [], edges: [] };
    const project = JSON.parse(raw);
    return {
      elements: (project.elements ?? []) as StoredElement[],
      edges: (project.edges ?? []) as StoredEdge[],
    };
  }, SEED_PROJECT_ID);
}

async function dragChip(
  page: Page,
  kind: 'constraint' | 'value',
  targetPosition: { x: number; y: number },
): Promise<string> {
  const matching = page.locator(
    `[data-testid^="parametric-${kind}-"][data-element-id]`,
  );
  const before = await matching.count();
  const chip = page.getByTestId(`parametric-palette-${kind}`);
  const canvas = page.getByTestId('canvas-drop-target');
  await chip.dragTo(canvas, { targetPosition });
  await expect(matching).toHaveCount(before + 1);
  const id = await matching.nth(before).getAttribute('data-element-id');
  if (!id) throw new Error(`Drop did not produce a parametric-${kind} node`);
  return id;
}

async function inlineRename(
  page: Page,
  kind: 'constraint' | 'value',
  id: string,
  name: string,
): Promise<void> {
  await page.getByTestId(`parametric-${kind}-name-${id}`).dblclick();
  const input = page.getByTestId(`parametric-${kind}-input-${id}`);
  await input.fill(name);
  await input.press('Enter');
  await expect(page.getByTestId(`parametric-${kind}-name-${id}`)).toHaveText(
    name,
  );
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

test.describe('Phase 8 gate (issue #138)', () => {
  test.beforeEach(async ({ page }) => {
    await seedEmptyProject(page);
  });

  test('Parametric vertical slice: chip drops + inline rename → inspector edits → ParameterBinding edge → reload → undo cascade → redo', async ({
    page,
    browserName,
  }) => {
    await gotoParametric(page);

    // Step 1 — drag Constraint chip; default name is Constraint1; rename to
    // Newton. Positions keep everything under y≈460 to fit the
    // canvas-drop-target (iter-40 lesson).
    const constraintId = await dragChip(page, 'constraint', { x: 220, y: 100 });
    await expect(
      page.getByTestId(`parametric-constraint-name-${constraintId}`),
    ).toHaveText('Constraint1');
    await inlineRename(page, 'constraint', constraintId, 'Newton');

    // Step 2 — drag Value chip; rename to mass.
    const valueId = await dragChip(page, 'value', { x: 220, y: 340 });
    await expect(
      page.getByTestId(`parametric-value-name-${valueId}`),
    ).toHaveText('value1');
    await inlineRename(page, 'value', valueId, 'mass');

    // Step 3 — edit equation on Constraint via inspector. Select first to
    // surface the ConstraintExtras panel.
    await page
      .locator(`[data-testid="parametric-constraint-${constraintId}"]`)
      .click();
    await expect(page.getByTestId('inspector-constraint')).toBeVisible();
    await page.getByTestId('inspector-constraint-expression').fill('F = m * a');
    await page.getByTestId('inspector-constraint-expression').blur();
    await expect(
      page.getByTestId(`parametric-constraint-expression-${constraintId}`),
    ).toContainText('F = m * a');

    // Step 4 — edit defaultValue on Value via inspector. valueType defaults
    // to 'string' for chip drops; switch to 'number' so '9.8' parses.
    await page
      .locator(`[data-testid="parametric-value-${valueId}"]`)
      .click();
    await expect(page.getByTestId('inspector-value-property')).toBeVisible();
    await page.getByTestId('inspector-value-type').selectOption('number');
    await page.getByTestId('inspector-value-default').fill('9.8');
    await page.getByTestId('inspector-value-default').blur();
    await expect(
      page.getByTestId(`parametric-value-meta-${valueId}`),
    ).toContainText('9.8');

    // Step 5 — draw ParameterBinding edge: Constraint bottom → Value top.
    await dragHandle(
      page,
      page.getByTestId(`parametric-handle-bottom-${constraintId}`),
      page.getByTestId(`parametric-handle-top-${valueId}`),
    );
    const edge = page.locator('[data-testid^="parametric-binding-edge-"]');
    await expect(edge).toHaveCount(1);
    await expect(
      page.getByTestId('inspector-parameter-binding-edge'),
    ).toBeVisible();

    // Step 6 — assert sessionStorage carries the expected shape. Chip drop
    // for ConstraintUsage compounds (CD + CU) so we expect 3 elements
    // (ConstraintDefinition + ConstraintUsage + ValueProperty) + 1 edge.
    let snapshot = await readProject(page);
    expect(
      snapshot.elements.filter((e) => e.kind === 'ConstraintUsage'),
    ).toHaveLength(1);
    expect(
      snapshot.elements.filter((e) => e.kind === 'ConstraintDefinition'),
    ).toHaveLength(1);
    expect(
      snapshot.elements.filter((e) => e.kind === 'ValueProperty'),
    ).toHaveLength(1);
    const constraintEl = snapshot.elements.find(
      (e) => e.id === constraintId,
    );
    expect(constraintEl?.name).toBe('Newton');
    const definitionEl = snapshot.elements.find(
      (e) => e.kind === 'ConstraintDefinition',
    );
    expect(definitionEl?.expression).toBe('F = m * a');
    const valueEl = snapshot.elements.find((e) => e.id === valueId);
    expect(valueEl?.name).toBe('mass');
    expect(valueEl?.defaultValue).toBe(9.8);
    const bindingEdge = snapshot.edges.find(
      (e) => e.kind === 'ParameterBinding',
    );
    expect(bindingEdge).toBeDefined();
    expect(bindingEdge!.sourceId).toBe(constraintId);
    expect(bindingEdge!.targetId).toBe(valueId);

    // Step 7 — reload; everything persists.
    await page.reload();
    await page.getByRole('tab', { name: 'System Parametrics' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Parametric Diagram',
    );
    await expect(
      page.locator('[data-testid^="parametric-constraint-"][data-element-id]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="parametric-value-"][data-element-id]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="parametric-binding-edge-"]'),
    ).toHaveCount(1);
    await expect(
      page.getByTestId(`parametric-constraint-name-${constraintId}`),
    ).toHaveText('Newton');
    await expect(
      page.getByTestId(`parametric-value-name-${valueId}`),
    ).toHaveText('mass');
    await expect(
      page.getByTestId(`parametric-constraint-expression-${constraintId}`),
    ).toContainText('F = m * a');
    await expect(
      page.getByTestId(`parametric-value-meta-${valueId}`),
    ).toContainText('9.8');

    // Step 8 — Cmd-Z cascade. Blur any focused input so the global handler
    // routes to model undo (iter-44 lesson).
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    const modifier = browserName === 'webkit' ? 'Meta' : 'Control';
    await page.evaluate(() => {
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
      ) {
        document.activeElement.blur();
      }
    });
    const undo = async (): Promise<void> => {
      await page.keyboard.press(`${modifier}+KeyZ`);
    };
    const redo = async (): Promise<void> => {
      await page.keyboard.press(`${modifier}+Shift+KeyZ`);
    };

    const totalCount = async (): Promise<number> =>
      page.evaluate((id) => {
        const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
        if (!raw) return 0;
        const p = JSON.parse(raw);
        // Exclude the synthesized root Package (ownerId === null) — it
        // always exists and should not block the "empty" termination check.
        return (
          (p.elements?.filter((e: { ownerId: unknown }) => e.ownerId !== null).length ?? 0) +
          (p.edges?.length ?? 0)
        );
      }, SEED_PROJECT_ID);

    const undoUntilEmpty = async (maxSteps: number): Promise<void> => {
      for (let i = 0; i < maxSteps; i += 1) {
        if ((await totalCount()) === 0) return;
        await undo();
        await page.waitForTimeout(20);
      }
      expect(
        await totalCount(),
        `Undo cascade did not fully roll back in ${maxSteps} presses`,
      ).toBe(0);
    };
    await undoUntilEmpty(40);

    snapshot = await readProject(page);
    // After full undo only the synthesized root Package (ownerId === null) remains.
    expect(snapshot.elements.filter((e) => e.ownerId !== null)).toEqual([]);
    expect(snapshot.edges).toEqual([]);

    // Step 9 — redo all the way forward. Termination needs 4 signals:
    // 3 elements (CD + CU + VP) + 1 edge + expression set + defaultValue set
    // + renames present. Trailing `update-element`/`update-edge` commands
    // don't change element/edge counts so count-only termination would exit
    // early (iter-40 lesson).
    const readRedoState = async (): Promise<{
      readonly elements: number;
      readonly edges: number;
      readonly hasExpression: boolean;
      readonly hasDefaultValue: boolean;
      readonly hasRenames: boolean;
    }> =>
      page.evaluate(
        ({ id, constraintUsageId, valuePropertyId }) => {
          const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
          if (!raw) {
            return {
              elements: 0,
              edges: 0,
              hasExpression: false,
              hasDefaultValue: false,
              hasRenames: false,
            };
          }
          const p = JSON.parse(raw);
          const allElements = (p.elements ?? []) as Array<{
            id: string;
            kind: string;
            name?: string;
            ownerId?: string | null;
            expression?: string;
            defaultValue?: unknown;
          }>;
          // Exclude synthesized root Package so the count reflects user elements only.
          const elements = allElements.filter((e) => e.ownerId !== null);
          const edges = (p.edges ?? []) as Array<{ kind: string }>;
          const constraintUsage = elements.find(
            (e) => e.id === constraintUsageId,
          );
          const value = elements.find((e) => e.id === valuePropertyId);
          const definition = elements.find(
            (e) => e.kind === 'ConstraintDefinition',
          );
          return {
            elements: elements.length,
            edges: edges.length,
            hasExpression: definition?.expression === 'F = m * a',
            hasDefaultValue: value?.defaultValue === 9.8,
            hasRenames:
              constraintUsage?.name === 'Newton' && value?.name === 'mass',
          };
        },
        {
          id: SEED_PROJECT_ID,
          constraintUsageId: constraintId,
          valuePropertyId: valueId,
        },
      );

    const redoUntilFullyRestored = async (
      maxSteps: number,
    ): Promise<void> => {
      for (let i = 0; i < maxSteps; i += 1) {
        const state = await readRedoState();
        if (
          state.elements === 3 &&
          state.edges === 1 &&
          state.hasExpression &&
          state.hasDefaultValue &&
          state.hasRenames
        ) {
          return;
        }
        await redo();
        await page.waitForTimeout(20);
      }
      expect(
        await readRedoState(),
        `Redo cascade did not fully restore in ${maxSteps} presses`,
      ).toEqual({
        elements: 3,
        edges: 1,
        hasExpression: true,
        hasDefaultValue: true,
        hasRenames: true,
      });
    };
    await redoUntilFullyRestored(40);
  });

  test('@a11y empty Parametric canvas has no serious/critical violations', async ({
    page,
  }) => {
    await gotoParametric(page);
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

  test('@a11y populated Parametric canvas (Constraint + Value + binding edge) has no serious/critical violations', async ({
    page,
  }) => {
    await gotoParametric(page);
    const constraintId = await dragChip(page, 'constraint', { x: 220, y: 100 });
    const valueId = await dragChip(page, 'value', { x: 220, y: 340 });
    await dragHandle(
      page,
      page.getByTestId(`parametric-handle-bottom-${constraintId}`),
      page.getByTestId(`parametric-handle-top-${valueId}`),
    );
    await expect(
      page.locator('[data-testid^="parametric-binding-edge-"]'),
    ).toHaveCount(1);

    // Clear selection so focus rings don't dominate the axe sample.
    await page.locator('body').click({ position: { x: 4, y: 4 } });
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

  test('@a11y inspector with ConstraintUsage selected (expression field visible) has no serious/critical violations', async ({
    page,
  }) => {
    await gotoParametric(page);
    const constraintId = await dragChip(page, 'constraint', { x: 220, y: 100 });
    await page
      .locator(`[data-testid="parametric-constraint-${constraintId}"]`)
      .click();
    await expect(page.getByTestId('inspector-constraint')).toBeVisible();
    await page.getByTestId('inspector-constraint-expression').fill('F = m * a');
    await page.getByTestId('inspector-constraint-expression').blur();

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
});
