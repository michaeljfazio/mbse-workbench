import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Phase 10 gate spec (issue #178): orchestrated end-to-end traceability
// walkthrough that closes the Phase 10 epic.
//
// AGENT.md Phase 10 gate verbatim: "Playwright e2e — create requirement,
// link to block in BDD and action in Activity, verify matrix, verify
// coverage, run impact analysis and assert highlighted set."
//
// Slice 1 (this file): functional walkthrough + three @a11y scans (matrix,
// coverage, impact-active). The @visual baseline `phase-10-final.png` of
// the matrix populated state lands in slice 2 — it requires generating
// chromium + webkit PNGs in the Linux Playwright container per
// docs/CONTEXT.md, separate from the test logic that is the load-bearing
// gate.

const SEED_PROJECT_ID = 'p-phase-10-gate';
const BDD_DIAGRAM = 'd-bdd';
const ACTIVITY_DIAGRAM = 'd-activity';
const REQ_DIAGRAM = 'd-requirements';

async function seedEmptyProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, bddId, activityId, reqId }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Phase 10 Gate Seed',
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
            id: activityId,
            viewpointId: 'activity',
            name: 'Main Activity',
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
      activityId: ACTIVITY_DIAGRAM,
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
  const blocks = page.locator('[data-testid^="bdd-block-"][data-element-id]');
  const before = await blocks.count();
  await page.getByTestId('toolbar-add-block').click();
  await expect(blocks).toHaveCount(before + 1);
  const id = (await blocks.nth(before).getAttribute('data-element-id'))!;
  await page.getByTestId(`project-tree-leaf-${id}`).click();
  const nameField = page.getByTestId('inspector-name');
  await nameField.fill(name);
  await nameField.press('Enter');
  await expect(
    page.locator(`[data-testid="bdd-block-label-${id}"]`),
  ).toHaveText(name);
  return id;
}

