import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Workspace shell (issue #30)', () => {
  test('renders header, three panes with correct ARIA roles, and the BDD tab is the default', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByLabel('Active project')).toHaveText(/Untitled Project/);

    await expect(page.getByRole('tree', { name: 'Project tree' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Canvas' })).toBeVisible();
    await expect(
      page.getByRole('complementary', { name: 'Inspector and chat' }),
    ).toBeVisible();

    const tablist = page.getByRole('tablist', { name: 'Diagram tabs' });
    await expect(tablist).toBeVisible();
    const activeTab = tablist.getByRole('tab', { selected: true });
    await expect(activeTab).toHaveText(/Main BDD/);

    await expect(
      page.getByRole('tab', { name: 'Inspector', selected: true }),
    ).toBeVisible();
    await expect(page.getByTestId('sidebar-panel')).toContainText(
      /Select an element to edit/,
    );
  });

  test('switching to the Chat tab swaps the visible tabpanel content', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Chat' }).click();
    await expect(
      page.getByRole('tab', { name: 'Chat', selected: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('complementary', { name: 'Inspector and chat' }),
    ).toContainText(/Chat lands in Phase 11/);
  });

  test('dragging the left divider resizes the project tree pane and persists across reload', async ({
    page,
  }) => {
    await page.goto('/');

    const treePane = page.getByTestId('project-tree-pane');
    const divider = page.getByRole('separator', {
      name: 'Resize project tree pane',
    });
    await expect(treePane).toBeVisible();
    await expect(divider).toBeVisible();

    const startBox = await treePane.boundingBox();
    const dividerBox = await divider.boundingBox();
    if (!startBox || !dividerBox) throw new Error('missing bounding box');

    await page.mouse.move(
      dividerBox.x + dividerBox.width / 2,
      dividerBox.y + dividerBox.height / 2,
    );
    await page.mouse.down();
    const targetX = dividerBox.x + 80;
    await page.mouse.move(targetX, dividerBox.y + dividerBox.height / 2, {
      steps: 8,
    });
    await page.mouse.up();

    const newBox = await treePane.boundingBox();
    if (!newBox) throw new Error('missing bounding box after resize');
    expect(newBox.width).toBeGreaterThan(startBox.width + 40);

    const widthAfterDrag = newBox.width;

    await page.reload();
    const reloadedBox = await page
      .getByTestId('project-tree-pane')
      .boundingBox();
    if (!reloadedBox) throw new Error('missing bounding box after reload');
    expect(Math.abs(reloadedBox.width - widthAfterDrag)).toBeLessThanOrEqual(2);
  });

  test('@visual workspace empty BDD baseline', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('region', { name: 'Canvas' }),
    ).toContainText(/Block Definition Diagram/);
    // Move the mouse out of the way so hover states don't leak into the snapshot.
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('workspace-empty-bdd.png', {
      fullPage: false,
    });
  });

  test('@a11y workspace shell has no serious or critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('region', { name: 'Canvas' }),
    ).toContainText(/Block Definition Diagram/);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
});
