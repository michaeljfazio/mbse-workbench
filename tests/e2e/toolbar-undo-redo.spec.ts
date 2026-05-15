import { expect, test } from '@playwright/test';

test.describe('toolbar Undo/Redo buttons', () => {
  test('Undo/Redo enable, click, and round-trip a block create', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('workspace-header')).toBeVisible();

    const undo = page.getByTestId('toolbar-undo');
    const redo = page.getByTestId('toolbar-redo');
    const blocks = page.locator('[data-testid^="bdd-block-"][data-element-id]');

    // Empty BDD on first boot: both disabled with their respective reasons.
    await expect(undo).toBeDisabled();
    await expect(undo).toHaveAttribute('title', 'Nothing to undo');
    await expect(redo).toBeDisabled();
    await expect(redo).toHaveAttribute('title', 'Nothing to redo');

    // Create a block: Undo enables and flips to its action label; Redo stays
    // disabled because a fresh dispatch clears the redo stack.
    await page.getByTestId('toolbar-add-block').click();
    await expect(blocks).toHaveCount(1);
    await expect(undo).toBeEnabled();
    await expect(undo).toHaveAttribute('title', 'Undo last action (Cmd-Z)');
    await expect(redo).toBeDisabled();
    await expect(redo).toHaveAttribute('title', 'Nothing to redo');

    // Click Undo: block is removed, Undo flips back to disabled, Redo enables.
    await undo.click();
    await expect(blocks).toHaveCount(0);
    await expect(undo).toBeDisabled();
    await expect(undo).toHaveAttribute('title', 'Nothing to undo');
    await expect(redo).toBeEnabled();
    await expect(redo).toHaveAttribute(
      'title',
      'Redo last undone action (Cmd-Shift-Z)',
    );

    // Click Redo: block returns, Undo enables, Redo flips back to disabled.
    await redo.click();
    await expect(blocks).toHaveCount(1);
    await expect(undo).toBeEnabled();
    await expect(redo).toBeDisabled();
  });
});
