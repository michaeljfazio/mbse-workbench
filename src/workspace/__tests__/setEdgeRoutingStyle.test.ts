/**
 * Unit tests for the `setEdgeRoutingStyle` store action (issue #564).
 *
 * Covers:
 * - Success path: ModelEdge (BDD Composition) routing style set.
 * - Success path: element-as-edge (ConnectionUsage) routing style set.
 * - Success path: element-as-edge (Transition) routing style set.
 * - Undo (Cmd-Z) restores the prior value for ModelEdge.
 * - Undo (Cmd-Z) restores the prior value for element-as-edge.
 * - Setting to the same value is a no-op (does not dispatch a command).
 * - Setting on an unknown id returns false.
 *
 * Tests run directly against the command bus + element registry (no Zustand
 * store singleton; mirrors reconnectEdge.test.ts pattern).
 *
 * Refs #564
 */
import { describe, expect, it, beforeEach } from 'vitest';

import {
  createEdgeId,
  createElementId,
  createElementRegistry,
  createUserId,
  type CompositionEdge,
  type ConnectionUsageElement,
  type EdgeRoutingStyle,
  type PackageElement,
  type PartDefinitionElement,
  type TransitionElement,
} from '@/model';
import type { EdgeId, ElementId, EdgePatch, ElementPatch } from '@/model';
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

// ---------------------------------------------------------------------------
// Action implementation (mirrors store.ts)
// ---------------------------------------------------------------------------

function setEdgeRoutingStyle(
  registry: ElementRegistry,
  bus: CommandBus,
  user: User,
  edgeId: EdgeId | ElementId,
  style: EdgeRoutingStyle,
): boolean {
  // ModelEdge path
  const modelEdge = registry.getEdge(edgeId as EdgeId);
  if (modelEdge) {
    if ((modelEdge.routingStyle ?? undefined) === style) return false;
    const patch: EdgePatch<typeof modelEdge.kind> = { routingStyle: style };
    bus.dispatch(
      {
        kind: 'update-edge',
        id: modelEdge.id,
        patch,
      },
      user,
    );
    return true;
  }

  // Element-as-edge path (ConnectionUsage / ItemFlow / Transition)
  const element = registry.get(edgeId as ElementId);
  if (!element) return false;
  if (
    element.kind !== 'ConnectionUsage' &&
    element.kind !== 'ItemFlow' &&
    element.kind !== 'Transition'
  ) {
    return false;
  }
  if ((element.routingStyle ?? undefined) === style) return false;
  const patch: ElementPatch<typeof element.kind> = { routingStyle: style };
  bus.dispatch(
    {
      kind: 'update-element',
      id: element.id,
      patch,
    },
    user,
  );
  return true;
}

// ---------------------------------------------------------------------------
// BDD Composition fixture
// ---------------------------------------------------------------------------

interface BddFixture {
  registry: ElementRegistry;
  bus: CommandBus;
  user: User;
  blockA: PartDefinitionElement;
  blockB: PartDefinitionElement;
  edgeId: EdgeId;
}

function setupBddFixture(): BddFixture {
  const registry = createElementRegistry();
  const bus = createCommandBus({ registry });
  const user = mkUser();

  const pkg = mkPackage();
  const blockA = mkPartDef(pkg.id, 'BlockA');
  const blockB = mkPartDef(pkg.id, 'BlockB');

  registry.add(pkg);
  registry.add(blockA);
  registry.add(blockB);

  const edgeId = createEdgeId();
  const edge: CompositionEdge = {
    id: edgeId,
    kind: 'Composition',
    sourceId: blockA.id,
    targetId: blockB.id,
  };
  bus.dispatch({ kind: 'link', edge }, user);

  return { registry, bus, user, blockA, blockB, edgeId };
}

// ---------------------------------------------------------------------------
// IBD ConnectionUsage fixture
// ---------------------------------------------------------------------------

interface IbdFixture {
  registry: ElementRegistry;
  bus: CommandBus;
  user: User;
  connectionId: ElementId;
}

function setupIbdFixture(): IbdFixture {
  const registry = createElementRegistry();
  const bus = createCommandBus({ registry });
  const user = mkUser();

  const pkg = mkPackage();
  const portA = mkPartDef(pkg.id, 'PortA');
  const portB = mkPartDef(pkg.id, 'PortB');
  registry.add(pkg);
  registry.add(portA);
  registry.add(portB);

  const connectionId = createElementId();
  const conn: ConnectionUsageElement = {
    id: connectionId,
    kind: 'ConnectionUsage',
    name: 'conn',
    ownerId: pkg.id,
    ownerRole: 'member',
    ownerIndex: 0,
    sourceId: portA.id,
    targetId: portB.id,
  };
  registry.add(conn);

  return { registry, bus, user, connectionId };
}

// ---------------------------------------------------------------------------
// State Machine Transition fixture
// ---------------------------------------------------------------------------

interface SmFixture {
  registry: ElementRegistry;
  bus: CommandBus;
  user: User;
  transitionId: ElementId;
  stateA: PartDefinitionElement;
  stateB: PartDefinitionElement;
}

