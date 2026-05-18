import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Pre-seed a Use Case diagram with two UseCases and two Actors at fixed
// positions so handle coordinates are predictable for drag-create tests.
const SEED_PROJECT_ID = 'p-use-case-edges';
const USE_CASE_ID = 'd-use-case';
const UC_A_ID = 'uc-a';
const UC_B_ID = 'uc-b';
const ACTOR_A_ID = 'actor-a';
const ACTOR_B_ID = 'actor-b';

async function seedUseCaseProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({
      projectId,
      useCaseId,
      ucAId,
      ucBId,
      actorAId,
      actorBId,
    }: {
      projectId: string;
      useCaseId: string;
      ucAId: string;
      ucBId: string;
      actorAId: string;
      actorBId: string;
    }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Use Case Edges Seed',
        createdAt: '2026-05-12T10:00:00.000Z',
        modifiedAt: '2026-05-12T10:05:00.000Z',
        elements: [
          { id: ucAId, kind: 'UseCase', name: 'Authenticate' },
          { id: ucBId, kind: 'UseCase', name: 'Validate Credentials' },
          { id: actorAId, kind: 'Actor', name: 'Customer' },
          { id: actorBId, kind: 'Actor', name: 'VipCustomer' },
        ],
        edges: [],
        diagrams: [
          {
            id: 'd-bdd',
            viewpointId: 'bdd',
            name: 'Main BDD',
            positions: {},
          },
          {
            id: useCaseId,
            viewpointId: 'use-case',
            name: 'System Use Cases',
            positions: {
              [ucAId]: { x: 120, y: 80 },
              [ucBId]: { x: 120, y: 280 },
              [actorAId]: { x: 500, y: 80 },
              [actorBId]: { x: 500, y: 320 },
            },
          },
        ],
        history: { undo: [], redo: [] },
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      useCaseId: USE_CASE_ID,
      ucAId: UC_A_ID,
      ucBId: UC_B_ID,
      actorAId: ACTOR_A_ID,
      actorBId: ACTOR_B_ID,
    },
  );
}

