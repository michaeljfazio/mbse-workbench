import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Phase 5 gate spec (issue #90): one orchestrated walkthrough of the full
// Activity vertical slice, plus three @a11y scans for the screens called out
// in the issue's acceptance criteria. Mirrors `tests/e2e/phase-4-gate.spec.ts`
// (issue #74) and `tests/e2e/phase-3-gate.spec.ts` (issue #54).
//
// The walkthrough covers: drop pseudostate + action + diamond + merge chips
// → rename → wire ControlFlow chain → guard one edge → wire one ObjectFlow
// with Shift → reload → Cmd-Z cascade until empty → Cmd-Shift-Z cascade
// forward → final reload. Per ADR 0005 § 4 the validator already refuses
// final-as-source and initial-as-target wiring; the gate exercises the
// happy paths (those refusals are covered by `activity-edges.spec.ts`).
//
// No new @visual baselines are added here — the issue calls them out as
// optional and the per-feature baselines from #87/#88/#89 already cover
// every persistent canvas state. (Per the iteration-39 lesson, adding a
// new baseline file would also require creating the parallel
// `tests/e2e/__screenshots__/phase-5-gate.spec.ts/` directory with
// first-time PNGs.)

const SEED_PROJECT_ID = 'p-phase-5-gate';
const BDD_DIAGRAM_ID = 'd-bdd';
const ACTIVITY_DIAGRAM_ID = 'd-activity';

async function seedEmptyProject(page: Page): Promise<void> {
  // addInitScript fires on every page load (including reload) — guard the
  // seed so the workspace's autosave survives the reload step in the
  // walkthrough. Per `docs/CONTEXT.md` 2026-05-12 entry.
  await page.addInitScript(
    ({ projectId, bddId, activityId }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Phase 5 Gate Seed',
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
            id: activityId,
            viewpointId: 'activity',
            name: 'System Activity',
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
      activityId: ACTIVITY_DIAGRAM_ID,
    },
  );
}

async function gotoActivity(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System Activity' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Activity Diagram',
  );
}

interface StoredElement {
  readonly id: string;
  readonly kind: string;
  readonly name?: string;
  readonly ownerId?: string | null;
  readonly nodeType?: string;
}

interface StoredEdge {
  readonly id: string;
  readonly kind: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly guard?: string;
  readonly itemType?: string;
}

async function readProject(page: Page): Promise<{
  readonly elements: readonly StoredElement[];
  readonly edges: readonly StoredEdge[];
}> {
  return await page.evaluate((id) => {
    const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
    if (!raw) return { elements: [], edges: [] };
    const project = JSON.parse(raw);
    // Exclude the synthesized root Package (ownerId === null) from
    // user-element counts; the gate's assertions speak about user-authored
    // ActionUsages, not the project root.
    const allElements = (project.elements ?? []) as StoredElement[];
    return {
      elements: allElements.filter(
        (e) => (e as { ownerId?: unknown }).ownerId !== null,
      ),
      edges: (project.edges ?? []) as StoredEdge[],
    };
  }, SEED_PROJECT_ID);
}

async function dragChipOntoCanvas(
  page: Page,
  nodeType: string,
  targetPosition: { x: number; y: number },
): Promise<string> {
  // After a chip drop the new ActionUsage is auto-selected by the workspace
  // store's createActionUsage compound. We resolve its id by counting nodes
  // of that nodeType before vs after.
  const matching = page.locator(
    `[data-action-node-type="${nodeType}"][data-element-id]`,
  );
  const before = await matching.count();
  const chip = page.getByTestId(`activity-palette-${nodeType}`);
  const canvas = page.getByTestId('canvas-drop-target');
  await chip.dragTo(canvas, { targetPosition });
  await expect(matching).toHaveCount(before + 1);
  const id = await matching.nth(before).getAttribute('data-element-id');
  if (!id) throw new Error(`Drop did not produce a ${nodeType} node`);
  return id;
}

