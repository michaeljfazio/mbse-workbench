import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Phase 4 gate spec (issue #74): one orchestrated cross-diagram walkthrough
// of the full Requirements vertical slice, plus a11y scans for the three
// screens called out in the issue's acceptance criteria.
//
// AGENT.md Phase 4 gate verbatim: "create requirement, link to block via
// derive/satisfy/verify, verify in matrix view (which arrives in Phase 10 —
// for now just verify the underlying edges exist)." Issue #74 fleshes this
// out into a 10-step walkthrough; this spec executes it end-to-end.
//
// Visual baselines for the four major Phase 4 states (Requirements empty,
// one Requirement, four-trace canvas, inspector-with-trace-link) all land
// on the children's PRs (#70/#71/#72/#73). The gate intentionally does
// NOT add new @visual specs — it only confirms the orchestrated flow
// holds together at the model layer + a11y screens.

const SEED_PROJECT_ID = 'p-phase-4-gate';
const BDD_DIAGRAM = 'd-bdd';
const REQ_DIAGRAM = 'd-requirements';

async function seedEmptyProject(page: Page): Promise<void> {
  // Init scripts fire on every page load, including reload — gate the seed
  // on existing sessionStorage so the workspace's autosave survives the
  // explicit reload step in the walkthrough.
  await page.addInitScript(
    ({ projectId, bddId, reqId }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Phase 4 Gate Seed',
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
            id: reqId,
            viewpointId: 'requirements',
            name: 'System Requirements',
            positions: {},
          },
        ],
        history: { undo: [], redo: [] },
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      bddId: BDD_DIAGRAM,
      reqId: REQ_DIAGRAM,
    },
  );
}

interface StoredEdge {
  readonly id: string;
  readonly kind: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly traceKind?: string;
}

async function readEdges(page: Page): Promise<StoredEdge[]> {
  return await page.evaluate((id) => {
    const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
    if (!raw) return [] as StoredEdge[];
    const project = JSON.parse(raw);
    return (project.edges ?? []) as StoredEdge[];
  }, SEED_PROJECT_ID);
}

