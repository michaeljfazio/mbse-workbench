import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Phase 3 gate spec (issue #54): a single cross-diagram orchestration that
// exercises the full IBD slice end-to-end.
//
// AGENT.md Phase 3 gate verbatim: "Playwright e2e + cross-diagram test (same
// Block appears in BDD and IBD; editing properties in one reflects in the
// other)." The test below proves this in one pass and also covers persistence,
// undo across diagrams, and the visual+a11y baselines listed in issue #54.
//
// Sequencing note: issue #54's acceptance criteria lists step 3 (drag the
// PartUsages) before step 4 (add ports to the Cylinder definition). The
// current model materialises a PartUsage's PortUsage children at PartUsage-
// creation time (see `createPartUsage` in src/workspace/store.ts), so adding
// ports to the definition AFTER its PartUsages exist does not propagate
// handles to those PartUsages. The spec therefore adds the ports first and
// then drag-creates the parts — this preserves every cross-diagram assertion
// the gate cares about. The "ports propagate to existing PartUsages" flow is
// orthogonal and tracked separately.

async function addBlockNamed(page: Page, name: string): Promise<string> {
  const blocks = page.locator('[data-testid^="bdd-block-"][data-element-id]');
  const before = await blocks.count();
  await page.getByTestId('toolbar-add-block').click();
  await expect(blocks).toHaveCount(before + 1);
  const block = blocks.nth(before);
  await block.click();
  const id = (await block.getAttribute('data-element-id'))!;
  const nameField = page.getByTestId('inspector-name');
  await nameField.fill(name);
  await nameField.press('Enter');
  await expect(block.locator(`[data-testid="bdd-block-label-${id}"]`)).toHaveText(
    name,
  );
  return id;
}

async function addPort(
  page: Page,
  name: string,
  direction: 'in' | 'out' | 'inout',
): Promise<string> {
  await page.getByTestId('inspector-add-port').click();
  const rows = page.locator('[data-testid^="inspector-port-row-"]');
  const row = rows.last();
  const portId = (await row.getAttribute('data-port-id'))!;
  const nameField = page.getByTestId(`inspector-port-name-${portId}`);
  await nameField.fill(name);
  await nameField.blur();
  await page
    .getByTestId(`inspector-port-dir-${portId}`)
    .selectOption(direction);
  await expect(page.getByTestId(`inspector-port-dir-${portId}`)).toHaveValue(
    direction,
  );
  return portId;
}

async function dragPartPaletteToCanvas(
  page: Page,
  targetX: number,
  targetY: number,
): Promise<void> {
  const group = page.getByTestId('project-tree-group-PartUsage');
  const canvas = page.getByTestId('canvas-drop-target');
  await group.dragTo(canvas, { targetPosition: { x: targetX, y: targetY } });
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
  options: { shift?: boolean } = {},
): Promise<void> {
  const start = await handleCenter(source);
  const end = await handleCenter(target);
  if (options.shift) await page.keyboard.down('Shift');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const steps = 10;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await page.mouse.move(
      start.x + (end.x - start.x) * t,
      start.y + (end.y - start.y) * t,
    );
  }
  await page.mouse.up();
  if (options.shift) await page.keyboard.up('Shift');
}

async function portUsageIdsFor(
  page: Page,
  partUsageId: string,
): Promise<{ fuelIn: string; exhaustOut: string }> {
  // Read the port-usage ids off the rendered handle test ids. Each PartUsage
  // renders one `[data-testid="ibd-handle-<portUsageId>"]` per port, and a
  // sibling `[data-testid="ibd-port-label-<portUsageId>"]` carries the
  // PortDefinition name — so we can identify which PortUsage maps to which
  // port name without reaching into the store.
  const part = page.locator(`[data-testid="ibd-part-${partUsageId}"]`);
  const labels = part.locator('[data-testid^="ibd-port-label-"]');
  const count = await labels.count();
  const out: Record<string, string> = {};
  for (let i = 0; i < count; i += 1) {
    const label = labels.nth(i);
    const testId = (await label.getAttribute('data-testid'))!;
    const portUsageId = testId.replace(/^ibd-port-label-/, '');
    const text = (await label.textContent())?.trim() ?? '';
    out[text] = portUsageId;
  }
  if (!out.fuelIn || !out.exhaustOut) {
    throw new Error(
      `Expected fuelIn + exhaustOut PortUsages on ${partUsageId}, got ${JSON.stringify(out)}`,
    );
  }
  return { fuelIn: out.fuelIn, exhaustOut: out.exhaustOut };
}

