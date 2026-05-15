import { expect, test } from '@playwright/test';

test.describe('toolbar disabled-reason tooltips', () => {
  test('Auto-layout, Delete, and Export surface their disabled reasons', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('workspace-header')).toBeVisible();

    const autoLayout = page.getByTestId('toolbar-auto-layout');
    const deleteBtn = page.getByTestId('toolbar-delete');
    const exportTrigger = page.getByTestId('toolbar-export');

    // Empty BDD on first boot: all three are disabled and carry reasons.
    await expect(autoLayout).toBeDisabled();
    await expect(autoLayout).toHaveAttribute('title', 'No elements to lay out');
    await expect(deleteBtn).toBeDisabled();
    await expect(deleteBtn).toHaveAttribute(
      'title',
      'Select something on the diagram to delete',
    );
    await expect(exportTrigger).toBeDisabled();
    await expect(exportTrigger).toHaveAttribute('title', 'No elements to export');

    // Add a block: Auto-layout + Export enable; Auto-layout title flips to its
    // action label; Export trigger title goes away; Delete is still disabled
    // because nothing is selected.
    await page.getByTestId('toolbar-add-block').click();
    await expect(autoLayout).toBeEnabled();
    await expect(autoLayout).toHaveAttribute(
      'title',
      'Re-arrange blocks with dagre layout',
    );
    await expect(exportTrigger).toBeEnabled();
    await expect(exportTrigger).not.toHaveAttribute('title', /.+/);
    await expect(deleteBtn).toBeDisabled();
    await expect(deleteBtn).toHaveAttribute(
      'title',
      'Select something on the diagram to delete',
    );

    // Select the block: Delete enables and its disabled-title disappears.
    const block = page
      .locator('[data-testid^="bdd-block-"][data-element-id]')
      .first();
    await block.click();
    await expect(deleteBtn).toBeEnabled();
    await expect(deleteBtn).not.toHaveAttribute('title', /.+/);
  });

  test('Split-pane buttons distinguish active vs secondary reasons', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('workspace-header')).toBeVisible();

    const activeTab = page.locator('[data-testid^="diagram-tab-"][aria-selected="true"]');
    const tabId = await activeTab.getAttribute('data-testid');
    if (!tabId) throw new Error('active diagram tab not found');
    const activeDiagramId = tabId.replace('diagram-tab-', '');
    const splitButton = page.getByTestId(`split-tab-${activeDiagramId}`);

    await expect(splitButton).toBeDisabled();
    await expect(splitButton).toHaveAttribute('title', 'Already the main diagram');
  });
});
