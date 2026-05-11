import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Cross-diagram nav seed (issue #53): one PartDefinition `Engine` placed on
// the Main BDD, plus a PartUsage `engine` typed by Engine placed on an IBD
// whose context binds it to the Engine PartDefinition. The right-click menu
// on the Engine block should offer "Show in IBD"; the right-click menu on
// the engine PartUsage should offer "Show definition in BDD".

const SEED_PROJECT_ID = 'p-ctx-menu-seed';
const DEF_ID = 'pd-engine';
const PART_USAGE_ID = 'pu-engine';
const BDD_ID = 'd-bdd';
const IBD_ID = 'd-ibd';

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, bddId, ibdId, defId, partUsageId }) => {
      const project = {
        id: projectId,
        name: 'Context Menu Seed',
        createdAt: '2026-05-12T10:00:00.000Z',
        modifiedAt: '2026-05-12T10:05:00.000Z',
        elements: [
          {
            id: defId,
            kind: 'PartDefinition',
            name: 'Engine',
            isAbstract: false,
            propertyIds: [],
            portIds: [],
          },
          {
            id: partUsageId,
            kind: 'PartUsage',
            name: 'engine',
            definitionId: defId,
            portUsageIds: [],
          },
        ],
        edges: [],
        diagrams: [
          {
            id: bddId,
            viewpointId: 'bdd',
            name: 'Main BDD',
            positions: {
              [defId]: { x: 80, y: 80 },
            },
          },
          {
            id: ibdId,
            viewpointId: 'ibd',
            name: 'Engine IBD',
            positions: {
              [partUsageId]: { x: 200, y: 140 },
            },
            context: { kind: 'partDefinition', id: defId },
          },
        ],
        history: { undo: [], redo: [] },
      };
      sessionStorage.setItem(
        `mbse:v1:project:${projectId}`,
        JSON.stringify(project),
      );
    },
    {
      projectId: SEED_PROJECT_ID,
      bddId: BDD_ID,
      ibdId: IBD_ID,
      defId: DEF_ID,
      partUsageId: PART_USAGE_ID,
    },
  );
}

async function gotoBdd(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'Main BDD' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    page.locator(`[data-testid="bdd-block-${DEF_ID}"]`),
  ).toBeVisible();
}

async function gotoIbd(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Engine IBD' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Internal Block Diagram',
  );
  await expect(
    page.locator(`[data-testid="ibd-part-${PART_USAGE_ID}"]`),
  ).toBeVisible();
}

test.describe('Cross-diagram navigation context menu (issue #53)', () => {
  test('right-click on a BDD PartDefinition opens "Show in IBD" and navigates', async ({
    page,
  }) => {
    await seedProject(page);
    await gotoBdd(page);

    await page
      .locator(`[data-testid="bdd-block-${DEF_ID}"]`)
      .click({ button: 'right' });

    const menu = page.getByTestId('element-context-menu');
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('role', 'menu');

    const showInIbd = page.getByTestId('context-menu-show-in-ibd');
    await expect(showInIbd).toBeVisible();
    await expect(showInIbd).toHaveAttribute('role', 'menuitem');
    await showInIbd.click();

    await expect(menu).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Engine IBD' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      page.locator(`[data-testid="ibd-part-${PART_USAGE_ID}"]`),
    ).toBeVisible();
  });

  test('right-click on an IBD PartUsage opens "Show definition in BDD" and navigates with the PartDefinition selected', async ({
    page,
  }) => {
    await seedProject(page);
    await gotoIbd(page);

    await page
      .locator(`[data-testid="ibd-part-${PART_USAGE_ID}"]`)
      .click({ button: 'right' });

    const menu = page.getByTestId('element-context-menu');
    await expect(menu).toBeVisible();

    const showInBdd = page.getByTestId('context-menu-show-definition-in-bdd');
    await expect(showInBdd).toBeVisible();
    await expect(showInBdd).toContainText('Engine');
    await showInBdd.click();

    await expect(menu).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Main BDD' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      page.locator(`[data-testid="bdd-block-${DEF_ID}"]`),
    ).toBeVisible();
    // Inspector reflects the new selection.
    await expect(page.getByTestId('inspector-name')).toHaveValue(
      'Engine',
    );
  });

  test('BDD → IBD → BDD round-trip returns to the Engine PartDefinition selection', async ({
    page,
  }) => {
    await seedProject(page);
    await gotoBdd(page);

    // BDD → IBD via context menu.
    await page
      .locator(`[data-testid="bdd-block-${DEF_ID}"]`)
      .click({ button: 'right' });
    await page.getByTestId('context-menu-show-in-ibd').click();
    await expect(page.getByRole('tab', { name: 'Engine IBD' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // IBD → BDD via context menu.
    await page
      .locator(`[data-testid="ibd-part-${PART_USAGE_ID}"]`)
      .click({ button: 'right' });
    await page.getByTestId('context-menu-show-definition-in-bdd').click();

    await expect(page.getByRole('tab', { name: 'Main BDD' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('inspector-name')).toHaveValue(
      'Engine',
    );
  });

  test('Escape closes the menu without navigating', async ({ page }) => {
    await seedProject(page);
    await gotoBdd(page);

    await page
      .locator(`[data-testid="bdd-block-${DEF_ID}"]`)
      .click({ button: 'right' });
    const menu = page.getByTestId('element-context-menu');
    await expect(menu).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    // Still on the BDD.
    await expect(page.getByRole('tab', { name: 'Main BDD' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('ArrowDown then Enter activates the first item via keyboard', async ({
    page,
  }) => {
    await seedProject(page);
    await gotoBdd(page);

    await page
      .locator(`[data-testid="bdd-block-${DEF_ID}"]`)
      .click({ button: 'right' });
    const item = page.getByTestId('context-menu-show-in-ibd');
    await expect(item).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('tab', { name: 'Engine IBD' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('clicking outside the menu closes it', async ({ page }) => {
    await seedProject(page);
    await gotoBdd(page);

    await page
      .locator(`[data-testid="bdd-block-${DEF_ID}"]`)
      .click({ button: 'right' });
    const menu = page.getByTestId('element-context-menu');
    await expect(menu).toBeVisible();
    // Click the toolbar — well outside the menu region.
    await page.getByTestId('canvas-toolbar').click({ position: { x: 4, y: 4 } });
    await expect(menu).toHaveCount(0);
  });

  test('@a11y open context menu has no serious/critical violations', async ({
    page,
  }) => {
    await seedProject(page);
    await gotoBdd(page);

    await page
      .locator(`[data-testid="bdd-block-${DEF_ID}"]`)
      .click({ button: 'right' });
    await expect(page.getByTestId('element-context-menu')).toBeVisible();

    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map((a) => a.finished));
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@visual context menu open on a BDD block', async ({ page }) => {
    await seedProject(page);
    await gotoBdd(page);

    // Right-click near the bottom-right corner of the block so the menu
    // opens beneath it without overlapping — keeps the baseline crisp.
    await page
      .locator(`[data-testid="bdd-block-${DEF_ID}"]`)
      .click({ button: 'right', position: { x: 180, y: 70 } });
    await expect(page.getByTestId('element-context-menu')).toBeVisible();
    // Settle animations.
    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map((a) => a.finished));
    });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('context-menu-bdd.png', {
      fullPage: false,
    });
  });
});
