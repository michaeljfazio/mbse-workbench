/**
 * Unit tests for IBD seed-frame creation (issue #461).
 *
 * Covers:
 * - Creating an IBD diagram for a PartDefinition seeds exactly one
 *   IbdEnclosingFrameNode in the canvas (even when no PartUsage nodes exist).
 * - The seed frame is bound to the context PartDefinition's id and name.
 * - Undo of the create-diagram command removes the diagram → frame disappears.
 * - Redo re-creates the diagram → frame reappears.
 * - dim-13 invariant: renaming the PartDefinition is immediately reflected in
 *   the enclosing-frame node's `data.name` field.
 */
import { describe, expect, it } from 'vitest';

import {
  createElementId,
  createElementRegistry,
  createUserId,
  type PackageElement,
  type PartDefinitionElement,
} from '@/model';
import {
  createCommandBus,
  createInMemoryDiagramStore,
} from '@/commands';
import type { User } from '@/collab';
import {
  createDiagramId,
  type Diagram,
} from '@/workspace/diagram';
import { toFlowNodes } from '@/workspace/flowGraph';
import {
  IBD_ENCLOSING_FRAME_DEFAULT_HEIGHT,
  IBD_ENCLOSING_FRAME_DEFAULT_WIDTH,
  IBD_ENCLOSING_FRAME_NODE_TYPE,
  ibdViewpoint,
} from '@/viewpoints';

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

function mkPartDef(ownerId: string, name = 'FCS'): PartDefinitionElement {
  return {
    id: createElementId(),
    kind: 'PartDefinition',
    name,
    isAbstract: false,
    ownerId: ownerId as ReturnType<typeof createElementId>,
    ownerRole: 'member',
    ownerIndex: 0,
  };
}

function mkIbdDiagram(partDefId: string, name = 'FCS IBD'): Diagram {
  return {
    id: createDiagramId(),
    viewpointId: ibdViewpoint.id,
    name,
    positions: {},
    context: { kind: 'partDefinition', id: partDefId as ReturnType<typeof createElementId> },
  };
}

// ---------------------------------------------------------------------------
// Tests: seed frame on empty IBD
// ---------------------------------------------------------------------------

describe('IBD seed frame — empty canvas', () => {
  it('renders exactly one IbdEnclosingFrameNode for a freshly-created (empty) IBD', () => {
    const pkg = mkPackage();
    const partDef = mkPartDef(pkg.id);
    const diagram = mkIbdDiagram(partDef.id);
    const registry = createElementRegistry();
    registry.add(pkg);
    registry.add(partDef);

    const nodes = toFlowNodes(
      [],
      ibdViewpoint,
      diagram,
      new Set(),
      () => undefined,
      registry,
      new Set(),
    );

    expect(nodes).toHaveLength(1);
    const frame = nodes[0];
    expect(frame).toBeDefined();
    expect(frame?.type).toBe(IBD_ENCLOSING_FRAME_NODE_TYPE);
    expect(frame?.data['partDefinitionId']).toBe(partDef.id);
    expect(frame?.data['name']).toBe('FCS');
    expect(frame?.width).toBe(IBD_ENCLOSING_FRAME_DEFAULT_WIDTH);
    expect(frame?.height).toBe(IBD_ENCLOSING_FRAME_DEFAULT_HEIGHT);
    expect(frame?.position).toEqual({ x: 0, y: 0 });
  });

  it('uses the frame id scheme ibd-enclosing-frame:<partDefId>', () => {
    const pkg = mkPackage();
    const partDef = mkPartDef(pkg.id);
    const diagram = mkIbdDiagram(partDef.id);
    const registry = createElementRegistry();
    registry.add(pkg);
    registry.add(partDef);

    const nodes = toFlowNodes([], ibdViewpoint, diagram, new Set(), () => undefined, registry, new Set());
    expect(nodes[0]?.id).toBe(`ibd-enclosing-frame:${partDef.id}`);
  });
});

// ---------------------------------------------------------------------------
// Tests: undo/redo via create-diagram command
// ---------------------------------------------------------------------------

