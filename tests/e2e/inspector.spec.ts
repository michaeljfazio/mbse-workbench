import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function addAndSelectBlock(page: Page): Promise<Locator> {
  const before = page.locator('[data-testid^="bdd-block-"][data-element-id]');
  const beforeCount = await before.count();
  await page.getByTestId('toolbar-add-block').click();
  await expect(before).toHaveCount(beforeCount + 1);
  const block = page
    .locator('[data-testid^="bdd-block-"][data-element-id]')
    .nth(beforeCount);
  await block.click();
  await expect(page.getByTestId('inspector-single')).toBeVisible();
  return block;
}

test.describe('Inspector panel (issue #32)', () => {
  test('empty selection shows the create panel for the active viewpoint', async ({
    page,
  }) => {
    await page.goto('/');
    const empty = page.getByTestId('inspector-empty');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveAttribute('data-viewpoint-id', 'bdd');
    await expect(empty).toContainText(/Add to this diagram/i);
    await expect(
      page.getByTestId('inspector-empty-action-PartDefinition'),
    ).toHaveText('+ New Block');
  });

  test('single selection shows kind label and editable name/description fields', async ({
    page,
  }) => {
    await page.goto('/');
    await addAndSelectBlock(page);

    const inspector = page.getByTestId('inspector-single');
    await expect(inspector).toContainText('PartDefinition');
    await expect(page.getByTestId('inspector-name')).toHaveValue('Block 1');
    await expect(page.getByTestId('inspector-description')).toHaveValue('');
    // Every new element is owned by the project's root Package, so the
    // inspector-owner field now shows the root Package's ID rather than
    // "unassigned". We assert it is non-empty.
    await expect(page.getByTestId('inspector-owner')).not.toBeEmpty();
  });

  test('editing the name field commits on blur and the block label updates', async ({
    page,
  }) => {
    await page.goto('/');
    const block = await addAndSelectBlock(page);

    const nameField = page.getByTestId('inspector-name');
    await nameField.fill('Engine');
    await nameField.blur();

    const label = block.locator('[data-testid^="bdd-block-label-"]');
    await expect(label).toHaveText('Engine');

    // Refresh: sessionStorage repo persists across reload of the same tab.
    await page.reload();
    await expect(
      page
        .locator('[data-testid^="bdd-block-label-"]')
        .first(),
    ).toHaveText('Engine');
  });

  test('editing the description commits on blur', async ({ page }) => {
    await page.goto('/');
    const block = await addAndSelectBlock(page);

    const desc = page.getByTestId('inspector-description');
    await desc.fill('Provides the rotational power.');
    await desc.blur();

    // Inspector still reflects committed value, click block again to refresh.
    await block.click();
    await expect(page.getByTestId('inspector-description')).toHaveValue(
      'Provides the rotational power.',
    );
  });

  test('committing an empty name leaves the original name in place', async ({
    page,
  }) => {
    await page.goto('/');
    const block = await addAndSelectBlock(page);

    const nameField = page.getByTestId('inspector-name');
    await nameField.fill('');
    await nameField.blur();

    const label = block.locator('[data-testid^="bdd-block-label-"]');
    await expect(label).toHaveText('Block 1');
    await expect(nameField).toHaveValue('Block 1');
  });

  test('Cmd+Z undoes the rename; Cmd+Shift+Z redoes it', async ({
    page,
    browserName,
  }) => {
    await page.goto('/');
    const block = await addAndSelectBlock(page);

    const nameField = page.getByTestId('inspector-name');
    await nameField.fill('Engine');
    await nameField.blur();
    const label = block.locator('[data-testid^="bdd-block-label-"]');
    await expect(label).toHaveText('Engine');

    // Click empty area of the canvas to take focus out of the textbox.
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });

    const modifier = browserName === 'webkit' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyZ`);
    await expect(label).toHaveText('Block 1');

    await page.keyboard.press(`${modifier}+Shift+KeyZ`);
    await expect(label).toHaveText('Engine');
  });

  test('inline rename in the BlockNode flows back into the inspector name field', async ({
    page,
  }) => {
    await page.goto('/');
    const block = await addAndSelectBlock(page);

    const label = block.locator('[data-testid^="bdd-block-label-"]');
    await label.dblclick();
    const input = block.locator('[data-testid^="bdd-block-input-"]');
    await input.fill('Engine');
    await input.press('Enter');

    await expect(label).toHaveText('Engine');
    await expect(page.getByTestId('inspector-name')).toHaveValue('Engine');
  });

  test('@a11y inspector with a block selected has no serious or critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    await addAndSelectBlock(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@visual inspector-block-selected baseline', async ({ page }) => {
    await page.goto('/');
    await addAndSelectBlock(page);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('inspector-block-selected.png', {
      fullPage: false,
    });
  });
});
