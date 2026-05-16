import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Phase 6 gate spec (issue #107): one orchestrated walkthrough of the full
// State Machine vertical slice, plus three @a11y scans for the screens called
// out in the issue's acceptance criteria. Mirrors `tests/e2e/phase-5-gate.spec.ts`
// (issue #90) and `tests/e2e/phase-4-gate.spec.ts` (issue #74).
//
// The walkthrough covers: drop initial + three states + final chips → rename
// three states → wire four Transitions → set trigger/guard/effect on
// Idle→Running → set entry/do/exit on Idle → reload → Cmd-Z cascade until
// empty → Cmd-Shift-Z cascade forward (4-signal termination per the iter-40
// lesson) → final reload.
//
// Per ADR 0006 § 4 the validator already refuses final-as-source,
// initial-as-target, self-loops, and non-StateUsage endpoints; the gate
// exercises the happy paths (those refusals are covered by
// `state-machine-transitions.spec.ts`).
//
// No new @visual baselines are added here — the issue's acceptance criteria
// explicitly says they are not required and the per-feature baselines from
// #104/#105/#106 cover every persistent canvas state.

const SEED_PROJECT_ID = 'p-phase-6-gate';
const BDD_DIAGRAM_ID = 'd-bdd';
const SM_DIAGRAM_ID = 'd-sm';

async function seedEmptyProject(page: Page): Promise<void> {
  // addInitScript fires on every page load (including reload) — guard the
  // seed so the workspace's autosave survives the reload step in the
  // walkthrough. Per `docs/CONTEXT.md` 2026-05-12 entry.
  await page.addInitScript(
    ({ projectId, bddId, smId }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Phase 6 Gate Seed',
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
            id: smId,
            viewpointId: 'state-machine',
            name: 'System State Machine',
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
      smId: SM_DIAGRAM_ID,
    },
  );
}

async function gotoStateMachine(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System State Machine' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'State Machine Diagram',
  );
}

interface StoredElement {
  readonly id: string;
  readonly kind: string;
  readonly name?: string;
  readonly ownerId?: string | null;
  readonly stateType?: string;
  readonly entryAction?: string;
  readonly doAction?: string;
  readonly exitAction?: string;
  readonly trigger?: string;
  readonly guard?: string;
  readonly effect?: string;
  readonly sourceId?: string;
  readonly targetId?: string;
}

async function readProject(
  page: Page,
): Promise<{ readonly elements: readonly StoredElement[] }> {
  return await page.evaluate((id) => {
    const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
    if (!raw) return { elements: [] };
    const project = JSON.parse(raw);
    return {
      elements: (project.elements ?? []) as StoredElement[],
    };
  }, SEED_PROJECT_ID);
}

async function dragChipOntoCanvas(
  page: Page,
  stateType: string,
  targetPosition: { x: number; y: number },
): Promise<string> {
  // After a chip drop the new StateUsage is auto-selected by the workspace
  // store's createStateUsage compound. We resolve its id by counting nodes
  // of that stateType before vs after.
  const matching = page.locator(
    `[data-state-node-type="${stateType}"][data-element-id]`,
  );
  const before = await matching.count();
  const chip = page.getByTestId(`state-machine-palette-${stateType}`);
  const canvas = page.getByTestId('canvas-drop-target');
  await chip.dragTo(canvas, { targetPosition });
  await expect(matching).toHaveCount(before + 1);
  const id = await matching.nth(before).getAttribute('data-element-id');
  if (!id) throw new Error(`Drop did not produce a ${stateType} node`);
  return id;
}

