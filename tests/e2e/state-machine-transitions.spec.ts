import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Two-state seed: stateA above stateB on the same State Machine diagram.
// The fixed seed avoids cascade offsets so handles are predictable.
const SEED_PROJECT_ID = 'p-state-machine-transitions';
const BDD_ID = 'd-bdd';
const SM_ID = 'd-sm';
const STATE_A_ID = 's-1';
const STATE_B_ID = 's-2';
const INITIAL_ID = 'p-initial';
const FINAL_ID = 'p-final';

interface SeedOptions {
  readonly withPseudostates?: boolean;
}

async function seedStateMachineProject(
  page: Page,
  options: SeedOptions = {},
): Promise<void> {
  await page.addInitScript(
    ({
      projectId,
      bddId,
      smId,
      stateAId,
      stateBId,
      initialId,
      finalId,
      withPseudostates,
    }: {
      projectId: string;
      bddId: string;
      smId: string;
      stateAId: string;
      stateBId: string;
      initialId: string;
      finalId: string;
      withPseudostates: boolean;
    }) => {
      const key = `mbse:v1:project:${projectId}`;
      // addInitScript fires on every page load (including reload); guard the seed.
      if (sessionStorage.getItem(key)) return;
      const elements: Array<Record<string, unknown>> = [
        { id: stateAId, kind: 'StateUsage', name: 'Idle', stateType: 'state' },
        { id: stateBId, kind: 'StateUsage', name: 'Running', stateType: 'state' },
      ];
      const positions: Record<string, { x: number; y: number }> = {
        [stateAId]: { x: 200, y: 80 },
        [stateBId]: { x: 200, y: 280 },
      };
      if (withPseudostates) {
        elements.push(
          { id: initialId, kind: 'StateUsage', name: '', stateType: 'initial' },
          { id: finalId, kind: 'StateUsage', name: '', stateType: 'final' },
        );
        positions[initialId] = { x: 280, y: 20 };
        positions[finalId] = { x: 280, y: 480 };
      }
      const project = {
        id: projectId,
        name: 'State Machine Transitions Seed',
        createdAt: '2026-05-12T10:00:00.000Z',
        modifiedAt: '2026-05-12T10:05:00.000Z',
        elements,
        edges: [],
        diagrams: [
          { id: bddId, viewpointId: 'bdd', name: 'Main BDD', positions: {} },
          {
            id: smId,
            viewpointId: 'state-machine',
            name: 'System State Machine',
            positions,
          },
        ],
        history: { undo: [], redo: [] },
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      bddId: BDD_ID,
      smId: SM_ID,
      stateAId: STATE_A_ID,
      stateBId: STATE_B_ID,
      initialId: INITIAL_ID,
      finalId: FINAL_ID,
      withPseudostates: options.withPseudostates ?? false,
    },
  );
}

async function gotoStateMachine(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System State Machine' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'State Machine Diagram',
  );
  await expect(
    page.locator('[data-testid^="state-machine-state-"][data-element-id]'),
  ).toHaveCount(2);
}

async function handleCenter(handle: Locator): Promise<{ x: number; y: number }> {
  const box = await handle.boundingBox();
  if (!box) throw new Error('Handle bounding box unavailable');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function dragHandle(
  page: Page,
  source: Locator,
  target: Locator,
): Promise<void> {
  const start = await handleCenter(source);
  const end = await handleCenter(target);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await page.mouse.move(
      start.x + (end.x - start.x) * t,
      start.y + (end.y - start.y) * t,
    );
  }
  await page.mouse.up();
}

function bottomHandleOf(page: Page, stateId: string): Locator {
  return page
    .getByTestId(`state-machine-state-${stateId}`)
    .locator('.react-flow__handle-bottom');
}

function topHandleOf(page: Page, stateId: string): Locator {
  return page
    .getByTestId(`state-machine-state-${stateId}`)
    .locator('.react-flow__handle-top');
}

