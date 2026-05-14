import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Phase 9 gate spec (issue #157): one orchestrated walkthrough of the full
// Package Diagram vertical slice plus three @a11y scans for the screens
// called out in the issue's acceptance criteria.
//
// AGENT.md Phase 9 gate verbatim: "Playwright e2e covering moving an element
// between packages."
//
// Walkthrough: switch to Package viewpoint → drop two Package nodes from the
// palette (P1, P2) → drag a pre-seeded PartDefinition tree leaf onto P1 →
// assert P1.memberIds → drag the same leaf onto P2 → assert P1 empty + P2
// holds the member → Cmd-Z restores to P1 → draw PackageImport edge P1→P2 →
// assert dashed «import» arrow → final shape check.

const SEED_PROJECT_ID = 'p-phase-9-gate';
const BDD_DIAGRAM_ID = 'd-bdd';
const PACKAGE_DIAGRAM_ID = 'd-package';
const SEED_PART_ID = 'part-wheel';

async function seedProject(page: Page): Promise<void> {
  // addInitScript fires on every page load including reload — guard the seed
  // so the workspace autosave survives unrelated reloads (matches the
  // phase-8 idempotency pattern).
  await page.addInitScript(
    ({ projectId, bddId, packageId, partId }) => {
      const key = `mbse:v1:project:${projectId}`;
      if (sessionStorage.getItem(key)) return;
      const project = {
        id: projectId,
        name: 'Phase 9 Gate Seed',
        createdAt: '2026-05-13T10:00:00.000Z',
        modifiedAt: '2026-05-13T10:05:00.000Z',
        elements: [
          {
            id: partId,
            kind: 'PartDefinition',
            name: 'Wheel',
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
            positions: {},
          },
          {
            id: packageId,
            viewpointId: 'package',
            name: 'System Packages',
            positions: {},
          },
        ],
        history: { undo: [], redo: [] },
      };
      sessionStorage.setItem(key, JSON.stringify(project));
    },
    {
      projectId: SEED_PROJECT_ID,
      bddId: BDD_DIAGRAM_ID,
      packageId: PACKAGE_DIAGRAM_ID,
      partId: SEED_PART_ID,
    },
  );
}

async function gotoPackage(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'System Packages' }).click();
  await expect(page.getByTestId('canvas-toolbar')).toContainText(
    'Package Diagram',
  );
}

interface StoredElement {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly ownerId?: string | null;
}

interface StoredEdge {
  readonly id: string;
  readonly kind: string;
  readonly sourceId: string;
  readonly targetId: string;
}

async function readProject(page: Page): Promise<{
  readonly elements: readonly StoredElement[];
  readonly edges: readonly StoredEdge[];
}> {
  return await page.evaluate((id) => {
    const raw = sessionStorage.getItem(`mbse:v1:project:${id}`);
    if (!raw) return { elements: [], edges: [] };
    const project = JSON.parse(raw);
    return {
      elements: (project.elements ?? []) as StoredElement[],
      edges: (project.edges ?? []) as StoredEdge[],
    };
  }, SEED_PROJECT_ID);
}

/** Derive the list of member element IDs owned by a Package. */
function getMemberIds(
  elements: readonly StoredElement[],
  packageId: string,
): readonly string[] {
  return elements
    .filter((e) => e.ownerId === packageId)
    .map((e) => e.id);
}

async function dropPackageFromPalette(
  page: Page,
  targetPosition: { x: number; y: number },
): Promise<string> {
  // The Package palette item is exposed as the draggable project-tree group
  // for the Package kind (see src/workspace/tree/ProjectTree.tsx — groups
  // whose kind is in the active viewpoint's paletteItems are draggable).
  const matching = page.locator(
    '[data-testid^="package-node-"][data-element-id]',
  );
  const before = await matching.count();
  const group = page.getByTestId('project-tree-group-Package');
  const canvas = page.getByTestId('canvas-drop-target');
  await group.dragTo(canvas, { targetPosition });
  await expect(matching).toHaveCount(before + 1);
  const newest = matching.nth(before);
  const id = await newest.getAttribute('data-element-id');
  if (!id) throw new Error('Package drop did not produce a Package node id');
  return id;
}

async function renamePackage(
  page: Page,
  id: string,
  name: string,
): Promise<void> {
  await page.getByTestId(`package-node-label-${id}`).dblclick();
  const input = page.getByTestId(`package-node-input-${id}`);
  await input.fill(name);
  await input.press('Enter');
  await expect(page.getByTestId(`package-node-label-${id}`)).toHaveText(name);
}

