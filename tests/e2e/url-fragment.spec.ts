import { expect, test } from '@playwright/test';

test.describe('URL fragment permalinks (T-13.39)', () => {
  test('selecting an element writes #/element/<id>; clearing falls back to #/diagram/<id>', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('workspace-header')).toBeVisible();
    await expect(page.getByTestId('workspace-project-name')).toBeEnabled();

    // Cold start: no selection, BDD active by default → expect #/diagram/<id>.
    await expect
      .poll(() => page.evaluate(() => window.location.hash))
      .toMatch(/^#\/diagram\//);

    // Create a block via the canvas-toolbar Add affordance, then click it to
    // select — `createBlock` itself does not change selection. URL should
    // flip from the diagram-form to the element-form fragment.
    await page.getByTestId('toolbar-add-block').click();
    const block = page
      .locator('[data-testid^="bdd-block-"][data-element-id]')
      .first();
    await expect(block).toBeVisible();
    await block.click();

    await expect
      .poll(() => page.evaluate(() => window.location.hash))
      .toMatch(/^#\/element\//);

    // Clear selection by pressing Escape inside the React Flow viewport.
    // URL falls back to the active diagram form.
    await page.locator('.react-flow').click({ position: { x: 5, y: 5 } });
    await expect
      .poll(() => page.evaluate(() => window.location.hash))
      .toMatch(/^#\/diagram\//);
  });

  test('cold-load with #/element/<id> selects the element after hydration', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('workspace-project-name')).toBeEnabled();

    // Create a block, then capture its element id from the DOM.
    await page.getByTestId('toolbar-add-block').click();
    const block = page
      .locator('[data-testid^="bdd-block-"][data-element-id]')
      .first();
    await expect(block).toBeVisible();
    const elementId = await block.getAttribute('data-element-id');
    expect(elementId).not.toBeNull();
    const blockName = await block
      .locator(`[data-testid^="bdd-block-label-"]`)
      .textContent();
    expect(blockName).not.toBeNull();

    // Reload with the element-form hash. Hydration should restore selection
    // — the inspector flips from inspector-empty to inspector-single and
    // shows the block's name.
    await page.goto(`/#/element/${encodeURIComponent(elementId!)}`);
    await expect(page.getByTestId('workspace-project-name')).toBeEnabled();
    await expect(page.getByTestId('inspector-single')).toBeVisible();
    await expect(page.getByTestId('inspector-name')).toHaveValue(blockName!);

    // And the URL is preserved across the round-trip.
    expect(await page.evaluate(() => window.location.hash)).toBe(
      `#/element/${encodeURIComponent(elementId!)}`,
    );
  });
});
