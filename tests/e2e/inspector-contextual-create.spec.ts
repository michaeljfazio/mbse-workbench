import { expect, test, type Page } from '@playwright/test';

import { addAndSelectBlockViaPalette } from './_palette-drag-helpers';

// ADR 0015 step 4 — when an element is selected on the inspector, the
// inspector exposes a contextual "+ New <child kind>" panel whose buttons
// create the child as a member of the *currently-selected parent*, NOT
// under the project root. The kinds come from
// `acceptedChildKinds(parentKind)` (the same table that drives the
// containment-tree "Create child…" submenu), so the rule lives in one
// place.

async function addAndSelectPartDefinition(page: Page): Promise<string> {
  // ADR 0015 step 3 retired `toolbar-add-block`; seed via the canonical
  // palette-drag helper that step 1 established.
  const elementId = await addAndSelectBlockViaPalette(page);
  const inspector = page.getByTestId('inspector-single');
  await expect(inspector).toBeVisible();
  await expect(inspector).toHaveAttribute('data-element-id', elementId);
  return elementId;
}

test.describe('Inspector contextual create panel (ADR 0015 step 4)', () => {
  test('PartDefinition selection surfaces + New Port + Value Property; click creates child under selected parent', async ({
    page,
  }) => {
    await page.goto('/');
    const parentId = await addAndSelectPartDefinition(page);

    // (a) contextual create panel is visible and anchored to the selected
    //     PartDefinition.
    const panel = page.getByTestId('inspector-contextual-create');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-parent-id', parentId);
    await expect(panel).toHaveAttribute('data-parent-kind', 'PartDefinition');

    // (b) `acceptedChildKinds('PartDefinition')` is `[PortDefinition(port),
    //     ValueProperty(property)]`. The panel surfaces one button per
    //     entry, labelled with the canonical metamodel singular (per ADR
    //     0015 §"Vocabulary").
    const portButton = panel.getByTestId(
      'inspector-contextual-create-action-PortDefinition-port',
    );
    const valueButton = panel.getByTestId(
      'inspector-contextual-create-action-ValueProperty-property',
    );
    await expect(portButton).toHaveText('+ New Port definition');
    await expect(valueButton).toHaveText('+ New Value');

    // The header discloses the parent so the operator never wonders
    // where the new element lands.
    await expect(
      panel.getByTestId('inspector-contextual-create-header'),
    ).toHaveText(/^Add to Block 1$/);

    // (c) clicking "+ New Port definition" creates a PortDefinition whose
    //     ownerId is the selected PartDefinition (NOT the project root).
    //     The containment tree exposes one row per element; the new row
    //     appears nested under the selected parent.

    // Snapshot the row count under the parent BEFORE the click. The parent's
    // own row is included; we'll just diff before/after.
    const parentRow = page.getByTestId(`containment-tree-element-${parentId}`);
    await expect(parentRow).toBeVisible();

    // The parent row's disclosure triangle expands its children list. After
    // creation the new child should render as a nested row whose ownerId is
    // the parent. We assert directly on element count + the kind row.
    const allBefore = page.locator(
      '[data-testid^="containment-tree-element-"][data-kind]',
    );
    const beforeCount = await allBefore.count();

    await portButton.click();

    // The new element gets auto-selected + the inspector flips to its
    // single-selection view. Its kind is PortDefinition.
    const newInspector = page.getByTestId('inspector-single');
    await expect(newInspector).toBeVisible();
    await expect(newInspector).toContainText('PortDefinition');

    // One additional tree row exists, and its row's data-kind is
    // PortDefinition.
    const allAfter = page.locator(
      '[data-testid^="containment-tree-element-"][data-kind]',
    );
    await expect(allAfter).toHaveCount(beforeCount + 1);

    // Verify the new PortDefinition row is nested UNDER the parent
    // PartDefinition row (depth = parent.depth + 1). The parent row's
    // data-depth is some number N; the new child's row must have depth
    // N + 1 to be considered a child. We assert by finding any
    // PortDefinition row whose data-depth is exactly one greater than the
    // parent's.
    const parentDepthAttr = await parentRow.getAttribute('data-depth');
    if (parentDepthAttr === null) throw new Error('parent depth missing');
    const parentDepth = Number.parseInt(parentDepthAttr, 10);
    const childRow = page.locator(
      `[data-testid^="containment-tree-element-"][data-kind="PortDefinition"][data-depth="${parentDepth + 1}"]`,
    );
    await expect(childRow).toHaveCount(1);

    // NEGATIVE assertion: there is no PortDefinition at the project-root
    // depth (data-depth = 0). I.e. the new child did not land under root.
    const rootDepthPort = page.locator(
      '[data-testid^="containment-tree-element-"][data-kind="PortDefinition"][data-depth="0"]',
    );
    await expect(rootDepthPort).toHaveCount(0);
  });

  test('selecting an element whose kind accepts no children hides the contextual create panel', async ({
    page,
  }) => {
    await page.goto('/');
    // Create a PartDefinition then add a PortDefinition under it (via the
    // existing `inspector-add-port` affordance). PortDefinition is not in
    // the `acceptedChildKinds` switch, so it accepts no authoring children
    // — the contextual create panel must be suppressed for that selection.
    // Step 3 retired `toolbar-add-block`; use the canonical palette-drag.
    await addAndSelectPartDefinition(page);
    await expect(page.getByTestId('inspector-single')).toBeVisible();
    await expect(
      page.getByTestId('inspector-contextual-create'),
    ).toBeVisible();

    // Add a port under the PartDefinition, then select the port via the
    // containment tree row (clicking the row toggles selection).
    await page.getByTestId('inspector-add-port').click();
    const portTreeRow = page
      .locator(
        '[data-testid^="containment-tree-element-"][data-kind="PortDefinition"]',
      )
      .first();
    await expect(portTreeRow).toBeVisible();
    await portTreeRow.click();

    // Inspector now reflects the port selection; contextual panel is
    // suppressed because `acceptedChildKinds('PortDefinition') === []`.
    await expect(page.getByTestId('inspector-single')).toBeVisible();
    await expect(
      page.getByTestId('inspector-contextual-create'),
    ).toHaveCount(0);
  });
});