async function renameSelectedAction(page: Page, name: string): Promise<void> {
  const nameField = page.getByTestId('inspector-name');
  await expect(nameField).toBeVisible();
  await nameField.fill(name);
  await nameField.press('Enter');
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
  opts: { shift?: boolean } = {},
): Promise<void> {
  const start = await handleCenter(source);
  const end = await handleCenter(target);
  if (opts.shift) await page.keyboard.down('Shift');
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
  if (opts.shift) await page.keyboard.up('Shift');
}

function sourceHandleOf(page: Page, nodeTestid: string): Locator {
  // Action / decision / merge / fork / join all expose a bottom (source)
  // handle. Initial is source-only, so its single handle is the source too
  // — `.react-flow__handle-bottom` matches in that case as well because the
  // component sets position={Bottom}.
  return page.getByTestId(nodeTestid).locator('.react-flow__handle-bottom');
}

function targetHandleOf(page: Page, nodeTestid: string): Locator {
  // Symmetric to sourceHandleOf — final is target-only with a top handle.
  return page.getByTestId(nodeTestid).locator('.react-flow__handle-top');
}

test.describe('Phase 5 gate (issue #90)', () => {
  test.beforeEach(async ({ page }) => {
    await seedEmptyProject(page);
  });

  test('Activity vertical slice: drops → wire chain → guard → object flow → reload → undo cascade → redo → reload', async ({
    page,
    browserName,
  }) => {
    await gotoActivity(page);

    // Step 1 — drop the seven nodes via the Activity palette chips. Positions
    // are picked so the rendered handles don't overlap and every drop lands
    // inside the canvas-drop-target bounding box (canvas pane is ~430 px wide
    // and ~540 px tall on the 1280×800 viewport with default pane widths).
    const initialId = await dragChipOntoCanvas(page, 'initial', {
      x: 200,
      y: 30,
    });
    const validateId = await dragChipOntoCanvas(page, 'action', {
      x: 200,
      y: 110,
    });
    await renameSelectedAction(page, 'Validate');

    const decisionId = await dragChipOntoCanvas(page, 'decision', {
      x: 200,
      y: 210,
    });
    await renameSelectedAction(page, 'Adult?');

    const approveId = await dragChipOntoCanvas(page, 'action', {
      x: 100,
      y: 320,
    });
    await renameSelectedAction(page, 'Approve');

    const rejectId = await dragChipOntoCanvas(page, 'action', {
      x: 300,
      y: 320,
    });
    await renameSelectedAction(page, 'Reject');

    const mergeId = await dragChipOntoCanvas(page, 'merge', {
      x: 200,
      y: 430,
    });
    await renameSelectedAction(page, 'Done');

    const finalId = await dragChipOntoCanvas(page, 'final', {
      x: 210,
      y: 510,
    });

    // Step 2 — wire the first two ControlFlows so the validator is exercised
    // end-to-end (initial-as-source, action-as-target, action-as-source,
    // decision-as-target).
    await dragHandle(
      page,
      sourceHandleOf(page, `activity-initial-${initialId}`),
      targetHandleOf(page, `activity-action-${validateId}`),
    );
    await dragHandle(
      page,
      sourceHandleOf(page, `activity-action-${validateId}`),
      targetHandleOf(page, `activity-decision-${decisionId}`),
    );

    // Step 3 — wire Adult? → Approve. The new edge auto-selects, so the
    // inspector immediately exposes the Guard field. Fill it before wiring
    // the rest of the chain to avoid having to re-select via canvas click
    // (RF v12 edge clicks are unreliable per docs/CONTEXT.md 2026-05-12).
    await dragHandle(
      page,
      sourceHandleOf(page, `activity-decision-${decisionId}`),
      targetHandleOf(page, `activity-action-${approveId}`),
    );
    await expect(page.getByTestId('inspector-control-flow-edge')).toBeVisible();
    const guard = page.getByTestId('inspector-control-flow-guard');
    await guard.fill('age >= 18');
    await guard.press('Enter');
    // Confirm the bracketed label reflects on the canvas.
    const guardedEdge = page
      .locator('[data-testid^="activity-edge-"][data-edge-kind="ControlFlow"]')
      .last();
    const guardedEdgeId = await guardedEdge.getAttribute('data-edge-id');
    await expect(
      page.getByTestId(`activity-edge-guard-${guardedEdgeId}`),
    ).toHaveText('[age >= 18]');

    // Step 4 — wire the remaining four ControlFlows.
    await dragHandle(
      page,
      sourceHandleOf(page, `activity-decision-${decisionId}`),
      targetHandleOf(page, `activity-action-${rejectId}`),
    );
    await dragHandle(
      page,
      sourceHandleOf(page, `activity-action-${approveId}`),
      targetHandleOf(page, `activity-merge-${mergeId}`),
    );
    await dragHandle(
      page,
      sourceHandleOf(page, `activity-action-${rejectId}`),
      targetHandleOf(page, `activity-merge-${mergeId}`),
    );
    await dragHandle(
      page,
      sourceHandleOf(page, `activity-merge-${mergeId}`),
      targetHandleOf(page, `activity-final-${finalId}`),
    );
    await expect(
      page.locator(
        '[data-testid^="activity-edge-"][data-edge-kind="ControlFlow"]',
      ),
    ).toHaveCount(7);

    // Step 5 — shift-drag Approve → Done for an ObjectFlow. The auto-selected
    // edge surfaces the itemType field in the inspector.
    await dragHandle(
      page,
      sourceHandleOf(page, `activity-action-${approveId}`),
      targetHandleOf(page, `activity-merge-${mergeId}`),
      { shift: true },
    );
    const objectFlowEdge = page
      .locator('[data-testid^="activity-edge-"][data-edge-kind="ObjectFlow"]')
      .first();
    await expect(objectFlowEdge).toHaveCount(1);
    await expect(page.getByTestId('inspector-object-flow-edge')).toBeVisible();
    const itemType = page.getByTestId('inspector-object-flow-item-type');
    await itemType.fill('Token');
    await itemType.press('Enter');
    const objectFlowEdgeId = await objectFlowEdge.getAttribute('data-edge-id');
    await expect(
      page.getByTestId(`activity-edge-label-${objectFlowEdgeId}`),
    ).toHaveText('Token');

    // Step 6 — assert sessionStorage carries all seven elements (5 actions/
    // diamonds + initial + final), seven ControlFlows + one ObjectFlow, the
    // guard on the Adult?→Approve edge, and itemType on the ObjectFlow.
    let snapshot = await readProject(page);
    expect(snapshot.elements).toHaveLength(7);
    expect(snapshot.edges).toHaveLength(8);

    const controlFlows = snapshot.edges.filter((e) => e.kind === 'ControlFlow');
    const objectFlows = snapshot.edges.filter((e) => e.kind === 'ObjectFlow');
    expect(controlFlows).toHaveLength(7);
    expect(objectFlows).toHaveLength(1);

    const guarded = controlFlows.find(
      (e) => e.sourceId === decisionId && e.targetId === approveId,
    );
    expect(guarded).toBeDefined();
    expect(guarded!.guard).toBe('age >= 18');

    expect(objectFlows[0]!.sourceId).toBe(approveId);
    expect(objectFlows[0]!.targetId).toBe(mergeId);
    expect(objectFlows[0]!.itemType).toBe('Token');

    // Step 7 — reload; the rebuilt project matches the in-memory state. This
    // is the load-bearing repository round-trip check for Phase 5.
    await page.reload();
    await page.getByRole('tab', { name: 'System Activity' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Activity Diagram',
    );
    await expect(
      page.locator(
        '[data-testid^="activity-edge-"][data-edge-kind="ControlFlow"]',
      ),
    ).toHaveCount(7);
    await expect(
      page.locator(
        '[data-testid^="activity-edge-"][data-edge-kind="ObjectFlow"]',
      ),
    ).toHaveCount(1);
    snapshot = await readProject(page);
    expect(snapshot.elements).toHaveLength(7);
    expect(snapshot.edges).toHaveLength(8);
    const reloadedGuarded = snapshot.edges.find(
      (e) =>
        e.kind === 'ControlFlow' &&
        e.sourceId === decisionId &&
        e.targetId === approveId,
    );
    expect(reloadedGuarded!.guard).toBe('age >= 18');
    expect(
      snapshot.edges.find((e) => e.kind === 'ObjectFlow')!.itemType,
    ).toBe('Token');

    // Step 8 — Cmd-Z cascade. Workspace.tsx accepts metaKey OR ctrlKey;
    // Control+z is portable. Blur any focused input so the global handler
    // fires (input/textarea focus is suppressed by design).
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

    // 7 drop compounds + 5 renames + 7 ControlFlow links + 1 update-edge
    // (guard) + 1 ObjectFlow link + 1 update-edge (itemType) = 22 expected
    // history entries. 40 is a generous upper bound.
    const undoUntilEmpty = async (maxSteps: number): Promise<void> => {
      for (let i = 0; i < maxSteps; i += 1) {
        const remaining = await page.evaluate((id) => {
          const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
          if (!raw) return 0;
          const p = JSON.parse(raw);
          // Exclude the synthesized root Package (ownerId === null).
          return (
            (p.elements?.filter((e: { ownerId: unknown }) => e.ownerId !== null).length ?? 0) +
            (p.edges?.length ?? 0)
          );
        }, SEED_PROJECT_ID);
        if (remaining === 0) return;
        await undo();
        await page.waitForTimeout(20);
      }
      const finalRemaining = await page.evaluate((id) => {
        const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
        if (!raw) return -1;
        const p = JSON.parse(raw);
        return (
          (p.elements?.filter((e: { ownerId: unknown }) => e.ownerId !== null).length ?? 0) +
          (p.edges?.length ?? 0)
        );
      }, SEED_PROJECT_ID);
      expect(
        finalRemaining,
        `Undo cascade did not fully roll back in ${maxSteps} presses`,
      ).toBe(0);
    };
    await undoUntilEmpty(40);

    snapshot = await readProject(page);
    // After full undo only the synthesized root Package (ownerId === null) remains.
    expect(snapshot.elements.filter((e) => e.ownerId !== null)).toEqual([]);
    expect(snapshot.edges).toEqual([]);

    // Step 9 — redo all the way forward. Termination needs all four signals:
    // 7 elements + 8 edges + guard restored on the Adult?→Approve edge +
    // itemType restored on the ObjectFlow. Counting elements+edges alone
    // would exit early because the two trailing update-edge commands don't
    // change those counts.
    const redoUntilFullyRestored = async (maxSteps: number): Promise<void> => {
      for (let i = 0; i < maxSteps; i += 1) {
        const state = await page.evaluate((id) => {
          const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
          if (!raw) {
            return {
              elements: 0,
              edges: 0,
              hasGuard: false,
              hasItemType: false,
            };
          }
          const p = JSON.parse(raw);
          const edges = (p.edges ?? []) as Array<{
            kind: string;
            guard?: string;
            itemType?: string;
          }>;
          return {
            // Exclude the synthesized root Package (ownerId === null).
            elements: (p.elements ?? []).filter((e: { ownerId: unknown }) => e.ownerId !== null).length,
            edges: edges.length,
            hasGuard: edges.some(
              (e) => e.kind === 'ControlFlow' && e.guard === 'age >= 18',
            ),
            hasItemType: edges.some(
              (e) => e.kind === 'ObjectFlow' && e.itemType === 'Token',
            ),
          };
        }, SEED_PROJECT_ID);
        if (
          state.elements === 7 &&
          state.edges === 8 &&
          state.hasGuard &&
          state.hasItemType
        ) {
          return;
        }
        await redo();
        await page.waitForTimeout(20);
      }
      const finalState = await page.evaluate((id) => {
        const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
        const p = JSON.parse(raw!);
        const edges = (p.edges ?? []) as Array<{
          kind: string;
          guard?: string;
          itemType?: string;
        }>;
        return {
          elements: (p.elements ?? []).filter((e: { ownerId: unknown }) => e.ownerId !== null).length,
          edges: edges.length,
          hasGuard: edges.some(
            (e) => e.kind === 'ControlFlow' && e.guard === 'age >= 18',
          ),
          hasItemType: edges.some(
            (e) => e.kind === 'ObjectFlow' && e.itemType === 'Token',
          ),
        };
      }, SEED_PROJECT_ID);
      expect(
        finalState,
        `Redo cascade did not fully restore in ${maxSteps} presses`,
      ).toEqual({
        elements: 7,
        edges: 8,
        hasGuard: true,
        hasItemType: true,
      });
    };
    await redoUntilFullyRestored(40);

    // Step 10 — final reload; the post-redo state survives sessionStorage.
    await page.reload();
    await page.getByRole('tab', { name: 'System Activity' }).click();
    snapshot = await readProject(page);
    // Exclude the synthesized root Package (ownerId === null) when counting user elements.
    expect(snapshot.elements.filter((e) => e.ownerId !== null)).toHaveLength(7);
    expect(snapshot.edges).toHaveLength(8);
    expect(
      snapshot.edges.filter((e) => e.kind === 'ControlFlow'),
    ).toHaveLength(7);
    const finalObjectFlow = snapshot.edges.find(
      (e) => e.kind === 'ObjectFlow',
    );
    expect(finalObjectFlow).toBeDefined();
    expect(finalObjectFlow!.itemType).toBe('Token');
    const finalGuarded = snapshot.edges.find(
      (e) =>
        e.kind === 'ControlFlow' &&
        e.sourceId === decisionId &&
        e.targetId === approveId,
    );
    expect(finalGuarded!.guard).toBe('age >= 18');

    // Spot-check element names round-tripped through history + reload.
    const namesByKind = new Map<string, string>();
    for (const el of snapshot.elements) {
      namesByKind.set(el.id, el.name ?? '');
    }
    expect(namesByKind.get(validateId)).toBe('Validate');
    expect(namesByKind.get(decisionId)).toBe('Adult?');
    expect(namesByKind.get(approveId)).toBe('Approve');
    expect(namesByKind.get(rejectId)).toBe('Reject');
    expect(namesByKind.get(mergeId)).toBe('Done');
    // Pseudostates are intentionally created with empty names (per
    // `createActionUsage`).
    expect(namesByKind.get(initialId)).toBe('');
    expect(namesByKind.get(finalId)).toBe('');
  });

  test('@a11y empty Activity canvas has no serious/critical violations', async ({
    page,
  }) => {
    await gotoActivity(page);
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

  test('@a11y Activity canvas with pseudostates + named action + decision has no serious/critical violations', async ({
    page,
  }) => {
    await gotoActivity(page);
    await dragChipOntoCanvas(page, 'initial', { x: 200, y: 30 });
    await dragChipOntoCanvas(page, 'action', { x: 200, y: 110 });
    await renameSelectedAction(page, 'Validate');
    await dragChipOntoCanvas(page, 'decision', { x: 200, y: 230 });
    await renameSelectedAction(page, 'Adult?');
    await dragChipOntoCanvas(page, 'final', { x: 200, y: 340 });

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

  test('@a11y Activity canvas with one ControlFlow + guard and the edge inspector visible has no serious/critical violations', async ({
    page,
  }) => {
    await gotoActivity(page);
    const sourceId = await dragChipOntoCanvas(page, 'action', {
      x: 200,
      y: 100,
    });
    await renameSelectedAction(page, 'Validate');
    const targetId = await dragChipOntoCanvas(page, 'action', {
      x: 200,
      y: 280,
    });
    await renameSelectedAction(page, 'Approve');

    await dragHandle(
      page,
      sourceHandleOf(page, `activity-action-${sourceId}`),
      targetHandleOf(page, `activity-action-${targetId}`),
    );
    await expect(page.getByTestId('inspector-control-flow-edge')).toBeVisible();
    const guard = page.getByTestId('inspector-control-flow-guard');
    await guard.fill('water > 0');
    await guard.press('Enter');

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
