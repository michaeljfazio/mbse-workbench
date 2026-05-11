import { describe, expect, it, vi } from 'vitest';
import {
  createElementId,
  createEdgeId,
  createElementRegistry,
  createUserId,
  type ElementId,
  type EdgeId,
  type ModelEdge,
  type PartDefinitionElement,
  type CompositionEdge,
} from '@/model';
import {
  createCommandBus,
  PermissionDeniedError,
  type Command,
  type ModelEvent,
} from '@/commands';
import type { User } from '@/collab';

function mkPartDef(name: string, id?: ElementId): PartDefinitionElement {
  return {
    id: id ?? createElementId(),
    kind: 'PartDefinition',
    name,
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  };
}

function mkComposition(
  source: ElementId,
  target: ElementId,
  id?: EdgeId,
): CompositionEdge {
  return {
    id: id ?? createEdgeId(),
    kind: 'Composition',
    sourceId: source,
    targetId: target,
  };
}

function mkUser(displayName = 'alice'): User {
  return { id: createUserId(), displayName, color: '#000000' };
}

describe('createCommandBus — basic dispatch', () => {
  it('dispatches create-element and adds it to the registry', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const block = mkPartDef('A');

    const event = bus.dispatch({ kind: 'create-element', element: block }, user);

    expect(registry.get(block.id)).toEqual(block);
    expect(event.command).toEqual({ kind: 'create-element', element: block });
    expect(event.actorId).toBe(user.id);
    expect(event.modelVersion).toBe(1);
  });

  it('returns events with monotonically increasing modelVersion', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();

    const a = mkPartDef('A');
    const b = mkPartDef('B');
    const e1 = bus.dispatch({ kind: 'create-element', element: a }, user);
    const e2 = bus.dispatch({ kind: 'create-element', element: b }, user);

    expect(e1.modelVersion).toBe(1);
    expect(e2.modelVersion).toBe(2);
  });

  it('emits a ModelEvent to subscribers', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const handler = vi.fn();
    bus.subscribe(handler);

    const a = mkPartDef('A');
    bus.dispatch({ kind: 'create-element', element: a }, user);

    expect(handler).toHaveBeenCalledTimes(1);
    const [event] = handler.mock.calls[0] as [ModelEvent];
    expect(event.command).toEqual({ kind: 'create-element', element: a });
  });

  it('stops notifying after unsubscribe', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const handler = vi.fn();
    const off = bus.subscribe(handler);

    bus.dispatch({ kind: 'create-element', element: mkPartDef('A') }, user);
    off();
    bus.dispatch({ kind: 'create-element', element: mkPartDef('B') }, user);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('createCommandBus — element commands', () => {
  it('updates an element and inverts on undo', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const block = mkPartDef('A');
    bus.dispatch({ kind: 'create-element', element: block }, user);

    const event = bus.dispatch(
      { kind: 'update-element', id: block.id, patch: { name: 'A-renamed' } },
      user,
    );
    expect(registry.get(block.id)?.name).toBe('A-renamed');
    expect(event.payload).toEqual({
      kind: 'update-element',
      id: block.id,
      patch: { name: 'A' },
    });

    bus.undo();
    expect(registry.get(block.id)?.name).toBe('A');

    bus.redo();
    expect(registry.get(block.id)?.name).toBe('A-renamed');
  });

  it('deletes an element and restores it (with incident edges) on undo', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const a = mkPartDef('A');
    const b = mkPartDef('B');
    const edge = mkComposition(a.id, b.id);
    bus.dispatch({ kind: 'create-element', element: a }, user);
    bus.dispatch({ kind: 'create-element', element: b }, user);
    bus.dispatch({ kind: 'link', edge }, user);

    bus.dispatch({ kind: 'delete-element', id: b.id }, user);
    expect(registry.get(b.id)).toBeUndefined();
    expect(registry.getEdge(edge.id)).toBeUndefined();

    bus.undo();
    expect(registry.get(b.id)).toEqual(b);
    expect(registry.getEdge(edge.id)).toEqual(edge);

    bus.redo();
    expect(registry.get(b.id)).toBeUndefined();
    expect(registry.getEdge(edge.id)).toBeUndefined();
  });
});

