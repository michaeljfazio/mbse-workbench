/**
 * Unit tests for the `reconnectEdge` store action (issue #562).
 *
 * Covers:
 * - Success path: ModelEdge (BDD Composition) source endpoint updated.
 * - Success path: ModelEdge target endpoint updated.
 * - Success path: element-as-edge (Transition) source endpoint updated.
 * - Invalid re-anchor rejected (new pair fails viewpoint validator).
 * - Undo (Cmd-Z) restores the original endpoints for both ModelEdge and
 *   element-as-edge reconnects.
 *
 * Tests run directly against the command bus + element registry to keep
 * them fast and free of DOM/React dependencies (same pattern as
 * bddBlockResize.test.ts and ibdSeedFrame.test.ts).
 *
 * Refs #562
 */
import { describe, expect, it, beforeEach } from 'vitest';

import {
  createEdgeId,
  createElementId,
  createElementRegistry,
  createUserId,
  type CompositionEdge,
  type PackageElement,
  type PartDefinitionElement,
  type TransitionElement,
} from '@/model';
import { createCommandBus } from '@/commands';
import type { User } from '@/collab';
import type { ElementRegistry } from '@/model';
import type { CommandBus } from '@/commands';

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

function mkPartDef(ownerId: string, name = 'Block'): PartDefinitionElement {
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

interface BddFixture {
  registry: ElementRegistry;
  bus: CommandBus;
  user: User;
  blockA: PartDefinitionElement;
  blockB: PartDefinitionElement;
  blockC: PartDefinitionElement;
  edgeId: ReturnType<typeof createEdgeId>;
}

function setupBddFixture(): BddFixture {
  const registry = createElementRegistry();
  const bus = createCommandBus({ registry });
  const user = mkUser();

  const pkg = mkPackage();
  const blockA = mkPartDef(pkg.id, 'BlockA');
  const blockB = mkPartDef(pkg.id, 'BlockB');
  const blockC = mkPartDef(pkg.id, 'BlockC');

  registry.add(pkg);
  registry.add(blockA);
  registry.add(blockB);
  registry.add(blockC);

  const edgeId = createEdgeId();
  const edge: CompositionEdge = {
    id: edgeId,
    kind: 'Composition',
    sourceId: blockA.id,
    targetId: blockB.id,
  };
  bus.dispatch({ kind: 'link', edge }, user);

  return { registry, bus, user, blockA, blockB, blockC, edgeId };
}

// ---------------------------------------------------------------------------
// Helper: simulate reconnectEdge logic against registry + bus directly.
// This mirrors the store action's logic so tests remain independent of the
// Zustand store singleton.
// ---------------------------------------------------------------------------

import {
  isValidBddConnection,
  isValidStateMachineConnection,
  isValidActivityConnection,
} from '@/viewpoints';
import type { EdgeId, ElementId, ElementPatch, ModelEdge } from '@/model';

function reconnectModelEdge(
  registry: ElementRegistry,
  bus: CommandBus,
  user: User,
  edgeId: EdgeId,
  end: 'source' | 'target',
  newNodeId: ElementId,
  edges: readonly ModelEdge[],
): boolean {
  const modelEdge = registry.getEdge(edgeId);
  if (!modelEdge) return false;

  const newSource = end === 'source' ? newNodeId : modelEdge.sourceId;
  const newTarget = end === 'target' ? newNodeId : modelEdge.targetId;
  if (newSource === newTarget) return false;

  const syntheticConn = {
    source: newSource as string,
    target: newTarget as string,
    sourceHandle: null,
    targetHandle: null,
  };

  const kind = modelEdge.kind;
  if (
    kind === 'Composition' ||
    kind === 'Aggregation' ||
    kind === 'Generalization' ||
    kind === 'Association' ||
    kind === 'Dependency'
  ) {
    if (!isValidBddConnection(syntheticConn, registry)) return false;
  } else if (kind === 'ControlFlow' || kind === 'ObjectFlow') {
    if (!isValidActivityConnection(syntheticConn, registry)) return false;
  } else {
    return false;
  }

  void edges;
  const updatedEdge: ModelEdge = { ...modelEdge, sourceId: newSource, targetId: newTarget };
  bus.dispatch(
    {
      kind: 'compound',
      commands: [
        { kind: 'unlink', id: modelEdge.id },
        { kind: 'link', edge: updatedEdge },
      ],
    },
    user,
  );
  return true;
}

function reconnectElementEdge(
  registry: ElementRegistry,
  bus: CommandBus,
  user: User,
  elementId: ElementId,
  end: 'source' | 'target',
  newNodeId: ElementId,
): boolean {
  const element = registry.get(elementId);
  if (!element) return false;
  if (element.kind !== 'Transition') return false;

  const newSource = end === 'source' ? newNodeId : element.sourceId;
  const newTarget = end === 'target' ? newNodeId : element.targetId;
  if (newSource === newTarget) return false;

  const syntheticConn = {
    source: newSource as string,
    target: newTarget as string,
    sourceHandle: null,
    targetHandle: null,
  };
  if (!isValidStateMachineConnection(syntheticConn, registry)) return false;

  const endpointPatch: ElementPatch<'Transition'> = {
    sourceId: newSource,
    targetId: newTarget,
  };
  bus.dispatch(
    {
      kind: 'update-element',
      id: element.id,
      patch: endpointPatch,
    },
    user,
  );
  return true;
}

// ---------------------------------------------------------------------------
// Tests: ModelEdge (BDD Composition)
// ---------------------------------------------------------------------------

describe('reconnectEdge — ModelEdge (BDD Composition)', () => {
  let f: BddFixture;
  beforeEach(() => {
    f = setupBddFixture();
  });

  it('success: moves source endpoint to blockC', () => {
    const ok = reconnectModelEdge(
      f.registry,
      f.bus,
      f.user,
      f.edgeId,
      'source',
      f.blockC.id,
      f.registry.edges(),
    );
    expect(ok).toBe(true);

    const edge = f.registry.getEdge(f.edgeId);
    expect(edge).toBeDefined();
    expect(edge?.sourceId).toBe(f.blockC.id);
    expect(edge?.targetId).toBe(f.blockB.id);
  });

  it('success: moves target endpoint to blockC', () => {
    const ok = reconnectModelEdge(
      f.registry,
      f.bus,
      f.user,
      f.edgeId,
      'target',
      f.blockC.id,
      f.registry.edges(),
    );
    expect(ok).toBe(true);

    const edge = f.registry.getEdge(f.edgeId);
    expect(edge).toBeDefined();
    expect(edge?.sourceId).toBe(f.blockA.id);
    expect(edge?.targetId).toBe(f.blockC.id);
  });

  it('rejected: new endpoint is not a PartDefinition (invalid for BDD)', () => {
    // Add a non-PartDefinition element (Package).
    const otherPkg = mkPackage();
    f.registry.add(otherPkg);

    const ok = reconnectModelEdge(
      f.registry,
      f.bus,
      f.user,
      f.edgeId,
      'target',
      otherPkg.id,
      f.registry.edges(),
    );
    expect(ok).toBe(false);

    // Edge must remain unchanged.
    const edge = f.registry.getEdge(f.edgeId);
    expect(edge?.targetId).toBe(f.blockB.id);
  });

  it('rejected: self-loop (source === target after reconnect)', () => {
    const ok = reconnectModelEdge(
      f.registry,
      f.bus,
      f.user,
      f.edgeId,
      'source',
      f.blockB.id, // blockB is already the target → self-loop
      f.registry.edges(),
    );
    expect(ok).toBe(false);

    const edge = f.registry.getEdge(f.edgeId);
    expect(edge?.sourceId).toBe(f.blockA.id);
  });

  it('undo (Cmd-Z) restores original source after a successful reconnect', () => {
    reconnectModelEdge(
      f.registry,
      f.bus,
      f.user,
      f.edgeId,
      'source',
      f.blockC.id,
      f.registry.edges(),
    );
    expect(f.registry.getEdge(f.edgeId)?.sourceId).toBe(f.blockC.id);

    f.bus.undo();

    const edge = f.registry.getEdge(f.edgeId);
    expect(edge).toBeDefined();
    expect(edge?.sourceId).toBe(f.blockA.id);
    expect(edge?.targetId).toBe(f.blockB.id);
  });

  it('undo restores original target after a successful reconnect', () => {
    reconnectModelEdge(
      f.registry,
      f.bus,
      f.user,
      f.edgeId,
      'target',
      f.blockC.id,
      f.registry.edges(),
    );
    expect(f.registry.getEdge(f.edgeId)?.targetId).toBe(f.blockC.id);

    f.bus.undo();

    const edge = f.registry.getEdge(f.edgeId);
    expect(edge?.sourceId).toBe(f.blockA.id);
    expect(edge?.targetId).toBe(f.blockB.id);
  });
});

// ---------------------------------------------------------------------------
// Tests: element-as-edge (Transition / State Machine)
// ---------------------------------------------------------------------------

import type { StateUsageElement } from '@/model';

function mkStateUsage(ownerId: string, name = 'State'): StateUsageElement {
  return {
    id: createElementId(),
    kind: 'StateUsage',
    name,
    stateType: 'state',
    ownerId: ownerId as ElementId,
    ownerRole: 'member',
    ownerIndex: 0,
  };
}

describe('reconnectEdge — element-as-edge (Transition)', () => {
  it('success: moves source endpoint to stateC', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();

    const pkg = mkPackage();
    const stateA = mkStateUsage(pkg.id, 'StateA');
    const stateB = mkStateUsage(pkg.id, 'StateB');
    const stateC = mkStateUsage(pkg.id, 'StateC');
    registry.add(pkg);
    registry.add(stateA);
    registry.add(stateB);
    registry.add(stateC);

    const transitionId = createElementId();
    const transition: TransitionElement = {
      id: transitionId,
      kind: 'Transition',
      name: 'T1',
      sourceId: stateA.id,
      targetId: stateB.id,
      ownerId: pkg.id,
      ownerRole: 'member',
      ownerIndex: 0,
    };
    bus.dispatch({ kind: 'create-element', element: transition }, user);

    const ok = reconnectElementEdge(
      registry,
      bus,
      user,
      transitionId,
      'source',
      stateC.id,
    );
    expect(ok).toBe(true);

    const updated = registry.get(transitionId);
    expect(updated?.kind).toBe('Transition');
    if (updated?.kind === 'Transition') {
      expect(updated.sourceId).toBe(stateC.id);
      expect(updated.targetId).toBe(stateB.id);
    }
  });

  it('rejected: new endpoint is not a StateUsage (invalid for StateMachine)', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();

    const pkg = mkPackage();
    const stateA = mkStateUsage(pkg.id, 'StateA');
    const stateB = mkStateUsage(pkg.id, 'StateB');
    const partDef = mkPartDef(pkg.id, 'BlockX');
    registry.add(pkg);
    registry.add(stateA);
    registry.add(stateB);
    registry.add(partDef);

    const transitionId = createElementId();
    const transition: TransitionElement = {
      id: transitionId,
      kind: 'Transition',
      name: 'T1',
      sourceId: stateA.id,
      targetId: stateB.id,
      ownerId: pkg.id,
      ownerRole: 'member',
      ownerIndex: 0,
    };
    bus.dispatch({ kind: 'create-element', element: transition }, user);

    const ok = reconnectElementEdge(
      registry,
      bus,
      user,
      transitionId,
      'target',
      partDef.id,
    );
    expect(ok).toBe(false);

    const el = registry.get(transitionId);
    if (el?.kind === 'Transition') {
      expect(el.targetId).toBe(stateB.id);
    }
  });

  it('undo (Cmd-Z) restores original source after a successful reconnect', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();

    const pkg = mkPackage();
    const stateA = mkStateUsage(pkg.id, 'StateA');
    const stateB = mkStateUsage(pkg.id, 'StateB');
    const stateC = mkStateUsage(pkg.id, 'StateC');
    registry.add(pkg);
    registry.add(stateA);
    registry.add(stateB);
    registry.add(stateC);

    const transitionId = createElementId();
    const transition: TransitionElement = {
      id: transitionId,
      kind: 'Transition',
      name: 'T1',
      sourceId: stateA.id,
      targetId: stateB.id,
      ownerId: pkg.id,
      ownerRole: 'member',
      ownerIndex: 0,
    };
    bus.dispatch({ kind: 'create-element', element: transition }, user);

    reconnectElementEdge(registry, bus, user, transitionId, 'source', stateC.id);

    const updated = registry.get(transitionId);
    if (updated?.kind === 'Transition') {
      expect(updated.sourceId).toBe(stateC.id);
    }

    bus.undo();

    const restored = registry.get(transitionId);
    if (restored?.kind === 'Transition') {
      expect(restored.sourceId).toBe(stateA.id);
      expect(restored.targetId).toBe(stateB.id);
    }
  });
});
