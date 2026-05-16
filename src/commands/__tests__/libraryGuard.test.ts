import { describe, expect, it, vi } from 'vitest';
import {
  createElementId,
  createEdgeId,
  createElementRegistry,
  createUserId,
  type ElementId,
  type EdgeId,
  type ElementRegistry,
  type PackageElement,
  type PartDefinitionElement,
  type CompositionEdge,
} from '@/model';
import {
  createCommandBus,
  createInMemoryDiagramPositionStore,
  LibraryViolationError,
  type Command,
} from '@/commands';
import type { User } from '@/collab';
import { createDiagramId } from '@/workspace/diagram';

function mkPackage(opts: {
  name: string;
  id?: ElementId;
  ownerId?: ElementId | null;
  ownerIndex?: number;
  isReadOnly?: boolean;
}): PackageElement {
  return {
    id: opts.id ?? createElementId(),
    kind: 'Package',
    name: opts.name,
    ownerId: opts.ownerId ?? null,
    ownerRole: 'member',
    ownerIndex: opts.ownerIndex ?? 0,
    ...(opts.isReadOnly !== undefined ? { isReadOnly: opts.isReadOnly } : {}),
  };
}

function mkPartDef(opts: {
  name: string;
  id?: ElementId;
  ownerId?: ElementId | null;
  ownerIndex?: number;
}): PartDefinitionElement {
  return {
    id: opts.id ?? createElementId(),
    kind: 'PartDefinition',
    name: opts.name,
    isAbstract: false,
    ownerId: opts.ownerId ?? null,
    ownerRole: 'member',
    ownerIndex: opts.ownerIndex ?? 0,
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

function mkUser(): User {
  return { id: createUserId(), displayName: 'alice', color: '#000000' };
}

/**
 * Build a registry containing a read-only Package and one PartDefinition
 * child element. Returns ids needed for assertions.
 */
function buildReadOnlyFixture(): {
  registry: ElementRegistry;
  libRoot: PackageElement;
  child: PartDefinitionElement;
} {
  const registry = createElementRegistry();
  const libRoot = mkPackage({ name: 'KerML', isReadOnly: true });
  const child = mkPartDef({
    name: 'AnythingDef',
    ownerId: libRoot.id,
    ownerIndex: 0,
  });
  registry.add(libRoot);
  registry.add(child);
  return { registry, libRoot, child };
}

describe('command bus — library read-only guard', () => {
  describe('create-element', () => {
    it('rejects creating an element whose owner is in a read-only subtree', () => {
      const { registry, libRoot } = buildReadOnlyFixture();
      const bus = createCommandBus({ registry });
      const before = registry.elements().length;
      const newChild = mkPartDef({
        name: 'illegal',
        ownerId: libRoot.id,
        ownerIndex: 1,
      });

      expect(() =>
        bus.dispatch({ kind: 'create-element', element: newChild }, mkUser()),
      ).toThrow(LibraryViolationError);

      expect(registry.elements()).toHaveLength(before);
      expect(registry.get(newChild.id)).toBeUndefined();
    });

    it('permits creating an element under a non-read-only Package', () => {
      const registry = createElementRegistry();
      const ownerPkg = mkPackage({ name: 'user-pkg' });
      registry.add(ownerPkg);
      const bus = createCommandBus({ registry });
      const newChild = mkPartDef({
        name: 'ok',
        ownerId: ownerPkg.id,
        ownerIndex: 0,
      });

      expect(() =>
        bus.dispatch({ kind: 'create-element', element: newChild }, mkUser()),
      ).not.toThrow();
      expect(registry.get(newChild.id)).toEqual(newChild);
    });

    it('permits creating a top-level element (ownerId === null)', () => {
      const registry = createElementRegistry();
      const bus = createCommandBus({ registry });
      const elem = mkPackage({ name: 'top' });

      expect(() =>
        bus.dispatch({ kind: 'create-element', element: elem }, mkUser()),
      ).not.toThrow();
    });
  });

  describe('update-element', () => {
    it('rejects updating an element inside a read-only Package', () => {
      const { registry, child } = buildReadOnlyFixture();
      const bus = createCommandBus({ registry });
      const snapshot = registry.get(child.id);

      expect(() =>
        bus.dispatch(
          { kind: 'update-element', id: child.id, patch: { name: 'renamed' } },
          mkUser(),
        ),
      ).toThrow(LibraryViolationError);

      expect(registry.get(child.id)).toEqual(snapshot);
    });

    it('rejects updating the read-only Package itself', () => {
      const { registry, libRoot } = buildReadOnlyFixture();
      const bus = createCommandBus({ registry });

      expect(() =>
        bus.dispatch(
          {
            kind: 'update-element',
            id: libRoot.id,
            patch: { name: 'renamed' },
          },
          mkUser(),
        ),
      ).toThrow(LibraryViolationError);
    });
  });

  describe('delete-element', () => {
    it('rejects deleting an element inside a read-only Package', () => {
      const { registry, child } = buildReadOnlyFixture();
      const bus = createCommandBus({ registry });
      const before = registry.elements().length;

      expect(() =>
        bus.dispatch({ kind: 'delete-element', id: child.id }, mkUser()),
      ).toThrow(LibraryViolationError);

      expect(registry.get(child.id)).toBeDefined();
      expect(registry.elements()).toHaveLength(before);
    });
  });

  describe('link / unlink / update-edge', () => {
    it('rejects linking when source endpoint is in a read-only subtree', () => {
      const { registry, child } = buildReadOnlyFixture();
      const userPkg = mkPackage({ name: 'user' });
      registry.add(userPkg);
      const other = mkPartDef({ name: 'other', ownerId: userPkg.id });
      registry.add(other);

      const bus = createCommandBus({ registry });
      const edge = mkComposition(child.id, other.id);

      expect(() =>
        bus.dispatch({ kind: 'link', edge }, mkUser()),
      ).toThrow(LibraryViolationError);
      expect(registry.getEdge(edge.id)).toBeUndefined();
    });

    it('rejects linking when target endpoint is in a read-only subtree', () => {
      const { registry, child } = buildReadOnlyFixture();
      const userPkg = mkPackage({ name: 'user' });
      registry.add(userPkg);
      const other = mkPartDef({ name: 'other', ownerId: userPkg.id });
      registry.add(other);

      const bus = createCommandBus({ registry });
      const edge = mkComposition(other.id, child.id);

      expect(() =>
        bus.dispatch({ kind: 'link', edge }, mkUser()),
      ).toThrow(LibraryViolationError);
    });

    it('rejects unlinking an edge whose endpoint is in a read-only subtree', () => {
      const registry = createElementRegistry();
      const userPkg = mkPackage({ name: 'user' });
      registry.add(userPkg);
      const userPart = mkPartDef({ name: 'p', ownerId: userPkg.id });
      registry.add(userPart);

      // Seed an edge while the package is mutable, then make it read-only.
      const libPart = mkPartDef({ name: 'lib-part' });
      registry.add(libPart);
      const edge = mkComposition(userPart.id, libPart.id);
      registry.addEdge(edge);

      // Now make libPart's owner read-only (simulating loaded library state).
      const libPkg = mkPackage({ name: 'lib', isReadOnly: true });
      registry.add(libPkg);
      registry.update(libPart.id, { ownerId: libPkg.id });

      const bus = createCommandBus({ registry });

      expect(() =>
        bus.dispatch({ kind: 'unlink', id: edge.id }, mkUser()),
      ).toThrow(LibraryViolationError);
      expect(registry.getEdge(edge.id)).toBeDefined();
    });

    it('rejects update-edge against an edge in a read-only subtree', () => {
      const registry = createElementRegistry();
      const libPkg = mkPackage({ name: 'lib', isReadOnly: true });
      registry.add(libPkg);
      const a = mkPartDef({ name: 'a', ownerId: libPkg.id, ownerIndex: 0 });
      const b = mkPartDef({ name: 'b', ownerId: libPkg.id, ownerIndex: 1 });
      registry.add(a);
      registry.add(b);
      const edge = mkComposition(a.id, b.id);
      registry.addEdge(edge);

      const bus = createCommandBus({ registry });

      expect(() =>
        bus.dispatch(
          { kind: 'update-edge', id: edge.id, patch: { label: 'x' } },
          mkUser(),
        ),
      ).toThrow(LibraryViolationError);
    });
  });

  describe('exempt commands', () => {
    it('does NOT reject update-diagram-position even against a read-only element', () => {
      const { registry, child } = buildReadOnlyFixture();
      const positions = createInMemoryDiagramPositionStore();
      const bus = createCommandBus({ registry, positions });
      const diagramId = createDiagramId();

      expect(() =>
        bus.dispatch(
          {
            kind: 'update-diagram-position',
            diagramId,
            elementId: child.id,
            position: { x: 10, y: 10 },
          },
          mkUser(),
        ),
      ).not.toThrow();
    });
  });

  describe('ancestor bubbling', () => {
    it('rejects when a 3-levels-up ancestor Package is read-only', () => {
      const registry = createElementRegistry();
      const root = mkPackage({ name: 'lib', isReadOnly: true });
      const mid1 = mkPackage({
        name: 'sub1',
        ownerId: root.id,
        ownerIndex: 0,
      });
      const mid2 = mkPackage({
        name: 'sub2',
        ownerId: mid1.id,
        ownerIndex: 0,
      });
      const leaf = mkPartDef({
        name: 'leaf',
        ownerId: mid2.id,
        ownerIndex: 0,
      });
      registry.add(root);
      registry.add(mid1);
      registry.add(mid2);
      registry.add(leaf);

      const bus = createCommandBus({ registry });

      let caught: unknown;
      try {
        bus.dispatch(
          { kind: 'update-element', id: leaf.id, patch: { name: 'x' } },
          mkUser(),
        );
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(LibraryViolationError);
      expect((caught as LibraryViolationError).elementId).toBe(root.id);
    });

    it('walks past a non-read-only Package ancestor to find a read-only one above', () => {
      const registry = createElementRegistry();
      const root = mkPackage({ name: 'lib', isReadOnly: true });
      const mid = mkPackage({
        name: 'mid',
        ownerId: root.id,
        ownerIndex: 0,
        isReadOnly: false,
      });
      const leaf = mkPartDef({
        name: 'leaf',
        ownerId: mid.id,
        ownerIndex: 0,
      });
      registry.add(root);
      registry.add(mid);
      registry.add(leaf);

      const bus = createCommandBus({ registry });

      expect(() =>
        bus.dispatch(
          { kind: 'update-element', id: leaf.id, patch: { name: 'x' } },
          mkUser(),
        ),
      ).toThrow(LibraryViolationError);
    });
  });

  describe('compound commands', () => {
    it('rejects a compound when any subcommand violates the guard, and applies nothing', () => {
      const { registry, child } = buildReadOnlyFixture();
      const userPkg = mkPackage({ name: 'user' });
      registry.add(userPkg);
      const okElement = mkPartDef({
        name: 'ok',
        ownerId: userPkg.id,
        ownerIndex: 0,
      });

      const bus = createCommandBus({ registry });
      const elementsBefore = registry.elements().length;

      const compound: Command = {
        kind: 'compound',
        commands: [
          { kind: 'create-element', element: okElement },
          {
            kind: 'update-element',
            id: child.id,
            patch: { name: 'illegal' },
          },
        ],
      };

      expect(() => bus.dispatch(compound, mkUser())).toThrow(
        LibraryViolationError,
      );

      // Neither subcommand applied — the guard runs across the whole compound
      // before any apply (atomicity).
      expect(registry.elements()).toHaveLength(elementsBefore);
      expect(registry.get(okElement.id)).toBeUndefined();
      expect(registry.get(child.id)?.name).toBe(child.name);
    });
  });

  describe('undo-stack integrity', () => {
    it('does NOT push an inverse onto the undo stack when the guard rejects', () => {
      const { registry, child } = buildReadOnlyFixture();
      const bus = createCommandBus({ registry });

      expect(bus.canUndo()).toBe(false);
      expect(() =>
        bus.dispatch(
          { kind: 'update-element', id: child.id, patch: { name: 'x' } },
          mkUser(),
        ),
      ).toThrow(LibraryViolationError);

      expect(bus.canUndo()).toBe(false);
      expect(bus.getHistory().undo).toHaveLength(0);
    });

    it('does NOT emit a ModelEvent when the guard rejects', () => {
      const { registry, child } = buildReadOnlyFixture();
      const bus = createCommandBus({ registry });
      const handler = vi.fn();
      bus.subscribe(handler);

      expect(() =>
        bus.dispatch(
          { kind: 'update-element', id: child.id, patch: { name: 'x' } },
          mkUser(),
        ),
      ).toThrow(LibraryViolationError);

      expect(handler).not.toHaveBeenCalled();
      expect(bus.events()).toHaveLength(0);
    });
  });

  describe('onError hook', () => {
    it('invokes onError with the error and the command, then re-throws', () => {
      const { registry, child } = buildReadOnlyFixture();
      const onError = vi.fn();
      const bus = createCommandBus({ registry, onError });

      const cmd: Command = {
        kind: 'update-element',
        id: child.id,
        patch: { name: 'x' },
      };
      expect(() => bus.dispatch(cmd, mkUser())).toThrow(LibraryViolationError);

      expect(onError).toHaveBeenCalledTimes(1);
      const [err, captured] = onError.mock.calls[0] as [Error, Command];
      expect(err).toBeInstanceOf(LibraryViolationError);
      expect(captured).toEqual(cmd);
    });

    it('is NOT invoked on successful dispatch', () => {
      const registry = createElementRegistry();
      const onError = vi.fn();
      const bus = createCommandBus({ registry, onError });
      const elem = mkPackage({ name: 'top' });

      bus.dispatch({ kind: 'create-element', element: elem }, mkUser());
      expect(onError).not.toHaveBeenCalled();
    });
  });
});