test.describe('State Machine transitions (issue #106)', () => {
  test('drag from one state to another creates a Transition + auto-selects it', async ({
    page,
  }) => {
    await seedStateMachineProject(page);
    await gotoStateMachine(page);

    await dragHandle(
      page,
      bottomHandleOf(page, STATE_A_ID),
      topHandleOf(page, STATE_B_ID),
    );

    const transitions = page.locator(
      '[data-testid^="state-machine-edge-"][data-edge-kind="Transition"]',
    );
    await expect(transitions).toHaveCount(1);

    // Inspector reflects the new Transition with endpoint labels and three
    // editable fields.
    await expect(page.getByTestId('inspector-transition')).toBeVisible();
    await expect(
      page.getByTestId('inspector-transition-source'),
    ).toContainText('Idle');
    await expect(
      page.getByTestId('inspector-transition-target'),
    ).toContainText('Running');
    await expect(page.getByTestId('inspector-transition-trigger')).toHaveValue(
      '',
    );
    await expect(page.getByTestId('inspector-transition-guard')).toHaveValue(
      '',
    );
    await expect(page.getByTestId('inspector-transition-effect')).toHaveValue(
      '',
    );
  });

  test('rejects final → state (final cannot be a transition source)', async ({
    page,
  }) => {
    await seedStateMachineProject(page, { withPseudostates: true });
    await gotoStateMachine(page);

    await expect(
      page.locator('[data-testid^="state-machine-final-"][data-element-id]'),
    ).toHaveCount(1);

    const finalNode = page.getByTestId(`state-machine-final-${FINAL_ID}`);
    const finalHandle = finalNode.locator('.react-flow__handle');
    // Final has only a target handle (top); React Flow refuses to start a
    // connection drag from a target handle, so the drag cannot initiate —
    // which is precisely the ADR 0006 § 4 behaviour we want.
    await dragHandle(page, finalHandle, topHandleOf(page, STATE_A_ID));
    await expect(
      page.locator('[data-testid^="state-machine-edge-"]'),
    ).toHaveCount(0);
  });

  test('rejects state → initial (initial cannot be a transition target)', async ({
    page,
  }) => {
    await seedStateMachineProject(page, { withPseudostates: true });
    await gotoStateMachine(page);

    await expect(
      page.locator('[data-testid^="state-machine-initial-"][data-element-id]'),
    ).toHaveCount(1);

    const initialNode = page.getByTestId(`state-machine-initial-${INITIAL_ID}`);
    const initialHandle = initialNode.locator('.react-flow__handle');
    await dragHandle(
      page,
      bottomHandleOf(page, STATE_A_ID),
      initialHandle,
    );
    await expect(
      page.locator('[data-testid^="state-machine-edge-"]'),
    ).toHaveCount(0);
  });

  test('rejects self-loop (no transition from a state to itself)', async ({
    page,
  }) => {
    await seedStateMachineProject(page);
    await gotoStateMachine(page);

    // Drag bottom→top of the same node. isValidStateMachineConnection refuses
    // self-loops; no Transition is created.
    const handle = bottomHandleOf(page, STATE_A_ID);
    const target = topHandleOf(page, STATE_A_ID);
    await dragHandle(page, handle, target);
    await expect(
      page.locator('[data-testid^="state-machine-edge-"]'),
    ).toHaveCount(0);
  });

  test('trigger/guard/effect edits compose the SysMLv2 label "trigger [guard] / effect"', async ({
    page,
  }) => {
    await seedStateMachineProject(page);
    await gotoStateMachine(page);

    await dragHandle(
      page,
      bottomHandleOf(page, STATE_A_ID),
      topHandleOf(page, STATE_B_ID),
    );
    const edge = page
      .locator(
        '[data-testid^="state-machine-edge-"][data-edge-kind="Transition"]',
      )
      .first();
    await expect(edge).toHaveCount(1);
    const edgeId = await edge.getAttribute('data-edge-id');

    // Set trigger first → label = "tick".
    const trigger = page.getByTestId('inspector-transition-trigger');
    await trigger.fill('tick');
    await trigger.press('Enter');
    await expect(
      page.getByTestId(`state-machine-edge-label-${edgeId}`),
    ).toHaveText('tick');

    // Add guard → label = "tick [count < 10]".
    const guard = page.getByTestId('inspector-transition-guard');
    await guard.fill('count < 10');
    await guard.press('Enter');
    await expect(
      page.getByTestId(`state-machine-edge-label-${edgeId}`),
    ).toHaveText('tick [count < 10]');

    // Add effect → label = "tick [count < 10] / incCount()".
    const effect = page.getByTestId('inspector-transition-effect');
    await effect.fill('incCount()');
    await effect.press('Enter');
    await expect(
      page.getByTestId(`state-machine-edge-label-${edgeId}`),
    ).toHaveText('tick [count < 10] / incCount()');
  });

  test('Cmd-Z reverts a Transition create', async ({ page }) => {
    await seedStateMachineProject(page);
    await gotoStateMachine(page);

    await dragHandle(
      page,
      bottomHandleOf(page, STATE_A_ID),
      topHandleOf(page, STATE_B_ID),
    );
    const edge = page.locator(
      '[data-testid^="state-machine-edge-"][data-edge-kind="Transition"]',
    );
    await expect(edge).toHaveCount(1);

    await page.locator('.react-flow').focus();
    await page.keyboard.press('Control+z');
    await expect(edge).toHaveCount(0);
  });

  test('Backspace deletes a selected Transition; Cmd-Z restores it', async ({
    page,
  }) => {
    await seedStateMachineProject(page);
    await gotoStateMachine(page);

    await dragHandle(
      page,
      bottomHandleOf(page, STATE_A_ID),
      topHandleOf(page, STATE_B_ID),
    );
    const edge = page.locator(
      '[data-testid^="state-machine-edge-"][data-edge-kind="Transition"]',
    );
    await expect(edge).toHaveCount(1);

    await page.locator('.react-flow').focus();
    await page.keyboard.press('Backspace');
    await expect(edge).toHaveCount(0);

    await page.keyboard.press('Control+z');
    await expect(edge).toHaveCount(1);
  });

  test('@a11y State Machine canvas with one Transition has no serious/critical violations', async ({
    page,
  }) => {
    await seedStateMachineProject(page);
    await gotoStateMachine(page);

    await dragHandle(
      page,
      bottomHandleOf(page, STATE_A_ID),
      topHandleOf(page, STATE_B_ID),
    );
    await expect(
      page.locator(
        '[data-testid^="state-machine-edge-"][data-edge-kind="Transition"]',
      ),
    ).toHaveCount(1);

    // Wait for any in-flight CSS transitions before running axe; otherwise
    // color-contrast can sample mid-transition styles (CONTEXT.md 2026-05-12).
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

  test('@visual state-machine-with-transition baseline', async ({ page }) => {
    await seedStateMachineProject(page);
    await gotoStateMachine(page);

    await dragHandle(
      page,
      bottomHandleOf(page, STATE_A_ID),
      topHandleOf(page, STATE_B_ID),
    );
    await expect(
      page.locator(
        '[data-testid^="state-machine-edge-"][data-edge-kind="Transition"]',
      ),
    ).toHaveCount(1);

    // Clear selection so the edge-selection accent isn't in the baseline.
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    await page.mouse.move(0, 0);

    await expect(page).toHaveScreenshot('state-machine-with-transition.png', {
      fullPage: false,
    });
  });

  test('@visual inspector-transition-selected baseline', async ({ page }) => {
    await seedStateMachineProject(page);
    await gotoStateMachine(page);

    await dragHandle(
      page,
      bottomHandleOf(page, STATE_A_ID),
      topHandleOf(page, STATE_B_ID),
    );
    await expect(page.getByTestId('inspector-transition')).toBeVisible();

    // Populate all three optional fields so the visual covers the full
    // composed label and inspector state.
    await page.getByTestId('inspector-transition-trigger').fill('tick');
    await page.getByTestId('inspector-transition-trigger').press('Enter');
    await page.getByTestId('inspector-transition-guard').fill('count < 10');
    await page.getByTestId('inspector-transition-guard').press('Enter');
    await page.getByTestId('inspector-transition-effect').fill('incCount()');
    await page.getByTestId('inspector-transition-effect').press('Enter');

    await page.mouse.move(0, 0);

    await expect(page).toHaveScreenshot('inspector-transition-selected.png', {
      fullPage: false,
    });
  });
});
