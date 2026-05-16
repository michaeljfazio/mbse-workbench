import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const SEED_PROJECT_ID = 'p-activity-create-edit';

async function seedActivityProject(page: Page): Promise<void> {
  await page.addInitScript((projectId) => {
    const key = `mbse:v1:project:${projectId}`;
    if (sessionStorage.getItem(key)) return;
    const project = {
      id: projectId,
      name: 'Activity Create+Edit Seed',
      createdAt: '2026-05-12T10:00:00.000Z',
      modifiedAt: '2026-05-12T10:05:00.000Z',
      elements: [],
      edges: [],
      diagrams: [
        {
          id: 'd-bdd',
          viewpointId: 'bdd',
          name: 'Main BDD',
          positions: {},
        },
        {
          id: 'd-activity',
          viewpointId: 'activity',
          name: 'System Activity',
          positions: {},
        },
      ],
      history: { undo: [], redo: [] },
    };
    sessionStorage.setItem(key, JSON.stringify(project));
  }, SEED_PROJECT_ID);
}

async function gotoActivity(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System Activity' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Activity Diagram',
  );
}

async function dragChipOntoCanvas(
  page: Page,
  nodeType: string,
  targetPosition: { x: number; y: number },
): Promise<void> {
  const chip = page.getByTestId(`activity-palette-${nodeType}`);
  const canvas = page.getByTestId('canvas-drop-target');
  await chip.dragTo(canvas, { targetPosition });
}

