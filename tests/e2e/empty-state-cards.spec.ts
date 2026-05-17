/**
 * empty-state-cards.spec.ts — ADR 0015 step 2 (#376).
 *
 * Step 2 of the canonical-creation-affordance migration: the empty-state
 * "New Part Definition" and "New Requirement" cards become click-shortcuts
 * that dispatch the SAME `create-element` compound command the palette
 * drag (step 1) uses — `createBlock(position)` for BDD, and
 * `createRequirement(diagramId, position)` for the Requirements surface.
 *
 * The "creates via the shared command" contract is implicit: the card
 * click only renders a node + enters the shared rename flow if the same
 * code path `CanvasPane.handleDrop` exercises succeeds. The element's
 * auto-generated name comes from `nextBlockName` / `nextRequirementName`
 * — "Block 1", "Req1" — which is the proof: empty-state click and palette
 * drag emit indistinguishable elements.
 *
 * Vocabulary: the card label is "New Part Definition" (ADR 0015
 * §"Vocabulary"). The SysML-1.x "Block" alias is gone from creation
 * surfaces; the toolbar `+ Block` button is step 3's job to retire.
 *
 * Scope kept tight: this spec covers the click-shortcut contract for the
 * two create-cards on the empty state. The pre-existing
 * `empty-state-error-boundary.spec.ts` covers the cards' visibility +
 * dismissal-on-click. The pre-existing `palette-drag-from-tree.spec.ts`
 * covers the shared drop-handler path the cards now reuse.
 */

import { expect, test } from '@playwright/test';

test.describe('empty-state cards are click-shortcuts (ADR 0015 step 2, #376)', () => {
  test('the empty state renders a "New Part Definition" card on cold start', async ({
    page,
  }) => {
    await page.goto('/');
    // Cold-start lands on the BDD canvas with zero elements, so the
    // empty-state overlay paints.
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Block Definition Diagram',
    );
    await expect(page.getByTestId('workspace-empty-state')).toBeVisible();
    const card = page.getByTestId('empty-state-new-part-definition');
    await expect(card).toBeVisible();
    await expect(card).toContainText('New Part Definition');
    // The SysML-1.x "Block" alias is gone from the card copy.
    await expect(card).not.toContainText('New Block');
  });

  test('clicking "New Part Definition" creates a PartDefinition on the BDD canvas, selects it, and enters inline rename', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Block Definition Diagram',
    );

    // Pre-condition: zero PartDefinitions in the project-tree group, zero
    // blocks on the BDD canvas, empty-state visible.
    await expect(
      page.getByTestId('project-tree-group-PartDefinition'),
    ).toHaveAttribute('aria-label', expect.stringMatching(/Part definitions \(0\)/));
    const blocksBefore = page.locator(
      '[data-testid^="bdd-block-"][data-element-id]',
    );
    await expect(blocksBefore).toHaveCount(0);
    await expect(page.getByTestId('workspace-empty-state')).toBeVisible();

    await page.getByTestId('empty-state-new-part-definition').click();

    // Post-condition #1: a new PartDefinition node renders on the BDD
    // canvas (proves the shared code path the palette drag uses ran —
    // empty-state click goes through `createBlock`, which emits the same
    // `create-element` + `update-diagram-position` compound).
    const blocks = page.locator(
      '[data-testid^="bdd-block-"][data-element-id]',
    );
    await expect(blocks).toHaveCount(1);

    // Post-condition #2: the empty-state overlay dismisses (elementCount
    // > 0 unmounts it).
    await expect(page.getByTestId('workspace-empty-state')).toHaveCount(0);

    // Post-condition #3: the project tree's Part-Definition group count
    // ticks up to 1 — same accounting the palette-drag spec asserts.
    await expect(
      page.getByTestId('project-tree-group-PartDefinition'),
    ).toHaveAttribute('aria-label', expect.stringMatching(/Part definitions \(1\)/));

    // Post-condition #4: inline rename is queued — the project tree's
    // rename input is mounted + focused for the new element. The
    // element id is captured off the block node's `data-element-id`
    // attribute.
    const newBlock = blocks.first();
    const newElementId = await newBlock.getAttribute('data-element-id');
    expect(newElementId, 'block node must carry data-element-id').toBeTruthy();
    const renameInput = page.getByTestId(
      `containment-tree-element-rename-${newElementId}`,
    );
    await expect(renameInput).toBeVisible();
    await expect(renameInput).toBeFocused();
  });

  test('clicking "New Requirement" creates a Requirement, switches to the Requirements surface, selects it, and enters inline rename', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('workspace-empty-state')).toBeVisible();

    // Pre-condition: zero Requirements.
    await expect(
      page.getByTestId('project-tree-group-Requirement'),
    ).toHaveAttribute('aria-label', expect.stringMatching(/Requirements \(0\)/));

    await page.getByTestId('empty-state-new-requirement').click();

    // Post-condition #1: a Requirement element exists in the tree.
    await expect(
      page.getByTestId('project-tree-group-Requirement'),
    ).toHaveAttribute('aria-label', expect.stringMatching(/Requirements \(1\)/));

    // Post-condition #2: the surface switched to the Requirements editor
    // (the card's UX continuity guarantee — the new element is visible
    // on the surface that owns it).
    await expect(page.getByTestId('requirements-surface')).toBeVisible();

    // Post-condition #3: inline rename is queued for the new Requirement.
    // Pull the auto-named ("ReqN") element via aria-label from the project
    // tree's Requirement group, then assert the rename input is mounted.
    const reqRow = page
      .locator('[data-element-id]')
      .filter({ has: page.locator('text=/^Req\\d+$/') })
      .first();
    // Fallback path: the tree row may not always expose the element id on
    // its outer wrapper; the rename input always carries
    // `containment-tree-element-rename-{id}`, so a single visible
    // rename input is the canonical signal that an inline rename is in
    // progress.
    const renameInputs = page.locator(
      '[data-testid^="containment-tree-element-rename-"]',
    );
    await expect(renameInputs).toHaveCount(1);
    await expect(renameInputs.first()).toBeFocused();
    // Belt and braces: the row that contains the auto-named Requirement
    // resolves at least once (proving the new element rendered in the
    // tree — i.e. the create command actually committed).
    await expect(reqRow).toBeAttached();
  });
});
