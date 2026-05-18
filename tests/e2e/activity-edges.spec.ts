import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Two-action Activity seed: actionA placed above actionB on the same Activity
// diagram. The seed avoids any UI cascade so handle positions are predictable
// and drag-tests don't have to compensate for default-cascade offsets.
const SEED_PROJECT_ID = 'p-activity-edges';
const BDD_ID = 'd-bdd';
const ACTIVITY_ID = 'd-activity';
const ACTION_A_ID = 'a-1';
const ACTION_B_ID = 'a-2';
const INITIAL_ID = 'p-initial';
const FINAL_ID = 'p-final';

interface SeedOptions {
  readonly withPseudostates?: boolean;
}

async function seedActivityProject(
  page: Page,
  options: SeedOptions = {},
): Promise<void> {
  await page.addInitScript(
    ({
      projectId,
      bddId,
      activityId,
      actionAId,
      actionBId,
      initialId,
      finalId,
      withPseudostates,
    }: {
      projectId: string;
      bddId: string;
      activityId: string;
      actionAId: string;
      actionBId: string;
      initialId: string;
      finalId: string;
      withPseudostates: boolean;
    }) => {
      const key = `mbse:v1:project:${projectId}`;
      // Per docs/CONTEXT.md 2026-05-12: addInitScript fires on every page
      // load (including reload), so guard the seed.
      if (sessionStorage.getItem(key)) return;
      const elements: Array<Record<string, unknown>> = [
        {
          id: actionAId,
          kind: 'ActionUsage',
          name: 'Boil water',
          nodeType: 'action',
        },
        {
          id: actionBId,
          kind: 'ActionUsage',
          name: 'Brew coffee',
          nodeType: 'action',
        },
      ];
      const positions: Record<string, { x: number; y: number }> = {
        [actionAId]: { x: 160, y: 80 },
        [actionBId]: { x: 160, y: 280 },
      };
      if (withPseudostates) {
        elements.push(
          { id: initialId, kind: 'ActionUsage', name: '', nodeType: 'initial' },
          { id: finalId, kind: 'ActionUsage', name: '', nodeType: 'final' },
        );
        positions[initialId] = { x: 240, y: 20 };
        positions[finalId] = { x: 240, y: 480 };
      }
      const project = {
        id: projectId,
        name: 'Activity Edges Seed',
        createdAt: '2026-05-12T10:00:00.000Z',
        modifiedAt: '2026-05-12T10:05:00.000Z',
        elements,
        edges: [],
        diagrams: [
          {
            id: bddId,
            viewpointId: 'bdd',
            name: 'Main BDD',
            positions: {},
          },
          {
            id: activityId,
            viewpointId: 'activity',
            name: 'System Activity',
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
      activityId: ACTIVITY_ID,
      actionAId: ACTION_A_ID,
      actionBId: ACTION_B_ID,
      initialId: INITIAL_ID,
      finalId: FINAL_ID,
      withPseudostates: options.withPseudostates ?? false,
    },
  );
}

async function gotoActivity(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System Activity' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Activity Diagram',
  );
  await expect(
    page.locator('[data-testid^="activity-action-"][data-element-id]'),
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
  opts: { shift?: boolean } = {},
): Promise<void> {
  const start = await handleCenter(source);
  const end = await handleCenter(target);
  if (opts.shift) await page.keyboard.down('Shift');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // Smooth-step through intermediate points so React Flow's connection-in-
  // progress logic activates before the drop.
  const steps = 8;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await page.mouse.move(
      start.x + (end.x - start.x) * t,
      start.y + (end.y - start.y) * t,
    );
  }
  await page.mouse.up();
  if (opts.shift) await page.keyboard.up('Shift');
}

function bottomHandleOf(page: Page, actionId: string): Locator {
  return page
    .getByTestId(`activity-action-${actionId}`)
    .locator('.react-flow__handle-bottom');
}

function topHandleOf(page: Page, actionId: string): Locator {
  return page
    .getByTestId(`activity-action-${actionId}`)
    .locator('.react-flow__handle-top');
}

test.describe('Activity edges (issue #89)', () => {
  test('drag without modifier creates a ControlFlow', async ({ page }) => {
    await seedActivityProject(page);
    await gotoActivity(page);

    await dragHandle(
      page,
      bottomHandleOf(page, ACTION_A_ID),
      topHandleOf(page, ACTION_B_ID),
    );

    const controlFlow = page.locator(
      '[data-testid^="activity-edge-"][data-edge-kind="ControlFlow"]',
    );
    await expect(controlFlow).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="activity-edge-"][data-edge-kind="ObjectFlow"]'),
    ).toHaveCount(0);

    // Inspector reflects the new ControlFlow with endpoint labels.
    await expect(page.getByTestId('inspector-control-flow-edge')).toBeVisible();
    await expect(
      page.getByTestId('inspector-control-flow-source'),
    ).toContainText('Boil water');
    await expect(
      page.getByTestId('inspector-control-flow-target'),
    ).toContainText('Brew coffee');
    await expect(page.getByTestId('inspector-control-flow-guard')).toHaveValue(
      '',
    );
  });

  test('Shift+drag creates an ObjectFlow (not a ControlFlow)', async ({
    page,
  }) => {
    await seedActivityProject(page);
    await gotoActivity(page);

    await dragHandle(
      page,
      bottomHandleOf(page, ACTION_A_ID),
      topHandleOf(page, ACTION_B_ID),
      { shift: true },
    );

    const objectFlow = page.locator(
      '[data-testid^="activity-edge-"][data-edge-kind="ObjectFlow"]',
    );
    await expect(objectFlow).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="activity-edge-"][data-edge-kind="ControlFlow"]'),
    ).toHaveCount(0);

    await expect(page.getByTestId('inspector-object-flow-edge')).toBeVisible();
    await expect(
      page.getByTestId('inspector-object-flow-source'),
    ).toContainText('Boil water');
    await expect(
      page.getByTestId('inspector-object-flow-target'),
    ).toContainText('Brew coffee');
  });

  test('rejects final → action (final cannot be a flow source)', async ({
    page,
  }) => {
    await seedActivityProject(page, { withPseudostates: true });
    await gotoActivity(page);

    await expect(
      page.locator('[data-testid^="activity-final-"][data-element-id]'),
    ).toHaveCount(1);

    const finalNode = page.getByTestId(`activity-final-${FINAL_ID}`);
    // Final has only a target handle (top); React Flow refuses to start a
    // connection drag from a target handle, so a "drag from final" cannot
    // even initiate — exactly what ADR 0005 § 4 mandates. We assert that
    // attempting the drag from the final's top handle does not create any
    // edge.
    const finalHandle = finalNode.locator('.react-flow__handle');
    await dragHandle(page, finalHandle, topHandleOf(page, ACTION_A_ID));
    await expect(
      page.locator('[data-testid^="activity-edge-"]'),
    ).toHaveCount(0);
  });

  test('rejects action → initial (initial cannot be a flow target)', async ({
    page,
  }) => {
    await seedActivityProject(page, { withPseudostates: true });
    await gotoActivity(page);

    await expect(
      page.locator('[data-testid^="activity-initial-"][data-element-id]'),
    ).toHaveCount(1);

    const initialNode = page.getByTestId(`activity-initial-${INITIAL_ID}`);
    // Initial has only a source handle, so React Flow blocks drops on it
    // outright (no target handle to land on). The drag from actionA's
    // bottom to the initial node should produce no edge.
    const initialHandle = initialNode.locator('.react-flow__handle');
    await dragHandle(page, bottomHandleOf(page, ACTION_A_ID), initialHandle);
    await expect(
      page.locator('[data-testid^="activity-edge-"]'),
    ).toHaveCount(0);
  });

  test('editing guard via inspector reflects on the edge and undoes with Cmd-Z', async ({
    page,
  }) => {
    await seedActivityProject(page);
    await gotoActivity(page);

    await dragHandle(
      page,
      bottomHandleOf(page, ACTION_A_ID),
      topHandleOf(page, ACTION_B_ID),
    );
    await expect(
      page.locator('[data-testid^="activity-edge-"][data-edge-kind="ControlFlow"]'),
    ).toHaveCount(1);

    const guard = page.getByTestId('inspector-control-flow-guard');
    await guard.fill('water > 0');
    await guard.press('Enter');

    // The edge label area now renders the bracketed guard text.
    const edge = page
      .locator('[data-testid^="activity-edge-"][data-edge-kind="ControlFlow"]')
      .first();
    const edgeId = await edge.getAttribute('data-edge-id');
    await expect(
      page.getByTestId(`activity-edge-guard-${edgeId}`),
    ).toHaveText('[water > 0]');

    // Cmd-Z reverts the guard edit (registered as a single update-edge).
    await page.locator('.react-flow').focus();
    await page.keyboard.press('Control+z');
    await expect(
      page.getByTestId(`activity-edge-guard-${edgeId}`),
    ).toHaveCount(0);
    await expect(guard).toHaveValue('');
  });

  test('editing itemType via inspector reflects on the ObjectFlow edge label', async ({
    page,
  }) => {
    await seedActivityProject(page);
    await gotoActivity(page);

    await dragHandle(
      page,
      bottomHandleOf(page, ACTION_A_ID),
      topHandleOf(page, ACTION_B_ID),
      { shift: true },
    );
    await expect(
      page.locator('[data-testid^="activity-edge-"][data-edge-kind="ObjectFlow"]'),
    ).toHaveCount(1);

    const itemType = page.getByTestId('inspector-object-flow-item-type');
    await itemType.fill('Token');
    await itemType.press('Enter');

    const edge = page
      .locator('[data-testid^="activity-edge-"][data-edge-kind="ObjectFlow"]')
      .first();
    const edgeId = await edge.getAttribute('data-edge-id');
    await expect(
      page.getByTestId(`activity-edge-label-${edgeId}`),
    ).toHaveText('Token');
  });

  test('Backspace deletes a selected ControlFlow; Cmd-Z restores it', async ({
    page,
  }) => {
    await seedActivityProject(page);
    await gotoActivity(page);

    await dragHandle(
      page,
      bottomHandleOf(page, ACTION_A_ID),
      topHandleOf(page, ACTION_B_ID),
    );
    const edge = page.locator(
      '[data-testid^="activity-edge-"][data-edge-kind="ControlFlow"]',
    );
    await expect(edge).toHaveCount(1);

    await page.locator('.react-flow').focus();
    await page.keyboard.press('Backspace');
    await expect(edge).toHaveCount(0);

    await page.keyboard.press('Control+z');
    await expect(edge).toHaveCount(1);
  });

  test('@a11y Activity canvas with one ControlFlow has no serious/critical violations', async ({
    page,
  }) => {
    await seedActivityProject(page);
    await gotoActivity(page);

    await dragHandle(
      page,
      bottomHandleOf(page, ACTION_A_ID),
      topHandleOf(page, ACTION_B_ID),
    );
    await expect(
      page.locator('[data-testid^="activity-edge-"][data-edge-kind="ControlFlow"]'),
    ).toHaveCount(1);

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

  test('@visual activity-with-control-flow baseline', async ({ page }) => {
    await seedActivityProject(page);
    await gotoActivity(page);

    await dragHandle(
      page,
      bottomHandleOf(page, ACTION_A_ID),
      topHandleOf(page, ACTION_B_ID),
    );
    await expect(
      page.locator('[data-testid^="activity-edge-"][data-edge-kind="ControlFlow"]'),
    ).toHaveCount(1);

    // Clear selection so the edge-selection accent is not in the baseline.
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    await page.mouse.move(0, 0);

    await expect(page).toHaveScreenshot('activity-with-control-flow.png', {
      fullPage: false,
    });
  });

  test('@visual activity-with-object-flow baseline', async ({ page }) => {
    await seedActivityProject(page);
    await gotoActivity(page);

    await dragHandle(
      page,
      bottomHandleOf(page, ACTION_A_ID),
      topHandleOf(page, ACTION_B_ID),
      { shift: true },
    );
    await expect(
      page.locator('[data-testid^="activity-edge-"][data-edge-kind="ObjectFlow"]'),
    ).toHaveCount(1);

    const itemType = page.getByTestId('inspector-object-flow-item-type');
    await itemType.fill('Token');
    await itemType.press('Enter');

    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    await page.mouse.move(0, 0);

    // Per-test threshold raised to 0.025 — see issue #444 for diagnosis.
    // This baseline has ~0.02 natural rendering variance across CI runs that
    // is not a regression signal; visual project runs with retries: 0.
    await expect(page).toHaveScreenshot('activity-with-object-flow.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.025,
    });
  });
});