test.describe('Activity drop + inspector (issue #88)', () => {
  test.beforeEach(async ({ page }) => {
    await seedActivityProject(page);
  });

  test('shows + Action toolbar button + the seven palette chips on the Activity viewpoint', async ({
    page,
  }) => {
    await gotoActivity(page);
    await expect(page.getByTestId('toolbar-add-action')).toBeVisible();
    await expect(page.getByTestId('toolbar-add-block')).toHaveCount(0);
    await expect(page.getByTestId('toolbar-add-requirement')).toHaveCount(0);
    for (const nodeType of [
      'action',
      'initial',
      'final',
      'fork',
      'join',
      'decision',
      'merge',
    ]) {
      await expect(
        page.getByTestId(`activity-palette-${nodeType}`),
      ).toBeVisible();
    }
  });

  test('clicking + Action drops a default Action node, names it, and selects it', async ({
    page,
  }) => {
    await gotoActivity(page);
    await page.getByTestId('toolbar-add-action').click();
    const actions = page.locator('[data-testid^="activity-action-"][data-element-id]');
    await expect(actions).toHaveCount(1);
    const id = (await actions.first().getAttribute('data-element-id'))!;
    await expect(page.getByTestId(`activity-action-label-${id}`)).toHaveText(
      'Action1',
    );
    await expect(page.getByTestId('inspector-action-node-type')).toHaveText(
      'action',
    );
  });

  test('drag each of the seven palette chips → renders the matching nodeType', async ({
    page,
  }) => {
    await gotoActivity(page);
    const chipDrops: ReadonlyArray<{ nodeType: string; targetTestidPrefix: string; pos: { x: number; y: number } }> = [
      { nodeType: 'action', targetTestidPrefix: 'activity-action-', pos: { x: 200, y: 80 } },
      { nodeType: 'initial', targetTestidPrefix: 'activity-initial-', pos: { x: 200, y: 200 } },
      { nodeType: 'final', targetTestidPrefix: 'activity-final-', pos: { x: 200, y: 280 } },
      { nodeType: 'fork', targetTestidPrefix: 'activity-fork-', pos: { x: 400, y: 80 } },
      { nodeType: 'join', targetTestidPrefix: 'activity-join-', pos: { x: 400, y: 160 } },
      { nodeType: 'decision', targetTestidPrefix: 'activity-decision-', pos: { x: 400, y: 240 } },
      { nodeType: 'merge', targetTestidPrefix: 'activity-merge-', pos: { x: 400, y: 320 } },
    ];
    for (const drop of chipDrops) {
      await dragChipOntoCanvas(page, drop.nodeType, drop.pos);
      // After each drop, exactly one node of that nodeType should exist.
      await expect(
        page.locator(
          `[data-testid^="${drop.targetTestidPrefix}"][data-action-node-type="${drop.nodeType}"]`,
        ),
      ).toHaveCount(1);
    }
  });

  test('Cmd-Z reverts a single drop in one step (compound command)', async ({
    page,
  }) => {
    await gotoActivity(page);
    await page.getByTestId('toolbar-add-action').click();
    const actions = page.locator('[data-testid^="activity-action-"][data-element-id]');
    await expect(actions).toHaveCount(1);
    await page.keyboard.press('Control+z');
    await expect(actions).toHaveCount(0);
  });

  test('initial / final pseudostates show «kind» placeholder labels in the project tree', async ({
    page,
  }) => {
    await gotoActivity(page);
    await dragChipOntoCanvas(page, 'initial', { x: 200, y: 100 });
    await dragChipOntoCanvas(page, 'final', { x: 200, y: 260 });

    const initialId = await page
      .locator('[data-testid^="activity-initial-"][data-element-id]')
      .first()
      .getAttribute('data-element-id');
    const finalId = await page
      .locator('[data-testid^="activity-final-"][data-element-id]')
      .first()
      .getAttribute('data-element-id');

    await expect(
      page.locator(`[data-testid="project-tree-leaf-${initialId}"]`),
    ).toContainText('«initial»');
    await expect(
      page.locator(`[data-testid="project-tree-leaf-${finalId}"]`),
    ).toContainText('«final»');
  });

  test('inspector ActionExtras shows the nodeType badge for any selected ActionUsage', async ({
    page,
  }) => {
    await gotoActivity(page);
    await dragChipOntoCanvas(page, 'decision', { x: 240, y: 200 });
    const decision = page.locator('[data-testid^="activity-decision-"][data-element-id]');
    await expect(decision).toHaveCount(1);
    await expect(page.getByTestId('inspector-action-node-type')).toHaveText(
      'decision',
    );
    // The Definition select is action-only (per issue § ActionExtras).
    await expect(page.getByTestId('inspector-action-definition')).toHaveCount(0);
  });

  test('decision and merge render as SVG polygons inscribed in the bounding box', async ({
    page,
  }) => {
    await gotoActivity(page);
    await dragChipOntoCanvas(page, 'decision', { x: 200, y: 200 });
    await dragChipOntoCanvas(page, 'merge', { x: 400, y: 200 });

    const decision = page.locator('[data-testid^="activity-decision-"][data-element-id]');
    const merge = page.locator('[data-testid^="activity-merge-"][data-element-id]');
    await expect(decision).toHaveCount(1);
    await expect(merge).toHaveCount(1);

    // Each diamond contains exactly one <svg><polygon> with a non-empty
    // points attribute, fixing the prior rotated-div bounding-box overflow.
    for (const shape of [decision, merge]) {
      const polygon = shape.locator('svg > polygon');
      await expect(polygon).toHaveCount(1);
      const points = await polygon.getAttribute('points');
      expect(points?.trim().split(/\s+/) ?? []).toHaveLength(4);
    }
  });

  test('@a11y Activity canvas with one Action and selection has no serious/critical violations', async ({
    page,
  }) => {
    await gotoActivity(page);
    await page.getByTestId('toolbar-add-action').click();
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

  test('@visual activity-with-action baseline', async ({ page }) => {
    await gotoActivity(page);
    await page.getByTestId('toolbar-add-action').click();
    // Clear selection so the node-selected ring is not in the baseline.
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('activity-with-action.png', {
      fullPage: false,
    });
  });

  test('@visual activity-with-pseudostates baseline', async ({ page }) => {
    await gotoActivity(page);
    // initial → action → decision → final laid out vertically along the
    // canvas centre line so all four shapes are visible.
    await dragChipOntoCanvas(page, 'initial', { x: 240, y: 100 });
    await dragChipOntoCanvas(page, 'action', { x: 240, y: 200 });
    await dragChipOntoCanvas(page, 'decision', { x: 240, y: 320 });
    await dragChipOntoCanvas(page, 'final', { x: 240, y: 440 });
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('activity-with-pseudostates.png', {
      fullPage: false,
    });
  });

  test('@visual inspector-action-selected baseline', async ({ page }) => {
    await gotoActivity(page);
    await dragChipOntoCanvas(page, 'decision', { x: 240, y: 240 });
    await page.evaluate(async () => {
      await Promise.allSettled(document.getAnimations().map((a) => a.finished));
    });
    await expect(page).toHaveScreenshot('inspector-action-selected.png', {
      fullPage: false,
    });
  });
});