async function gotoUseCase(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System Use Cases' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Use Case Diagram',
  );
  await expect(
    page.locator('[data-use-case-node-kind="usecase"]'),
  ).toHaveCount(2);
  await expect(
    page.locator('[data-use-case-node-kind="actor"]'),
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

function bottomHandleOfUseCase(page: Page, id: string): Locator {
  return page
    .getByTestId(`use-case-usecase-${id}`)
    .locator('.react-flow__handle-bottom');
}

function topHandleOfUseCase(page: Page, id: string): Locator {
  return page
    .getByTestId(`use-case-usecase-${id}`)
    .locator('.react-flow__handle-top');
}

function bottomHandleOfActor(page: Page, id: string): Locator {
  return page
    .getByTestId(`use-case-actor-${id}`)
    .locator('.react-flow__handle-bottom');
}

function topHandleOfActor(page: Page, id: string): Locator {
  return page
    .getByTestId(`use-case-actor-${id}`)
    .locator('.react-flow__handle-top');
}

function leftHandleOfActor(page: Page, id: string): Locator {
  return page
    .getByTestId(`use-case-actor-${id}`)
    .locator('.react-flow__handle-left');
}

function leftHandleOfUseCase(page: Page, id: string): Locator {
  return page
    .getByTestId(`use-case-usecase-${id}`)
    .locator('.react-flow__handle-left');
}

function rightHandleOfActor(page: Page, id: string): Locator {
  return page
    .getByTestId(`use-case-actor-${id}`)
    .locator('.react-flow__handle-right');
}

test.describe('Use Case edges — Include + Extend + Generalization (#119)', () => {
  test.beforeEach(async ({ page }) => {
    await seedUseCaseProject(page);
  });

  test('drag UseCase→UseCase opens popover; pick Include creates dashed edge with «include» label', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfUseCase(page, UC_A_ID),
      topHandleOfUseCase(page, UC_B_ID),
    );
    const popover = page.getByTestId('use-case-edge-kind-popover');
    await expect(popover).toBeVisible();
    await page.getByTestId('use-case-edge-kind-Include').click();
    await expect(popover).toHaveCount(0);
    await expect(
      page.locator('g[data-include-edge="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="use-case-include-edge-label-"]').first(),
    ).toContainText('«include»');
  });

  test('drag UseCase→UseCase + pick Extend creates dashed edge with «extend» label', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfUseCase(page, UC_A_ID),
      topHandleOfUseCase(page, UC_B_ID),
    );
    await page.getByTestId('use-case-edge-kind-Extend').click();
    await expect(
      page.locator('g[data-extend-edge="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="use-case-extend-edge-label-"]').first(),
    ).toContainText('«extend»');
  });

  test('extensionPoint round-trips through inspector + page reload (Extend)', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfUseCase(page, UC_A_ID),
      topHandleOfUseCase(page, UC_B_ID),
    );
    await page.getByTestId('use-case-edge-kind-Extend').click();
    // Wait until the edge selection has surfaced the inspector extras.
    await expect(page.getByTestId('inspector-extend-edge')).toBeVisible();
    const input = page.getByTestId('inspector-extend-extension-point');
    await input.fill('afterPayment');
    await input.press('Enter');
    await page.reload();
    await page.getByRole('tab', { name: 'System Use Cases' }).click();
    await expect(
      page.locator('g[data-extend-edge="true"]'),
    ).toHaveCount(1);
    // Edge SVG paths in RF v12 have a 1.5 px hit target — clicking them is
    // unreliable (per docs/CONTEXT.md). Verify the extensionPoint persisted by
    // inspecting the EdgeLabelRenderer-portaled secondary label instead.
    await expect(
      page
        .locator('[data-testid^="use-case-extend-edge-extension-point-"]')
        .first(),
    ).toContainText('afterPayment');
  });

  test('drag Actor→Actor opens popover; pick Generalization creates solid edge with hollow triangle (no stereotype label)', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfActor(page, ACTOR_A_ID),
      topHandleOfActor(page, ACTOR_B_ID),
    );
    const popover = page.getByTestId('use-case-edge-kind-popover');
    await expect(popover).toBeVisible();
    // Generalization is the only allowed kind for Actor↔Actor — others disabled.
    await expect(
      page.getByTestId('use-case-edge-kind-Include'),
    ).toBeDisabled();
    await expect(
      page.getByTestId('use-case-edge-kind-Extend'),
    ).toBeDisabled();
    await page.getByTestId('use-case-edge-kind-Generalization').click();
    await expect(
      page.locator('g[data-generalization-edge="true"]'),
    ).toHaveCount(1);
  });

  test('drag Actor→UseCase opens popover; pick Association creates plain solid edge (phase-15 #517)', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfActor(page, ACTOR_A_ID),
      topHandleOfUseCase(page, UC_A_ID),
    );
    const popover = page.getByTestId('use-case-edge-kind-popover');
    await expect(popover).toBeVisible();
    // Association is the only allowed kind for Actor↔UseCase — others disabled.
    await expect(
      page.getByTestId('use-case-edge-kind-Include'),
    ).toBeDisabled();
    await expect(
      page.getByTestId('use-case-edge-kind-Extend'),
    ).toBeDisabled();
    await expect(
      page.getByTestId('use-case-edge-kind-Generalization'),
    ).toBeDisabled();
    await page.getByTestId('use-case-edge-kind-Association').click();
    await expect(popover).toHaveCount(0);
    await expect(
      page.locator('g[data-association-edge="true"]'),
    ).toHaveCount(1);
  });

  test('drag UseCase→Actor also opens popover for Association (phase-15 #517)', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfUseCase(page, UC_A_ID),
      topHandleOfActor(page, ACTOR_A_ID),
    );
    const popover = page.getByTestId('use-case-edge-kind-popover');
    await expect(popover).toBeVisible();
    await page.getByTestId('use-case-edge-kind-Association').click();
    await expect(
      page.locator('g[data-association-edge="true"]'),
    ).toHaveCount(1);
  });

  // Phase-15 #528 (walk-33 finding): React Flow gates drag-initiation on
  // `type="source"` handles; ActorNode's `left`/`top` handles were declared
  // `type="target"` only, so a drag starting from Actor.left silently
  // failed even though `isValidUseCaseConnection` accepts both orderings.
  // Fix: use `ConnectionMode.Loose` for the use-case viewpoint (same
  // pattern as IBD per #499) so the validator is the single source of
  // truth for handle-pair validity. This test exercises the previously-
  // broken direction (actor.left → usecase.left).
  test('drag Actor.left → UseCase.left also opens popover for Association (phase-15 #528)', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      leftHandleOfActor(page, ACTOR_A_ID),
      leftHandleOfUseCase(page, UC_A_ID),
    );
    const popover = page.getByTestId('use-case-edge-kind-popover');
    await expect(popover).toBeVisible();
    await expect(
      page.getByTestId('use-case-edge-kind-Association'),
    ).toBeEnabled();
    await page.getByTestId('use-case-edge-kind-Association').click();
    await expect(popover).toHaveCount(0);
    await expect(
      page.locator('g[data-association-edge="true"]'),
    ).toHaveCount(1);
  });

  // Phase-15 #548 — walk-34's secondary direction (`actor.right →
  // usecase.left`) reportedly produced no edge in the deployed bundle.
  // Investigation in iter-890 traced the finding to a driver artefact: the
  // walk's `wait_for_function` polled for the prefix `use-case-edge-*`,
  // which incidentally matches the popover testids (`use-case-edge-kind-
  // popover`, `use-case-edge-kind-Association`, ...) — so PRIMARY reported
  // PASS purely from the popover opening, while SECONDARY's `before` set
  // already contained those popover testids and so timed out waiting for
  // something "new". This test locks in the actual application behaviour:
  // drag from Actor's new `Position.Right` source handle (PR #531) into a
  // UseCase's `Position.Left` target handle, with ConnectionMode.Loose
  // delegating handle-role validity to `isValidUseCaseConnection`. Pick
  // Association from the popover; assert the edge appears.
  test('drag Actor.right → UseCase.left also opens popover for Association (phase-15 #548)', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      rightHandleOfActor(page, ACTOR_A_ID),
      leftHandleOfUseCase(page, UC_A_ID),
    );
    const popover = page.getByTestId('use-case-edge-kind-popover');
    await expect(popover).toBeVisible();
    await expect(
      page.getByTestId('use-case-edge-kind-Association'),
    ).toBeEnabled();
    await page.getByTestId('use-case-edge-kind-Association').click();
    await expect(popover).toHaveCount(0);
    await expect(
      page.locator('g[data-association-edge="true"]'),
    ).toHaveCount(1);
  });

  test('Cmd-Z reverts an Include edge creation in one step', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfUseCase(page, UC_A_ID),
      topHandleOfUseCase(page, UC_B_ID),
    );
    await page.getByTestId('use-case-edge-kind-Include').click();
    await expect(
      page.locator('g[data-include-edge="true"]'),
    ).toHaveCount(1);
    await page.keyboard.press('Control+z');
    await expect(
      page.locator('g[data-include-edge="true"]'),
    ).toHaveCount(0);
  });

  test('clicking an Include edge selects it and the inspector reflects', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfUseCase(page, UC_A_ID),
      topHandleOfUseCase(page, UC_B_ID),
    );
    await page.getByTestId('use-case-edge-kind-Include').click();
    await expect(page.getByTestId('inspector-include-edge')).toBeVisible();
    await expect(page.getByTestId('inspector-include-source')).toContainText(
      'Authenticate',
    );
    await expect(page.getByTestId('inspector-include-target')).toContainText(
      'Validate Credentials',
    );
  });

  test('cancel via Escape leaves no edge created', async ({ page }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfUseCase(page, UC_A_ID),
      topHandleOfUseCase(page, UC_B_ID),
    );
    await expect(
      page.getByTestId('use-case-edge-kind-popover'),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByTestId('use-case-edge-kind-popover'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-use-case-edge-kind]'),
    ).toHaveCount(0);
  });

  test('@a11y open use-case-edge-kind popover has no serious/critical violations', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfUseCase(page, UC_A_ID),
      topHandleOfUseCase(page, UC_B_ID),
    );
    await expect(
      page.getByTestId('use-case-edge-kind-popover'),
    ).toBeVisible();
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

  test('@visual use-case-with-include-edge baseline', async ({ page }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfUseCase(page, UC_A_ID),
      topHandleOfUseCase(page, UC_B_ID),
    );
    await page.getByTestId('use-case-edge-kind-Include').click();
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('use-case-with-include-edge.png', {
      fullPage: false,
    });
  });

  test('@visual use-case-with-extend-edge baseline', async ({ page }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfUseCase(page, UC_A_ID),
      topHandleOfUseCase(page, UC_B_ID),
    );
    await page.getByTestId('use-case-edge-kind-Extend').click();
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('use-case-with-extend-edge.png', {
      fullPage: false,
    });
  });

  test('@visual use-case-with-generalization-edge baseline', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfActor(page, ACTOR_A_ID),
      topHandleOfActor(page, ACTOR_B_ID),
    );
    await page.getByTestId('use-case-edge-kind-Generalization').click();
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(
      'use-case-with-generalization-edge.png',
      { fullPage: false },
    );
  });

  test('@visual use-case-with-association-edge baseline (phase-15 #517)', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragHandle(
      page,
      bottomHandleOfActor(page, ACTOR_A_ID),
      topHandleOfUseCase(page, UC_A_ID),
    );
    await page.getByTestId('use-case-edge-kind-Association').click();
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(
      'use-case-with-association-edge.png',
      { fullPage: false },
    );
  });
});
