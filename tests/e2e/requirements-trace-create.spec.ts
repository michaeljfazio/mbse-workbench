import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Seed two Requirements on a Requirements diagram so trace-creation drags
// don't need to also exercise the create path. A third "implementer" Block
// covers the satisfy/verify Requirement → PartDefinition case.

const SEED_PROJECT_ID = 'p-requirements-trace-create';
const REQ_A = 'r-a';
const REQ_B = 'r-b';
const REQ_C = 'r-c';
const REQ_D = 'r-d';
const BLOCK_E = 'b-e';
const REQ_DIAGRAM = 'd-requirements';
const BDD_DIAGRAM = 'd-bdd';

async function seed(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, reqDiagram, bddDiagram, ra, rb, rc, rd, be }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Requirements Trace Seed',
        createdAt: '2026-05-12T10:00:00.000Z',
        modifiedAt: '2026-05-12T10:05:00.000Z',
        elements: [
          {
            id: ra,
            kind: 'Requirement',
            name: 'Stop on red',
            reqId: 'R-001',
            text: 'The system shall stop on a red signal.',
            priority: 'critical',
            status: 'approved',
          },
          {
            id: rb,
            kind: 'Requirement',
            name: 'Brake',
            reqId: 'R-002',
            text: 'The system shall actuate the brake.',
            priority: 'high',
            status: 'draft',
          },
          {
            id: rc,
            kind: 'Requirement',
            name: 'Alert',
            reqId: 'R-003',
            text: 'The system shall alert the driver.',
            priority: 'medium',
            status: 'draft',
          },
          {
            id: rd,
            kind: 'Requirement',
            name: 'Log',
            reqId: 'R-004',
            text: 'The system shall log all stops.',
            priority: 'low',
            status: 'draft',
          },
          {
            id: be,
            kind: 'PartDefinition',
            name: 'BrakeController',
            isAbstract: false,
            propertyIds: [],
            portIds: [],
          },
        ],
        edges: [],
        diagrams: [
          {
            id: bddDiagram,
            viewpointId: 'bdd',
            name: 'Main BDD',
            positions: { [be]: { x: 80, y: 80 } },
          },
          {
            id: reqDiagram,
            viewpointId: 'requirements',
            name: 'System Requirements',
            positions: {
              [ra]: { x: 60, y: 60 },
              [rb]: { x: 360, y: 60 },
              [rc]: { x: 60, y: 280 },
              [rd]: { x: 360, y: 280 },
            },
          },
        ],
        history: { undo: [], redo: [] },
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      reqDiagram: REQ_DIAGRAM,
      bddDiagram: BDD_DIAGRAM,
      ra: REQ_A,
      rb: REQ_B,
      rc: REQ_C,
      rd: REQ_D,
      be: BLOCK_E,
    },
  );
}

async function gotoRequirements(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System Requirements' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Requirements Diagram',
  );
  await expect(
    page.locator('[data-testid^="requirements-req-"][data-element-id]'),
  ).toHaveCount(4);
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

async function createTrace(
  page: Page,
  source: string,
  target: string,
  kind: 'derive' | 'satisfy' | 'verify' | 'refine',
): Promise<void> {
  await dragHandle(
    page,
    page.getByTestId(`requirements-handle-bottom-${source}`),
    page.getByTestId(`requirements-handle-top-${target}`),
  );
  await expect(page.getByTestId('trace-kind-popover')).toBeVisible();
  await page.getByTestId(`trace-kind-${kind}`).click();
  await expect(page.getByTestId('trace-kind-popover')).toHaveCount(0);
}

