import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Phase 12 slice D (issue #234) — Cmd-K command palette.
//
// The palette is a modal that searches every element by name + id substring
// (case-insensitive), caps results at 50, supports Up/Down/Enter/Esc, and on
// selection navigates to the first diagram containing the element and
// focuses it on the canvas.
//
// Phase 13 / T-13.05a layered in a typed command registry: with no query the
// palette renders an Actions section listing the enabled built-in commands.
//
// Phase 13 / T-13.05b unifies the typed-query view: matching commands and
// matching elements share a single ranked list, and the registry is
// extended with open-chat / show-inspector / rename-selection commands.

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
    // T-13.05b unified the typed-query view with commands; query by element-id
    // prefix so only the three seeded blocks rank, in document order.
    await page.getByTestId('command-palette-input').fill('cp-block');
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

  test('T-13.05b — query "save" surfaces the Save command in the unified ranked list', async ({
    page,
  }) => {
    await page.keyboard.press('ControlOrMeta+k');
    await page.getByTestId('command-palette-input').fill('save');

    const saveCmd = page.getByTestId(
      'command-palette-command-workspace.save-project',
    );
    await expect(saveCmd).toBeVisible();
    // No "Actions" header during a query — the listbox is unified.
    await expect(
      page.getByTestId('command-palette-commands-header'),
    ).toHaveCount(0);
    // Command outranks any element with the same substring (none here).
    await expect(saveCmd).toHaveAttribute('data-active', 'true');
  });

  test('T-13.05b — Open chat command switches the sidebar to the chat tab', async ({
    page,
  }) => {
    await page.keyboard.press('ControlOrMeta+k');
    await page.getByTestId('command-palette-input').fill('chat');
    const openChat = page.getByTestId(
      'command-palette-command-workspace.open-chat',
    );
    await expect(openChat).toBeVisible();
    await openChat.click();
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
    // Sidebar tab = chat. Tabs carry HTML ids (sidebar-tab-<id>) and aria
    // attributes; their tablist parent owns the data-testid.
    await expect(page.locator('#sidebar-tab-chat')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('T-13.05c — selecting a Block on the diagram surfaces Create representation commands; clicking IBD opens an anchored IBD', async ({
    page,
  }) => {
    // First open: no selection → no scoped commands.
    await page.keyboard.press('ControlOrMeta+k');
    await expect(
      page.getByTestId(
        'command-palette-command-selection.create-representation.ibd',
      ),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);

    // Use the palette itself to select a block on the BDD — pressing Enter
    // on a result calls navigate + setActiveSurface('diagram') + selects the
    // element on the active diagram, which is the exact precondition the
    // scoped commands key off.
    await page.keyboard.press('ControlOrMeta+k');
    await page.getByTestId('command-palette-input').fill('alpha');
    await expect(
      page.getByTestId('command-palette-result-cp-block-alpha'),
    ).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);

    // Reopen — the three accepted representations for PartDefinition appear.
    await page.keyboard.press('ControlOrMeta+k');
    await expect(
      page.getByTestId(
        'command-palette-command-selection.create-representation.bdd',
      ),
    ).toBeVisible();
    const ibdCmd = page.getByTestId(
      'command-palette-command-selection.create-representation.ibd',
    );
    await expect(ibdCmd).toBeVisible();
    await expect(
      page.getByTestId(
        'command-palette-command-selection.create-representation.parametric',
      ),
    ).toBeVisible();

    // Click → palette closes; the workspace switches to a freshly-created
    // IBD whose tab carries the "<owner> IBD" name and is the active tab.
    await ibdCmd.click();
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
    const newTab = page.getByRole('tab', { name: /AlphaSystem IBD/ });
    await expect(newTab).toBeVisible();
    await expect(newTab).toHaveAttribute('aria-selected', 'true');
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
