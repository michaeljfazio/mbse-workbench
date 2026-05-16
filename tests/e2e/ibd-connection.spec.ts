import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Two-part IBD seed: Producer (out port `power`) and Consumer (in port `intake`),
// each with a PartUsage already placed on the same IBD diagram. The diagram is
// bound to Producer for ADR-0003 consistency (the choice is arbitrary — we
// just need both PartUsages on the canvas).

const SEED_PROJECT_ID = 'p-ibd-connection-seed';
const PRODUCER_DEF = 'pd-producer';
const PRODUCER_PORT_DEF = 'port-d-power';
const PRODUCER_PART_USAGE = 'pu-producer';
const PRODUCER_PORT_USAGE = 'pu-power';
const CONSUMER_DEF = 'pd-consumer';
const CONSUMER_PORT_DEF = 'port-d-intake';
const CONSUMER_PART_USAGE = 'pu-consumer';
const CONSUMER_PORT_USAGE = 'pu-intake';
const BDD_ID = 'd-bdd';
const IBD_ID = 'd-ibd';

async function seedConnectionProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({
      projectId,
      bddId,
      ibdId,
      producerDef,
      producerPortDef,
      producerPartUsage,
      producerPortUsage,
      consumerDef,
      consumerPortDef,
      consumerPartUsage,
      consumerPortUsage,
    }) => {
      const project = {
        id: projectId,
        name: 'IBD Connection Seed',
        createdAt: '2026-05-12T10:00:00.000Z',
        modifiedAt: '2026-05-12T10:05:00.000Z',
        elements: [
          {
            id: producerDef,
            kind: 'PartDefinition',
            name: 'Producer',
            isAbstract: false,
            propertyIds: [],
            portIds: [producerPortDef],
          },
          {
            id: producerPortDef,
            kind: 'PortDefinition',
            name: 'power',
            direction: 'out',
          },
          {
            id: producerPortUsage,
            kind: 'PortUsage',
            name: 'power',
            definitionId: producerPortDef,
          },
          {
            id: producerPartUsage,
            kind: 'PartUsage',
            name: 'producer',
            definitionId: producerDef,
            portUsageIds: [producerPortUsage],
          },
          {
            id: consumerDef,
            kind: 'PartDefinition',
            name: 'Consumer',
            isAbstract: false,
            propertyIds: [],
            portIds: [consumerPortDef],
          },
          {
            id: consumerPortDef,
            kind: 'PortDefinition',
            name: 'intake',
            direction: 'in',
          },
          {
            id: consumerPortUsage,
            kind: 'PortUsage',
            name: 'intake',
            definitionId: consumerPortDef,
          },
          {
            id: consumerPartUsage,
            kind: 'PartUsage',
            name: 'consumer',
            definitionId: consumerDef,
            portUsageIds: [consumerPortUsage],
          },
        ],
        edges: [],
        diagrams: [
          {
            id: bddId,
            viewpointId: 'bdd',
            name: 'Main BDD',
            positions: {
              [producerDef]: { x: 60, y: 40 },
              [consumerDef]: { x: 320, y: 40 },
            },
          },
          {
            id: ibdId,
            viewpointId: 'ibd',
            name: 'Producer IBD',
            positions: {
              [producerPartUsage]: { x: 80, y: 120 },
              [consumerPartUsage]: { x: 420, y: 120 },
            },
            context: { kind: 'partDefinition', id: producerDef },
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
      producerDef: PRODUCER_DEF,
      producerPortDef: PRODUCER_PORT_DEF,
      producerPartUsage: PRODUCER_PART_USAGE,
      producerPortUsage: PRODUCER_PORT_USAGE,
      consumerDef: CONSUMER_DEF,
      consumerPortDef: CONSUMER_PORT_DEF,
      consumerPartUsage: CONSUMER_PART_USAGE,
      consumerPortUsage: CONSUMER_PORT_USAGE,
    },
  );
}

async function gotoIbd(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Producer IBD' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Internal Block Diagram',
  );
  await expect(
    page.locator('[data-testid^="ibd-part-"][data-element-id]'),
  ).toHaveCount(2);
}

