import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const SEED_PROJECT_ID = 'p-state-machine-nodes';

async function seedStateMachineProject(page: Page): Promise<void> {
  await page.addInitScript((projectId) => {
    const key = `mbse:v1:project:${projectId}`;
    if (sessionStorage.getItem(key)) return;
    const project = {
      id: projectId,
      name: 'State Machine Nodes Seed',
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
          id: 'd-sm',
          viewpointId: 'state-machine',
          name: 'System State Machine',
          positions: {},
        },
      ],
      history: { undo: [], redo: [] },
    };
    sessionStorage.setItem(key, JSON.stringify(project));
  }, SEED_PROJECT_ID);
}

async function gotoStateMachine(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System State Machine' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'State Machine Diagram',
  );
}

async function dragChipOntoCanvas(
  page: Page,
  stateType: string,
  targetPosition: { x: number; y: number },
): Promise<void> {
  const chip = page.getByTestId(`state-machine-palette-${stateType}`);
  const canvas = page.getByTestId('canvas-drop-target');
  await chip.dragTo(canvas, { targetPosition });
}

test.describe('State Machine nodes + palette + inspector (issue #105)', () => {
  test.beforeEach(async ({ page }) => {
    await seedStateMachineProject(page);
  });

  test('shows + State toolbar button + the three palette chips on the State Machine viewpoint', async ({
    page,
  }) => {
    await gotoStateMachine(page);
    await expect(page.getByTestId('toolbar-add-state')).toBeVisible();
    await expect(page.getByTestId('toolbar-add-block')).toHaveCount(0);
    await expect(page.getByTestId('toolbar-add-action')).toHaveCount(0);
    for (const stateType of ['state', 'initial', 'final']) {
      await expect(
        page.getByTestId(`state-machine-palette-${stateType}`),
      ).toBeVisible();
    }
  });

  test('clicking + State drops a default State node, names it, and selects it', async ({
    page,
  }) => {
    await gotoStateMachine(page);
    await page.getByTestId('toolbar-add-state').click();
    const states = page.locator(
      '[data-testid^="state-machine-state-"][data-element-id]',
    );
    await expect(states).toHaveCount(1);
    const id = (await states.first().getAttribute('data-element-id'))!;
    await expect(page.getByTestId(`state-machine-state-label-${id}`)).toHaveText(
      'State1',
    );
    await expect(page.getByTestId('inspector-state-type')).toHaveText('state');
  });

  test('drag each of the three palette chips → renders the matching stateType', async ({
    page,
  }) => {
    await gotoStateMachine(page);
    const drops: ReadonlyArray<{
      stateType: string;
      targetTestidPrefix: string;
      pos: { x: number; y: number };
    }> = [
      {
        stateType: 'state',
        targetTestidPrefix: 'state-machine-state-',
        pos: { x: 240, y: 120 },
      },
      {
        stateType: 'initial',
        targetTestidPrefix: 'state-machine-initial-',
        pos: { x: 100, y: 120 },
      },
      {
        stateType: 'final',
        targetTestidPrefix: 'state-machine-final-',
        pos: { x: 400, y: 120 },
      },
    ];
    for (const drop of drops) {
      await dragChipOntoCanvas(page, drop.stateType, drop.pos);
      await expect(
        page.locator(
          `[data-testid^="${drop.targetTestidPrefix}"][data-state-node-type="${drop.stateType}"]`,
        ),
      ).toHaveCount(1);
    }
  });

  test('Cmd-Z reverts a single drop in one step (compound command)', async ({
    page,
  }) => {
    await gotoStateMachine(page);
    await page.getByTestId('toolbar-add-state').click();
    const states = page.locator(
      '[data-testid^="state-machine-state-"][data-element-id]',
    );
    await expect(states).toHaveCount(1);
    await page.keyboard.press('Control+z');
    await expect(states).toHaveCount(0);
  });

  test('initial / final pseudostates show «stateType» placeholder labels in the project tree', async ({
    page,
  }) => {
    await gotoStateMachine(page);
    await dragChipOntoCanvas(page, 'initial', { x: 120, y: 120 });
    await dragChipOntoCanvas(page, 'final', { x: 360, y: 120 });

    const initialId = await page
      .locator('[data-testid^="state-machine-initial-"][data-element-id]')
      .first()
      .getAttribute('data-element-id');
    const finalId = await page
      .locator('[data-testid^="state-machine-final-"][data-element-id]')
      .first()
      .getAttribute('data-element-id');

    await expect(
      page.locator(`[data-testid="project-tree-leaf-${initialId}"]`),
    ).toContainText('«initial»');
    await expect(
      page.locator(`[data-testid="project-tree-leaf-${finalId}"]`),
    ).toContainText('«final»');
  });

  test('inspector StateExtras edits entry/exit/do actions; values persist across reload', async ({
    page,
  }) => {
    await gotoStateMachine(page);
    await page.getByTestId('toolbar-add-state').click();
    const states = page.locator(
      '[data-testid^="state-machine-state-"][data-element-id]',
    );
    const id = (await states.first().getAttribute('data-element-id'))!;

    // Rename via inspector.
    const nameInput = page.getByTestId('inspector-name');
    await nameInput.fill('Idle');
    await nameInput.press('Enter');

    // Fill the three action fields.
    await page.getByTestId('inspector-state-entry').fill('turnOn()');
    await page.getByTestId('inspector-state-entry').press('Tab');
    await page.getByTestId('inspector-state-do').fill('poll()');
    await page.getByTestId('inspector-state-do').press('Tab');
    await page.getByTestId('inspector-state-exit').fill('turnOff()');
    await page.getByTestId('inspector-state-exit').press('Tab');

    // Action lines render on the node.
    const actionList = page.getByTestId(`state-machine-state-actions-${id}`);
    await expect(actionList).toContainText('entry');
    await expect(actionList).toContainText('turnOn()');
    await expect(actionList).toContainText('do');
    await expect(actionList).toContainText('poll()');
    await expect(actionList).toContainText('exit');
    await expect(actionList).toContainText('turnOff()');

    await page.reload();
    await page.getByRole('tab', { name: 'System State Machine' }).click();
    await expect(
      page.getByTestId(`state-machine-state-label-${id}`),
    ).toHaveText('Idle');
    // Click the persisted state to re-select it.
    await page.getByTestId(`state-machine-state-${id}`).click();
    await expect(page.getByTestId('inspector-state-entry')).toHaveValue(
      'turnOn()',
    );
    await expect(page.getByTestId('inspector-state-do')).toHaveValue('poll()');
    await expect(page.getByTestId('inspector-state-exit')).toHaveValue(
      'turnOff()',
    );
  });

  test('Cmd-Z reverts an action-field edit', async ({ page }) => {
    await gotoStateMachine(page);
    await page.getByTestId('toolbar-add-state').click();
    await page.getByTestId('inspector-state-entry').fill('turnOn()');
    // Press Enter to commit + blur the input. Tab would move focus to the
    // next inspector input, which would route Cmd-Z to the browser's native
    // input-undo (per the Workspace.tsx keydown guard) instead of the model
    // undo we're testing here.
    await page.getByTestId('inspector-state-entry').press('Enter');
    await expect(page.getByTestId('inspector-state-entry')).toHaveValue(
      'turnOn()',
    );
    await page.keyboard.press('Control+z');
    await expect(page.getByTestId('inspector-state-entry')).toHaveValue('');
  });

  test('initial / final inspectors hide entry/exit/do fields (no actions on pseudostates)', async ({
    page,
  }) => {
    await gotoStateMachine(page);
    await dragChipOntoCanvas(page, 'initial', { x: 120, y: 120 });
    const initial = page.locator(
      '[data-testid^="state-machine-initial-"][data-element-id]',
    );
    await expect(initial).toHaveCount(1);
    // Inspector shows the state-type badge but no action fields.
    await expect(page.getByTestId('inspector-state-type')).toHaveText('initial');
    await expect(page.getByTestId('inspector-state-entry')).toHaveCount(0);
    await expect(page.getByTestId('inspector-state-do')).toHaveCount(0);
    await expect(page.getByTestId('inspector-state-exit')).toHaveCount(0);
  });

  test('@a11y State Machine canvas with three nodes + inspector open has no serious/critical violations', async ({
    page,
  }) => {
    await gotoStateMachine(page);
    await dragChipOntoCanvas(page, 'initial', { x: 120, y: 120 });
    await dragChipOntoCanvas(page, 'state', { x: 280, y: 120 });
    await dragChipOntoCanvas(page, 'final', { x: 460, y: 120 });
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

  test('@visual state-machine-with-state baseline', async ({ page }) => {
    await gotoStateMachine(page);
    await page.getByTestId('toolbar-add-state').click();
    // Clear selection so the node-selected ring is not in the baseline.
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('state-machine-with-state.png', {
      fullPage: false,
    });
  });

  test('@visual state-machine-with-pseudostates baseline', async ({ page }) => {
    await gotoStateMachine(page);
    // initial → state → final laid out horizontally along the canvas top so
    // all three shapes are visible.
    await dragChipOntoCanvas(page, 'initial', { x: 120, y: 140 });
    await dragChipOntoCanvas(page, 'state', { x: 280, y: 140 });
    await dragChipOntoCanvas(page, 'final', { x: 460, y: 140 });
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('state-machine-with-pseudostates.png', {
      fullPage: false,
    });
  });

  test('@visual inspector-state-selected baseline', async ({ page }) => {
    await gotoStateMachine(page);
    await page.getByTestId('toolbar-add-state').click();
    // Populate all three action fields so the inspector shows the full panel.
    await page.getByTestId('inspector-state-entry').fill('turnOn()');
    await page.getByTestId('inspector-state-entry').press('Tab');
    await page.getByTestId('inspector-state-do').fill('poll()');
    await page.getByTestId('inspector-state-do').press('Tab');
    await page.getByTestId('inspector-state-exit').fill('turnOff()');
    await page.getByTestId('inspector-state-exit').press('Tab');
    await page.evaluate(async () => {
      await Promise.allSettled(document.getAnimations().map((a) => a.finished));
    });
    await expect(page).toHaveScreenshot('inspector-state-selected.png', {
      fullPage: false,
    });
  });
});
