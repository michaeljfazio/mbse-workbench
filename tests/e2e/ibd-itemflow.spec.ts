import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Two-part IBD seed shared with ibd-connection.spec.ts: Producer (out port
// `power`) and Consumer (in port `intake`), each with a PartUsage already
// placed on the same IBD diagram. The diagram is bound to Producer.

const SEED_PROJECT_ID = 'p-ibd-itemflow-seed';
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

async function seedItemFlowProject(page: Page): Promise<void> {
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
        name: 'IBD ItemFlow Seed',
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

async function dragHandleWithShift(
  page: Page,
  source: Locator,
  target: Locator,
): Promise<void> {
  const start = await handleCenter(source);
  const end = await handleCenter(target);
  // Hold Shift across the whole drag so the window-level keyboard listener
  // (and the onConnectStart event-shiftKey capture) both see it as held when
  // onConnect fires.
  await page.keyboard.down('Shift');
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
  await page.keyboard.up('Shift');
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

test.describe('IBD ItemFlow (issue #52)', () => {
  test('Shift+drag between port handles creates an ItemFlow (not a ConnectionUsage)', async ({
    page,
  }) => {
    await seedItemFlowProject(page);
    await gotoIbd(page);

    await dragHandleWithShift(
      page,
      page.getByTestId(`ibd-handle-${PRODUCER_PORT_USAGE}`),
      page.getByTestId(`ibd-handle-${CONSUMER_PORT_USAGE}`),
    );

    const flow = page.locator(
      '[data-testid^="ibd-edge-"][data-edge-kind="ItemFlow"]',
    );
    await expect(flow).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ConnectionUsage"]'),
    ).toHaveCount(0);

    // Inspector reflects the new ItemFlow with endpoint labels and the
    // editable Item-type field.
    await expect(page.getByTestId('inspector-itemflow-endpoints')).toBeVisible();
    await expect(page.getByTestId('inspector-itemflow-source')).toContainText(
      'producer.power (out)',
    );
    await expect(page.getByTestId('inspector-itemflow-target')).toContainText(
      'consumer.intake (in)',
    );
    await expect(page.getByTestId('inspector-item-type')).toHaveValue('');
  });

  test('drag without Shift still creates a ConnectionUsage (regression — #51)', async ({
    page,
  }) => {
    await seedItemFlowProject(page);
    await gotoIbd(page);

    await dragHandle(
      page,
      page.getByTestId(`ibd-handle-${PRODUCER_PORT_USAGE}`),
      page.getByTestId(`ibd-handle-${CONSUMER_PORT_USAGE}`),
    );

    await expect(
      page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ConnectionUsage"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ItemFlow"]'),
    ).toHaveCount(0);
  });

  test('editing the inspector Item type field updates the edge label', async ({
    page,
  }) => {
    await seedItemFlowProject(page);
    await gotoIbd(page);

    await dragHandleWithShift(
      page,
      page.getByTestId(`ibd-handle-${PRODUCER_PORT_USAGE}`),
      page.getByTestId(`ibd-handle-${CONSUMER_PORT_USAGE}`),
    );

    const flow = page.locator(
      '[data-testid^="ibd-edge-"][data-edge-kind="ItemFlow"]',
    );
    await expect(flow).toHaveCount(1);
    const flowId = await flow.first().getAttribute('data-testid');
    expect(flowId).toMatch(/^ibd-edge-/);
    const edgeId = flowId!.replace(/^ibd-edge-/, '');

    // No label is shown before itemType is set and name is the default
    // "flow1" — the edge component prefers itemType but falls back to name,
    // so the default name "flow1" is the initial label.
    const label = page.getByTestId(`ibd-edge-label-${edgeId}`);
    await expect(label).toContainText('flow1');

    const itemTypeField = page.getByTestId('inspector-item-type');
    await itemTypeField.fill('Fuel');
    await itemTypeField.press('Enter');

    await expect(label).toContainText('Fuel');
  });

  // Issue #499 companion: Shift+drag between two `inout` ports must create an
  // ItemFlow. Same root cause as the ConnectionUsage path — without
  // `ConnectionMode.Loose` the source→source drag is rejected before
  // `isValidIbdConnection` runs.
  test('Shift+drag between two inout ports creates an ItemFlow (issue #499)', async ({
    page,
  }) => {
    await page.addInitScript(
      ({
        projectId,
        ibdId,
        bddId,
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
          name: 'IBD ItemFlow Seed (inout-inout)',
          createdAt: '2026-05-19T10:00:00.000Z',
          modifiedAt: '2026-05-19T10:05:00.000Z',
          elements: [
            {
              id: producerDef,
              kind: 'PartDefinition',
              name: 'PFC',
              isAbstract: false,
              propertyIds: [],
              portIds: [producerPortDef],
            },
            {
              id: producerPortDef,
              kind: 'PortDefinition',
              name: 'data',
              direction: 'inout',
            },
            {
              id: producerPortUsage,
              kind: 'PortUsage',
              name: 'data',
              definitionId: producerPortDef,
            },
            {
              id: producerPartUsage,
              kind: 'PartUsage',
              name: 'pfc_1',
              definitionId: producerDef,
              portUsageIds: [producerPortUsage],
            },
            {
              id: consumerDef,
              kind: 'PartDefinition',
              name: 'ADIRU',
              isAbstract: false,
              propertyIds: [],
              portIds: [consumerPortDef],
            },
            {
              id: consumerPortDef,
              kind: 'PortDefinition',
              name: 'feed',
              direction: 'inout',
            },
            {
              id: consumerPortUsage,
              kind: 'PortUsage',
              name: 'feed',
              definitionId: consumerPortDef,
            },
            {
              id: consumerPartUsage,
              kind: 'PartUsage',
              name: 'adiru_1',
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
              name: 'PFC IBD',
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
        projectId: 'p-ibd-itemflow-inout-inout',
        bddId: 'd-bdd-iof',
        ibdId: 'd-ibd-iof',
        producerDef: 'pd-pfc-iof',
        producerPortDef: 'port-d-data-iof',
        producerPartUsage: 'pu-pfc-iof',
        producerPortUsage: 'pu-data-iof',
        consumerDef: 'pd-adiru-iof',
        consumerPortDef: 'port-d-feed-iof',
        consumerPartUsage: 'pu-adiru-iof',
        consumerPortUsage: 'pu-feed-iof',
      },
    );

    await page.goto('/');
    await page.getByRole('tab', { name: 'PFC IBD' }).click();
    await expect(
      page.locator('[data-testid^="ibd-part-"][data-element-id]'),
    ).toHaveCount(2);

    await dragHandleWithShift(
      page,
      page.getByTestId('ibd-handle-pu-data-iof'),
      page.getByTestId('ibd-handle-pu-feed-iof'),
    );

    await expect(
      page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ItemFlow"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ConnectionUsage"]'),
    ).toHaveCount(0);
  });

  test('rejects in ↔ in Shift+drag (typed compatibility per ADR 0003)', async ({
    page,
  }) => {
    // Re-seed with both sides `in` direction.
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
          name: 'IBD ItemFlow Seed (in-in)',
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
        projectId: 'p-ibd-itemflow-in-in',
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

    await dragHandleWithShift(
      page,
      page.getByTestId('ibd-handle-pu-pa'),
      page.getByTestId('ibd-handle-pu-pb'),
    );

    await expect(
      page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ItemFlow"]'),
    ).toHaveCount(0);
  });

  test('Backspace deletes a selected ItemFlow; Control+z restores it', async ({
    page,
  }) => {
    await seedItemFlowProject(page);
    await gotoIbd(page);

    await dragHandleWithShift(
      page,
      page.getByTestId(`ibd-handle-${PRODUCER_PORT_USAGE}`),
      page.getByTestId(`ibd-handle-${CONSUMER_PORT_USAGE}`),
    );
    const flow = page.locator(
      '[data-testid^="ibd-edge-"][data-edge-kind="ItemFlow"]',
    );
    await expect(flow).toHaveCount(1);

    await expect(page.getByTestId('inspector-itemflow-endpoints')).toBeVisible();
    await page.locator('.react-flow').focus();
    await page.keyboard.press('Backspace');
    await expect(flow).toHaveCount(0);

    await page.keyboard.press('Control+z');
    await expect(flow).toHaveCount(1);
  });

  test('@a11y IBD with one ItemFlow has no serious/critical violations', async ({
    page,
  }) => {
    await seedItemFlowProject(page);
    await gotoIbd(page);
    await dragHandleWithShift(
      page,
      page.getByTestId(`ibd-handle-${PRODUCER_PORT_USAGE}`),
      page.getByTestId(`ibd-handle-${CONSUMER_PORT_USAGE}`),
    );
    await expect(
      page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ItemFlow"]'),
    ).toHaveCount(1);

    await page.getByTestId('inspector-item-type').fill('Fuel');
    await page.getByTestId('inspector-item-type').press('Enter');

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

  test('@visual IBD with two parts and one ItemFlow labelled "Fuel"', async ({
    page,
  }) => {
    await seedItemFlowProject(page);
    await gotoIbd(page);
    await dragHandleWithShift(
      page,
      page.getByTestId(`ibd-handle-${PRODUCER_PORT_USAGE}`),
      page.getByTestId(`ibd-handle-${CONSUMER_PORT_USAGE}`),
    );
    await expect(
      page.locator('[data-testid^="ibd-edge-"][data-edge-kind="ItemFlow"]'),
    ).toHaveCount(1);

    await page.getByTestId('inspector-item-type').fill('Fuel');
    await page.getByTestId('inspector-item-type').press('Enter');

    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    await page.mouse.move(0, 0);
    // Per-test threshold raised to 0.025 — see issue #444 for diagnosis.
    // This baseline has ~0.02 natural rendering variance across CI runs that
    // is not a regression signal; visual project runs with retries: 0.
    await expect(page).toHaveScreenshot('ibd-two-parts-one-itemflow.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.025,
    });
  });
});