async function renameSelected(page: Page, name: string): Promise<void> {
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

function bottomHandleOf(page: Page, nodeTestid: string): Locator {
  return page.getByTestId(nodeTestid).locator('.react-flow__handle-bottom');
}

function topHandleOf(page: Page, nodeTestid: string): Locator {
  return page.getByTestId(nodeTestid).locator('.react-flow__handle-top');
}

test.describe('Phase 6 gate (issue #107)', () => {
  test.beforeEach(async ({ page }) => {
    await seedEmptyProject(page);
  });

  test('State Machine vertical slice: drops → wire transitions → label edits → reload → undo cascade → redo → reload', async ({
    page,
    browserName,
  }) => {
    await gotoStateMachine(page);

    // Step 1 — drop the five nodes via the State Machine palette chips.
    // Positions keep everything under y≈480 to fit the canvas-drop-target
    // bounding box (canvas pane is ~540 px tall on the 1280×800 viewport with
    // default pane widths — per the iter-40 lesson recorded in
    // `docs/CONTEXT.md`).
    const initialId = await dragChipOntoCanvas(page, 'initial', {
      x: 220,
      y: 20,
    });

    const idleId = await dragChipOntoCanvas(page, 'state', {
      x: 180,
      y: 100,
    });
    await renameSelected(page, 'Idle');

    const runningId = await dragChipOntoCanvas(page, 'state', {
      x: 180,
      y: 220,
    });
    await renameSelected(page, 'Running');

    const stoppedId = await dragChipOntoCanvas(page, 'state', {
      x: 180,
      y: 340,
    });
    await renameSelected(page, 'Stopped');

    const finalId = await dragChipOntoCanvas(page, 'final', {
      x: 220,
      y: 460,
    });

    // Step 2 — wire initial → Idle. The new Transition auto-selects.
    await dragHandle(
      page,
      bottomHandleOf(page, `state-machine-initial-${initialId}`),
      topHandleOf(page, `state-machine-state-${idleId}`),
    );
    // Precondition (#161 fix 1): isolate "did the drag create the edge?"
    // from "did the inspector auto-select and mount?" — the latter lands
    // a frame after the former and can race the render tick under CI
    // load (cold-load-all-tabs amplifies concurrent render activity).
    await expect(
      page.locator(
        '[data-testid^="state-machine-edge-"][data-edge-kind="Transition"]',
      ),
    ).toHaveCount(1);
    // #161 fix 2: raise the auto-select-and-mount wait at this seam
    // specifically. Under amplified CI load the default 5s race-wins
    // before the inspector subscribes to the freshly-selected edge.
    // Line 240's second wait still uses the default — it follows a
    // user-initiated drag from an already-rendered canvas and has
    // never been observed flaking.
    await expect(page.getByTestId('inspector-transition')).toBeVisible({
      timeout: 15_000,
    });

    // Step 3 — wire Idle → Running. The auto-selected Transition's inspector
    // exposes trigger / guard / effect; fill them now to avoid re-selecting
    // the edge later (RF v12 edge clicks are unreliable per CONTEXT.md
    // 2026-05-12 "Edge click({force:true}) doesn't select edges in RF v12").
    await dragHandle(
      page,
      bottomHandleOf(page, `state-machine-state-${idleId}`),
      topHandleOf(page, `state-machine-state-${runningId}`),
    );
    await expect(page.getByTestId('inspector-transition')).toBeVisible();
    const trigger = page.getByTestId('inspector-transition-trigger');
    await trigger.fill('start');
    await trigger.press('Enter');
    const guard = page.getByTestId('inspector-transition-guard');
    await guard.fill('ready');
    await guard.press('Enter');
    const effect = page.getByTestId('inspector-transition-effect');
    await effect.fill('log()');
    await effect.press('Enter');
    // The Idle → Running edge label should now compose to the SysMLv2
    // textual convention "trigger [guard] / effect".
    const labelledEdge = page
      .locator(
        '[data-testid^="state-machine-edge-"][data-edge-kind="Transition"]',
      )
      .nth(1);
    const labelledEdgeId = await labelledEdge.getAttribute('data-edge-id');
    await expect(
      page.getByTestId(`state-machine-edge-label-${labelledEdgeId}`),
    ).toHaveText('start [ready] / log()');

    // Step 4 — wire the remaining two transitions.
    await dragHandle(
      page,
      bottomHandleOf(page, `state-machine-state-${runningId}`),
      topHandleOf(page, `state-machine-state-${stoppedId}`),
    );
    await dragHandle(
      page,
      bottomHandleOf(page, `state-machine-state-${stoppedId}`),
      topHandleOf(page, `state-machine-final-${finalId}`),
    );
    await expect(
      page.locator(
        '[data-testid^="state-machine-edge-"][data-edge-kind="Transition"]',
      ),
    ).toHaveCount(4);

    // Step 5 — re-select Idle via the project tree leaf so the inspector
    // shows StateExtras. The project-tree-leaf click REPLACES selection
    // (versus canvas node clicks which MERGE) — see `docs/CONTEXT.md`
    // 2026-05-12 "Selection is workspace-global..." for context.
    await page.getByTestId(`project-tree-leaf-${idleId}`).click();
    await expect(page.getByTestId('inspector-state-type')).toHaveText('state');

    const entryField = page.getByTestId('inspector-state-entry');
    await entryField.fill('reset()');
    await entryField.press('Enter');
    const doField = page.getByTestId('inspector-state-do');
    await doField.fill('tick()');
    await doField.press('Enter');
    const exitField = page.getByTestId('inspector-state-exit');
    await exitField.fill('cleanup()');
    await exitField.press('Enter');

    // Action lines render on the Idle node.
    const actionList = page.getByTestId(`state-machine-state-actions-${idleId}`);
    await expect(actionList).toContainText('entry');
    await expect(actionList).toContainText('reset()');
    await expect(actionList).toContainText('do');
    await expect(actionList).toContainText('tick()');
    await expect(actionList).toContainText('exit');
    await expect(actionList).toContainText('cleanup()');

    // Step 6 — assert sessionStorage carries all five elements + four
    // Transition elements with correct sourceId/targetId, plus the labels
    // from steps 3 + 5. Transitions live in `elements` (element-as-edge per
    // ADR 0006 § 3), not `edges`.
    let snapshot = await readProject(page);
    const states = snapshot.elements.filter((e) => e.kind === 'StateUsage');
    const transitions = snapshot.elements.filter(
      (e) => e.kind === 'Transition',
    );
    expect(states).toHaveLength(5);
    expect(transitions).toHaveLength(4);

    const labelled = transitions.find(
      (t) => t.sourceId === idleId && t.targetId === runningId,
    );
    expect(labelled).toBeDefined();
    expect(labelled!.trigger).toBe('start');
    expect(labelled!.guard).toBe('ready');
    expect(labelled!.effect).toBe('log()');

    const idleState = states.find((s) => s.id === idleId);
    expect(idleState).toBeDefined();
    expect(idleState!.entryAction).toBe('reset()');
    expect(idleState!.doAction).toBe('tick()');
    expect(idleState!.exitAction).toBe('cleanup()');

    // Step 7 — reload; the rebuilt project matches the in-memory state. This
    // is the load-bearing repository round-trip check for Phase 6.
    await page.reload();
    await page.getByRole('tab', { name: 'System State Machine' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'State Machine Diagram',
    );
    await expect(
      page.locator(
        '[data-testid^="state-machine-edge-"][data-edge-kind="Transition"]',
      ),
    ).toHaveCount(4);
    await expect(
      page.locator('[data-testid^="state-machine-state-"][data-element-id]'),
    ).toHaveCount(3);
    await expect(actionList).toContainText('reset()');

    snapshot = await readProject(page);
    const reloadedStates = snapshot.elements.filter(
      (e) => e.kind === 'StateUsage',
    );
    const reloadedTransitions = snapshot.elements.filter(
      (e) => e.kind === 'Transition',
    );
    expect(reloadedStates).toHaveLength(5);
    expect(reloadedTransitions).toHaveLength(4);
    const reloadedLabelled = reloadedTransitions.find(
      (t) => t.sourceId === idleId && t.targetId === runningId,
    );
    expect(reloadedLabelled!.trigger).toBe('start');
    expect(reloadedLabelled!.guard).toBe('ready');
    expect(reloadedLabelled!.effect).toBe('log()');
    const reloadedIdle = reloadedStates.find((s) => s.id === idleId);
    expect(reloadedIdle!.entryAction).toBe('reset()');
    expect(reloadedIdle!.doAction).toBe('tick()');
    expect(reloadedIdle!.exitAction).toBe('cleanup()');

    // Step 8 — Cmd-Z cascade. Workspace.tsx accepts metaKey OR ctrlKey;
    // Control+z is portable. Blur any focused input so the global handler
    // fires (input/textarea focus routes to native input-undo by design).
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

    // 5 drop compounds + 3 renames + 4 Transition creates + 6 update-element
    // (trigger/guard/effect/entry/do/exit) = 18 expected history entries.
    // 40 is a generous upper bound that covers any intermediate clicks.
    const elementCount = async (): Promise<number> =>
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
        if ((await elementCount()) === 0) return;
        await undo();
        await page.waitForTimeout(20);
      }
      expect(
        await elementCount(),
        `Undo cascade did not fully roll back in ${maxSteps} presses`,
      ).toBe(0);
    };
    await undoUntilEmpty(40);

    snapshot = await readProject(page);
    // After full undo only the synthesized root Package (ownerId === null) remains.
    expect(snapshot.elements.filter((e) => e.ownerId !== null)).toEqual([]);

    // Step 9 — redo all the way forward. Termination needs all four signals:
    // 5 states + 4 transitions + transitionExtras present (trigger/guard/
    // effect on Idle→Running) + stateExtras present (entry/do/exit on Idle).
    // Counting elements alone would exit early because the trailing six
    // update-element commands don't change the element count.
    const readRedoState = async (): Promise<{
      states: number;
      transitions: number;
      hasTransitionExtras: boolean;
      hasStateExtras: boolean;
    }> =>
      page.evaluate(
        ({ id, idleStateId, runningStateId }) => {
          const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
          if (!raw) {
            return {
              states: 0,
              transitions: 0,
              hasTransitionExtras: false,
              hasStateExtras: false,
            };
          }
          const p = JSON.parse(raw);
          const elements = (p.elements ?? []) as Array<{
            id: string;
            kind: string;
            sourceId?: string;
            targetId?: string;
            trigger?: string;
            guard?: string;
            effect?: string;
            entryAction?: string;
            doAction?: string;
            exitAction?: string;
          }>;
          const states = elements.filter((e) => e.kind === 'StateUsage').length;
          const transitions = elements.filter(
            (e) => e.kind === 'Transition',
          ).length;
          const labelledTransition = elements.find(
            (e) =>
              e.kind === 'Transition' &&
              e.sourceId === idleStateId &&
              e.targetId === runningStateId,
          );
          const idle = elements.find((e) => e.id === idleStateId);
          return {
            states,
            transitions,
            hasTransitionExtras:
              labelledTransition?.trigger === 'start' &&
              labelledTransition?.guard === 'ready' &&
              labelledTransition?.effect === 'log()',
            hasStateExtras:
              idle?.entryAction === 'reset()' &&
              idle?.doAction === 'tick()' &&
              idle?.exitAction === 'cleanup()',
          };
        },
        { id: SEED_PROJECT_ID, idleStateId: idleId, runningStateId: runningId },
      );

    const redoUntilFullyRestored = async (maxSteps: number): Promise<void> => {
      for (let i = 0; i < maxSteps; i += 1) {
        const state = await readRedoState();
        if (
          state.states === 5 &&
          state.transitions === 4 &&
          state.hasTransitionExtras &&
          state.hasStateExtras
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
        states: 5,
        transitions: 4,
        hasTransitionExtras: true,
        hasStateExtras: true,
      });
    };
    await redoUntilFullyRestored(40);

    // Step 10 — final reload; the post-redo state survives sessionStorage.
    await page.reload();
    await page.getByRole('tab', { name: 'System State Machine' }).click();
    snapshot = await readProject(page);
    const finalStates = snapshot.elements.filter(
      (e) => e.kind === 'StateUsage',
    );
    const finalTransitions = snapshot.elements.filter(
      (e) => e.kind === 'Transition',
    );
    expect(finalStates).toHaveLength(5);
    expect(finalTransitions).toHaveLength(4);

    const finalLabelled = finalTransitions.find(
      (t) => t.sourceId === idleId && t.targetId === runningId,
    );
    expect(finalLabelled!.trigger).toBe('start');
    expect(finalLabelled!.guard).toBe('ready');
    expect(finalLabelled!.effect).toBe('log()');

    const finalIdle = finalStates.find((s) => s.id === idleId);
    expect(finalIdle!.entryAction).toBe('reset()');
    expect(finalIdle!.doAction).toBe('tick()');
    expect(finalIdle!.exitAction).toBe('cleanup()');

    // Spot-check named-state survival across history + reload. Pseudostates
    // are intentionally created with empty names (per `createStateUsage`).
    const namesById = new Map<string, string>();
    for (const el of finalStates) {
      namesById.set(el.id, el.name ?? '');
    }
    expect(namesById.get(idleId)).toBe('Idle');
    expect(namesById.get(runningId)).toBe('Running');
    expect(namesById.get(stoppedId)).toBe('Stopped');
    expect(namesById.get(initialId)).toBe('');
    expect(namesById.get(finalId)).toBe('');
  });

  test('@a11y empty State Machine canvas has no serious/critical violations', async ({
    page,
  }) => {
    await gotoStateMachine(page);
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

  test('@a11y State Machine canvas with two states + one Transition has no serious/critical violations', async ({
    page,
  }) => {
    await gotoStateMachine(page);
    const sourceId = await dragChipOntoCanvas(page, 'state', {
      x: 200,
      y: 100,
    });
    await renameSelected(page, 'Idle');
    const targetId = await dragChipOntoCanvas(page, 'state', {
      x: 200,
      y: 280,
    });
    await renameSelected(page, 'Running');
    await dragHandle(
      page,
      bottomHandleOf(page, `state-machine-state-${sourceId}`),
      topHandleOf(page, `state-machine-state-${targetId}`),
    );
    await expect(
      page.locator(
        '[data-testid^="state-machine-edge-"][data-edge-kind="Transition"]',
      ),
    ).toHaveCount(1);

    // Clear selection so focus rings don't dominate the axe sample.
    await page.locator('body').click({ position: { x: 4, y: 4 } });
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

  test('@a11y inspector with TransitionExtras populated has no serious/critical violations', async ({
    page,
  }) => {
    await gotoStateMachine(page);
    const sourceId = await dragChipOntoCanvas(page, 'state', {
      x: 200,
      y: 100,
    });
    await renameSelected(page, 'Idle');
    const targetId = await dragChipOntoCanvas(page, 'state', {
      x: 200,
      y: 280,
    });
    await renameSelected(page, 'Running');
    await dragHandle(
      page,
      bottomHandleOf(page, `state-machine-state-${sourceId}`),
      topHandleOf(page, `state-machine-state-${targetId}`),
    );
    await expect(page.getByTestId('inspector-transition')).toBeVisible();

    await page.getByTestId('inspector-transition-trigger').fill('start');
    await page.getByTestId('inspector-transition-trigger').press('Enter');
    await page.getByTestId('inspector-transition-guard').fill('ready');
    await page.getByTestId('inspector-transition-guard').press('Enter');
    await page.getByTestId('inspector-transition-effect').fill('log()');
    await page.getByTestId('inspector-transition-effect').press('Enter');

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
});