describe('IBD seed frame — undo / redo', () => {
  it('Cmd-Z on create-diagram removes the diagram so the frame disappears', () => {
    const pkg = mkPackage();
    const partDef = mkPartDef(pkg.id);
    const registry = createElementRegistry();
    registry.add(pkg);
    registry.add(partDef);

    const diagrams = createInMemoryDiagramStore();
    const bus = createCommandBus({ registry, diagrams });
    const user = mkUser();

    const diagram = mkIbdDiagram(partDef.id);
    bus.dispatch({ kind: 'create-diagram', diagram }, user);

    expect(diagrams.getDiagram(diagram.id)).toBeDefined();

    // Undo: diagram should be removed
    bus.undo();
    expect(diagrams.getDiagram(diagram.id)).toBeUndefined();

    // toFlowNodes on a stale reference to the diagram still renders if we
    // pass it in, but there is no diagram in the store to retrieve — verifying
    // the bus effect is sufficient.
  });

  it('Cmd-Shift-Z after undo restores the diagram so the frame reappears', () => {
    const pkg = mkPackage();
    const partDef = mkPartDef(pkg.id);
    const registry = createElementRegistry();
    registry.add(pkg);
    registry.add(partDef);

    const diagrams = createInMemoryDiagramStore();
    const bus = createCommandBus({ registry, diagrams });
    const user = mkUser();

    const diagram = mkIbdDiagram(partDef.id);
    bus.dispatch({ kind: 'create-diagram', diagram }, user);
    bus.undo();
    bus.redo();

    const restored = diagrams.getDiagram(diagram.id);
    expect(restored).toBeDefined();
    expect(restored?.context).toEqual({ kind: 'partDefinition', id: partDef.id });

    // Verify frame is present in toFlowNodes after redo
    const nodes = toFlowNodes([], ibdViewpoint, diagram, new Set(), () => undefined, registry, new Set());
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.type).toBe(IBD_ENCLOSING_FRAME_NODE_TYPE);
  });
});

// ---------------------------------------------------------------------------
// Tests: dim-13 cross-diagram coherence — rename propagation
// ---------------------------------------------------------------------------

describe('IBD seed frame — dim-13 rename propagation', () => {
  it('reflects the new name after PartDefinition is renamed', () => {
    const pkg = mkPackage();
    const partDef = mkPartDef(pkg.id, 'FCS');
    const registry = createElementRegistry();
    registry.add(pkg);
    registry.add(partDef);

    const diagrams = createInMemoryDiagramStore();
    const bus = createCommandBus({ registry, diagrams });
    const user = mkUser();

    const diagram = mkIbdDiagram(partDef.id, 'FCS IBD');
    bus.dispatch({ kind: 'create-diagram', diagram }, user);

    // Verify initial name
    const nodesBefore = toFlowNodes([], ibdViewpoint, diagram, new Set(), () => undefined, registry, new Set());
    expect(nodesBefore[0]?.data['name']).toBe('FCS');

    // Rename via update-element
    bus.dispatch(
      { kind: 'update-element', id: partDef.id, patch: { name: 'FlightControlSystem' } },
      user,
    );

    // Frame name should reflect the rename immediately (live registry read)
    const nodesAfter = toFlowNodes([], ibdViewpoint, diagram, new Set(), () => undefined, registry, new Set());
    expect(nodesAfter[0]?.data['name']).toBe('FlightControlSystem');
  });

  it('reverts the frame name when rename is undone', () => {
    const pkg = mkPackage();
    const partDef = mkPartDef(pkg.id, 'FCS');
    const registry = createElementRegistry();
    registry.add(pkg);
    registry.add(partDef);

    const diagrams = createInMemoryDiagramStore();
    const bus = createCommandBus({ registry, diagrams });
    const user = mkUser();

    const diagram = mkIbdDiagram(partDef.id, 'FCS IBD');
    bus.dispatch({ kind: 'create-diagram', diagram }, user);
    bus.dispatch(
      { kind: 'update-element', id: partDef.id, patch: { name: 'FlightControlSystem' } },
      user,
    );

    bus.undo();

    const nodesReverted = toFlowNodes([], ibdViewpoint, diagram, new Set(), () => undefined, registry, new Set());
    expect(nodesReverted[0]?.data['name']).toBe('FCS');
  });
});

// ---------------------------------------------------------------------------
// Tests: invalid context (non-PartDefinition) must not seed a frame
// ---------------------------------------------------------------------------

describe('IBD seed frame — context validation', () => {
  it('returns no frame when diagram has no valid IBD context (package context)', () => {
    const pkg = mkPackage();
    const registry = createElementRegistry();
    registry.add(pkg);

    // A diagram with a 'package' context is not a valid IBD context
    const diagram: Diagram = {
      id: createDiagramId(),
      viewpointId: ibdViewpoint.id,
      name: 'Bogus IBD',
      positions: {},
      context: { kind: 'package', id: pkg.id },
    };

    const nodes = toFlowNodes([], ibdViewpoint, diagram, new Set(), () => undefined, registry, new Set());
    // resolveIbdEnclosingFrameLabel returns null for non-partDefinition context
    expect(nodes).toHaveLength(0);
  });
});