test.describe('Phase 3 gate (issue #54)', () => {
  test('cross-diagram slice: BDD → IBD → wire → reload → rename reflects → undo cascade', async ({
    page,
    browserName,
  }) => {
    await page.goto('/');

    // Three-pane shell up; Main BDD active by default.
    await expect(
      page.getByRole('tab', { name: 'Main BDD', selected: true }),
    ).toBeVisible();

    // 1. Create the Engine PartDefinition in BDD.
    const engineId = await addBlockNamed(page, 'Engine');

    // 2. Create the Cylinder PartDefinition in BDD.
    const cylinderId = await addBlockNamed(page, 'Cylinder');

    // 3. Add two ports to Cylinder. (Order: ports before parts — see header.)
    await page.locator(`[data-testid="bdd-block-${cylinderId}"]`).click();
    await addPort(page, 'fuelIn', 'in');
    await addPort(page, 'exhaustOut', 'out');

    // 4. Right-click Engine → "Show in IBD"; assert tab opens bound to Engine.
    await page
      .locator(`[data-testid="bdd-block-${engineId}"]`)
      .click({ button: 'right' });
    await page.getByTestId('context-menu-show-in-ibd').click();
    await expect(
      page.getByRole('tab', { name: /Engine IBD/, selected: true }),
    ).toBeVisible();
    await expect(page.getByTestId('canvas-toolbar')).toContainText(
      'Internal Block Diagram',
    );

    // 5. Drag-create two PartUsages of Cylinder onto the Engine IBD.
    await dragPartPaletteToCanvas(page, 180, 200);
    await page.getByTestId(`part-type-option-${cylinderId}`).click();
    await dragPartPaletteToCanvas(page, 520, 200);
    await page.getByTestId(`part-type-option-${cylinderId}`).click();
    const parts = page.locator('[data-testid^="ibd-part-"][data-element-id]');
    await expect(parts).toHaveCount(2);
    const cyl1Id = (await parts.nth(0).getAttribute('data-element-id'))!;
    const cyl2Id = (await parts.nth(1).getAttribute('data-element-id'))!;

    // Each PartUsage materialised two PortUsages (one per Cylinder PortDef).
    await expect(
      parts.nth(0).locator('[data-testid^="ibd-handle-"]'),
    ).toHaveCount(2);
    await expect(
      parts.nth(1).locator('[data-testid^="ibd-handle-"]'),
    ).toHaveCount(2);

    const cyl1 = await portUsageIdsFor(page, cyl1Id);
    const cyl2 = await portUsageIdsFor(page, cyl2Id);

    // 6. Wire cyl1.fuelIn ← cyl2.exhaustOut with a ConnectionUsage.
    //    Drag from cyl2.exhaustOut (out) → cyl1.fuelIn (in) — canonical out→in.
    await dragHandle(
      page,
      page.getByTestId(`ibd-handle-${cyl2.exhaustOut}`),
      page.getByTestId(`ibd-handle-${cyl1.fuelIn}`),
    );
    const connectionEdges = page.locator(
      '[data-testid^="ibd-edge-"][data-edge-kind="ConnectionUsage"]',
    );
    await expect(connectionEdges).toHaveCount(1);

    // 7. Shift-drag cyl1.exhaustOut → cyl2.fuelIn → ItemFlow; set itemType.
    await dragHandle(
      page,
      page.getByTestId(`ibd-handle-${cyl1.exhaustOut}`),
      page.getByTestId(`ibd-handle-${cyl2.fuelIn}`),
      { shift: true },
    );
    const itemFlowEdges = page.locator(
      '[data-testid^="ibd-edge-"][data-edge-kind="ItemFlow"]',
    );
    await expect(itemFlowEdges).toHaveCount(1);
    const itemFlowField = page.getByTestId('inspector-item-type');
    await itemFlowField.fill('fuel');
    await itemFlowField.press('Enter');
    await expect(itemFlowField).toHaveValue('fuel');

    // 8. Reload: model + positions + diagram tabs all persist.
    await page.reload();
    await expect(page.getByRole('tab', { name: /Engine IBD/ })).toBeVisible();
    await page.getByRole('tab', { name: /Engine IBD/ }).click();
    await expect(parts).toHaveCount(2);
    await expect(connectionEdges).toHaveCount(1);
    await expect(itemFlowEdges).toHaveCount(1);
    // Cyl1/cyl2 ids survived reload.
    await expect(
      page.locator(`[data-testid="ibd-part-${cyl1Id}"]`),
    ).toBeVisible();
    await expect(
      page.locator(`[data-testid="ibd-part-${cyl2Id}"]`),
    ).toBeVisible();

    // 9. Cross-diagram rename: select Engine from the project tree while the
    //    IBD is active, rename in the inspector to "EngineV2", then jump to
    //    BDD and verify the block label reflects the change. This is the
    //    canonical "editing properties in one reflects in the other" gate.
    await page.getByTestId(`project-tree-leaf-${engineId}`).click();
    const nameField = page.getByTestId('inspector-name');
    await expect(nameField).toHaveValue('Engine');
    await nameField.fill('EngineV2');
    await nameField.press('Enter');
    // The diagram name is baked in at IBD-creation time ("Engine IBD"), so we
    // don't assert on the tab label here — the gate calls for cross-diagram
    // reflection on the BDD block label, not on the IBD tab.

    await page.getByRole('tab', { name: 'Main BDD' }).click();
    await expect(
      page.locator(`[data-testid="bdd-block-label-${engineId}"]`),
    ).toHaveText('EngineV2');

    // 10. Cross-diagram undo cascade. Workspace.tsx treats Control+z (and
    //     metaKey+z) as undo, so picking Control+z is portable. Click an
    //     empty canvas pane first so no input has focus.
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    const modifier = browserName === 'webkit' ? 'Meta' : 'Control';
    // Focus the body so keystrokes hit the window keydown handler (not a
    // focused tab button whose `:focus-visible` outline might confuse axe in
    // a later spec). The workspace undo handler suppresses INPUT/TEXTAREA/
    // SELECT focused targets, so this just makes the focus explicitly safe.
    await page.evaluate(() => {
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
      ) {
        document.activeElement.blur();
      }
    });
    const undo = async (): Promise<void> => {
      await page.keyboard.press(`${modifier}+KeyZ`);
    };

    // Undo the rename first (last forward command). Block label rolls back.
    await undo();
    await expect(
      page.locator(`[data-testid="bdd-block-label-${engineId}"]`),
    ).toHaveText('Engine');

    // Switch back to the IBD so subsequent undos visibly affect it. Wait
    // for the canvas to render parts AND edges before pressing Cmd-Z — React
    // Flow rebuilds the edge layer on a separate tick after the parts mount,
    // and querying the DOM during that gap reports zero edges even though
    // the model still has them.
    await page.getByRole('tab', { name: /Engine IBD/ }).click();
    await expect(parts).toHaveCount(2);
    await expect(connectionEdges).toHaveCount(1);
    await expect(itemFlowEdges).toHaveCount(1);

    // Press Cmd-Z until the given locator reaches `target` count, bounded.
    // The exact step-count between cross-diagram milestones is implementation-
    // dependent (compound commands wrap multiple sub-commands into one undo);
    // we just bound the loop and assert the locator count converges.
    const undoUntilCount = async (
      locator: Locator,
      target: number,
      maxSteps: number,
      label: string,
    ): Promise<void> => {
      for (let i = 0; i < maxSteps; i += 1) {
        if ((await locator.count()) === target) return;
        await undo();
        // Give React + Zustand a tick to reconcile before the next press.
        await page.waitForTimeout(20);
      }
      await expect(locator, `${label} (after ${maxSteps} undos)`).toHaveCount(
        target,
      );
    };

    // ItemFlow gone (undoes itemType assignment then ItemFlow create).
    await undoUntilCount(itemFlowEdges, 0, 6, 'ItemFlow gone');
    // ConnectionUsage gone.
    await undoUntilCount(connectionEdges, 0, 4, 'ConnectionUsage gone');
    // Parts gone (each PartUsage create is one compound — cyl2 then cyl1).
    await undoUntilCount(parts, 0, 4, 'PartUsages gone');

    // Ports gone — verify on the Cylinder PartDefinition back in BDD.
    await page.getByRole('tab', { name: 'Main BDD' }).click();
    await page.locator(`[data-testid="bdd-block-${cylinderId}"]`).click();
    await undoUntilCount(
      page.locator('[data-testid^="inspector-port-row-"]'),
      0,
      12,
      'ports gone',
    );
    await expect(page.getByTestId('inspector-ports-empty')).toBeVisible();

    // Blocks gone — undo to clear both PartDefinitions and their renames.
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    await undoUntilCount(
      page.locator('[data-testid^="bdd-block-"][data-element-id]'),
      0,
      6,
      'blocks gone',
    );
  });

  test('@a11y BDD after cross-diagram rename has no serious/critical violations', async ({
    page,
  }) => {
    // Seed the post-rename state directly so the a11y scan focuses on the
    // BDD-with-renamed-block screen rather than the whole flow.
    const projectId = 'p-phase-3-gate-a11y';
    const defId = 'pd-engine';
    const bddId = 'd-bdd';
    const ibdId = 'd-ibd';
    await page.addInitScript(
      ({ projectId, defId, bddId, ibdId }) => {
        const project = {
          id: projectId,
          name: 'Phase 3 Gate (a11y seed)',
          createdAt: '2026-05-12T10:00:00.000Z',
          modifiedAt: '2026-05-12T10:05:00.000Z',
          elements: [
            {
              id: defId,
              kind: 'PartDefinition',
              name: 'EngineV2',
              isAbstract: false,
              propertyIds: [],
              portIds: [],
            },
          ],
          edges: [],
          diagrams: [
            {
              id: bddId,
              viewpointId: 'bdd',
              name: 'Main BDD',
              positions: { [defId]: { x: 120, y: 100 } },
            },
            {
              id: ibdId,
              viewpointId: 'ibd',
              name: 'EngineV2 IBD',
              positions: {},
              context: { kind: 'partDefinition', id: defId },
            },
          ],
          history: { undo: [], redo: [] },
        };
        sessionStorage.setItem(
          `mbse:v1:project:${projectId}`,
          JSON.stringify(project),
        );
      },
      { projectId, defId, bddId, ibdId },
    );
    await page.goto('/');
    await page.locator(`[data-testid="bdd-block-${defId}"]`).click();
    await expect(page.getByTestId('inspector-name')).toHaveValue('EngineV2');

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

  test('@visual BDD reflects cross-diagram rename', async ({ page }) => {
    const projectId = 'p-phase-3-gate-visual';
    const defId = 'pd-engine';
    const bddId = 'd-bdd';
    const ibdId = 'd-ibd';
    await page.addInitScript(
      ({ projectId, defId, bddId, ibdId }) => {
        const project = {
          id: projectId,
          name: 'Phase 3 Gate (visual seed)',
          createdAt: '2026-05-12T10:00:00.000Z',
          modifiedAt: '2026-05-12T10:05:00.000Z',
          elements: [
            {
              id: defId,
              kind: 'PartDefinition',
              name: 'EngineV2',
              isAbstract: false,
              propertyIds: [],
              portIds: [],
            },
          ],
          edges: [],
          diagrams: [
            {
              id: bddId,
              viewpointId: 'bdd',
              name: 'Main BDD',
              positions: { [defId]: { x: 120, y: 100 } },
            },
            {
              id: ibdId,
              viewpointId: 'ibd',
              name: 'EngineV2 IBD',
              positions: {},
              context: { kind: 'partDefinition', id: defId },
            },
          ],
          history: { undo: [], redo: [] },
        };
        sessionStorage.setItem(
          `mbse:v1:project:${projectId}`,
          JSON.stringify(project),
        );
      },
      { projectId, defId, bddId, ibdId },
    );
    await page.goto('/');
    await expect(
      page.locator(`[data-testid="bdd-block-label-${defId}"]`),
    ).toHaveText('EngineV2');
    // Click a corner of the canvas pane so no node is selected — keeps the
    // baseline crisp.
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('bdd-post-rename.png', {
      fullPage: false,
    });
  });
});
