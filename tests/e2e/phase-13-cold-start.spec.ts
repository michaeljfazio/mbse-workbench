import { expect, test, type Locator, type Page } from '@playwright/test';

// Phase-13 gate item #1 (per AGENT.md "Phase 13 gate"):
//
//   Cold-start UI walkthrough: a Playwright spec opens the app fresh and,
//   using ONLY user-facing affordances (no direct store mutation), creates
//   a diagram per viewpoint, authors one element per viewpoint, saves the
//   project, reloads, and asserts all eight viewpoints persist with content.
//
// Strategy:
//   - No sessionStorage seed. The app's bootstrap creates an empty
//     "Untitled Project" with a root Package element and a Main BDD diagram
//     anchored on it. That bootstrap IS a user-facing affordance (the cold
//     open), so the BDD slot is filled by Main BDD; the other seven
//     viewpoints are created via the Containment-Tree row menu's
//     "Create representation…" submenu (T-13.33c).
//   - Element authoring uses only user-visible surfaces: inspector
//     empty-state CTAs (T-13.07) where available, project-tree palette drag
//     for IBD's PartUsage (the inspector emits a notice rather than a
//     button for PartUsage), and tree row "Create child…" for the two
//     definition elements (ActionDefinition + StateDefinition) that
//     own Activity and State-Machine representations.
//   - Persistence: autosave is wired into the command bus, so a plain
//     `page.reload()` round-trips through sessionStorage with no explicit
//     save action needed.

const TREE_ROW = '[data-testid^="containment-tree-element-"]';

function rowIdFromTestId(testId: string | null): string {
  if (testId === null) throw new Error('row had no data-testid');
  const prefix = 'containment-tree-element-';
  if (!testId.startsWith(prefix)) {
    throw new Error(`unexpected testid: ${testId}`);
  }
  return testId.slice(prefix.length);
}

async function rowIdByKind(page: Page, kind: string): Promise<string> {
  const row = page.locator(`${TREE_ROW}[data-kind="${kind}"]`).first();
  await expect(row).toBeVisible();
  return rowIdFromTestId(await row.getAttribute('data-testid'));
}

async function openRowMenu(page: Page, elementId: string): Promise<Locator> {
  const trigger = page.getByTestId(
    `containment-tree-element-menu-trigger-${elementId}`,
  );
  // The trigger only becomes visible on row hover. Force-click — the button
  // is fully styled and clickable, just opacity-0 until hover.
  await trigger.click({ force: true });
  const menu = page.getByTestId(`containment-tree-element-menu-${elementId}`);
  await expect(menu).toBeVisible();
  return menu;
}

async function createChild(
  page: Page,
  ownerId: string,
  kind: string,
  ownerRole: string,
): Promise<void> {
  await openRowMenu(page, ownerId);
  await page
    .getByTestId(`containment-tree-element-menu-create-child-${ownerId}`)
    .click();
  await page
    .getByTestId(
      `containment-tree-element-menu-create-${kind}-${ownerRole}-${ownerId}`,
    )
    .click();
  // requestCreateChild fires setRenamingId() — exit the inline rename so
  // subsequent menu opens don't fight an active input.
  await page.keyboard.press('Escape');
}

async function createRepresentation(
  page: Page,
  ownerId: string,
  viewpointId: string,
): Promise<void> {
  await openRowMenu(page, ownerId);
  await page
    .getByTestId(
      `containment-tree-element-menu-create-representation-${ownerId}`,
    )
    .click();
  await page
    .getByTestId(
      `containment-tree-element-menu-representation-${viewpointId}-${ownerId}`,
    )
    .click();
  // Active diagram switches to the new one; wait for the panel to reflect it.
  await expect(page.getByTestId('diagram-panel')).toHaveAttribute(
    'data-viewpoint-id',
    viewpointId,
  );
}

async function activateDiagram(page: Page, name: string): Promise<void> {
  await page
    .getByRole('tablist', { name: 'Diagram tabs' })
    .getByRole('tab', { name })
    .click();
}

async function activeDiagramViewpoint(page: Page): Promise<string> {
  const v = await page.getByTestId('diagram-panel').getAttribute('data-viewpoint-id');
  if (v === null) throw new Error('diagram-panel had no data-viewpoint-id');
  return v;
}

interface ViewpointSlot {
  readonly viewpointId: string;
  readonly /** Diagram name as assigned by requestCreateRepresentation:
   * `${ownerName} ${RepresentationOption.label}`. For Main BDD (bootstrap),
   * the literal "Main BDD". */
  diagramName: string;
  readonly /** Locator selector that resolves to AT LEAST one node on the
   * diagram after authoring. */
  nodeSelector: string;
}

