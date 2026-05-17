import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const SEED_PROJECT_ID = 'p-use-case-nodes';

async function seedUseCaseProject(page: Page): Promise<void> {
  await page.addInitScript((projectId) => {
    const key = `mbse:v1:project:${projectId}`;
    if (sessionStorage.getItem(key)) return;
    const project = {
      id: projectId,
      name: 'Use Case Nodes Seed',
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
          id: 'd-use-case',
          viewpointId: 'use-case',
          name: 'System Use Cases',
          positions: {},
        },
      ],
      history: { undo: [], redo: [] },
    };
    sessionStorage.setItem(key, JSON.stringify(project));
  }, SEED_PROJECT_ID);
}

async function gotoUseCase(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System Use Cases' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Use Case Diagram',
  );
}

async function dragChipOntoCanvas(
  page: Page,
  elementKind: 'actor' | 'usecase',
  targetPosition: { x: number; y: number },
): Promise<void> {
  const chip = page.getByTestId(`use-case-palette-${elementKind}`);
  const canvas = page.getByTestId('canvas-drop-target');
  await chip.dragTo(canvas, { targetPosition });
}

test.describe('Use Case nodes + palette + inspector (issue #118)', () => {
  test.beforeEach(async ({ page }) => {
    await seedUseCaseProject(page);
  });

  test('shows Actor + Use case palette chips on the Use Case viewpoint', async ({
    page,
  }) => {
    // ADR 0015 step 3 (#376): the diagram-toolbar `+ Actor` /
    // `+ Use case` buttons retired. The Use-Case-specific palette chips
    // remain as the canonical creation path on this viewpoint.
    await gotoUseCase(page);
    await expect(page.getByTestId('use-case-palette-actor')).toBeVisible();
    await expect(page.getByTestId('use-case-palette-usecase')).toBeVisible();
  });

  test('dragging the Actor chip adds Actors with cascading default names and selects each one', async ({
    page,
  }) => {
    // Post-ADR-0015-step-3 (#376): replaces the `+ Actor` toolbar click with
    // the canonical `use-case-palette-actor` chip drag.
    await gotoUseCase(page);
    await dragChipOntoCanvas(page, 'actor', { x: 160, y: 200 });
    const actors = page.locator('[data-use-case-node-kind="actor"]');
    await expect(actors).toHaveCount(1);
    const firstId = (await actors.first().getAttribute('data-element-id'))!;
    await expect(
      page.getByTestId(`use-case-actor-label-${firstId}`),
    ).toHaveText('Actor1');
    await dragChipOntoCanvas(page, 'actor', { x: 320, y: 200 });
    await expect(actors).toHaveCount(2);
    const secondId = (await actors.nth(1).getAttribute('data-element-id'))!;
    await expect(
      page.getByTestId(`use-case-actor-label-${secondId}`),
    ).toHaveText('Actor2');
  });

  test('dragging the Use case chip adds UseCases with cascading default UC1, UC2, …', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragChipOntoCanvas(page, 'usecase', { x: 160, y: 200 });
    await dragChipOntoCanvas(page, 'usecase', { x: 320, y: 200 });
    const useCases = page.locator('[data-use-case-node-kind="usecase"]');
    await expect(useCases).toHaveCount(2);
    const idA = (await useCases.first().getAttribute('data-element-id'))!;
    const idB = (await useCases.nth(1).getAttribute('data-element-id'))!;
    await expect(page.getByTestId(`use-case-usecase-label-${idA}`)).toHaveText(
      'UC1',
    );
    await expect(page.getByTestId(`use-case-usecase-label-${idB}`)).toHaveText(
      'UC2',
    );
  });

  test('drag Actor + Use case palette chips onto canvas → both render', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragChipOntoCanvas(page, 'actor', { x: 120, y: 200 });
    await dragChipOntoCanvas(page, 'usecase', { x: 360, y: 200 });
    await expect(
      page.locator('[data-use-case-node-kind="actor"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-use-case-node-kind="usecase"]'),
    ).toHaveCount(1);
  });

  test('inline rename via double-click commits on Enter', async ({ page }) => {
    await gotoUseCase(page);
    await dragChipOntoCanvas(page, 'actor', { x: 160, y: 200 });
    const actor = page.locator('[data-use-case-node-kind="actor"]').first();
    const id = (await actor.getAttribute('data-element-id'))!;
    await page.getByTestId(`use-case-actor-label-${id}`).dblclick();
    const input = page.getByTestId(`use-case-actor-input-${id}`);
    await input.fill('Driver');
    await input.press('Enter');
    await expect(page.getByTestId(`use-case-actor-label-${id}`)).toHaveText(
      'Driver',
    );
  });

  test('Cmd-Z reverts an Actor palette drop in one step (compound command)', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragChipOntoCanvas(page, 'actor', { x: 160, y: 200 });
    const actors = page.locator('[data-use-case-node-kind="actor"]');
    await expect(actors).toHaveCount(1);
    await page.keyboard.press('Control+z');
    await expect(actors).toHaveCount(0);
  });

  test('inspector shows Name + Description for Actor, Name + Description + Text for UseCase', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragChipOntoCanvas(page, 'usecase', { x: 160, y: 200 });
    await expect(page.getByTestId('inspector-name')).toHaveValue('UC1');
    await expect(page.getByTestId('inspector-description')).toBeVisible();
    await expect(page.getByTestId('inspector-usecase-text')).toBeVisible();

    await page.getByTestId('inspector-usecase-text').fill('Driver starts car');
    await page.getByTestId('inspector-usecase-text').blur();
    await page.reload();
    await page.getByRole('tab', { name: 'System Use Cases' }).click();
    await page.locator('[data-use-case-node-kind="usecase"]').first().click();
    await expect(page.getByTestId('inspector-usecase-text')).toHaveValue(
      'Driver starts car',
    );

    // Switch to Actor — no text field.
    await dragChipOntoCanvas(page, 'actor', { x: 360, y: 200 });
    await expect(page.getByTestId('inspector-name')).toHaveValue('Actor1');
    await expect(page.getByTestId('inspector-usecase-text')).toHaveCount(0);
  });

  test('project tree shows Actors + Use cases groups; leaves appear after creation', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await expect(
      page.getByTestId('project-tree-group-Actor'),
    ).toBeVisible();
    await expect(
      page.getByTestId('project-tree-group-UseCase'),
    ).toBeVisible();
    await dragChipOntoCanvas(page, 'actor', { x: 160, y: 200 });
    await dragChipOntoCanvas(page, 'usecase', { x: 360, y: 200 });
    const actorId = await page
      .locator('[data-use-case-node-kind="actor"]')
      .first()
      .getAttribute('data-element-id');
    const useCaseId = await page
      .locator('[data-use-case-node-kind="usecase"]')
      .first()
      .getAttribute('data-element-id');
    await expect(
      page.locator(`[data-testid="project-tree-leaf-${actorId}"]`),
    ).toContainText('Actor1');
    await expect(
      page.locator(`[data-testid="project-tree-leaf-${useCaseId}"]`),
    ).toContainText('UC1');
  });

  test('@a11y Use Case canvas with Actor + UseCase + inspector open has no serious/critical violations', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragChipOntoCanvas(page, 'actor', { x: 160, y: 200 });
    await dragChipOntoCanvas(page, 'usecase', { x: 420, y: 200 });
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

  test('use-case node body is rendered as an SVG <ellipse> (Phase-13 gate invariant)', async ({
    page,
  }) => {
    await gotoUseCase(page);
    await dragChipOntoCanvas(page, 'usecase', { x: 160, y: 200 });
    const useCaseNode = page.locator('[data-use-case-node-kind="usecase"]').first();
    await expect(useCaseNode).toBeVisible();
    const ellipse = useCaseNode.locator('svg ellipse').first();
    await expect(ellipse).toHaveCount(1);
    const { rx, ry } = await ellipse.evaluate((el) => {
      const e = el as SVGEllipseElement;
      return { rx: e.rx.baseVal.value, ry: e.ry.baseVal.value };
    });
    expect(rx).toBeGreaterThan(0);
    expect(ry).toBeGreaterThan(0);
  });

  test('@visual use-case-with-actor-and-usecase baseline', async ({ page }) => {
    await gotoUseCase(page);
    await dragChipOntoCanvas(page, 'actor', { x: 160, y: 200 });
    await dragChipOntoCanvas(page, 'usecase', { x: 420, y: 200 });
    // Clear selection so the node-selected ring is not in the baseline.
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('use-case-with-actor-and-usecase.png', {
      fullPage: false,
    });
  });
});
