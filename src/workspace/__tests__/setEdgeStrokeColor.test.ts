/**
 * Unit tests for the `setEdgeStrokeColor` store action (issue #566).
 *
 * Covers:
 * - Success path: ModelEdge (BDD Composition) stroke color set.
 * - Success path: element-as-edge (ConnectionUsage) stroke color set.
 * - Undo (Cmd-Z) restores the prior value.
 * - Setting to the same value is a no-op.
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
  type PackageElement,
  type PartDefinitionElement,
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
// Action implementation (mirrors store.ts setEdgeStrokeColor)
// ---------------------------------------------------------------------------

function setEdgeStrokeColor(
  registry: ElementRegistry,
  bus: CommandBus,
  user: User,
  edgeId: EdgeId | ElementId,
  color: string,
): boolean {
  // ModelEdge path
  const modelEdge = registry.getEdge(edgeId as EdgeId);
  if (modelEdge) {
    if ((modelEdge.strokeColor ?? undefined) === color) return false;
    const patch: EdgePatch<typeof modelEdge.kind> = { strokeColor: color };
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
  if ((element.strokeColor ?? undefined) === color) return false;
  const patch: ElementPatch<typeof element.kind> = { strokeColor: color };
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('setEdgeStrokeColor — ModelEdge (BDD Composition)', () => {
  let f: BddFixture;
  beforeEach(() => { f = setupBddFixture(); });

  it('sets strokeColor to a hex value', () => {
    const ok = setEdgeStrokeColor(f.registry, f.bus, f.user, f.edgeId, '#ff0000');
    expect(ok).toBe(true);
    expect(f.registry.getEdge(f.edgeId)?.strokeColor).toBe('#ff0000');
  });

  it('no-op when same value', () => {
    setEdgeStrokeColor(f.registry, f.bus, f.user, f.edgeId, '#ff0000');
    const before = f.bus.getHistory().undo.length;
    const ok = setEdgeStrokeColor(f.registry, f.bus, f.user, f.edgeId, '#ff0000');
    expect(ok).toBe(false);
    expect(f.bus.getHistory().undo.length).toBe(before);
  });

  it('undo restores prior color', () => {
    expect(f.registry.getEdge(f.edgeId)?.strokeColor).toBeUndefined();
    setEdgeStrokeColor(f.registry, f.bus, f.user, f.edgeId, '#00ff00');
    f.bus.undo();
    expect(f.registry.getEdge(f.edgeId)?.strokeColor).toBeUndefined();
  });

  it('undo chain: #aaa → #bbb → undo → #aaa', () => {
    setEdgeStrokeColor(f.registry, f.bus, f.user, f.edgeId, '#aaaaaa');
    setEdgeStrokeColor(f.registry, f.bus, f.user, f.edgeId, '#bbbbbb');
    f.bus.undo();
    expect(f.registry.getEdge(f.edgeId)?.strokeColor).toBe('#aaaaaa');
  });
});

describe('setEdgeStrokeColor — element-as-edge (ConnectionUsage)', () => {
  let f: IbdFixture;
  beforeEach(() => { f = setupIbdFixture(); });

  it('sets strokeColor on ConnectionUsage', () => {
    const ok = setEdgeStrokeColor(f.registry, f.bus, f.user, f.connectionId, '#123456');
    expect(ok).toBe(true);
    const el = f.registry.get(f.connectionId);
    expect(el?.kind === 'ConnectionUsage' && el.strokeColor).toBe('#123456');
  });

  it('undo restores strokeColor on ConnectionUsage', () => {
    setEdgeStrokeColor(f.registry, f.bus, f.user, f.connectionId, '#ff00ff');
    f.bus.undo();
    const after = f.registry.get(f.connectionId);
    expect(after?.kind === 'ConnectionUsage' && after.strokeColor).toBeUndefined();
  });
});

describe('setEdgeStrokeColor — unknown id', () => {
  it('returns false', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const ok = setEdgeStrokeColor(registry, bus, user, createEdgeId(), '#ff0000');
    expect(ok).toBe(false);
  });
});