test.describe('Phase-13 gate item #1 — cold-start UI walkthrough', () => {
  // The walkthrough opens 8 diagram tabs in the strip. At the default
  // 1280x720 viewport the rightmost tabs (Activity, State Machine) get
  // clipped behind the sidebar, so Playwright treats them as obscured.
  // Widen the viewport so every tab is reachable.
  test.use({ viewport: { width: 1920, height: 900 } });

  test('eight viewpoints created + authored via UI persist across reload', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();

    // ------------------------------------------------------------------
    // Step 1. Capture the bootstrap root Package's element ID.
    // ------------------------------------------------------------------
    const rootPackageId = await rowIdByKind(page, 'Package');

    // ------------------------------------------------------------------
    // Step 2. The BDD diagram is the bootstrap "Main BDD". Author one
    //         Block on it via the inspector empty-state CTA. This block
    //         is also the PartDefinition we need as an owner for IBD +
    //         Parametric representations.
    // ------------------------------------------------------------------
    await expect(page.getByTestId('diagram-panel')).toHaveAttribute(
      'data-viewpoint-id',
      'bdd',
    );
    await page.getByTestId('inspector-empty-action-PartDefinition').click();
    const partDefRow = page.locator(
      `${TREE_ROW}[data-kind="PartDefinition"]`,
    );
    await expect(partDefRow).toHaveCount(1);
    const partDefId = rowIdFromTestId(
      await partDefRow.first().getAttribute('data-testid'),
    );
    await expect(
      page.locator('[data-testid^="bdd-block-"][data-element-id]'),
    ).toHaveCount(1);

    // ------------------------------------------------------------------
    // Step 3. Create ActionDefinition + StateDefinition children of root
    //         via the tree row menu's "Create child…" submenu. These are
    //         the context elements for Activity + State Machine
    //         representations respectively.
    // ------------------------------------------------------------------
    await createChild(page, rootPackageId, 'ActionDefinition', 'member');
    const actionDefId = await rowIdByKind(page, 'ActionDefinition');

    await createChild(page, rootPackageId, 'StateDefinition', 'member');
    const stateDefId = await rowIdByKind(page, 'StateDefinition');

    // ------------------------------------------------------------------
    // Step 4. Create the seven non-BDD representations. Each
    //         createRepresentation() flips the active diagram to the new
    //         one and adds its tab to the strip.
    // ------------------------------------------------------------------
    // Root-Package representations:
    await createRepresentation(page, rootPackageId, 'requirements');
    await createRepresentation(page, rootPackageId, 'use-case');
    await createRepresentation(page, rootPackageId, 'package');
    // PartDefinition representations:
    await createRepresentation(page, partDefId, 'ibd');
    await createRepresentation(page, partDefId, 'parametric');
    // ActionDefinition representation:
    await createRepresentation(page, actionDefId, 'activity');
    // StateDefinition representation:
    await createRepresentation(page, stateDefId, 'state-machine');

    // All 8 viewpoints now have a tab. Diagram-tab names derive from
    // `${ownerName} ${RepresentationOption.label}`. The root Package
    // bootstraps as "Untitled Project"; "New Action Definition" /
    // "New State Definition" are the default tree-child names from
    // requestCreateChild ("New ${ChildKindOption.label}"). "Block 1" is
    // the default block name from createBlock().
    const slots: readonly ViewpointSlot[] = [
      { viewpointId: 'bdd', diagramName: 'Main BDD', nodeSelector: '[data-testid^="bdd-block-"][data-element-id]' },
      { viewpointId: 'requirements', diagramName: 'Untitled Project Requirements', nodeSelector: '[data-testid^="requirements-req-"][data-element-id]' },
      { viewpointId: 'use-case', diagramName: 'Untitled Project Use Case', nodeSelector: '[data-testid^="use-case-actor-"][data-element-id], [data-testid^="use-case-usecase-"][data-element-id]' },
      { viewpointId: 'package', diagramName: 'Untitled Project Package', nodeSelector: '[data-testid^="package-node-"][data-element-id]' },
      { viewpointId: 'ibd', diagramName: 'Block 1 IBD', nodeSelector: '[data-testid^="ibd-part-"][data-element-id]' },
      { viewpointId: 'parametric', diagramName: 'Block 1 Parametric', nodeSelector: '[data-testid^="parametric-constraint-"][data-element-id], [data-testid^="parametric-value-"][data-element-id]' },
      { viewpointId: 'activity', diagramName: 'New Action Definition Activity', nodeSelector: '[data-testid^="activity-action-"][data-element-id]' },
      { viewpointId: 'state-machine', diagramName: 'New State Definition State Machine', nodeSelector: '[data-testid^="state-machine-state-"][data-element-id]' },
    ];

    // ------------------------------------------------------------------
    // Step 5. Author one element on each of the seven new diagrams. BDD
    //         (Main BDD) was authored in Step 2. Order chosen so each
    //         diagram is reachable via a known tab name.
    // ------------------------------------------------------------------

    // Authoring strategy: prefer affordances that don't depend on the
    // current selection. Toolbar buttons (`toolbar-add-…`) and tree
    // row-menu "Create child" both create + auto-select an element
    // regardless of prior selection. The inspector empty-state CTA
    // (T-13.07) only renders when nothing is selected, so it's used
    // only on the initial fresh-load BDD step (Step 2) where selection
    // is guaranteed empty.

    // Requirements: toolbar + Requirement.
    await activateDiagram(page, 'Untitled Project Requirements');
    expect(await activeDiagramViewpoint(page)).toBe('requirements');
    await page.getByTestId('toolbar-add-requirement').click();
    await expect(
      page.locator('[data-testid^="requirements-req-"][data-element-id]'),
    ).toHaveCount(1);

    // Use Case: toolbar + Actor.
    await activateDiagram(page, 'Untitled Project Use Case');
    expect(await activeDiagramViewpoint(page)).toBe('use-case');
    await page.getByTestId('toolbar-add-actor').click();
    await expect(
      page.locator('[data-testid^="use-case-actor-"][data-element-id]'),
    ).toHaveCount(1);

    // Package: no toolbar button. Use tree row menu — Create child >
    // Package on root. The new Package becomes a member of root and
    // renders as a sibling node on the Package canvas (which already
    // shows root). Assert that the on-canvas Package count grows by 1.
    await activateDiagram(page, 'Untitled Project Package');
    expect(await activeDiagramViewpoint(page)).toBe('package');
    const packageNodes = page.locator(
      '[data-testid^="package-node-"][data-element-id]',
    );
    const packageCountBefore = await packageNodes.count();
    await createChild(page, rootPackageId, 'Package', 'member');
    await expect(packageNodes).toHaveCount(packageCountBefore + 1);

    // IBD: drag the project-tree PartUsage palette chip onto the canvas
    // drop target, then choose the existing PartDefinition from the
    // PartUsageTypePopover (T-13.18 / ibd-parts.spec.ts pattern).
    await activateDiagram(page, 'Block 1 IBD');
    expect(await activeDiagramViewpoint(page)).toBe('ibd');
    await page
      .getByTestId('project-tree-group-PartUsage')
      .dragTo(page.getByTestId('canvas-drop-target'), {
        targetPosition: { x: 360, y: 220 },
      });
    const popover = page.getByTestId('part-type-popover');
    await expect(popover).toBeVisible();
    await page.getByTestId(`part-type-option-${partDefId}`).click();
    await expect(popover).toHaveCount(0);
    await expect(
      page.locator('[data-testid^="ibd-part-"][data-element-id]'),
    ).toHaveCount(1);

    // Parametric: no toolbar button. Use tree row menu — Create child >
    // Value Property on Block 1 (PartDefinition). The new ValueProperty
    // is a property of the block and renders on its Parametric canvas
    // (Parametric.acceptedElementKinds = [ConstraintUsage, ValueProperty]).
    await activateDiagram(page, 'Block 1 Parametric');
    expect(await activeDiagramViewpoint(page)).toBe('parametric');
    await createChild(page, partDefId, 'ValueProperty', 'property');
    await expect(
      page.locator('[data-testid^="parametric-value-"][data-element-id]'),
    ).toHaveCount(1);

    // Activity: toolbar + Action.
    await activateDiagram(page, 'New Action Definition Activity');
    expect(await activeDiagramViewpoint(page)).toBe('activity');
    await page.getByTestId('toolbar-add-action').click();
    await expect(
      page.locator('[data-testid^="activity-action-"][data-element-id]'),
    ).toHaveCount(1);

    // State Machine: toolbar + State.
    await activateDiagram(page, 'New State Definition State Machine');
    expect(await activeDiagramViewpoint(page)).toBe('state-machine');
    await page.getByTestId('toolbar-add-state').click();
    await expect(
      page.locator('[data-testid^="state-machine-state-"][data-element-id]'),
    ).toHaveCount(1);

    // ------------------------------------------------------------------
    // Step 6. Pre-reload sanity: each of the 8 diagrams has at least one
    //         authored node. Walk all 8 tabs.
    // ------------------------------------------------------------------
    for (const slot of slots) {
      await activateDiagram(page, slot.diagramName);
      expect(await activeDiagramViewpoint(page)).toBe(slot.viewpointId);
      await expect(
        page.locator(slot.nodeSelector),
        `pre-reload: ${slot.diagramName} should contain authored node`,
      ).not.toHaveCount(0);
    }

    // ------------------------------------------------------------------
    // Step 7. Reload. The command bus autosaves on every mutation, so
    //         sessionStorage already holds the full project. page.reload()
    //         preserves sessionStorage by default.
    // ------------------------------------------------------------------
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();

    // All 8 tabs reappear (open-tab-set is persisted).
    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    for (const slot of slots) {
      await expect(
        tablist.getByRole('tab', { name: slot.diagramName }),
        `post-reload: ${slot.diagramName} tab should be present`,
      ).toBeVisible();
    }

    // ------------------------------------------------------------------
    // Step 8. Each diagram still contains its authored element after
    //         reload.
    // ------------------------------------------------------------------
    for (const slot of slots) {
      await activateDiagram(page, slot.diagramName);
      expect(await activeDiagramViewpoint(page)).toBe(slot.viewpointId);
      await expect(
        page.locator(slot.nodeSelector),
        `post-reload: ${slot.diagramName} should still contain authored node`,
      ).not.toHaveCount(0);
    }
  });
});
