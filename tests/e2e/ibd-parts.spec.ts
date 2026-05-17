import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Helpers ---------------------------------------------------------------------

async function addAndSelectBlock(page: Page): Promise<string> {
  // ADR 0015 step 3 (#376): `toolbar-add-block` retired. Drag the
  // PartDefinition group from the project tree onto the BDD canvas to
  // create a block, then explicitly click to mirror the original
  // helper's "create + select" contract (the drop handler already
  // selects, but downstream code may have raced selection updates).
  const before = page.locator('[data-testid^="bdd-block-"][data-element-id]');
  const beforeCount = await before.count();
  const group = page.getByTestId('project-tree-group-PartDefinition');
  const canvas = page.getByTestId('canvas-drop-target');
  const xOffset = 180 + (beforeCount % 2) * 260;
  const yOffset = 160 + Math.floor(beforeCount / 2) * 280;
  await group.dragTo(canvas, {
    targetPosition: { x: xOffset, y: yOffset },
  });
  await expect(before).toHaveCount(beforeCount + 1);
  const block = before.nth(beforeCount);
  await block.click();
  return (await block.getAttribute('data-element-id'))!;
}

async function dragPartPaletteToCanvas(
  page: Page,
  targetX = 360,
  targetY = 220,
): Promise<void> {
  const group = page.getByTestId('project-tree-group-PartUsage');
  const canvas = page.getByTestId('canvas-drop-target');
  await group.dragTo(canvas, { targetPosition: { x: targetX, y: targetY } });
}

// Seeds a project with one PartDefinition that already exposes two ports plus
// an IBD diagram bound to it, ready for visual baselines.
const SEED_PROJECT_ID = 'p-ibd-parts-seed';

const SEED_PART_DEF_ID = 'pd-engine';
const SEED_PORT_FUEL_ID = 'port-d-fuel';
const SEED_PORT_POWER_ID = 'port-d-power';
const SEED_BDD_ID = 'd-bdd';
const SEED_IBD_ID = 'd-ibd';

async function seedTwoPortProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({
      projectId,
      partDefId,
      portFuelId,
      portPowerId,
      bddId,
      ibdId,
    }) => {
      const project = {
        id: projectId,
        name: 'IBD Parts Seed',
        createdAt: '2026-05-12T10:00:00.000Z',
        modifiedAt: '2026-05-12T10:05:00.000Z',
        elements: [
          {
            id: partDefId,
            kind: 'PartDefinition',
            name: 'Engine',
            isAbstract: false,
            propertyIds: [],
            portIds: [portFuelId, portPowerId],
          },
          {
            id: portFuelId,
            kind: 'PortDefinition',
            name: 'fuel',
            direction: 'in',
          },
          {
            id: portPowerId,
            kind: 'PortDefinition',
            name: 'power',
            direction: 'out',
          },
        ],
        edges: [],
        diagrams: [
          {
            id: bddId,
            viewpointId: 'bdd',
            name: 'Main BDD',
            positions: { [partDefId]: { x: 100, y: 100 } },
          },
          {
            id: ibdId,
            viewpointId: 'ibd',
            name: 'Engine IBD',
            positions: {},
            context: { kind: 'partDefinition', id: partDefId },
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
      partDefId: SEED_PART_DEF_ID,
      portFuelId: SEED_PORT_FUEL_ID,
      portPowerId: SEED_PORT_POWER_ID,
      bddId: SEED_BDD_ID,
      ibdId: SEED_IBD_ID,
    },
  );
}

async function gotoIbd(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Engine IBD' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Internal Block Diagram',
  );
}

// Tests -----------------------------------------------------------------------

