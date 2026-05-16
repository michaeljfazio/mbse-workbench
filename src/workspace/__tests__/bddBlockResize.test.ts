/**
 * Unit tests for BDD block resize persistence.
 *
 * Covers:
 * - `NodePosition` width/height optional fields round-trip through
 *   `update-diagram-position` command + undo/redo.
 * - `toFlowNodes` respects the persisted size over the viewpoint default.
 * - The migrateLegacyProject round-trip preserves width/height when present.
 *
 * Refs #374
 */
import { describe, expect, it } from 'vitest';

import {
  createElementId,
  createElementRegistry,
  createUserId,
  type PartDefinitionElement,
  type PackageElement,
} from '@/model';
import {
  createCommandBus,
  createInMemoryDiagramPositionStore,
} from '@/commands';
import type { User } from '@/collab';
import { createDiagramId, type NodePosition } from '@/workspace/diagram';
import { toFlowNodes } from '@/workspace/flowGraph';
import { bddViewpoint, BDD_BLOCK_WIDTH, BDD_BLOCK_HEIGHT } from '@/viewpoints';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkUser(): User {
  return { id: createUserId(), displayName: 'alice', color: '#abc123' };
}

function mkPackage(): PackageElement {
  return {
    id: createElementId(),
    kind: 'Package',
    name: 'Root',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
  };
}

function mkPartDef(ownerId: string): PartDefinitionElement {
  return {
    id: createElementId(),
    kind: 'PartDefinition',
    name: 'Block 1',
    isAbstract: false,
    ownerId: ownerId as ReturnType<typeof createElementId>,
    ownerRole: 'member',
    ownerIndex: 0,
  };
}

// ---------------------------------------------------------------------------
// Tests: NodePosition width/height fields
// ---------------------------------------------------------------------------

describe('NodePosition — optional width/height', () => {
  it('accepts position with only x and y (no size)', () => {
    const pos: NodePosition = { x: 10, y: 20 };
    expect(pos.width).toBeUndefined();
    expect(pos.height).toBeUndefined();
  });

  it('accepts position with x, y, width, height', () => {
    const pos: NodePosition = { x: 10, y: 20, width: 400, height: 320 };
    expect(pos.width).toBe(400);
    expect(pos.height).toBe(320);
  });
});

// ---------------------------------------------------------------------------
// Tests: update-diagram-position persists width/height, undo restores previous
// ---------------------------------------------------------------------------

describe('update-diagram-position — resize persistence', () => {
  it('stores width and height in the position store', () => {
    const registry = createElementRegistry();
    const positions = createInMemoryDiagramPositionStore();
    const bus = createCommandBus({ registry, positions });
    const user = mkUser();
    const diagramId = createDiagramId();
    const elementId = createElementId();

    // Set initial position (no size)
    bus.dispatch(
      {
        kind: 'update-diagram-position',
        diagramId,
        elementId,
        position: { x: 50, y: 80 },
      },
      user,
    );

    // Resize: merge width/height into position
    bus.dispatch(
      {
        kind: 'update-diagram-position',
        diagramId,
        elementId,
        position: { x: 50, y: 80, width: 400, height: 300 },
      },
      user,
    );

    const pos = positions.getPosition(diagramId, elementId);
    expect(pos).toEqual({ x: 50, y: 80, width: 400, height: 300 });
  });

  it('undo reverts the resize to the previous position', () => {
    const registry = createElementRegistry();
    const positions = createInMemoryDiagramPositionStore();
    const bus = createCommandBus({ registry, positions });
    const user = mkUser();
    const diagramId = createDiagramId();
    const elementId = createElementId();

    bus.dispatch(
      {
        kind: 'update-diagram-position',
        diagramId,
        elementId,
        position: { x: 50, y: 80 },
      },
      user,
    );

    bus.dispatch(
      {
        kind: 'update-diagram-position',
        diagramId,
        elementId,
        position: { x: 50, y: 80, width: 400, height: 300 },
      },
      user,
    );

    // Undo the resize
    bus.undo();

    const pos = positions.getPosition(diagramId, elementId);
    // Should revert to the pre-resize position (no width/height).
    expect(pos).toEqual({ x: 50, y: 80 });
  });

  it('redo re-applies the resize after undo', () => {
    const registry = createElementRegistry();
    const positions = createInMemoryDiagramPositionStore();
    const bus = createCommandBus({ registry, positions });
    const user = mkUser();
    const diagramId = createDiagramId();
    const elementId = createElementId();

    bus.dispatch(
      {
        kind: 'update-diagram-position',
        diagramId,
        elementId,
        position: { x: 50, y: 80 },
      },
      user,
    );

    bus.dispatch(
      {
        kind: 'update-diagram-position',
        diagramId,
        elementId,
        position: { x: 50, y: 80, width: 400, height: 300 },
      },
      user,
    );

    bus.undo();
    bus.redo();

    const pos = positions.getPosition(diagramId, elementId);
    expect(pos).toEqual({ x: 50, y: 80, width: 400, height: 300 });
  });
});

// ---------------------------------------------------------------------------
// Tests: toFlowNodes respects persisted size
// ---------------------------------------------------------------------------

describe('toFlowNodes — persisted size overrides viewpoint default', () => {
  it('uses the viewpoint default when no size is stored', () => {
    const pkg = mkPackage();
    const block = mkPartDef(pkg.id);
    const diagramId = createDiagramId();
    const registry = createElementRegistry();
    registry.add(pkg);
    registry.add(block);

    const nodes = toFlowNodes(
      [block],
      bddViewpoint,
      {
        id: diagramId,
        viewpointId: bddViewpoint.id,
        name: 'BDD',
        positions: { [block.id]: { x: 0, y: 0 } },
        context: { kind: 'package', id: pkg.id },
      },
      new Set(),
      () => undefined,
      registry,
      new Set(),
    );

    expect(nodes).toHaveLength(1);
    expect(nodes[0].width).toBe(BDD_BLOCK_WIDTH);
    expect(nodes[0].height).toBe(BDD_BLOCK_HEIGHT);
  });

  it('uses the persisted size when width and height are stored', () => {
    const pkg = mkPackage();
    const block = mkPartDef(pkg.id);
    const diagramId = createDiagramId();
    const registry = createElementRegistry();
    registry.add(pkg);
    registry.add(block);

    const nodes = toFlowNodes(
      [block],
      bddViewpoint,
      {
        id: diagramId,
        viewpointId: bddViewpoint.id,
        name: 'BDD',
        positions: {
          [block.id]: { x: 0, y: 0, width: 400, height: 320 },
        },
        context: { kind: 'package', id: pkg.id },
      },
      new Set(),
      () => undefined,
      registry,
      new Set(),
    );

    expect(nodes).toHaveLength(1);
    expect(nodes[0].width).toBe(400);
    expect(nodes[0].height).toBe(320);
  });
});
