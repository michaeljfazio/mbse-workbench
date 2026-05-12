import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Phase 7 gate spec (issue #120): one orchestrated walkthrough of the full
// Use Case Diagram vertical slice, plus three @a11y scans for the screens
// called out in the issue's acceptance criteria. Mirrors phase-4/5/6-gate
// (issues #74 / #90 / #107).
//
// Walkthrough: drag Actor chip (Driver) → drag UseCase chips (Start engine,
// Authenticate driver) → Include edge → drag UseCase (Display dashboard) →
// Extend edge with extensionPoint round-trip → drag Actor (Admin) →
// Generalization edge → reload (assert persistence) → Cmd-Z cascade →
// Cmd-Shift-Z cascade (4-signal termination per the iter-40 lesson) →
// project-tree-leaf selection of UseCase (iter-33 lesson: REPLACES vs
// canvas click MERGES).
//
// Per ADR 0007 the validator rejects mixed Actor↔UseCase pairings — the
// gate exercises the happy paths only (rejection is covered by
// use-case-edges.spec.ts).
//
// No new @visual baselines are added here — per-feature baselines from
// #118/#119 cover every persistent canvas state.

const SEED_PROJECT_ID = 'p-phase-7-gate';
const BDD_DIAGRAM_ID = 'd-bdd';
const USE_CASE_DIAGRAM_ID = 'd-use-case';

async function seedEmptyProject(page: Page): Promise<void> {
  // addInitScript fires on every page load including reload — guard the seed
  // so the workspace autosave survives the reload step (iter-30 lesson in
  // docs/CONTEXT.md).
  await page.addInitScript(
    ({ projectId, bddId, useCaseId }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Phase 7 Gate Seed',
        createdAt: '2026-05-12T10:00:00.000Z',
        modifiedAt: '2026-05-12T10:05:00.000Z',
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
            id: useCaseId,
            viewpointId: 'use-case',
            name: 'System Use Cases',
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
      useCaseId: USE_CASE_DIAGRAM_ID,
    },
  );
}

async function gotoUseCase(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System Use Cases' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Use Case Diagram',
  );
}

interface StoredElement {
  readonly id: string;
  readonly kind: string;
  readonly name?: string;
  readonly text?: string;
}

interface StoredEdge {
  readonly id: string;
  readonly kind: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly extensionPoint?: string;
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
  kind: 'actor' | 'usecase',
  targetPosition: { x: number; y: number },
): Promise<string> {
  // The new element auto-selects on drop. Count nodes by data-attr before vs
  // after to resolve its id (same approach as phase-6-gate).
  const matching = page.locator(
    `[data-use-case-node-kind="${kind}"][data-element-id]`,
  );
  const before = await matching.count();
  const chip = page.getByTestId(`use-case-palette-${kind}`);
  const canvas = page.getByTestId('canvas-drop-target');
  await chip.dragTo(canvas, { targetPosition });
  await expect(matching).toHaveCount(before + 1);
  const id = await matching.nth(before).getAttribute('data-element-id');
  if (!id) throw new Error(`Drop did not produce a use-case-${kind} node`);
  return id;
}