async function readRequirement(
  page: Page,
  reqElementId: string,
): Promise<{
  readonly name: string;
  readonly reqId: string | undefined;
  readonly priority: string | undefined;
  readonly status: string | undefined;
  readonly text: string | undefined;
  readonly rationale: string | undefined;
} | null> {
  return await page.evaluate(
    ({ id, eid }) => {
      const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
      if (!raw) return null;
      const project = JSON.parse(raw);
      const element = (project.elements ?? []).find(
        (e: { id: string }) => e.id === eid,
      );
      if (!element) return null;
      return {
        name: element.name,
        reqId: element.reqId,
        priority: element.priority,
        status: element.status,
        text: element.text,
        rationale: element.rationale,
      };
    },
    { id: SEED_PROJECT_ID, eid: reqElementId },
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

async function dropRequirementOntoCanvas(
  page: Page,
  targetX: number,
  targetY: number,
): Promise<string> {
  const reqs = page.locator(
    '[data-testid^="requirements-req-"][data-element-id]',
  );
  const before = await reqs.count();
  const group = page.getByTestId('project-tree-group-Requirement');
  const canvas = page.getByTestId('canvas-drop-target');
  await group.dragTo(canvas, { targetPosition: { x: targetX, y: targetY } });
  await expect(reqs).toHaveCount(before + 1);
  return (await reqs.nth(before).getAttribute('data-element-id'))!;
}

async function addBlockNamed(page: Page, name: string): Promise<string> {
  // ADR 0015 step 3 (#376): `toolbar-add-block` retired. Palette drag is
  // now the canonical creation path.
  const blocks = page.locator('[data-testid^="bdd-block-"][data-element-id]');
  const before = await blocks.count();
  const group = page.getByTestId('project-tree-group-PartDefinition');
  const canvas = page.getByTestId('canvas-drop-target');
  const xOffset = 180 + (before % 2) * 260;
  const yOffset = 160 + Math.floor(before / 2) * 280;
  await group.dragTo(canvas, {
    targetPosition: { x: xOffset, y: yOffset },
  });
  await expect(blocks).toHaveCount(before + 1);
  const block = blocks.nth(before);
  const id = (await block.getAttribute('data-element-id'))!;
  // Use the project tree leaf to select rather than clicking the canvas node:
  // `setSelection([id])` from the tree REPLACES selection, whereas RF's
  // `onNodesChange` MERGES — so any residual cross-diagram selection (e.g.
  // a trace edge selected on the Requirements tab) would leave the inspector
  // in its multi-select state and `inspector-name` would never appear.
  await page.getByTestId(`project-tree-leaf-${id}`).click();
  const nameField = page.getByTestId('inspector-name');
  await nameField.fill(name);
  await nameField.press('Enter');
  await expect(block.locator(`[data-testid="bdd-block-label-${id}"]`)).toHaveText(
    name,
  );
  return id;
}

async function linkRequirementToSelectedElement(
  page: Page,
  reqElementId: string,
  kind: 'satisfy' | 'verify' | 'derive' | 'refine',
): Promise<void> {
  await page.getByTestId('inspector-add-trace-link').click();
  await expect(page.getByTestId('link-requirement-popover')).toBeVisible();
  await page.getByTestId(`link-requirement-row-${reqElementId}`).click();
  await page.getByTestId(`link-requirement-kind-${kind}`).click();
  await expect(page.getByTestId('link-requirement-popover')).toHaveCount(0);
}

test.describe('Phase 4 gate (issue #74)', () => {
  test.beforeEach(async ({ page }) => {
    await seedEmptyProject(page);
  });

  test('Requirements vertical slice: create → edit → reload → derive trace → BDD block → satisfy + verify → reload → undo cascade → redo', async ({
    page,
    browserName,
  }) => {
    await page.goto('/');

    // Step 1 — Requirements tab present and switchable.
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await expect(tablist.getByRole('tab', { name: 'Main BDD' })).toBeVisible();
    await expect(
      tablist.getByRole('tab', { name: 'System Requirements' }),
    ).toBeVisible();
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Requirements Diagram',
    );

    // Step 2a — drop two Requirements from the palette. Cascade gives them
    // reqIds R-001 and R-002 and names Req1, Req2 by default. Rename + edit
    // happens via the inspector below.
    const reqAId = await dropRequirementOntoCanvas(page, 220, 160);
    const reqBId = await dropRequirementOntoCanvas(page, 520, 160);
    expect(reqAId).not.toEqual(reqBId);

    // Step 2b — select R-001 and edit reqId/name/priority/status/text/rationale.
    await page.locator(`[data-testid="requirements-req-${reqAId}"]`).click();
    await expect(page.getByTestId('inspector-req-id')).toHaveValue('R-001');
    await page.getByTestId('inspector-name').fill('Mission');
    await page.getByTestId('inspector-name').press('Enter');
    await page.getByTestId('inspector-req-priority').selectOption('critical');
    await page.getByTestId('inspector-req-status').selectOption('approved');
    await page.getByTestId('inspector-req-text').fill('System shall meet mission objectives.');
    await page.getByTestId('inspector-req-text').blur();
    await page.getByTestId('inspector-req-rationale').fill('Mission charter §1.');
    await page.getByTestId('inspector-req-rationale').blur();

    // Rename R-002 too so the gate exercises both reqIds.
    await page.locator(`[data-testid="requirements-req-${reqBId}"]`).click();
    await expect(page.getByTestId('inspector-req-id')).toHaveValue('R-002');
    await page.getByTestId('inspector-name').fill('Subfunction');
    await page.getByTestId('inspector-name').press('Enter');

    // Reload — confirm R-001's full field set persisted (one of the AGENT.md
    // gate's load-bearing assertions for Phase 4: edits round-trip through
    // sessionStorage via the InMemorySessionRepository).
    await page.reload();
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    const persisted = await readRequirement(page, reqAId);
    expect(persisted).not.toBeNull();
    expect(persisted!.name).toBe('Mission');
    expect(persisted!.reqId).toBe('R-001');
    expect(persisted!.priority).toBe('critical');
    expect(persisted!.status).toBe('approved');
    expect(persisted!.text).toBe('System shall meet mission objectives.');
    expect(persisted!.rationale).toBe('Mission charter §1.');

    // Step 3 — drag R-002 (Subfunction) → R-001 (Mission) on the canvas; the
    // traceKind picker pops; pick `derive`.
    await dragHandle(
      page,
      page.getByTestId(`requirements-handle-bottom-${reqBId}`),
      page.getByTestId(`requirements-handle-top-${reqAId}`),
    );
    await expect(page.getByTestId('trace-kind-popover')).toBeVisible();
    await page.getByTestId('trace-kind-derive').click();
    await expect(page.getByTestId('trace-kind-popover')).toHaveCount(0);

    const deriveEdges = page.locator(
      '[data-testid^="req-trace-edge-"][data-trace-kind="derive"]',
    );
    await expect(deriveEdges).toHaveCount(1);
    let edges = await readEdges(page);
    expect(edges).toHaveLength(1);
    expect(edges[0]!.kind).toBe('RequirementTrace');
    expect(edges[0]!.traceKind).toBe('derive');
    expect(edges[0]!.sourceId).toBe(reqBId);
    expect(edges[0]!.targetId).toBe(reqAId);

    // Step 4 — switch to BDD, create the Engine PartDefinition.
    await tablist.getByRole('tab', { name: 'Main BDD' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Block Definition Diagram',
    );
    const engineId = await addBlockNamed(page, 'Engine');
    // Engine is the active selection — inspector already shows TraceLinksExtras.
    await expect(page.getByTestId('inspector-trace-links')).toBeVisible();

    // satisfy with R-001 (Mission).
    await linkRequirementToSelectedElement(page, reqAId, 'satisfy');
    await expect(page.getByTestId('inspector-trace-link-list')).toContainText(
      '«satisfy»',
    );

    // Step 5 — verify with R-002 (Subfunction). Re-open the popover; it
    // appends rather than replacing.
    await linkRequirementToSelectedElement(page, reqBId, 'verify');
    const traceRows = page.locator(
      '[data-testid^="inspector-trace-link-delete-"]',
    );
    await expect(traceRows).toHaveCount(2);
    await expect(page.getByTestId('inspector-trace-link-list')).toContainText(
      '«verify»',
    );

    // Step 6 — switch to Requirements; assert the model has all three traces
    // with correct source/target/traceKind. Per ADR 0004 §4 only the
    // R-002→R-001 derive trace actually RENDERS on the Requirements canvas
    // (Engine has no position there), so we assert visual count for derive
    // and model state for the other two.
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    await expect(page.locator('g[data-trace-kind="derive"]')).toHaveCount(1);

    edges = await readEdges(page);
    expect(edges).toHaveLength(3);

    const deriveEdge = edges.find(
      (e) => e.kind === 'RequirementTrace' && e.traceKind === 'derive',
    );
    expect(deriveEdge).toBeDefined();
    expect(deriveEdge!.sourceId).toBe(reqBId);
    expect(deriveEdge!.targetId).toBe(reqAId);

    const satisfyEdge = edges.find(
      (e) => e.kind === 'RequirementTrace' && e.traceKind === 'satisfy',
    );
    expect(satisfyEdge).toBeDefined();
    expect(satisfyEdge!.sourceId).toBe(reqAId);
    expect(satisfyEdge!.targetId).toBe(engineId);

    const verifyEdge = edges.find(
      (e) => e.kind === 'RequirementTrace' && e.traceKind === 'verify',
    );
    expect(verifyEdge).toBeDefined();
    expect(verifyEdge!.sourceId).toBe(reqBId);
    expect(verifyEdge!.targetId).toBe(engineId);

    // Step 7 — Cmd-Z cascade. Workspace.tsx accepts metaKey OR ctrlKey;
    // Control+z is portable. Focus the body so the global keydown handler
    // fires (input/textarea/select focus is suppressed by design).
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

    // Bounded loop: keep pressing Cmd-Z until total edges + elements reach
    // zero. The exact compound-command count is implementation-dependent
    // (createBlock is one compound, but the inline rename + each field
    // edit are separate update-element dispatches). 30 presses is a
    // generous upper bound for the ~10–12 mutations the walkthrough
    // produced.
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
      expect(finalRemaining, `Undo cascade did not fully roll back in ${maxSteps} presses`).toBe(0);
    };
    await undoUntilEmpty(30);

    edges = await readEdges(page);
    expect(edges).toEqual([]);
    const elementsAfterUndo = await page.evaluate((id) => {
      const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
      const p = JSON.parse(raw!);
      // Exclude the synthesized root Package (ownerId === null).
      return (p.elements ?? []).filter((e: { ownerId: unknown }) => e.ownerId !== null);
    }, SEED_PROJECT_ID);
    expect(elementsAfterUndo).toEqual([]);

    // Step 8 — redo all the way forward and assert the model returns to the
    // post-Step-5 state (3 trace edges + 3 elements: Engine + R-001 + R-002).
    const redoUntilFull = async (maxSteps: number): Promise<void> => {
      for (let i = 0; i < maxSteps; i += 1) {
        const counts = await page.evaluate((id) => {
          const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
          if (!raw) return { elements: 0, edges: 0 };
          const p = JSON.parse(raw);
          return {
            // Exclude the synthesized root Package (ownerId === null).
            elements: (p.elements ?? []).filter((e: { ownerId: unknown }) => e.ownerId !== null).length,
            edges: p.edges?.length ?? 0,
          };
        }, SEED_PROJECT_ID);
        if (counts.elements === 3 && counts.edges === 3) return;
        await redo();
        await page.waitForTimeout(20);
      }
      const finalCounts = await page.evaluate((id) => {
        const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
        const p = JSON.parse(raw!);
        return {
          elements: (p.elements ?? []).filter((e: { ownerId: unknown }) => e.ownerId !== null).length,
          edges: p.edges?.length ?? 0,
        };
      }, SEED_PROJECT_ID);
      expect(finalCounts, `Redo cascade did not fully restore in ${maxSteps} presses`).toEqual(
        { elements: 3, edges: 3 },
      );
    };
    await redoUntilFull(30);

    // Step 9 — reload; the rebuilt model matches the post-redo state.
    await page.reload();
    const postReload = await readEdges(page);
    expect(postReload).toHaveLength(3);
    const traceKinds = postReload
      .map((e) => e.traceKind)
      .filter((k): k is string => !!k)
      .sort();
    expect(traceKinds).toEqual(['derive', 'satisfy', 'verify']);

    // Spot-check that R-001's edited fields survived the full undo→redo→reload
    // round-trip — this proves update-element commands round-trip both
    // forward and inverse through the history.
    const postReloadReq = await readRequirement(page, reqAId);
    expect(postReloadReq).not.toBeNull();
    expect(postReloadReq!.name).toBe('Mission');
    expect(postReloadReq!.priority).toBe('critical');
    expect(postReloadReq!.status).toBe('approved');
    expect(postReloadReq!.text).toBe('System shall meet mission objectives.');
    expect(postReloadReq!.rationale).toBe('Mission charter §1.');
  });

  test('@a11y Requirements empty tab has no serious/critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('tablist', { name: 'Diagram tabs' })
      .getByRole('tab', { name: 'System Requirements' })
      .click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Requirements Diagram',
    );
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

  test('@a11y Requirements diagram with two requirements + one derive trace has no serious/critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    const reqAId = await dropRequirementOntoCanvas(page, 220, 160);
    const reqBId = await dropRequirementOntoCanvas(page, 520, 160);
    await dragHandle(
      page,
      page.getByTestId(`requirements-handle-bottom-${reqBId}`),
      page.getByTestId(`requirements-handle-top-${reqAId}`),
    );
    await expect(page.getByTestId('trace-kind-popover')).toBeVisible();
    await page.getByTestId('trace-kind-derive').click();
    await expect(page.locator('g[data-trace-kind="derive"]')).toHaveCount(1);

    // Clear selection so any focus ring is not in the axe sample.
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

  test('@a11y BDD block with one trace link in inspector has no serious/critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });

    // Seed one Requirement on the Requirements tab first so the popover
    // has something to link to.
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    const reqId = await dropRequirementOntoCanvas(page, 220, 160);
    await page.locator(`[data-testid="requirements-req-${reqId}"]`).click();
    await page.getByTestId('inspector-name').fill('Mission');
    await page.getByTestId('inspector-name').press('Enter');

    // Now create the Engine block and satisfy with R-001.
    await tablist.getByRole('tab', { name: 'Main BDD' }).click();
    const engineId = await addBlockNamed(page, 'Engine');
    await expect(page.getByTestId('inspector-trace-links')).toBeVisible();
    await linkRequirementToSelectedElement(page, reqId, 'satisfy');
    await expect(page.getByTestId('inspector-trace-link-list')).toContainText(
      '«satisfy»',
    );
    // Engine is still selected; inspector shows the linked row.
    expect(engineId).toBeDefined();

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
