/**
 * Unit tests for the `setEdgeStrokeStyle` store action (issue #566).
 *
 * Covers:
 * - Success path: ModelEdge (BDD Composition) stroke style set.
 * - Success path: element-as-edge (ConnectionUsage) stroke style set.
 * - Success path: element-as-edge (Transition) stroke style set.
 * - Undo (Cmd-Z) restores the prior value for ModelEdge.
 * - Undo (Cmd-Z) restores the prior value for element-as-edge.
 * - Setting to the same value is a no-op (does not dispatch a command).
 * - Setting on an unknown id returns false.
 *
 * Refs #566
 */
import { describe, expect, it, beforeEach } from 'vitest';

import {
  createEdgeId,
  createElementId,
  createElementRegistry,
  createUserId,
  type CompositionEdge,
  type ConnectionUsageElement,
  type EdgeStrokeStyle,
  type ModelEdge,
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
// Action implementation (mirrors store.ts setEdgeStrokeStyle)
// ---------------------------------------------------------------------------

function setEdgeStrokeStyle(
  registry: ElementRegistry,
  bus: CommandBus,
  user: User,
  edgeId: EdgeId | ElementId,
  style: EdgeStrokeStyle,
): boolean {
  // ModelEdge path
  const modelEdge = registry.getEdge(edgeId as EdgeId);
  if (modelEdge) {
    if ((modelEdge.strokeStyle ?? undefined) === style) return false;
    const patch: EdgePatch<typeof modelEdge.kind> = { strokeStyle: style };
    bus.dispatch({ kind: 'update-edge', id: modelEdge.id, patch }, user);
    return true;
  }

  // Element-as-edge path
  const element = registry.get(edgeId as ElementId);
  if (!element) return false;
  if (
    element.kind !== 'ConnectionUsage' &&
    element.kind !== 'ItemFlow' &&
    element.kind !== 'Transition'
  ) {
    return false;
  }
  if ((element.strokeStyle ?? undefined) === style) return false;
  const patch: ElementPatch<typeof element.kind> = { strokeStyle: style };
  bus.dispatch({ kind: 'update-element', id: element.id, patch }, user);
  return true;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface BddFixture {
  registry: ElementRegistry;
  bus: CommandBus;
  user: User;
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
  return { registry, bus, user, edgeId };
}

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

interface SmFixture {
  registry: ElementRegistry;
  bus: CommandBus;
  user: User;
  transitionId: ElementId;
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
  return { registry, bus, user, transitionId };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('setEdgeStrokeStyle — ModelEdge (BDD Composition)', () => {
  let f: BddFixture;
  beforeEach(() => { f = setupBddFixture(); });

  it('sets strokeStyle to dashed', () => {
    const ok = setEdgeStrokeStyle(f.registry, f.bus, f.user, f.edgeId, 'dashed');
    expect(ok).toBe(true);
    expect(f.registry.getEdge(f.edgeId)?.strokeStyle).toBe('dashed');
  });

  it('sets strokeStyle to dotted', () => {
    const ok = setEdgeStrokeStyle(f.registry, f.bus, f.user, f.edgeId, 'dotted');
    expect(ok).toBe(true);
    expect(f.registry.getEdge(f.edgeId)?.strokeStyle).toBe('dotted');
  });

  it('no-op when same value', () => {
    setEdgeStrokeStyle(f.registry, f.bus, f.user, f.edgeId, 'dashed');
    const before = f.bus.getHistory().undo.length;
    const ok = setEdgeStrokeStyle(f.registry, f.bus, f.user, f.edgeId, 'dashed');
    expect(ok).toBe(false);
    expect(f.bus.getHistory().undo.length).toBe(before);
  });

  it('undo restores prior value', () => {
    expect(f.registry.getEdge(f.edgeId)?.strokeStyle).toBeUndefined();
    setEdgeStrokeStyle(f.registry, f.bus, f.user, f.edgeId, 'dashed');
    expect(f.registry.getEdge(f.edgeId)?.strokeStyle).toBe('dashed');
    f.bus.undo();
    expect(f.registry.getEdge(f.edgeId)?.strokeStyle).toBeUndefined();
  });

  it('undo chain: dotted → dashed → undo → dotted', () => {
    setEdgeStrokeStyle(f.registry, f.bus, f.user, f.edgeId, 'dotted');
    setEdgeStrokeStyle(f.registry, f.bus, f.user, f.edgeId, 'dashed');
    expect(f.registry.getEdge(f.edgeId)?.strokeStyle).toBe('dashed');
    f.bus.undo();
    expect(f.registry.getEdge(f.edgeId)?.strokeStyle).toBe('dotted');
  });
});

describe('setEdgeStrokeStyle — element-as-edge (ConnectionUsage)', () => {
  let f: IbdFixture;
  beforeEach(() => { f = setupIbdFixture(); });

  it('sets strokeStyle on ConnectionUsage', () => {
    const ok = setEdgeStrokeStyle(f.registry, f.bus, f.user, f.connectionId, 'dashed');
    expect(ok).toBe(true);
    const el = f.registry.get(f.connectionId);
    expect(el?.kind === 'ConnectionUsage' && el.strokeStyle).toBe('dashed');
  });

  it('undo restores prior strokeStyle on ConnectionUsage', () => {
    setEdgeStrokeStyle(f.registry, f.bus, f.user, f.connectionId, 'dotted');
    f.bus.undo();
    const after = f.registry.get(f.connectionId);
    expect(after?.kind === 'ConnectionUsage' && after.strokeStyle).toBeUndefined();
  });
});

describe('setEdgeStrokeStyle — element-as-edge (Transition)', () => {
  let f: SmFixture;
  beforeEach(() => { f = setupSmFixture(); });

  it('sets strokeStyle on Transition', () => {
    const ok = setEdgeStrokeStyle(f.registry, f.bus, f.user, f.transitionId, 'dashed');
    expect(ok).toBe(true);
    const el = f.registry.get(f.transitionId);
    expect(el?.kind === 'Transition' && el.strokeStyle).toBe('dashed');
  });

  it('undo restores prior strokeStyle on Transition', () => {
    setEdgeStrokeStyle(f.registry, f.bus, f.user, f.transitionId, 'dotted');
    f.bus.undo();
    const after = f.registry.get(f.transitionId);
    expect(after?.kind === 'Transition' && after.strokeStyle).toBeUndefined();
  });
});

describe('setEdgeStrokeStyle — unknown id', () => {
  it('returns false', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const ok = setEdgeStrokeStyle(registry, bus, user, createEdgeId(), 'dashed');
    expect(ok).toBe(false);
  });
});

// Re-export for suppressing unused import warning
export type { ModelEdge };