async function inlineRename(
  page: Page,
  kind: 'actor' | 'usecase',
  id: string,
  name: string,
): Promise<void> {
  await page.getByTestId(`use-case-${kind}-label-${id}`).dblclick();
  const input = page.getByTestId(`use-case-${kind}-input-${id}`);
  await input.fill(name);
  await input.press('Enter');
  await expect(page.getByTestId(`use-case-${kind}-label-${id}`)).toHaveText(
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

function bottomHandle(page: Page, kind: 'actor' | 'usecase', id: string): Locator {
  return page
    .getByTestId(`use-case-${kind}-${id}`)
    .locator('.react-flow__handle-bottom');
}

function topHandle(page: Page, kind: 'actor' | 'usecase', id: string): Locator {
  return page
    .getByTestId(`use-case-${kind}-${id}`)
    .locator('.react-flow__handle-top');
}

test.describe('Phase 7 gate (issue #120)', () => {
  test.beforeEach(async ({ page }) => {
    await seedEmptyProject(page);
  });

  test('Use Case vertical slice: chip drops + inline rename → three stereotype edges → reload → undo cascade → redo → project-tree-leaf select', async ({
    page,
    browserName,
  }) => {
    await gotoUseCase(page);

    // Step 1 — drag Actor chip → inline rename to Driver. Positions keep
    // everything under y≈460 to fit the canvas-drop-target (iter-40 lesson).
    const driverId = await dragChip(page, 'actor', { x: 480, y: 80 });
    await expect(
      page.getByTestId(`use-case-actor-label-${driverId}`),
    ).toHaveText('Actor1');
    await inlineRename(page, 'actor', driverId, 'Driver');

    // Step 2 — Start engine UseCase.
    const startId = await dragChip(page, 'usecase', { x: 140, y: 80 });
    await expect(
      page.getByTestId(`use-case-usecase-label-${startId}`),
    ).toHaveText('UC1');
    await inlineRename(page, 'usecase', startId, 'Start engine');

    // Step 3 — Authenticate driver UseCase. Cascading defaults gap-fill
    // freed names (the previous rename released 'UC1'), so the new label
    // value isn't asserted here — only that inline rename takes effect.
    const authId = await dragChip(page, 'usecase', { x: 140, y: 240 });
    await inlineRename(page, 'usecase', authId, 'Authenticate driver');

    // Step 4 — Include edge: Start engine → Authenticate driver. Popover
    // defaults to Include for UseCase↔UseCase (ADR 0007).
    await dragHandle(
      page,
      bottomHandle(page, 'usecase', startId),
      topHandle(page, 'usecase', authId),
    );
    await expect(
      page.getByTestId('use-case-edge-kind-popover'),
    ).toBeVisible();
    await page.getByTestId('use-case-edge-kind-Include').click();
    await expect(page.locator('g[data-include-edge="true"]')).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="use-case-include-edge-label-"]').first(),
    ).toContainText('«include»');

    // Step 5 — Display dashboard UseCase (default name not asserted —
    // gap-fill of freed names).
    const dashId = await dragChip(page, 'usecase', { x: 140, y: 380 });
    await inlineRename(page, 'usecase', dashId, 'Display dashboard');

    // Step 6 — Extend edge: Start engine → Display dashboard + extensionPoint.
    await dragHandle(
      page,
      bottomHandle(page, 'usecase', startId),
      topHandle(page, 'usecase', dashId),
    );
    await page.getByTestId('use-case-edge-kind-Extend').click();
    await expect(page.locator('g[data-extend-edge="true"]')).toHaveCount(1);
    await expect(page.getByTestId('inspector-extend-edge')).toBeVisible();
    const extPoint = page.getByTestId('inspector-extend-extension-point');
    await extPoint.fill('on-start');
    await extPoint.press('Enter');
    await expect(
      page
        .locator('[data-testid^="use-case-extend-edge-extension-point-"]')
        .first(),
    ).toContainText('on-start');

    // Step 7 — Admin Actor (default name not asserted — gap-fill).
    const adminId = await dragChip(page, 'actor', { x: 480, y: 320 });
    await inlineRename(page, 'actor', adminId, 'Admin');

    // Step 8 — Generalization edge: Admin → Driver. Popover defaults to
    // Generalization for Actor↔Actor; Include/Extend are disabled.
    await dragHandle(
      page,
      bottomHandle(page, 'actor', adminId),
      topHandle(page, 'actor', driverId),
    );
    await expect(
      page.getByTestId('use-case-edge-kind-popover'),
    ).toBeVisible();
    await page.getByTestId('use-case-edge-kind-Generalization').click();
    await expect(
      page.locator('g[data-generalization-edge="true"]'),
    ).toHaveCount(1);

    // Step 9 — assert sessionStorage carries 5 elements (2 Actor + 3
    // UseCase) and 3 edges with the right kinds + extensionPoint.
    let snapshot = await readProject(page);
    expect(snapshot.elements.filter((e) => e.kind === 'Actor')).toHaveLength(2);
    expect(snapshot.elements.filter((e) => e.kind === 'UseCase')).toHaveLength(
      3,
    );
    const includeEdge = snapshot.edges.find((e) => e.kind === 'Include');
    const extendEdge = snapshot.edges.find((e) => e.kind === 'Extend');
    const genEdge = snapshot.edges.find((e) => e.kind === 'Generalization');
    expect(includeEdge).toBeDefined();
    expect(extendEdge).toBeDefined();
    expect(genEdge).toBeDefined();
    expect(extendEdge!.extensionPoint).toBe('on-start');
    expect(includeEdge!.sourceId).toBe(startId);
    expect(includeEdge!.targetId).toBe(authId);
    expect(genEdge!.sourceId).toBe(adminId);
    expect(genEdge!.targetId).toBe(driverId);

    // Step 10 — reload; everything persists.
    await page.reload();
    await page.getByRole('tab', { name: 'System Use Cases' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Use Case Diagram',
    );
    await expect(
      page.locator('[data-use-case-node-kind="actor"]'),
    ).toHaveCount(2);
    await expect(
      page.locator('[data-use-case-node-kind="usecase"]'),
    ).toHaveCount(3);
    await expect(page.locator('g[data-include-edge="true"]')).toHaveCount(1);
    await expect(page.locator('g[data-extend-edge="true"]')).toHaveCount(1);
    await expect(
      page.locator('g[data-generalization-edge="true"]'),
    ).toHaveCount(1);
    await expect(
      page
        .locator('[data-testid^="use-case-extend-edge-extension-point-"]')
        .first(),
    ).toContainText('on-start');

    // Step 11 — Cmd-Z cascade. Blur any focused input so the global handler
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
        return (p.elements?.length ?? 0) + (p.edges?.length ?? 0);
      }, SEED_PROJECT_ID);

    // 5 chip drops + 5 inline renames + 3 edge creates + 1 extensionPoint
    // update = 14 expected history entries. 40 is a generous upper bound.
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
    expect(snapshot.elements).toEqual([]);
    expect(snapshot.edges).toEqual([]);

    // Step 12 — redo all the way forward. Termination needs 4 signals:
    // 5 elements + 3 edges + extensionPoint set + final Actor name 'Admin'
    // present. Trailing `update-edge` and rename commands don't change
    // element/edge counts so count-only termination would exit early (iter-40
    // lesson).
    const readRedoState = async (): Promise<{
      readonly elements: number;
      readonly edges: number;
      readonly hasExtensionPoint: boolean;
      readonly hasRenames: boolean;
    }> =>
      page.evaluate(
        ({ id, startUseCaseId, driverActorId, adminActorId }) => {
          const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
          if (!raw) {
            return {
              elements: 0,
              edges: 0,
              hasExtensionPoint: false,
              hasRenames: false,
            };
          }
          const p = JSON.parse(raw);
          const elements = (p.elements ?? []) as Array<{
            id: string;
            kind: string;
            name?: string;
          }>;
          const edges = (p.edges ?? []) as Array<{
            kind: string;
            extensionPoint?: string;
          }>;
          const extendEdgeEntry = edges.find((e) => e.kind === 'Extend');
          const start = elements.find((e) => e.id === startUseCaseId);
          const driver = elements.find((e) => e.id === driverActorId);
          const admin = elements.find((e) => e.id === adminActorId);
          return {
            elements: elements.length,
            edges: edges.length,
            hasExtensionPoint: extendEdgeEntry?.extensionPoint === 'on-start',
            hasRenames:
              start?.name === 'Start engine' &&
              driver?.name === 'Driver' &&
              admin?.name === 'Admin',
          };
        },
        {
          id: SEED_PROJECT_ID,
          startUseCaseId: startId,
          driverActorId: driverId,
          adminActorId: adminId,
        },
      );

    const redoUntilFullyRestored = async (maxSteps: number): Promise<void> => {
      for (let i = 0; i < maxSteps; i += 1) {
        const state = await readRedoState();
        if (
          state.elements === 5 &&
          state.edges === 3 &&
          state.hasExtensionPoint &&
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
        elements: 5,
        edges: 3,
        hasExtensionPoint: true,
        hasRenames: true,
      });
    };
    await redoUntilFullyRestored(40);

    // Step 13 — select Start engine via project-tree-leaf (REPLACES selection
    // unlike canvas clicks which MERGE — iter-33 lesson). Confirm inspector
    // shows the UseCase text field.
    await page.getByTestId(`project-tree-leaf-${startId}`).click();
    await expect(page.getByTestId('inspector-name')).toHaveValue(
      'Start engine',
    );
    await expect(page.getByTestId('inspector-usecase-text')).toBeVisible();
  });

  test('@a11y empty Use Case canvas has no serious/critical violations', async ({
    page,
  }) => {
    await gotoUseCase(page);
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

  test('@a11y populated Use Case canvas (2 actors + 3 usecases + 3 edges) has no serious/critical violations', async ({
    page,
  }) => {
    await gotoUseCase(page);
    const driverId = await dragChip(page, 'actor', { x: 480, y: 80 });
    const startId = await dragChip(page, 'usecase', { x: 140, y: 80 });
    const authId = await dragChip(page, 'usecase', { x: 140, y: 240 });
    const dashId = await dragChip(page, 'usecase', { x: 140, y: 380 });
    const adminId = await dragChip(page, 'actor', { x: 480, y: 320 });

    await dragHandle(
      page,
      bottomHandle(page, 'usecase', startId),
      topHandle(page, 'usecase', authId),
    );
    await page.getByTestId('use-case-edge-kind-Include').click();
    await expect(page.locator('g[data-include-edge="true"]')).toHaveCount(1);

    await dragHandle(
      page,
      bottomHandle(page, 'usecase', startId),
      topHandle(page, 'usecase', dashId),
    );
    await page.getByTestId('use-case-edge-kind-Extend').click();
    await expect(page.locator('g[data-extend-edge="true"]')).toHaveCount(1);

    await dragHandle(
      page,
      bottomHandle(page, 'actor', adminId),
      topHandle(page, 'actor', driverId),
    );
    await page.getByTestId('use-case-edge-kind-Generalization').click();
    await expect(
      page.locator('g[data-generalization-edge="true"]'),
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

  test('@a11y inspector with Extend edge selected (extensionPoint field visible) has no serious/critical violations', async ({
    page,
  }) => {
    await gotoUseCase(page);
    const startId = await dragChip(page, 'usecase', { x: 140, y: 80 });
    const dashId = await dragChip(page, 'usecase', { x: 140, y: 280 });
    await dragHandle(
      page,
      bottomHandle(page, 'usecase', startId),
      topHandle(page, 'usecase', dashId),
    );
    await page.getByTestId('use-case-edge-kind-Extend').click();
    await expect(page.getByTestId('inspector-extend-edge')).toBeVisible();
    await page.getByTestId('inspector-extend-extension-point').fill('on-start');
    await page.getByTestId('inspector-extend-extension-point').press('Enter');

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