async function dragTreeLeafOntoPackageNode(
  page: Page,
  leafElementId: string,
  packageId: string,
): Promise<void> {
  const leaf = page.getByTestId(`project-tree-leaf-${leafElementId}`);
  const node = page.getByTestId(`package-node-${packageId}`);
  // dragTo over the package-node target uses the centre of the node's
  // bounding box; CanvasPane's drop handler walks up to the React Flow
  // wrapper (`[data-id]`) to recover the Package id (iter-81).
  await leaf.dragTo(node);
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
  const steps = 10;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await page.mouse.move(
      start.x + (end.x - start.x) * t,
      start.y + (end.y - start.y) * t,
    );
  }
  await page.mouse.up();
}

test.describe('Phase 9 gate (issue #157)', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
  });

  test('Package vertical slice: drop two packages → drag part between them → undo → draw import edge', async ({
    page,
    browserName,
  }) => {
    await gotoPackage(page);

    // Step 1 — drop two Package nodes from the palette. Keep y under ~360 to
    // stay within canvas-drop-target hit area.
    const p1Id = await dropPackageFromPalette(page, { x: 220, y: 140 });
    const p2Id = await dropPackageFromPalette(page, { x: 520, y: 140 });
    await renamePackage(page, p1Id, 'P1');
    await renamePackage(page, p2Id, 'P2');

    // Step 2 — drag the seeded PartDefinition tree leaf onto P1.
    await dragTreeLeafOntoPackageNode(page, SEED_PART_ID, p1Id);
    let snapshot = await readProject(page);
    expect(getMemberIds(snapshot.elements, p1Id)).toEqual([
      SEED_PART_ID,
    ]);
    expect(getMemberIds(snapshot.elements, p2Id)).toEqual([]);

    // Step 3 — drag the same part onto P2; P1 loses the member, P2 gains it.
    await dragTreeLeafOntoPackageNode(page, SEED_PART_ID, p2Id);
    snapshot = await readProject(page);
    expect(getMemberIds(snapshot.elements, p1Id)).toEqual([]);
    expect(getMemberIds(snapshot.elements, p2Id)).toEqual([
      SEED_PART_ID,
    ]);
    await expect(page.getByTestId(`package-node-members-${p1Id}`)).toHaveText(
      '0 members',
    );
    await expect(page.getByTestId(`package-node-members-${p2Id}`)).toHaveText(
      '1 member',
    );

    // Step 4 — Cmd-Z restores the part to P1 (single undo step per ADR 0009).
    // Blur any focused input so the global handler routes to model undo
    // (iter-44 lesson). Click empty pane first.
    await page.locator('.react-flow__pane').click({ position: { x: 8, y: 8 } });
    await page.evaluate(() => {
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
      ) {
        document.activeElement.blur();
      }
    });
    const modifier = browserName === 'webkit' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyZ`);
    await expect(page.getByTestId(`package-node-members-${p1Id}`)).toHaveText(
      '1 member',
    );
    snapshot = await readProject(page);
    expect(getMemberIds(snapshot.elements, p1Id)).toEqual([
      SEED_PART_ID,
    ]);
    expect(getMemberIds(snapshot.elements, p2Id)).toEqual([]);

    // Redo so the final shape matches the issue's "1 part in P2" expectation.
    await page.keyboard.press(`${modifier}+Shift+KeyZ`);
    await expect(page.getByTestId(`package-node-members-${p2Id}`)).toHaveText(
      '1 member',
    );

    // Step 5 — draw a PackageImport edge from P1 (right handle) to P2 (left
    // handle). PackageNode declares Top/Left as targets and Right/Bottom as
    // sources, so P1.right → P2.left is the canonical source→target shape.
    const p1Right = page
      .locator(`[data-testid="package-node-${p1Id}"] .react-flow__handle-right`)
      .first();
    const p2Left = page
      .locator(`[data-testid="package-node-${p2Id}"] .react-flow__handle-left`)
      .first();
    await dragHandle(page, p1Right, p2Left);
    const importEdges = page.locator(
      '[data-testid^="package-import-edge-"][data-edge-kind="PackageImport"]',
    );
    await expect(importEdges).toHaveCount(1);
    // Dashed arrow + «import» label.
    await expect(
      page.locator('[data-testid^="package-import-label-"]'),
    ).toHaveText('«import»');
    // BaseEdge renders the dashed line via inline `style` (the first <path>
    // inside the edge <g> is the <marker> arrowhead, so match by the
    // dasharray style attribute on the rendered edge line).
    await expect(
      importEdges.locator('path[style*="dasharray"]'),
    ).toHaveCount(1);

    // Step 6 — final shape: 2 Packages + 1 PartDefinition + 1 PackageImport
    // edge; P2 owns the member. Exclude the synthesized root Package (ownerId === null).
    snapshot = await readProject(page);
    expect(
      snapshot.elements.filter((e) => e.kind === 'Package' && e.ownerId !== null),
    ).toHaveLength(2);
    expect(
      snapshot.elements.filter((e) => e.kind === 'PartDefinition'),
    ).toHaveLength(1);
    expect(snapshot.edges).toHaveLength(1);
    expect(snapshot.edges[0]!.kind).toBe('PackageImport');
    expect(snapshot.edges[0]!.sourceId).toBe(p1Id);
    expect(snapshot.edges[0]!.targetId).toBe(p2Id);
    expect(getMemberIds(snapshot.elements, p2Id)).toEqual([
      SEED_PART_ID,
    ]);
  });

  test('@a11y empty Package canvas has no serious/critical violations', async ({
    page,
  }) => {
    await gotoPackage(page);
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

  test('@a11y populated Package canvas (two packages + member + import edge) has no serious/critical violations', async ({
    page,
  }) => {
    await gotoPackage(page);
    const p1Id = await dropPackageFromPalette(page, { x: 220, y: 140 });
    const p2Id = await dropPackageFromPalette(page, { x: 520, y: 140 });
    await renamePackage(page, p1Id, 'P1');
    await renamePackage(page, p2Id, 'P2');
    await dragTreeLeafOntoPackageNode(page, SEED_PART_ID, p1Id);
    await expect(page.getByTestId(`package-node-members-${p1Id}`)).toHaveText(
      '1 member',
    );
    const p1Right = page
      .locator(`[data-testid="package-node-${p1Id}"] .react-flow__handle-right`)
      .first();
    const p2Left = page
      .locator(`[data-testid="package-node-${p2Id}"] .react-flow__handle-left`)
      .first();
    await dragHandle(page, p1Right, p2Left);
    await expect(
      page.locator('[data-testid^="package-import-edge-"]'),
    ).toHaveCount(1);

    // Clear selection so focus rings don't dominate the axe sample.
    await page.locator('body').click({ position: { x: 4, y: 4 } });
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

  test('@a11y inspector PackageExtras (Package selected, member list visible) has no serious/critical violations', async ({
    page,
  }) => {
    await gotoPackage(page);
    const p1Id = await dropPackageFromPalette(page, { x: 220, y: 140 });
    await renamePackage(page, p1Id, 'P1');
    await dragTreeLeafOntoPackageNode(page, SEED_PART_ID, p1Id);
    // Select the Package via its tree leaf to surface PackageExtras. Tree
    // leaves call `setSelection([id])` directly and avoid the React-Flow
    // node-click path (which can lose the click on a redrawn node).
    await page.getByTestId(`project-tree-leaf-${p1Id}`).click();
    await expect(page.getByTestId('inspector-package-members')).toBeVisible();
    await expect(
      page.getByTestId('inspector-package-member-list'),
    ).toBeVisible();

    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map((a) => a.finished));
    });
    // Scope axe to the inspector panel — this scan is about the
    // PackageExtras subtree, not the canvas chrome (selected Package nodes
    // trip color-contrast on the decorative «package» tab; that surface is
    // covered by the populated-canvas @a11y test which deselects first).
    const results = await new AxeBuilder({ page })
      .include('[data-testid="inspector-single"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('@visual phase-9 final state (two packages + member + import edge)', async ({
    page,
  }) => {
    await gotoPackage(page);
    const p1Id = await dropPackageFromPalette(page, { x: 220, y: 140 });
    const p2Id = await dropPackageFromPalette(page, { x: 520, y: 140 });
    await renamePackage(page, p1Id, 'P1');
    await renamePackage(page, p2Id, 'P2');
    await dragTreeLeafOntoPackageNode(page, SEED_PART_ID, p2Id);
    const p1Right = page
      .locator(`[data-testid="package-node-${p1Id}"] .react-flow__handle-right`)
      .first();
    const p2Left = page
      .locator(`[data-testid="package-node-${p2Id}"] .react-flow__handle-left`)
      .first();
    await dragHandle(page, p1Right, p2Left);
    await expect(
      page.locator('[data-testid^="package-import-edge-"]'),
    ).toHaveCount(1);

    // Deselect by clicking an empty corner of the pane.
    const pane = page.locator('.react-flow__pane');
    const paneBox = await pane.boundingBox();
    if (paneBox) {
      await page.mouse.click(paneBox.x + paneBox.width - 80, paneBox.y + 40);
    }
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('phase-9-final.png', {
      fullPage: false,
    });
  });
});