function setupSmFixture(): SmFixture {
  const registry = createElementRegistry();
  const bus = createCommandBus({ registry });
  const user = mkUser();

  const pkg = mkPackage();
  const stateA = mkPartDef(pkg.id, 'StateA');
  const stateB = mkPartDef(pkg.id, 'StateB');
  registry.add(pkg);
  registry.add(stateA);
  registry.add(stateB);

  const transitionId = createElementId();
  const transition: TransitionElement = {
    id: transitionId,
    kind: 'Transition',
    name: 'T1',
    ownerId: pkg.id,
    ownerRole: 'member',
    ownerIndex: 0,
    sourceId: stateA.id,
    targetId: stateB.id,
  };
  registry.add(transition);

  return { registry, bus, user, transitionId, stateA, stateB };
}

// ---------------------------------------------------------------------------
// Tests: ModelEdge (BDD Composition)
// ---------------------------------------------------------------------------

describe('setEdgeRoutingStyle — ModelEdge (BDD Composition)', () => {
  let f: BddFixture;
  beforeEach(() => {
    f = setupBddFixture();
  });

  it('sets routingStyle to straight', () => {
    const ok = setEdgeRoutingStyle(f.registry, f.bus, f.user, f.edgeId, 'straight');
    expect(ok).toBe(true);
    const edge = f.registry.getEdge(f.edgeId);
    expect(edge?.routingStyle).toBe('straight');
  });

  it('sets routingStyle to bezier', () => {
    const ok = setEdgeRoutingStyle(f.registry, f.bus, f.user, f.edgeId, 'bezier');
    expect(ok).toBe(true);
    const edge = f.registry.getEdge(f.edgeId);
    expect(edge?.routingStyle).toBe('bezier');
  });

  it('no-op when same value', () => {
    // First set it
    setEdgeRoutingStyle(f.registry, f.bus, f.user, f.edgeId, 'step');
    const historyLenBefore = f.bus.getHistory().undo.length;
    // Set same value again
    const ok = setEdgeRoutingStyle(f.registry, f.bus, f.user, f.edgeId, 'step');
    expect(ok).toBe(false);
    expect(f.bus.getHistory().undo.length).toBe(historyLenBefore);
  });

  it('undo restores prior value (undefined → straight → undo → undefined)', () => {
    const edgeBefore = f.registry.getEdge(f.edgeId);
    expect(edgeBefore?.routingStyle).toBeUndefined();

    setEdgeRoutingStyle(f.registry, f.bus, f.user, f.edgeId, 'straight');
    expect(f.registry.getEdge(f.edgeId)?.routingStyle).toBe('straight');

    f.bus.undo();
    expect(f.registry.getEdge(f.edgeId)?.routingStyle).toBeUndefined();
  });

  it('undo restores prior explicit value (smooth-step → bezier → undo → smooth-step)', () => {
    setEdgeRoutingStyle(f.registry, f.bus, f.user, f.edgeId, 'smooth-step');
    setEdgeRoutingStyle(f.registry, f.bus, f.user, f.edgeId, 'bezier');
    expect(f.registry.getEdge(f.edgeId)?.routingStyle).toBe('bezier');

    f.bus.undo();
    expect(f.registry.getEdge(f.edgeId)?.routingStyle).toBe('smooth-step');
  });
});

// ---------------------------------------------------------------------------
// Tests: element-as-edge (ConnectionUsage)
// ---------------------------------------------------------------------------

describe('setEdgeRoutingStyle — element-as-edge (ConnectionUsage)', () => {
  let f: IbdFixture;
  beforeEach(() => {
    f = setupIbdFixture();
  });

  it('sets routingStyle on ConnectionUsage', () => {
    const ok = setEdgeRoutingStyle(
      f.registry,
      f.bus,
      f.user,
      f.connectionId,
      'straight',
    );
    expect(ok).toBe(true);
    const el = f.registry.get(f.connectionId);
    expect(el?.kind === 'ConnectionUsage' && el.routingStyle).toBe('straight');
  });

  it('undo restores prior routingStyle on ConnectionUsage', () => {
    setEdgeRoutingStyle(f.registry, f.bus, f.user, f.connectionId, 'step');
    const el = f.registry.get(f.connectionId);
    expect(el?.kind === 'ConnectionUsage' && el.routingStyle).toBe('step');

    f.bus.undo();
    const after = f.registry.get(f.connectionId);
    expect(after?.kind === 'ConnectionUsage' && after.routingStyle).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: element-as-edge (Transition)
// ---------------------------------------------------------------------------

describe('setEdgeRoutingStyle — element-as-edge (Transition)', () => {
  let f: SmFixture;
  beforeEach(() => {
    f = setupSmFixture();
  });

  it('sets routingStyle on Transition', () => {
    const ok = setEdgeRoutingStyle(
      f.registry,
      f.bus,
      f.user,
      f.transitionId,
      'smooth-step',
    );
    expect(ok).toBe(true);
    const el = f.registry.get(f.transitionId);
    expect(el?.kind === 'Transition' && el.routingStyle).toBe('smooth-step');
  });

  it('undo restores prior routingStyle on Transition', () => {
    setEdgeRoutingStyle(f.registry, f.bus, f.user, f.transitionId, 'bezier');
    f.bus.undo();
    const after = f.registry.get(f.transitionId);
    expect(after?.kind === 'Transition' && after.routingStyle).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: unknown id
// ---------------------------------------------------------------------------

describe('setEdgeRoutingStyle — unknown id', () => {
  it('returns false for an unknown id', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const fakeId = createEdgeId();
    const ok = setEdgeRoutingStyle(registry, bus, user, fakeId, 'straight');
    expect(ok).toBe(false);
  });
});
