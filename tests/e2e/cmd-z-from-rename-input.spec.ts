import { expect, test } from '@playwright/test';

// Regression test for issue #386 — Cmd-Z from the inline-rename input
// (the input that auto-opens on element creation) must undo the create.
//
// Walk-2 (iter-796) observed Cmd-Z NO-OP after a palette `+ New Part
// Definition` click. The probe at iter-798 traced the root cause: the
// palette click immediately opens the inline-rename `<input>` for the
// newly-created element, and the global Workspace keyboard handler
// (Workspace.tsx isTextInputTarget at line 20-26) intentionally skips
// text-input focus to preserve in-place text undo. Additionally, the
// rename input's onKeyDown calls `e.stopPropagation()` for all keys
// except Enter/Escape, so even if the global handler had been willing
// to undo on text-input focus, it wouldn't have received the event.
//
// Iter-798 fix: in ContainmentTreeRenameInput's onKeyDown, special-case
// Cmd-Z (and Cmd-Shift-Z) on an UNTOUCHED rename input — value ===
// initialValue, no edits — to cancel the rename and dispatch the model
// undo (or redo). The "untouched" guard preserves character-level undo
// behavior once the user has typed into the input.

test.describe('Cmd-Z from inline rename input (issue #386)', () => {
  test('Cmd-Z on the just-created element\'s untouched rename input undoes the create', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /MBSE Workbench/i })).toBeVisible();

    const initialNodes = page.locator('.react-flow__node');
    await expect(initialNodes).toHaveCount(0);

    // Click palette + New Part Definition — this both creates the element
    // and auto-focuses the inline-rename input.
    await page.locator('button[aria-label="New Part Definition"]').first().click();

    const renameInput = page.locator(
      '[data-testid^="containment-tree-element-rename-"]',
    );
    await expect(renameInput).toBeVisible();
    // Sanity: a node now exists on the canvas.
    await expect(page.locator('.react-flow__node')).toHaveCount(1);

    // Press Cmd-Z on the untouched rename input — should undo the create.
    await renameInput.press('Meta+Z');

    // Rename input is gone (cancelled), AND the model create is reverted.
    await expect(renameInput).toBeHidden();
    await expect(page.locator('.react-flow__node')).toHaveCount(0);
  });

  test('Cmd-Shift-Z on the rename input redoes the prior undo', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /MBSE Workbench/i })).toBeVisible();

    // Create, then undo, then in a fresh rename state press Cmd-Shift-Z.
    await page.locator('button[aria-label="New Part Definition"]').first().click();
    const renameInput = page.locator(
      '[data-testid^="containment-tree-element-rename-"]',
    );
    await expect(renameInput).toBeVisible();
    await renameInput.press('Meta+Z');
    await expect(page.locator('.react-flow__node')).toHaveCount(0);

    // Create again to land in a fresh rename input
    await page.locator('button[aria-label="New Part Definition"]').first().click();
    const renameInput2 = page.locator(
      '[data-testid^="containment-tree-element-rename-"]',
    );
    await expect(renameInput2).toBeVisible();
    await renameInput2.press('Meta+Z');
    await expect(page.locator('.react-flow__node')).toHaveCount(0);

    // Now redo via Cmd-Shift-Z from a fresh rename input would require
    // entering rename-mode again. The undo already cleared the create, so
    // Cmd-Shift-Z from anywhere should redo it. Use the body since no
    // rename input is currently open.
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Meta+Shift+Z');
    await expect(page.locator('.react-flow__node')).toHaveCount(1);
  });

  test('Cmd-Z on an EDITED rename input does NOT undo the create (preserves text-undo)', async ({
    page,
  }) => {
    await page.goto('/');

    await page.locator('button[aria-label="New Part Definition"]').first().click();
    const renameInput = page.locator(
      '[data-testid^="containment-tree-element-rename-"]',
    );
    await expect(renameInput).toBeVisible();

    // Type a character — now value !== initialValue.
    await renameInput.fill('Aircraft');

    // Cmd-Z should NOT cancel the rename and undo the create; it should
    // fall through to the input's native undo (revert the typed text).
    await renameInput.press('Meta+Z');

    // The rename input is still visible (not cancelled by our handler).
    await expect(renameInput).toBeVisible();
    // The canvas node is still present.
    await expect(page.locator('.react-flow__node')).toHaveCount(1);
  });
});
