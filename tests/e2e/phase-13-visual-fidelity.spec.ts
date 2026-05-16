import { expect, test, type Page } from '@playwright/test';

// Phase-13 gate item #2 (per AGENT.md "Phase 13 gate"):
//
//   Visual fidelity invariants: every node kind has computed
//   `backgroundColor !== 'rgba(0, 0, 0, 0)'`; every popover dialog same;
//   IBD ports have square (not pill) DOM geometry; the Use-Case node is
//   an SVG ellipse.
//
// These invariants are believed to hold after T-13.16 (`card` token in
// tailwind.config.ts + index.css), T-13.17 (square port glyphs in
// PartUsageNode), and T-13.22 (use-case SVG ellipse). This spec codifies
// them as a regression shield so the Phase-13 gate item can be checked
// off and any future drift surfaces immediately.

const SEED_PROJECT_ID = 'p-phase-13-visual-fidelity';
const ROOT_ID = 'pf-root';

interface SeedDiagram {
  readonly id: string;
  readonly viewpointId: string;
  readonly name: string;
  readonly context: { readonly kind: string; readonly id: string };
  readonly positions: Record<string, { readonly x: number; readonly y: number }>;
}

const SEED_ELEMENTS = [
  // Root package. Single ownerId===null entry.
  { id: ROOT_ID, kind: 'Package', name: 'Phase 13 Visual Fidelity', ownerId: null, ownerRole: 'member', ownerIndex: 0 },

  // BDD: a block (PartDefinition) plus a PortDefinition for IBD port typing.
  { id: 'pf-block', kind: 'PartDefinition', name: 'Vessel', isAbstract: false, ownerId: ROOT_ID, ownerRole: 'member', ownerIndex: 0 },
  { id: 'pf-port-def', kind: 'PortDefinition', name: 'P', ownerId: 'pf-block', ownerRole: 'port', ownerIndex: 0 },

  // IBD: PartUsage typed by Vessel, with one PortUsage child for the
  // square-port-glyph invariant.
  { id: 'pf-part', kind: 'PartUsage', name: 'mainVessel', definitionId: 'pf-block', ownerId: 'pf-block', ownerRole: 'property', ownerIndex: 1 },
  { id: 'pf-port-usage', kind: 'PortUsage', name: 'p1', direction: 'in', definitionId: 'pf-port-def', ownerId: 'pf-part', ownerRole: 'port', ownerIndex: 0 },

  // Requirements.
  { id: 'pf-req', kind: 'Requirement', name: 'R1', text: 'The system shall…', reqId: 'R-001', priority: 'high', status: 'approved', ownerId: ROOT_ID, ownerRole: 'member', ownerIndex: 1 },

  // Activity: ActionUsage rendered directly. Note: the Activity viewpoint's
  // `acceptedElementKinds` includes ActionDefinition but its `nodeTypeFor`
  // throws for that kind (the "called activity" frame is reserved for a
  // future ADR). So we keep ActionDefinition out of the seed entirely and
  // anchor the diagram at the root package — `acceptedContextKinds`
  // mismatch is irrelevant for visual fidelity (gate item #3 covers
  // context conformance separately).
  { id: 'pf-action', kind: 'ActionUsage', name: 'Act1', nodeType: 'action', ownerId: ROOT_ID, ownerRole: 'member', ownerIndex: 2 },

  // State Machine: StateUsage rendered directly (same reasoning as Activity
  // — StateDefinition is in `acceptedElementKinds` but unrenderable).
  { id: 'pf-state', kind: 'StateUsage', name: 'S1', stateType: 'state', ownerId: ROOT_ID, ownerRole: 'member', ownerIndex: 3 },

  // Use Case viewpoint.
  { id: 'pf-usecase', kind: 'UseCase', name: 'UC1', ownerId: ROOT_ID, ownerRole: 'member', ownerIndex: 4 },
  { id: 'pf-actor', kind: 'Actor', name: 'A1', ownerId: ROOT_ID, ownerRole: 'member', ownerIndex: 5 },

  // Parametric: context is a PartDefinition. We re-use `pf-block` so the
  // ConstraintUsage / ValueProperty are properties of Vessel.
  { id: 'pf-constraint', kind: 'ConstraintUsage', name: 'C1', expression: 'x = y', ownerId: 'pf-block', ownerRole: 'property', ownerIndex: 2 },
  { id: 'pf-valueprop', kind: 'ValueProperty', name: 'v1', type: 'Real', defaultValue: '0', ownerId: 'pf-block', ownerRole: 'property', ownerIndex: 3 },

  // Package viewpoint: a sub-package whose icon renders inside the root.
  { id: 'pf-sub-pkg', kind: 'Package', name: 'SubPkg', ownerId: ROOT_ID, ownerRole: 'member', ownerIndex: 6 },
] as const;