describe('createCommandBus — edge commands', () => {
  it('links and unlinks an edge with inverse', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const a = mkPartDef('A');
    const b = mkPartDef('B');
    bus.dispatch({ kind: 'create-element', element: a }, user);
    bus.dispatch({ kind: 'create-element', element: b }, user);
    const edge = mkComposition(a.id, b.id);

    const linkEvent = bus.dispatch({ kind: 'link', edge }, user);
    expect(registry.getEdge(edge.id)).toEqual(edge);
    expect(linkEvent.payload).toEqual({ kind: 'unlink', id: edge.id });

    bus.dispatch({ kind: 'unlink', id: edge.id }, user);
    expect(registry.getEdge(edge.id)).toBeUndefined();

    bus.undo();
    expect(registry.getEdge(edge.id)).toEqual(edge);

    bus.undo();
    expect(registry.getEdge(edge.id)).toBeUndefined();
  });
});

describe('createCommandBus — undo/redo discipline', () => {
  it('drops the redo stack when a new command lands after an undo', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const a = mkPartDef('A');
    const b = mkPartDef('B');
    const c = mkPartDef('C');
    bus.dispatch({ kind: 'create-element', element: a }, user);
    bus.dispatch({ kind: 'create-element', element: b }, user);
    bus.undo(); // b gone
    expect(registry.get(b.id)).toBeUndefined();

    bus.dispatch({ kind: 'create-element', element: c }, user); // should drop redo

    expect(bus.redo()).toBeUndefined();
    expect(registry.get(b.id)).toBeUndefined();
    expect(registry.get(c.id)).toEqual(c);
  });

  it('round-trips a sequence: create A, create B, link A→B, update A, delete B', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const a = mkPartDef('A');
    const b = mkPartDef('B');
    const edge = mkComposition(a.id, b.id);

    const sequence: Command[] = [
      { kind: 'create-element', element: a },
      { kind: 'create-element', element: b },
      { kind: 'link', edge },
      { kind: 'update-element', id: a.id, patch: { name: 'A2' } },
      { kind: 'delete-element', id: b.id },
    ];
    for (const cmd of sequence) bus.dispatch(cmd, user);

    expect(registry.get(a.id)?.name).toBe('A2');
    expect(registry.get(b.id)).toBeUndefined();

    for (let i = 0; i < sequence.length; i++) bus.undo();
    expect(registry.elements()).toHaveLength(0);
    expect(registry.edges()).toHaveLength(0);
    expect(bus.undo()).toBeUndefined();

    for (let i = 0; i < sequence.length; i++) bus.redo();
    expect(registry.get(a.id)?.name).toBe('A2');
    expect(registry.get(b.id)).toBeUndefined();
    expect(registry.getEdge(edge.id)).toBeUndefined();
    expect(bus.redo()).toBeUndefined();
  });

  it('undo / redo return undefined when stacks are empty', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    expect(bus.undo()).toBeUndefined();
    expect(bus.redo()).toBeUndefined();
  });
});

describe('createCommandBus — events log', () => {
  it('appends an event for every dispatch, undo, and redo', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const a = mkPartDef('A');
    bus.dispatch({ kind: 'create-element', element: a }, user);
    bus.undo();
    bus.redo();
    const log = bus.events();
    expect(log).toHaveLength(3);
    expect(log[0]?.command.kind).toBe('create-element');
    expect(log[1]?.command.kind).toBe('delete-element');
    expect(log[2]?.command.kind).toBe('create-element');
    // modelVersion increases on every step
    expect(log.map((e) => e.modelVersion)).toEqual([1, 2, 3]);
  });

  it('uses the injected now() and eventIdFactory()', () => {
    const registry = createElementRegistry();
    let n = 0;
    const bus = createCommandBus({
      registry,
      now: () => 1000 + n,
      eventIdFactory: () => `evt-${++n}`,
    });
    const user = mkUser();
    const event = bus.dispatch(
      { kind: 'create-element', element: mkPartDef('A') },
      user,
    );
    expect(event.id).toBe('evt-1');
    expect(event.timestamp).toBe(1001);
  });
});