test.describe('RequirementTrace edges (issue #72)', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page);
  });

  test('drag opens the traceKind picker; picking satisfy creates a RequirementTrace with traceKind=satisfy', async ({
    page,
  }) => {
    await gotoRequirements(page);
    await dragHandle(
      page,
      page.getByTestId(`requirements-handle-bottom-${REQ_A}`),
      page.getByTestId(`requirements-handle-top-${REQ_B}`),
    );
    await expect(page.getByTestId('trace-kind-popover')).toBeVisible();
    await expect(page.getByTestId('trace-kind-derive')).toBeEnabled();
    await expect(page.getByTestId('trace-kind-satisfy')).toBeEnabled();
    await expect(page.getByTestId('trace-kind-verify')).toBeEnabled();
    await expect(page.getByTestId('trace-kind-refine')).toBeEnabled();

    await page.getByTestId('trace-kind-satisfy').click();
    const edge = page.locator(
      '[data-testid^="req-trace-edge-"][data-trace-kind="satisfy"]',
    );
    await expect(edge).toHaveCount(1);

    // Inspector reflects the new trace edge.
    await expect(page.getByTestId('inspector-trace-edge')).toBeVisible();
    await expect(page.getByTestId('inspector-trace-kind')).toHaveText(
      '«satisfy»',
    );
    await expect(page.getByTestId('inspector-trace-source')).toContainText(
      'R-001',
    );
    await expect(page.getByTestId('inspector-trace-target')).toContainText(
      'R-002',
    );
  });

  test('verify / derive / refine each produce a distinct edge', async ({
    page,
  }) => {
    await gotoRequirements(page);
    await createTrace(page, REQ_A, REQ_B, 'satisfy');
    await createTrace(page, REQ_C, REQ_D, 'verify');
    await createTrace(page, REQ_A, REQ_C, 'derive');
    await createTrace(page, REQ_B, REQ_D, 'refine');

    for (const kind of ['satisfy', 'verify', 'derive', 'refine'] as const) {
      await expect(
        page.locator(`[data-testid^="req-trace-edge-"][data-trace-kind="${kind}"]`),
      ).toHaveCount(1);
    }
  });

  test('Escape on the picker leaves the model unchanged', async ({ page }) => {
    await gotoRequirements(page);
    await dragHandle(
      page,
      page.getByTestId(`requirements-handle-bottom-${REQ_A}`),
      page.getByTestId(`requirements-handle-top-${REQ_B}`),
    );
    await expect(page.getByTestId('trace-kind-popover')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('trace-kind-popover')).toHaveCount(0);
    await expect(page.locator('g[data-trace-kind]')).toHaveCount(0);
  });

  test('Cmd-Z undoes a trace creation; redo replays it', async ({ page }) => {
    await gotoRequirements(page);
    await createTrace(page, REQ_A, REQ_B, 'satisfy');
    const edge = page.locator('g[data-trace-kind]');
    await expect(edge).toHaveCount(1);

    await page.keyboard.press('Control+z');
    await expect(edge).toHaveCount(0);
    await page.keyboard.press('Control+Shift+z');
    await expect(edge).toHaveCount(1);
  });

  test('Inspector label edit round-trips through the model + persists across reload', async ({
    page,
  }) => {
    await gotoRequirements(page);
    await createTrace(page, REQ_A, REQ_B, 'satisfy');
    const labelInput = page.getByTestId('inspector-trace-label');
    await labelInput.fill('covers spec');
    await labelInput.blur();

    await page.reload();
    await page.getByRole('tab', { name: 'System Requirements' }).click();
    await expect(page.locator('g[data-trace-kind]')).toHaveCount(1);
    // Click the edge layer to re-select via the model state (which carries
    // the label).
    const stored = await page.evaluate((id) => {
      const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
      const project = JSON.parse(raw!);
      return project.edges[0];
    }, SEED_PROJECT_ID);
    expect(stored.label).toBe('covers spec');
    expect(stored.kind).toBe('RequirementTrace');
    expect(stored.traceKind).toBe('satisfy');
  });

  test('@a11y Requirements diagram with one trace edge has no serious/critical violations', async ({
    page,
  }) => {
    await gotoRequirements(page);
    await createTrace(page, REQ_A, REQ_B, 'satisfy');
    await page.locator('body').click({ position: { x: 4, y: 4 } });
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

  test('@visual requirements-four-traces baseline', async ({ page }) => {
    await gotoRequirements(page);
    await createTrace(page, REQ_A, REQ_B, 'satisfy');
    await createTrace(page, REQ_C, REQ_D, 'verify');
    await createTrace(page, REQ_A, REQ_C, 'derive');
    await createTrace(page, REQ_B, REQ_D, 'refine');
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('requirements-four-traces.png', {
      fullPage: false,
    });
  });

  test('@visual trace-kind-popover baseline', async ({ page }) => {
    await gotoRequirements(page);
    await dragHandle(
      page,
      page.getByTestId(`requirements-handle-bottom-${REQ_A}`),
      page.getByTestId(`requirements-handle-top-${REQ_B}`),
    );
    await expect(page.getByTestId('trace-kind-popover')).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('requirements-trace-kind-popover.png', {
      fullPage: false,
    });
  });

  test('@visual inspector-trace-edge-selected baseline', async ({ page }) => {
    await gotoRequirements(page);
    await createTrace(page, REQ_A, REQ_B, 'satisfy');
    await page.getByTestId('inspector-trace-label').fill('covers spec');
    await page.getByTestId('inspector-trace-label').blur();
    await page.evaluate(async () => {
      await Promise.allSettled(document.getAnimations().map((a) => a.finished));
    });
    await expect(page).toHaveScreenshot('inspector-trace-edge-selected.png', {
      fullPage: false,
    });
  });
});
