import { expect, test, type Page } from '@playwright/test';

// Phase 12 slice C (issue #233) — global keyboard shortcuts:
//   Cmd/Ctrl-Z      → undo
//   Cmd/Ctrl-Shift-Z → redo
//   Cmd/Ctrl-S      → export JSON (no-op if Cmd-K palette open)
//   Cmd/Ctrl-K      → toggle the command palette stub
//   Delete/Backspace → delete selected canvas element(s)

const SEED_PROJECT_ID = 'p-global-shortcuts';

const SEED_ELEMENTS = [
  {
    id: 'gs-block-alpha',
    kind: 'PartDefinition',
    name: 'Alpha',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  },
  {
    id: 'gs-block-beta',
    kind: 'PartDefinition',
    name: 'Beta',
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
    'gs-block-alpha': { x: 140, y: 140 },
    'gs-block-beta': { x: 380, y: 260 },
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
          name: 'Global Shortcuts',
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
    { projectId: SEED_PROJECT_ID, elements: SEED_ELEMENTS, diagram: SEED_DIAGRAM },
  );
}

test.describe('Phase 12 slice C — global keyboard shortcuts (issue #233)', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /MBSE Workbench/i }),
    ).toBeVisible();
  });

  test('Cmd/Ctrl-K toggles the command palette stub; Escape closes it', async ({
    page,
  }) => {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByTestId('command-palette-stub')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('command-palette-stub')).toHaveCount(0);

    // Toggle behaviour: pressing Cmd-K twice opens then closes.
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByTestId('command-palette-stub')).toBeVisible();
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByTestId('command-palette-stub')).toHaveCount(0);
  });

  test('Cmd/Ctrl-S triggers a JSON export download', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('ControlOrMeta+s'),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test('Cmd/Ctrl-S is suppressed while the command palette is open', async ({
    page,
  }) => {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByTestId('command-palette-stub')).toBeVisible();

    let downloaded = false;
    page.once('download', () => {
      downloaded = true;
    });
    await page.keyboard.press('ControlOrMeta+s');
    // Give the browser a moment in case a download were to be triggered.
    await page.waitForTimeout(200);
    expect(downloaded).toBe(false);
    // Palette is still open.
    await expect(page.getByTestId('command-palette-stub')).toBeVisible();
  });

  test('Cmd/Ctrl-Z undoes a block creation; Cmd/Ctrl-Shift-Z redoes it', async ({
    page,
  }) => {
    const blocks = page.locator('[data-testid^="bdd-block-"][data-element-id]');
    const before = await blocks.count();
    await page.getByTestId('toolbar-add-block').click();
    await expect(blocks).toHaveCount(before + 1);

    await page.keyboard.press('ControlOrMeta+z');
    await expect(blocks).toHaveCount(before);

    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(blocks).toHaveCount(before + 1);
  });

  test('Delete removes the selected diagram element when canvas is not in focus', async ({
    page,
  }) => {
    // Select Alpha via the project tree so the focus stays outside ReactFlow
    // (the tree-level focus path is the one the global handler is meant to
    // cover; ReactFlow handles in-canvas Delete on its own).
    const treeNode = page
      .getByTestId('project-tree')
      .getByText('Alpha', { exact: true });
    await treeNode.click();

    const canvasBlock = page.getByTestId('bdd-block-gs-block-alpha');
    await expect(canvasBlock).toBeVisible();
    await page.keyboard.press('Delete');
    await expect(canvasBlock).toHaveCount(0);
    // Inspector and tree entries follow the deletion.
    await expect(
      page.getByTestId('project-tree-leaf-gs-block-alpha'),
    ).toHaveCount(0);
  });
});