async function addActionNamed(page: Page, name: string): Promise<string> {
  const actions = page.locator(
    '[data-testid^="activity-action-"][data-element-id]',
  );
  const before = await actions.count();
  await page.getByTestId('toolbar-add-action').click();
  await expect(actions).toHaveCount(before + 1);
  const id = (await actions.nth(before).getAttribute('data-element-id'))!;
  await page.getByTestId(`project-tree-leaf-${id}`).click();
  const nameField = page.getByTestId('inspector-name');
  await nameField.fill(name);
  await nameField.press('Enter');
  await expect(
    page.getByTestId(`activity-action-label-${id}`),
  ).toHaveText(name);
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

test.describe('Phase 10 gate (issue #178)', () => {
  test.beforeEach(async ({ page }) => {
    await seedEmptyProject(page);
  });

  test('end-to-end traceability: requirement → satisfy block (BDD) + satisfy action (Activity) → matrix glyphs → coverage → impact analysis → undo', async ({
    page,
    browserName,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });

    // Step 1 — Create a Requirement on the Requirements diagram via palette
    // drop, then rename + approve via the inspector so the coverage
    // "approved-only" path is exercisable downstream if needed.
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Requirements Diagram',
    );
    const reqId = await dropRequirementOntoCanvas(page, 240, 180);
    await page.locator(`[data-testid="requirements-req-${reqId}"]`).click();
    await expect(page.getByTestId('inspector-req-id')).toHaveValue('R-001');
    await page.getByTestId('inspector-name').fill('Mission');
    await page.getByTestId('inspector-name').press('Enter');
    await page.getByTestId('inspector-req-status').selectOption('approved');

    // Step 2 — Switch to BDD, create the Engine block, link Mission via
    // satisfy in the inspector popover.
    await tablist.getByRole('tab', { name: 'Main BDD' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Block Definition Diagram',
    );
    const engineId = await addBlockNamed(page, 'Engine');
    await expect(page.getByTestId('inspector-trace-links')).toBeVisible();
    await linkRequirementToSelectedElement(page, reqId, 'satisfy');
    await expect(page.getByTestId('inspector-trace-link-list')).toContainText(
      '«satisfy»',
    );

    // Step 3 — Switch to Activity, create the Brake action, link Mission via
    // satisfy. The same requirement now traces to two elements across two
    // viewpoints — the matrix and coverage panels read both.
    await tablist.getByRole('tab', { name: 'Main Activity' }).click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Activity Diagram',
    );
    const brakeId = await addActionNamed(page, 'Brake');
    await expect(page.getByTestId('inspector-trace-links')).toBeVisible();
    await linkRequirementToSelectedElement(page, reqId, 'satisfy');
    await expect(page.getByTestId('inspector-trace-link-list')).toContainText(
      '«satisfy»',
    );

    // Step 4 — Open the Requirements surface → Matrix tab. The matrix has
    // one row (Mission) and two columns (Engine, Brake). Both cells carry
    // the «s» glyph.
    await page.getByTestId('surface-tab-requirements').click();
    await expect(page.getByTestId('requirements-surface')).toBeVisible();
    await page.getByTestId('requirements-tab-matrix-button').click();
    await expect(page.getByTestId('requirements-matrix-panel')).toBeVisible();
    await expect(
      page.getByTestId(
        `requirements-matrix-glyph-${reqId}-${engineId}-satisfy`,
      ),
    ).toBeVisible();
    await expect(
      page.getByTestId(
        `requirements-matrix-glyph-${reqId}-${brakeId}-satisfy`,
      ),
    ).toBeVisible();

    // Step 5 — Coverage tab. With 1 requirement satisfied by 2 elements and
    // 0 verifies, satisfied-count is 1/1, verified-count is 0/1, and the
    // unverified gap row for Mission is present.
    await page.getByTestId('requirements-tab-coverage-button').click();
    await expect(page.getByTestId('requirements-coverage-panel')).toBeVisible();
    await expect(
      page.getByTestId('requirements-coverage-satisfied-count'),
    ).toHaveText('1 / 1');
    await expect(
      page.getByTestId('requirements-coverage-verified-count'),
    ).toHaveText('0 / 1');
    await expect(
      page.getByTestId(`requirements-coverage-unverified-row-${reqId}`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`requirements-coverage-unsatisfied-row-${reqId}`),
    ).toHaveCount(0);

    // Step 6 — Impact analysis. Right-click Engine on BDD → "Show impact".
    // The banner appears; both satisfy edges + the linked Mission
    // requirement node show up in impactHighlightedIds. We assert the
    // banner state at the store level and the mbse-impact-node class on
    // the Requirements canvas (Mission rendered there).
    await tablist.getByRole('tab', { name: 'Main BDD' }).click();
    await page
      .locator(`[data-testid="bdd-block-${engineId}"]`)
      .click({ button: 'right' });
    await expect(page.getByTestId('element-context-menu')).toBeVisible();
    await page.getByTestId('context-menu-show-impact').click();
    await expect(page.getByTestId('element-context-menu')).toHaveCount(0);

    const banner = page.getByTestId('impact-banner');
    await expect(banner).toBeVisible();
    await expect(page.getByTestId('impact-banner-label')).toContainText('Engine');

    // Switch to Requirements to verify the highlight propagates to the
    // requirement node. CanvasPane writes `className: 'mbse-impact-node'`
    // onto the React Flow node config, so the class lands on the
    // `.react-flow__node` wrapper (one level above the inner
    // `requirements-req-*` div).
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    await expect(
      page.locator(`.react-flow__node[data-id="${reqId}"]`),
    ).toHaveClass(/mbse-impact-node/);

    // The model-edge invariant for the impact set: both satisfy edges exist
    // with the right shape, which is what `runImpactAnalysis` walks from
    // the Engine root.
    const edges = await readEdges(page);
    const satisfies = edges.filter(
      (e) => e.kind === 'RequirementTrace' && e.traceKind === 'satisfy',
    );
    expect(satisfies).toHaveLength(2);
    expect(satisfies.map((e) => e.targetId).sort()).toEqual(
      [engineId, brakeId].sort(),
    );
    expect(satisfies.every((e) => e.sourceId === reqId)).toBe(true);

    // Step 7 — Clear impact via banner, then Cmd-Z undo to reverse the last
    // satisfy edge (Brake → Mission). Verifies reversibility of the
    // traceability commands per the gate acceptance.
    await page.getByTestId('impact-banner-clear').click();
    await expect(page.getByTestId('impact-banner')).toHaveCount(0);

    const modifier = browserName === 'webkit' ? 'Meta' : 'Control';
    await page.evaluate(() => {
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
      ) {
        document.activeElement.blur();
      }
    });
    await page.keyboard.press(`${modifier}+KeyZ`);

    const edgesAfterUndo = await readEdges(page);
    const satisfiesAfterUndo = edgesAfterUndo.filter(
      (e) => e.kind === 'RequirementTrace' && e.traceKind === 'satisfy',
    );
    expect(satisfiesAfterUndo).toHaveLength(1);
    expect(satisfiesAfterUndo[0]!.targetId).toBe(engineId);
  });

  test('@a11y populated matrix tab has no serious/critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    const reqId = await dropRequirementOntoCanvas(page, 240, 180);
    await tablist.getByRole('tab', { name: 'Main BDD' }).click();
    const engineId = await addBlockNamed(page, 'Engine');
    await linkRequirementToSelectedElement(page, reqId, 'satisfy');
    await page.getByTestId('surface-tab-requirements').click();
    await page.getByTestId('requirements-tab-matrix-button').click();
    await expect(
      page.getByTestId(
        `requirements-matrix-glyph-${reqId}-${engineId}-satisfy`,
      ),
    ).toBeVisible();

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

  test('@a11y populated coverage tab has no serious/critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    const reqId = await dropRequirementOntoCanvas(page, 240, 180);
    await tablist.getByRole('tab', { name: 'Main BDD' }).click();
    const engineId = await addBlockNamed(page, 'Engine');
    await linkRequirementToSelectedElement(page, reqId, 'satisfy');
    expect(engineId).toBeDefined();
    await page.getByTestId('surface-tab-requirements').click();
    await page.getByTestId('requirements-tab-coverage-button').click();
    await expect(
      page.getByTestId('requirements-coverage-satisfied-count'),
    ).toHaveText('1 / 1');

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

  test('@a11y impact-active canvas has no serious/critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await tablist.getByRole('tab', { name: 'System Requirements' }).click();
    const reqId = await dropRequirementOntoCanvas(page, 240, 180);
    await tablist.getByRole('tab', { name: 'Main BDD' }).click();
    const engineId = await addBlockNamed(page, 'Engine');
    await linkRequirementToSelectedElement(page, reqId, 'satisfy');
    await page
      .locator(`[data-testid="bdd-block-${engineId}"]`)
      .click({ button: 'right' });
    await page.getByTestId('context-menu-show-impact').click();
    await expect(page.getByTestId('impact-banner')).toBeVisible();

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