const SEED_DIAGRAMS: readonly SeedDiagram[] = [
  { id: 'd-bdd', viewpointId: 'bdd', name: 'BDD', context: { kind: 'package', id: ROOT_ID }, positions: { 'pf-block': { x: 120, y: 120 } } },
  { id: 'd-ibd', viewpointId: 'ibd', name: 'IBD', context: { kind: 'partDefinition', id: 'pf-block' }, positions: { 'pf-part': { x: 220, y: 180 } } },
  { id: 'd-req', viewpointId: 'requirements', name: 'Reqs', context: { kind: 'package', id: ROOT_ID }, positions: { 'pf-req': { x: 120, y: 120 } } },
  // Activity / State Machine intentionally use package context — see
  // SEED_ELEMENTS comment above for the rationale.
  { id: 'd-act', viewpointId: 'activity', name: 'Act', context: { kind: 'package', id: ROOT_ID }, positions: { 'pf-action': { x: 120, y: 120 } } },
  { id: 'd-sm', viewpointId: 'state-machine', name: 'SM', context: { kind: 'package', id: ROOT_ID }, positions: { 'pf-state': { x: 120, y: 120 } } },
  { id: 'd-uc', viewpointId: 'use-case', name: 'UC', context: { kind: 'package', id: ROOT_ID }, positions: { 'pf-usecase': { x: 240, y: 120 }, 'pf-actor': { x: 60, y: 120 } } },
  { id: 'd-param', viewpointId: 'parametric', name: 'Param', context: { kind: 'partDefinition', id: 'pf-block' }, positions: { 'pf-constraint': { x: 120, y: 120 }, 'pf-valueprop': { x: 320, y: 120 } } },
  { id: 'd-pkg', viewpointId: 'package', name: 'Pkg', context: { kind: 'package', id: ROOT_ID }, positions: { 'pf-sub-pkg': { x: 120, y: 120 } } },
];

// Per-viewpoint rectangular-bodied node testid + diagram tab metadata.
// These are the kinds where the outer `[data-testid=...]` div carries the
// visible `bg-card` background. Excludes Use Case (SVG ellipse — shape
// invariant), Actor (SVG stick figure), and Package (transparent outer
// container with a `bg-card` child body).
interface RectangularBody {
  readonly diagramName: string;
  readonly testId: string;
  readonly label: string;
}

const RECTANGULAR_BODIES: readonly RectangularBody[] = [
  { diagramName: 'BDD', testId: 'bdd-block-pf-block', label: 'BDD Block (PartDefinition)' },
  { diagramName: 'IBD', testId: 'ibd-part-pf-part', label: 'IBD Part (PartUsage)' },
  { diagramName: 'Reqs', testId: 'requirements-req-pf-req', label: 'Requirement' },
  { diagramName: 'Act', testId: 'activity-action-pf-action', label: 'Activity Action (ActionUsage)' },
  { diagramName: 'SM', testId: 'state-machine-state-pf-state', label: 'State Machine State (StateUsage)' },
  { diagramName: 'Param', testId: 'parametric-constraint-pf-constraint', label: 'Parametric ConstraintUsage' },
  { diagramName: 'Param', testId: 'parametric-value-pf-valueprop', label: 'Parametric ValueProperty' },
];

const TRANSPARENT_RGBA = 'rgba(0, 0, 0, 0)';

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, rootId, elements, diagrams }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const now = '2026-05-16T10:00:00.000Z';
      const project = {
        id: projectId,
        name: 'Phase 13 Visual Fidelity Seed',
        createdAt: now,
        modifiedAt: now,
        rootId,
        elements,
        edges: [],
        diagrams,
        history: { undo: [], redo: [] },
        conversations: [],
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      rootId: ROOT_ID,
      elements: SEED_ELEMENTS,
      diagrams: SEED_DIAGRAMS,
    },
  );
}

async function activateDiagram(page: Page, name: string): Promise<void> {
  await page
    .getByRole('tablist', { name: 'Diagram tabs' })
    .getByRole('tab', { name })
    .click();
}

test.describe('Phase-13 gate item #2 — visual fidelity invariants', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();
  });

  test('every rectangular node body has opaque backgroundColor (bg-card resolves)', async ({ page }) => {
    for (const { diagramName, testId, label } of RECTANGULAR_BODIES) {
      await activateDiagram(page, diagramName);
      const body = page.getByTestId(testId);
      await expect(body, `${label} should render on ${diagramName}`).toBeVisible();
      const bg = await body.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor,
      );
      expect(
        bg,
        `${label} (${testId}) on diagram ${diagramName} should have opaque backgroundColor (got "${bg}")`,
      ).not.toBe(TRANSPARENT_RGBA);
    }
  });

  test('IBD port handles have square geometry (not pill / rounded-full)', async ({ page }) => {
    await activateDiagram(page, 'IBD');
    const handle = page.getByTestId('ibd-handle-pf-port-usage');
    await expect(handle).toBeVisible();
    const radius = await handle.evaluate(
      (el) => window.getComputedStyle(el).borderRadius,
    );
    // `!rounded-none` resolves to "0px"; the explicit pill value would be
    // "9999px". Reject any "9999px" component (handles top-left,
    // top-right, etc., resolved per-corner).
    expect(
      radius,
      `IBD port handle borderRadius should be square (got "${radius}"; must not contain 9999px)`,
    ).not.toContain('9999px');
  });

  test('Use-Case node renders as an SVG <ellipse>', async ({ page }) => {
    await activateDiagram(page, 'UC');
    const useCase = page.getByTestId('use-case-usecase-pf-usecase');
    await expect(useCase).toBeVisible();
    const ellipse = useCase.locator('svg > ellipse');
    await expect(
      ellipse,
      'Use-Case node must contain an <ellipse> SVG element (T-13.22 invariant)',
    ).toHaveCount(1);
  });

  test('containment-tree row context menu (popover) has opaque backgroundColor', async ({ page }) => {
    // Open the three-dots menu on the root package row. The menu is a
    // Radix `role=menu` overlay; it's the closest representative popover
    // surface in the explorer column.
    const rootRow = page.getByTestId(`containment-tree-element-${ROOT_ID}`);
    await expect(rootRow).toBeVisible();
    const trigger = rootRow.getByRole('button', { name: 'Open row menu' });
    await trigger.click();
    const menu = page.getByRole('menu').first();
    await expect(menu).toBeVisible();
    const bg = await menu.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );
    expect(
      bg,
      `Containment-tree row context menu popover should have opaque backgroundColor (got "${bg}")`,
    ).not.toBe(TRANSPARENT_RGBA);
  });
});
