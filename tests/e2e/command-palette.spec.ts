import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Phase 12 slice D (issue #234) — Cmd-K command palette.
//
// The palette is a modal that searches every element by name + id substring
// (case-insensitive), caps results at 50, supports Up/Down/Enter/Esc, and on
// selection navigates to the first diagram containing the element and
// focuses it on the canvas.

const SEED_PROJECT_ID = 'p-command-palette';

const SEED_ELEMENTS = [
  {
    id: 'cp-block-alpha',
    kind: 'PartDefinition',
    name: 'AlphaSystem',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  },
  {
    id: 'cp-block-beta',
    kind: 'PartDefinition',
    name: 'BetaSubsystem',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  },
  {
    id: 'cp-block-gamma',
    kind: 'PartDefinition',
    name: 'GammaController',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  },
];

const SEED_DIAGRAM = {
  id: 'd-bdd',
  viewpointId: 'bdd',
  name: 'BDD',
  positions: {
    'cp-block-alpha': { x: 140, y: 140 },
    'cp-block-beta': { x: 380, y: 260 },
    'cp-block-gamma': { x: 620, y: 140 },
  },
};

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript(
    ({ projectId, elements, diagram }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const now = '2026-05-14T10:00:00.000Z';
      sessionStorage.setItem(
        key,
        JSON.stringify({
          id: projectId,
          name: 'Command Palette',
          createdAt: now,
          modifiedAt: now,
          elements,
          edges: [],
          diagrams: [diagram],
          history: { undo: [], redo: [] },
          conversations: [],
        }),
      );
    },
    {
      projectId: SEED_PROJECT_ID,
      elements: SEED_ELEMENTS,
      diagram: SEED_DIAGRAM,
    },
  );
}

test.describe('Phase 12 slice D — Cmd-K command palette (issue #234)', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();
  });

  test('opens via Cmd-K, filters by name, selects with Enter, focuses on canvas', async ({
    page,
  }) => {
    await page.keyboard.press('ControlOrMeta+k');
    const palette = page.getByTestId('command-palette');
    await expect(palette).toBeVisible();
    await expect(palette).toHaveAttribute('role', 'dialog');
    await expect(palette).toHaveAttribute('aria-modal', 'true');

    const input = page.getByTestId('command-palette-input');
    await input.fill('beta');
    await expect(
      page.getByTestId('command-palette-result-cp-block-beta'),
    ).toBeVisible();
    // The other two blocks must not match.
    await expect(
      page.getByTestId('command-palette-result-cp-block-alpha'),
    ).toHaveCount(0);
    await expect(
      page.getByTestId('command-palette-result-cp-block-gamma'),
    ).toHaveCount(0);

    await page.keyboard.press('Enter');
    await expect(palette).toHaveCount(0);

    // Selected element is reflected on the canvas — the BDD block carries
    // a selected marker via React Flow's selected class.
    const beta = page.getByTestId('bdd-block-cp-block-beta');
    await expect(beta).toBeVisible();
    const selectedClass = await beta.locator('..').getAttribute('class');
    expect(selectedClass ?? '').toMatch(/selected/);
  });

  test('Arrow keys move the active result; Enter selects it', async ({
    page,
  }) => {
    await page.keyboard.press('ControlOrMeta+k');
    await page.getByTestId('command-palette-input').fill('a'); // matches all 3
    const alpha = page.getByTestId('command-palette-result-cp-block-alpha');
    const beta = page.getByTestId('command-palette-result-cp-block-beta');
    const gamma = page.getByTestId('command-palette-result-cp-block-gamma');
    await expect(alpha).toBeVisible();
    await expect(beta).toBeVisible();
    await expect(gamma).toBeVisible();

    // First result starts active.
    await expect(alpha).toHaveAttribute('data-active', 'true');

    await page.keyboard.press('ArrowDown');
    await expect(beta).toHaveAttribute('data-active', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(gamma).toHaveAttribute('data-active', 'true');
    // Wrap-around.
    await page.keyboard.press('ArrowDown');
    await expect(alpha).toHaveAttribute('data-active', 'true');
    // Up wraps the other way.
    await page.keyboard.press('ArrowUp');
    await expect(gamma).toHaveAttribute('data-active', 'true');

    await page.keyboard.press('Enter');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
    await expect(
      page.getByTestId('bdd-block-cp-block-gamma'),
    ).toBeVisible();
  });

  test('Empty-result state appears when nothing matches', async ({ page }) => {
    await page.keyboard.press('ControlOrMeta+k');
    await page.getByTestId('command-palette-input').fill('zzzNoMatch');
    await expect(page.getByTestId('command-palette-empty')).toBeVisible();
    // No result rows present.
    await expect(
      page.locator('[data-testid^="command-palette-result-"]'),
    ).toHaveCount(0);
  });

  test('T-13.05a — empty query shows the Actions section with built-in commands', async ({
    page,
  }) => {
    await page.keyboard.press('ControlOrMeta+k');
    const palette = page.getByTestId('command-palette');
    await expect(palette).toBeVisible();
    // Actions header is rendered.
    await expect(
      page.getByTestId('command-palette-commands-header'),
    ).toHaveText(/Actions/i);
    // Save project is always available when a project is loaded; it serves
    // as the always-on smoke check for the command rendering path.
    await expect(
      page.getByTestId('command-palette-command-workspace.save-project'),
    ).toBeVisible();
    // Typing switches back to element search and hides the Actions header.
    await page.getByTestId('command-palette-input').fill('alpha');
    await expect(
      page.getByTestId('command-palette-commands-header'),
    ).toHaveCount(0);
    await expect(
      page.getByTestId('command-palette-result-cp-block-alpha'),
    ).toBeVisible();
    // Clearing the input restores commands.
    await page.getByTestId('command-palette-input').fill('');
    await expect(
      page.getByTestId('command-palette-commands-header'),
    ).toBeVisible();
  });

  test('@a11y palette has zero serious/critical axe violations', async ({
    page,
  }) => {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await page.getByTestId('command-palette-input').fill('alpha');
    await expect(
      page.getByTestId('command-palette-result-cp-block-alpha'),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[data-testid="command-palette"]')
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious).toEqual([]);
  });
});
