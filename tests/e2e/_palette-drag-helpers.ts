/**
 * _palette-drag-helpers.ts — shared palette-drag creation helpers.
 *
 * Filename prefixed with `_` so the Playwright test runner ignores it (the
 * runner picks up `*.spec.ts`). Importable from any spec.
 *
 * Context: ADR 0015 step 3 (#376) retires the per-viewpoint `+ X` toolbar
 * buttons (`toolbar-add-block`, `-requirement`, `-action`, `-state`, `-actor`,
 * `-usecase`). Specs that used those buttons to seed elements now drive the
 * canonical palette-drag-onto-canvas affordance (step 1, PR #419) instead.
 *
 * The helpers below mirror the project-tree group → CanvasPane.handleDrop
 * MIME contract: every group header is `draggable` and carries
 * `PROJECT_TREE_DRAG_TYPE` set to its element kind. The drop handler routes
 * (viewpoint, kind) pairs through `acceptedElementKinds` and per-viewpoint
 * creation logic.
 *
 * Kind → viewpoint mapping covered here:
 *  - PartDefinition  → BDD              → Block node
 *  - Requirement     → Requirements VP  → Requirement node
 *  - ActionUsage     → Activity VP      → Action node
 *  - StateUsage      → State Machine VP → State node
 *  - Actor / UseCase → Use Case VP      → Actor / UseCase node
 *
 * Each helper drops at a deterministic-but-cascade-friendly position so
 * multiple sequential calls in a single spec do not stack nodes on top of
 * each other. The exact pixel target only matters when a spec is itself a
 * geometry test (e.g. visual baselines or layout tests) — those callers
 * pass an explicit `targetPosition`.
 */

import { expect, type Page } from '@playwright/test';

const DEFAULT_DROP_X = 360;
const DEFAULT_DROP_Y = 220;
const CASCADE_STEP_X = 80;
const CASCADE_STEP_Y = 60;

interface DragOpts {
  /** Pixel target inside the canvas drop zone. Defaults to a sensible mid-canvas point. */
  readonly targetPosition?: { readonly x: number; readonly y: number };
}

async function dragGroupTo(
  page: Page,
  groupKind: string,
  targetPosition: { x: number; y: number },
): Promise<void> {
  const group = page.getByTestId(`project-tree-group-${groupKind}`);
  const canvas = page.getByTestId('canvas-drop-target');
  await group.dragTo(canvas, { targetPosition });
}

function cascadePosition(index: number): { x: number; y: number } {
  const cols = 2;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: DEFAULT_DROP_X + col * CASCADE_STEP_X,
    y: DEFAULT_DROP_Y + row * CASCADE_STEP_Y,
  };
}

/**
 * Drag the `PartDefinition` project-tree group onto the BDD canvas, creating
 * a Block node. Returns the new block's `data-element-id`.
 *
 * Pre-condition: the BDD viewpoint is the active tab (cold-start default).
 */
export async function addBlockViaPalette(
  page: Page,
  opts?: DragOpts,
): Promise<string> {
  const before = page.locator('[data-testid^="bdd-block-"][data-element-id]');
  const beforeCount = await before.count();
  await dragGroupTo(
    page,
    'PartDefinition',
    opts?.targetPosition ?? cascadePosition(beforeCount),
  );
  await expect(before).toHaveCount(beforeCount + 1);
  const newBlock = before.nth(beforeCount);
  const id = await newBlock.getAttribute('data-element-id');
  if (!id) throw new Error('addBlockViaPalette: new block missing data-element-id');
  return id;
}

/**
 * Drag-create a Block then click it to select it. Mirrors the older
 * `addAndSelectBlock` helper that several specs inlined when the toolbar
 * `+ Block` button was the canonical creation path.
 */
export async function addAndSelectBlockViaPalette(page: Page): Promise<string> {
  const id = await addBlockViaPalette(page);
  await page.locator(`[data-testid="bdd-block-${id}"]`).click();
  return id;
}

/**
 * Drag the `Requirement` project-tree group onto the Requirements canvas.
 * Returns the new requirement node's element id.
 */
export async function addRequirementViaPalette(
  page: Page,
  opts?: DragOpts,
): Promise<string> {
  const before = page.locator(
    '[data-testid^="requirements-req-"][data-element-id]',
  );
  const beforeCount = await before.count();
  await dragGroupTo(
    page,
    'Requirement',
    opts?.targetPosition ?? cascadePosition(beforeCount),
  );
  await expect(before).toHaveCount(beforeCount + 1);
  const id = await before.nth(beforeCount).getAttribute('data-element-id');
  if (!id) throw new Error('addRequirementViaPalette: missing data-element-id');
  return id;
}

/**
 * Drag the `ActionUsage` project-tree group onto the Activity canvas. The
 * palette MIME carries the `action` node-type discriminator; tree-only drops
 * (which we're doing here) fall back to the default `action` node type.
 */
export async function addActionViaPalette(
  page: Page,
  opts?: DragOpts,
): Promise<string> {
  const before = page.locator(
    '[data-testid^="activity-action-"][data-element-id]',
  );
  const beforeCount = await before.count();
  await dragGroupTo(
    page,
    'ActionUsage',
    opts?.targetPosition ?? cascadePosition(beforeCount),
  );
  await expect(before).toHaveCount(beforeCount + 1);
  const id = await before.nth(beforeCount).getAttribute('data-element-id');
  if (!id) throw new Error('addActionViaPalette: missing data-element-id');
  return id;
}

/**
 * Drag the `StateUsage` project-tree group onto the State Machine canvas.
 * Tree-only drops fall back to the `state` node type.
 */
export async function addStateViaPalette(
  page: Page,
  opts?: DragOpts,
): Promise<string> {
  const before = page.locator(
    '[data-testid^="state-machine-state-"][data-element-id]',
  );
  const beforeCount = await before.count();
  await dragGroupTo(
    page,
    'StateUsage',
    opts?.targetPosition ?? cascadePosition(beforeCount),
  );
  await expect(before).toHaveCount(beforeCount + 1);
  const id = await before.nth(beforeCount).getAttribute('data-element-id');
  if (!id) throw new Error('addStateViaPalette: missing data-element-id');
  return id;
}

/**
 * Drag the `Actor` project-tree group onto the Use Case canvas.
 */
export async function addActorViaPalette(
  page: Page,
  opts?: DragOpts,
): Promise<string> {
  const before = page.locator(
    '[data-testid^="use-case-actor-"][data-element-id]',
  );
  const beforeCount = await before.count();
  await dragGroupTo(
    page,
    'Actor',
    opts?.targetPosition ?? cascadePosition(beforeCount),
  );
  await expect(before).toHaveCount(beforeCount + 1);
  const id = await before.nth(beforeCount).getAttribute('data-element-id');
  if (!id) throw new Error('addActorViaPalette: missing data-element-id');
  return id;
}

/**
 * Drag the `UseCase` project-tree group onto the Use Case canvas.
 */
export async function addUseCaseViaPalette(
  page: Page,
  opts?: DragOpts,
): Promise<string> {
  const before = page.locator(
    '[data-testid^="use-case-usecase-"][data-element-id]',
  );
  const beforeCount = await before.count();
  await dragGroupTo(
    page,
    'UseCase',
    opts?.targetPosition ?? cascadePosition(beforeCount),
  );
  await expect(before).toHaveCount(beforeCount + 1);
  const id = await before.nth(beforeCount).getAttribute('data-element-id');
  if (!id) throw new Error('addUseCaseViaPalette: missing data-element-id');
  return id;
}
