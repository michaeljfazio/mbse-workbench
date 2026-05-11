import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Issue #73 — cross-diagram traceability via the inspector "+ Link
// requirement" affordance. Seeds one BDD block + two Requirements so the
// link/unlink/context-menu flow runs without first creating elements.

const SEED_PROJECT_ID = 'p-cross-diagram-trace';
const BLOCK_ID = 'b-brake';
const REQ_A_ID = 'r-stop-red';
const REQ_B_ID = 'r-actuate';
const BDD_DIAGRAM = 'd-bdd';
const REQ_DIAGRAM = 'd-requirements';

async function seed(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, bddId, reqId, blockId, ra, rb }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Cross-diagram Trace Seed',
        createdAt: '2026-05-12T10:00:00.000Z',
        modifiedAt: '2026-05-12T10:05:00.000Z',
        elements: [
          {
            id: blockId,
            kind: 'PartDefinition',
            name: 'BrakeController',
            isAbstract: false,
            propertyIds: [],
            portIds: [],
          },
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
        ],
        edges: [],
        diagrams: [
          {
            id: bddId,
            viewpointId: 'bdd',
            name: 'Main BDD',
            positions: { [blockId]: { x: 120, y: 120 } },
          },
          {
            id: reqId,
            viewpointId: 'requirements',
            name: 'System Requirements',
            positions: {
              [ra]: { x: 60, y: 60 },
              [rb]: { x: 360, y: 60 },
            },
          },
        ],
        history: { undo: [], redo: [] },
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      bddId: BDD_DIAGRAM,
      reqId: REQ_DIAGRAM,
      blockId: BLOCK_ID,
      ra: REQ_A_ID,
      rb: REQ_B_ID,
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
    page.locator(`[data-testid="bdd-block-${BLOCK_ID}"]`),
  ).toBeVisible();
}

async function selectBlock(page: Page): Promise<void> {
  await page.locator(`[data-testid="bdd-block-${BLOCK_ID}"]`).click();
  await expect(page.getByTestId('inspector-trace-links')).toBeVisible();
}