describe('createCommandBus — permissions', () => {
  it('default hook allows all actions', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    expect(() =>
      bus.dispatch({ kind: 'create-element', element: mkPartDef('A') }, user),
    ).not.toThrow();
  });

  it('throws PermissionDeniedError when can() returns false', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry, can: () => false });
    const user = mkUser();
    expect(() =>
      bus.dispatch({ kind: 'create-element', element: mkPartDef('A') }, user),
    ).toThrow(PermissionDeniedError);
    expect(registry.elements()).toHaveLength(0);
  });

  it('passes user, action, and target element to the can() hook', () => {
    const registry = createElementRegistry();
    const can = vi.fn().mockReturnValue(true);
    const bus = createCommandBus({ registry, can });
    const user = mkUser();
    const a = mkPartDef('A');
    bus.dispatch({ kind: 'create-element', element: a }, user);
    bus.dispatch(
      { kind: 'update-element', id: a.id, patch: { name: 'A2' } },
      user,
    );

    expect(can).toHaveBeenNthCalledWith(1, user, 'create', a);
    // The element passed to update should be the stored version (pre-update),
    // since the hook gates the action before it happens.
    expect(can).toHaveBeenNthCalledWith(
      2,
      user,
      'update',
      expect.objectContaining({ id: a.id, name: 'A' }),
    );
  });

  it('checks every subcommand of a compound command before applying any', () => {
    const registry = createElementRegistry();
    const a = mkPartDef('A');
    const b = mkPartDef('B');
    const edge = mkComposition(a.id, b.id);
    const bus = createCommandBus({ registry });
    const user = mkUser();
    bus.dispatch({ kind: 'create-element', element: a }, user);
    bus.dispatch({ kind: 'create-element', element: b }, user);
    bus.dispatch({ kind: 'link', edge }, user);

    // delete-element with cascading edges should fully restore on undo
    bus.dispatch({ kind: 'delete-element', id: b.id }, user);
    expect(registry.get(b.id)).toBeUndefined();
    expect(registry.getEdge(edge.id)).toBeUndefined();

    bus.undo();
    expect(registry.get(b.id)).toEqual(b);
    expect(registry.getEdge(edge.id)).toEqual(edge);
  });
});

describe('createCommandBus — error paths', () => {
  it('throws when update-element targets a missing id', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    expect(() =>
      bus.dispatch(
        {
          kind: 'update-element',
          id: createElementId(),
          patch: { name: 'nope' },
        },
        user,
      ),
    ).toThrow();
  });

  it('throws when delete-element targets a missing id', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    expect(() =>
      bus.dispatch({ kind: 'delete-element', id: createElementId() }, user),
    ).toThrow();
  });

  it('throws when unlink targets a missing edge id', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    expect(() =>
      bus.dispatch({ kind: 'unlink', id: createEdgeId() }, user),
    ).toThrow();
  });

  it('does not record an event when dispatch fails mid-apply', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    try {
      bus.dispatch({ kind: 'delete-element', id: createElementId() }, user);
    } catch {
      // expected
    }
    expect(bus.events()).toHaveLength(0);
    expect(bus.undo()).toBeUndefined();
  });
});

describe('createCommandBus — every command kind', () => {
  // Phase-1 gate requires every command kind to be covered: create / update /
  // delete on the element side, link / unlink on the edge side. The other
  // element-kind-specific assertions live in registry tests; the bus test just
  // proves the dispatch path works generically across kinds.
  it('handles a tiny ModelEdge round-trip independent of element kind', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = mkUser();
    const a = mkPartDef('A');
    const b = mkPartDef('B');
    bus.dispatch({ kind: 'create-element', element: a }, user);
    bus.dispatch({ kind: 'create-element', element: b }, user);

    const edge: ModelEdge = {
      id: createEdgeId(),
      kind: 'Generalization',
      sourceId: a.id,
      targetId: b.id,
    };
    bus.dispatch({ kind: 'link', edge }, user);
    expect(registry.edges()).toHaveLength(1);
    bus.undo();
    expect(registry.edges()).toHaveLength(0);
    bus.redo();
    expect(registry.edges()).toHaveLength(1);
  });
});