async function handleCenter(
  handle: Locator,
): Promise<{ x: number; y: number }> {
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
  // Smooth-step through intermediate points so React Flow's connection-in-
  // progress logic activates and the validity check fires before the drop.
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

test.describe('IBD connection (issue #51)', () => {
  test('drag from out-handle to in-handle creates a ConnectionUsage edge', async ({
    page,
  }) => {
    await seedConnectionProject(page);
    await gotoIbd(page);

    const sourceHandle = page.getByTestId(`ibd-handle-${PRODUCER_PORT_USAGE}`);
    const targetHandle = page.getByTestId(`ibd-handle-${CONSUMER_PORT_USAGE}`);
    await expect(sourceHandle).toBeVisible();
    await expect(targetHandle).toBeVisible();

    await dragHandle(page, sourceHandle, targetHandle);

    const edge = page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ConnectionUsage"]');
    await expect(edge).toHaveCount(1);

    // Inspector reflects the new ConnectionUsage with both endpoint labels.
    await expect(
      page.getByTestId('inspector-connection-endpoints'),
    ).toBeVisible();
    await expect(
      page.getByTestId('inspector-connection-source'),
    ).toContainText('producer.power (out)');
    await expect(
      page.getByTestId('inspector-connection-target'),
    ).toContainText('consumer.intake (in)');
  });

  test('Backspace deletes a selected ConnectionUsage; Cmd-Z restores it', async ({
    page,
  }) => {
    await seedConnectionProject(page);
    await gotoIbd(page);

    await dragHandle(
      page,
      page.getByTestId(`ibd-handle-${PRODUCER_PORT_USAGE}`),
      page.getByTestId(`ibd-handle-${CONSUMER_PORT_USAGE}`),
    );
    const edge = page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ConnectionUsage"]');
    await expect(edge).toHaveCount(1);

    // After the drag, the new ConnectionUsage is the workspace selection.
    // Pressing Backspace deletes it via the command bus. Focus the canvas
    // pane first so React Flow's keyboard handler receives the keystroke.
    await expect(
      page.getByTestId('inspector-connection-endpoints'),
    ).toBeVisible();
    await page.locator('.react-flow').focus();
    await page.keyboard.press('Backspace');
    await expect(edge).toHaveCount(0);

    // Workspace.tsx wires undo to both metaKey and ctrlKey, so a single
    // Control+z fires on macOS as well as Linux CI. Pressing both modifiers
    // would undo twice (reverting Backspace AND the drag-create that
    // preceded it).
    await page.keyboard.press('Control+z');
    await expect(edge).toHaveCount(1);
  });

  test('rejects an in ↔ in drag (typed compatibility per ADR 0003)', async ({
    page,
  }) => {
    // Re-seed with consumer's port flipped to `in` on both sides.
    await page.addInitScript(
      ({
        projectId,
        bddId,
        ibdId,
        producerDef,
        producerPortDef,
        producerPartUsage,
        producerPortUsage,
        consumerDef,
        consumerPortDef,
        consumerPartUsage,
        consumerPortUsage,
      }) => {
        const project = {
          id: projectId,
          name: 'IBD Connection Seed (in-in)',
          createdAt: '2026-05-12T10:00:00.000Z',
          modifiedAt: '2026-05-12T10:05:00.000Z',
          elements: [
            {
              id: producerDef,
              kind: 'PartDefinition',
              name: 'A',
              isAbstract: false,
              propertyIds: [],
              portIds: [producerPortDef],
            },
            {
              id: producerPortDef,
              kind: 'PortDefinition',
              name: 'p',
              direction: 'in',
            },
            {
              id: producerPortUsage,
              kind: 'PortUsage',
              name: 'p',
              definitionId: producerPortDef,
            },
            {
              id: producerPartUsage,
              kind: 'PartUsage',
              name: 'a',
              definitionId: producerDef,
              portUsageIds: [producerPortUsage],
            },
            {
              id: consumerDef,
              kind: 'PartDefinition',
              name: 'B',
              isAbstract: false,
              propertyIds: [],
              portIds: [consumerPortDef],
            },
            {
              id: consumerPortDef,
              kind: 'PortDefinition',
              name: 'p',
              direction: 'in',
            },
            {
              id: consumerPortUsage,
              kind: 'PortUsage',
              name: 'p',
              definitionId: consumerPortDef,
            },
            {
              id: consumerPartUsage,
              kind: 'PartUsage',
              name: 'b',
              definitionId: consumerDef,
              portUsageIds: [consumerPortUsage],
            },
          ],
          edges: [],
          diagrams: [
            {
              id: bddId,
              viewpointId: 'bdd',
              name: 'Main BDD',
              positions: {},
            },
            {
              id: ibdId,
              viewpointId: 'ibd',
              name: 'A IBD',
              positions: {
                [producerPartUsage]: { x: 80, y: 120 },
                [consumerPartUsage]: { x: 420, y: 120 },
              },
              context: { kind: 'partDefinition', id: producerDef },
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
        projectId: 'p-ibd-connection-in-in',
        bddId: 'd-bdd-2',
        ibdId: 'd-ibd-2',
        producerDef: 'pd-a-2',
        producerPortDef: 'port-d-a',
        producerPartUsage: 'pu-a',
        producerPortUsage: 'pu-pa',
        consumerDef: 'pd-b-2',
        consumerPortDef: 'port-d-b',
        consumerPartUsage: 'pu-b',
        consumerPortUsage: 'pu-pb',
      },
    );

    await page.goto('/');
    await page.getByRole('tab', { name: 'A IBD' }).click();
    await expect(
      page.locator('[data-testid^="ibd-part-"][data-element-id]'),
    ).toHaveCount(2);

    await dragHandle(
      page,
      page.getByTestId('ibd-handle-pu-pa'),
      page.getByTestId('ibd-handle-pu-pb'),
    );

    await expect(
      page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ConnectionUsage"]'),
    ).toHaveCount(0);
  });

  test('@a11y IBD with one ConnectionUsage has no serious/critical violations', async ({
    page,
  }) => {
    await seedConnectionProject(page);
    await gotoIbd(page);
    await dragHandle(
      page,
      page.getByTestId(`ibd-handle-${PRODUCER_PORT_USAGE}`),
      page.getByTestId(`ibd-handle-${CONSUMER_PORT_USAGE}`),
    );
    await expect(
      page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ConnectionUsage"]'),
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

  test('@visual IBD with two parts and one connection', async ({ page }) => {
    await seedConnectionProject(page);
    await gotoIbd(page);
    await dragHandle(
      page,
      page.getByTestId(`ibd-handle-${PRODUCER_PORT_USAGE}`),
      page.getByTestId(`ibd-handle-${CONSUMER_PORT_USAGE}`),
    );
    await expect(
      page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ConnectionUsage"]'),
    ).toHaveCount(1);
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('ibd-two-parts-one-connection.png', {
      fullPage: false,
    });
  });
});