test.describe('Cross-diagram traceability (issue #73)', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page);
  });

  test('inspector + Link requirement → satisfy: creates a RequirementTraceEdge with the block as target', async ({
    page,
  }) => {
    await gotoBdd(page);
    await selectBlock(page);

    expect(
      await page.getByTestId('inspector-trace-links-empty').count(),
    ).toBe(1);

    await page.getByTestId('inspector-add-trace-link').click();
    await expect(
      page.getByTestId('link-requirement-popover'),
    ).toBeVisible();

    await page.getByTestId(`link-requirement-row-${REQ_A_ID}`).click();
    // satisfy/verify valid for non-Requirement target; derive/refine disabled.
    await expect(page.getByTestId('link-requirement-kind-derive')).toBeDisabled();
    await expect(page.getByTestId('link-requirement-kind-refine')).toBeDisabled();
    await page.getByTestId('link-requirement-kind-satisfy').click();
    await expect(
      page.getByTestId('link-requirement-popover'),
    ).toHaveCount(0);

    // The row appears in the inspector.
    const linkList = page.getByTestId('inspector-trace-link-list');
    await expect(linkList).toBeVisible();
    await expect(linkList).toContainText('«satisfy»');
    await expect(linkList).toContainText('R-001');

    // The model knows about it.
    const stored = await page.evaluate((id) => {
      const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
      const project = JSON.parse(raw!);
      return project.edges as Array<{
        kind: string;
        sourceId: string;
        targetId: string;
        traceKind?: string;
      }>;
    }, SEED_PROJECT_ID);
    expect(stored).toHaveLength(1);
    expect(stored[0]!.kind).toBe('RequirementTrace');
    expect(stored[0]!.sourceId).toBe(REQ_A_ID);
    expect(stored[0]!.targetId).toBe(BLOCK_ID);
    expect(stored[0]!.traceKind).toBe('satisfy');
  });

  test('unlink button removes the trace edge', async ({ page }) => {
    await gotoBdd(page);
    await selectBlock(page);

    await page.getByTestId('inspector-add-trace-link').click();
    await page.getByTestId(`link-requirement-row-${REQ_A_ID}`).click();
    await page.getByTestId('link-requirement-kind-verify').click();
    await expect(page.getByTestId('inspector-trace-link-list')).toBeVisible();

    const unlinkButton = page.locator(
      '[data-testid^="inspector-trace-link-delete-"]',
    );
    await expect(unlinkButton).toHaveCount(1);
    await unlinkButton.first().click();
    await expect(page.getByTestId('inspector-trace-links-empty')).toBeVisible();

    const stored = await page.evaluate((id) => {
      const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
      const project = JSON.parse(raw!);
      return project.edges;
    }, SEED_PROJECT_ID);
    expect(stored).toEqual([]);
  });

  test('link survives a full page reload', async ({ page }) => {
    await gotoBdd(page);
    await selectBlock(page);
    await page.getByTestId('inspector-add-trace-link').click();
    await page.getByTestId(`link-requirement-row-${REQ_A_ID}`).click();
    await page.getByTestId('link-requirement-kind-satisfy').click();
    await expect(page.getByTestId('inspector-trace-link-list')).toBeVisible();

    await page.reload();
    await expect(
      page.locator(`[data-testid="bdd-block-${BLOCK_ID}"]`),
    ).toBeVisible();
    await page.locator(`[data-testid="bdd-block-${BLOCK_ID}"]`).click();
    await expect(page.getByTestId('inspector-trace-link-list')).toBeVisible();
    await expect(page.getByTestId('inspector-trace-link-list')).toContainText(
      '«satisfy»',
    );
  });

  test('Show requirement traces context-menu entry navigates to the Requirements tab and selects the source', async ({
    page,
  }) => {
    await gotoBdd(page);
    await selectBlock(page);
    await page.getByTestId('inspector-add-trace-link').click();
    await page.getByTestId(`link-requirement-row-${REQ_A_ID}`).click();
    await page.getByTestId('link-requirement-kind-satisfy').click();

    const block = page.locator(`[data-testid="bdd-block-${BLOCK_ID}"]`);
    const box = await block.boundingBox();
    if (!box) throw new Error('Block bounding box unavailable');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
      button: 'right',
    });
    await expect(page.getByTestId('element-context-menu')).toBeVisible();
    await expect(
      page.getByTestId('context-menu-show-requirement-traces'),
    ).toBeVisible();
    await page.getByTestId('context-menu-show-requirement-traces').click();

    await expect(
      page.getByRole('tab', { name: 'System Requirements' }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('inspector-name')).toHaveValue('Stop on red');
  });

  test('context-menu entry is omitted when the element has zero traces', async ({
    page,
  }) => {
    await gotoBdd(page);
    const block = page.locator(`[data-testid="bdd-block-${BLOCK_ID}"]`);
    const box = await block.boundingBox();
    if (!box) throw new Error('Block bounding box unavailable');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
      button: 'right',
    });
    if (await page.getByTestId('element-context-menu').isVisible()) {
      await expect(
        page.getByTestId('context-menu-show-requirement-traces'),
      ).toHaveCount(0);
    }
  });

  test('@a11y BDD block with TraceLinksExtras open passes axe', async ({
    page,
  }) => {
    await gotoBdd(page);
    await selectBlock(page);
    await page.getByTestId('inspector-add-trace-link').click();
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

  test('@visual inspector-block-with-trace-link baseline', async ({ page }) => {
    await gotoBdd(page);
    await selectBlock(page);
    await page.getByTestId('inspector-add-trace-link').click();
    await page.getByTestId(`link-requirement-row-${REQ_A_ID}`).click();
    await page.getByTestId('link-requirement-kind-satisfy').click();
    await expect(page.getByTestId('inspector-trace-link-list')).toBeVisible();
    await page.mouse.move(0, 0);
    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map((a) => a.finished));
    });
    await expect(page).toHaveScreenshot('inspector-block-with-trace-link.png', {
      fullPage: false,
    });
  });

  test('@visual trace-link-popover baseline', async ({ page }) => {
    await gotoBdd(page);
    await selectBlock(page);
    await page.getByTestId('inspector-add-trace-link').click();
    await expect(
      page.getByTestId('link-requirement-popover'),
    ).toBeVisible();
    await page.mouse.move(0, 0);
    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map((a) => a.finished));
    });
    await expect(page).toHaveScreenshot('trace-link-popover.png', {
      fullPage: false,
    });
  });
});