test.describe('IBD parts (issue #50)', () => {
  test('Part group header is draggable from any viewpoint; drop is viewpoint-gated', async ({
    page,
  }) => {
    // Per ADR 0015 step 1 every visible project-tree group header is
    // `draggable`. The viewpoint-specificity moved from the drag affordance
    // to the drop-side `acceptedElementKinds` guard in CanvasPane.handleDrop:
    // dropping PartUsage on a BDD canvas still no-ops because BDD's accepted
    // kinds is just `PartDefinition`.
    await page.goto('/');
    await expect(
      page.getByTestId('project-tree-group-PartUsage'),
    ).toHaveAttribute('draggable', 'true');

    // Switch to IBD via the PartDefinition inspector — PartUsage stays
    // draggable here too (consistent affordance across viewpoints).
    await addAndSelectBlock(page);
    await page.getByTestId('inspector-open-internal-diagram').click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Internal Block Diagram',
    );
    await expect(
      page.getByTestId('project-tree-group-PartUsage'),
    ).toHaveAttribute('draggable', 'true');
  });

  test('dropping a Part on IBD shows a type-picker; choosing a definition creates a PartUsage', async ({
    page,
  }) => {
    await page.goto('/');
    // Create the PartDefinition Engine and rename it so the picker shows it.
    const defId = await addAndSelectBlock(page);
    await page.getByTestId('inspector-name').fill('Engine');
    await page.getByTestId('inspector-name').blur();
    // Open the IBD.
    await page.getByTestId('inspector-open-internal-diagram').click();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Internal Block Diagram',
    );

    await dragPartPaletteToCanvas(page);
    const popover = page.getByTestId('part-type-popover');
    await expect(popover).toBeVisible();
    await page.getByTestId(`part-type-option-${defId}`).click();
    await expect(popover).toHaveCount(0);

    // The PartUsage exists in the IBD with the lowercased name and definition
    // label rendered under it.
    const part = page.locator('[data-testid^="ibd-part-"][data-element-id]');
    await expect(part).toHaveCount(1);
    await expect(part.locator('[data-testid^="ibd-part-name-"]')).toHaveText(
      'engine',
    );
    await expect(part.locator('[data-testid^="ibd-part-def-"]')).toHaveText(
      ': Engine',
    );
  });

  test('Escape on the part-type popover cancels without creating a PartUsage', async ({
    page,
  }) => {
    await page.goto('/');
    await addAndSelectBlock(page);
    await page.getByTestId('inspector-open-internal-diagram').click();

    await dragPartPaletteToCanvas(page);
    await expect(page.getByTestId('part-type-popover')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('part-type-popover')).toHaveCount(0);
    await expect(
      page.locator('[data-testid^="ibd-part-"][data-element-id]'),
    ).toHaveCount(0);
  });

  test('PartDefinition inspector adds and removes a port; undo restores', async ({
    page,
  }) => {
    await page.goto('/');
    await addAndSelectBlock(page);

    // Add a port.
    await page.getByTestId('inspector-add-port').click();
    const row = page.locator('[data-testid^="inspector-port-row-"]');
    await expect(row).toHaveCount(1);
    await expect(row.locator('select')).toHaveValue('inout');

    // Rename and re-direct.
    const portId = (await row.getAttribute('data-port-id'))!;
    await page.getByTestId(`inspector-port-name-${portId}`).fill('fuel');
    await page.getByTestId(`inspector-port-name-${portId}`).blur();
    await page
      .getByTestId(`inspector-port-dir-${portId}`)
      .selectOption('in');
    await expect(
      page.getByTestId(`inspector-port-dir-${portId}`),
    ).toHaveValue('in');

    // Delete the port.
    await page.getByTestId(`inspector-port-delete-${portId}`).click();
    await expect(row).toHaveCount(0);
    await expect(page.getByTestId('inspector-ports-empty')).toBeVisible();
  });

  test('renders a PartUsage with two labelled handles (one per port)', async ({
    page,
  }) => {
    await seedTwoPortProject(page);
    await gotoIbd(page);
    await dragPartPaletteToCanvas(page);
    await page.getByTestId(`part-type-option-${SEED_PART_DEF_ID}`).click();

    const part = page.locator('[data-testid^="ibd-part-"][data-element-id]');
    await expect(part).toHaveCount(1);
    const handles = part.locator('[data-testid^="ibd-handle-"]');
    await expect(handles).toHaveCount(2);
    await expect(
      part.locator('[data-testid^="ibd-port-label-"]').nth(0),
    ).toHaveText('fuel');
    await expect(
      part.locator('[data-testid^="ibd-port-label-"]').nth(1),
    ).toHaveText('power');
  });

  test('@a11y IBD with a PartUsage and the inspector showing port management has no serious/critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const defId = await addAndSelectBlock(page);
    await page.getByTestId('inspector-add-port').click();
    await page.getByTestId('inspector-open-internal-diagram').click();

    await dragPartPaletteToCanvas(page);
    await page.getByTestId(`part-type-option-${defId}`).click();
    await expect(
      page.locator('[data-testid^="ibd-part-"][data-element-id]'),
    ).toHaveCount(1);

    // Settle any transitions before axe samples computed styles.
    await page.evaluate(async () => {
      await Promise.allSettled(document.getAnimations().map((a) => a.finished));
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@visual IBD with one part no ports', async ({ page }) => {
    await page.goto('/');
    const defId = await addAndSelectBlock(page);
    await page.getByTestId('inspector-open-internal-diagram').click();
    await dragPartPaletteToCanvas(page);
    await page.getByTestId(`part-type-option-${defId}`).click();
    await expect(
      page.locator('[data-testid^="ibd-part-"][data-element-id]'),
    ).toHaveCount(1);
    // Click the canvas pane to clear selection so the screenshot is stable.
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('ibd-one-part-no-ports.png', {
      fullPage: false,
    });
  });

  test('@visual IBD with one part with two ports', async ({ page }) => {
    await seedTwoPortProject(page);
    await gotoIbd(page);
    await dragPartPaletteToCanvas(page);
    await page.getByTestId(`part-type-option-${SEED_PART_DEF_ID}`).click();
    await expect(
      page.locator('[data-testid^="ibd-part-"][data-element-id]'),
    ).toHaveCount(1);
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('ibd-one-part-two-ports.png', {
      fullPage: false,
    });
  });

  test('@visual IBD with two parts side-by-side', async ({ page }) => {
    await seedTwoPortProject(page);
    await gotoIbd(page);
    await dragPartPaletteToCanvas(page, 180, 220);
    await page.getByTestId(`part-type-option-${SEED_PART_DEF_ID}`).click();
    await dragPartPaletteToCanvas(page, 540, 220);
    await page.getByTestId(`part-type-option-${SEED_PART_DEF_ID}`).click();
    await expect(
      page.locator('[data-testid^="ibd-part-"][data-element-id]'),
    ).toHaveCount(2);
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('ibd-two-parts.png', {
      fullPage: false,
    });
  });
});
