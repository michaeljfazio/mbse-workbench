import {
  createElementId,
  type EdgeKind,
  type EdgePatch,
  type ElementId,
  type ElementKind,
  type ElementPatch,
  type ElementRegistry,
  type ModelEdge,
  type ModelElement,
} from '@/model';
import {
  can as defaultCan,
  NoopCollaborationProvider,
  type CollaborationProvider,
  type PermissionHook,
  type User,
} from '@/collab';
import type { DiagramPositionStore } from './diagramPositions';
import type { DiagramStore } from './diagramStore';
import { LibraryViolationError, PermissionDeniedError } from './errors';
import type {
  Command,
  CommandKind,
  CompoundCommand,
  UpdateDiagramPositionCommand,
  UpdateEdgeCommand,
  UpdateElementCommand,
} from './types';
import type { ModelEvent, Unsubscribe } from './events';

/**
 * Command kinds that mutate the element registry or edge graph and are
 * therefore subject to the `isReadOnly` pre-apply guard. See ADR 0012.
 *
 * Adding a new mutating command kind without adding it here will fail
 * `src/commands/__tests__/destructiveCoverage.test.ts`, which asserts
 * every `CommandKind` is partitioned into either this set or
 * `EXEMPT_COMMAND_KINDS`.
 */
export const DESTRUCTIVE_COMMAND_KINDS = [
  'create-element',
  'update-element',
  'delete-element',
  'link',
  'unlink',
  'update-edge',
] as const satisfies readonly CommandKind[];

/**
 * Command kinds NOT subject to the library guard.
 * - `update-diagram-position` is pure presentation.
 * - `create-diagram` / `delete-diagram` mutate the diagrams slice, not the
 *   element registry; diagrams may show library elements without modifying
 *   them, so the library guard does not apply (see #413).
 * - `compound` is a gateway; its subcommands are guarded individually.
 */
export const EXEMPT_COMMAND_KINDS = [
  'update-diagram-position',
  'create-diagram',
  'delete-diagram',
  'compound',
] as const satisfies readonly CommandKind[];

export type DestructiveCommandKind = (typeof DESTRUCTIVE_COMMAND_KINDS)[number];

export interface CommandBus {
  dispatch(command: Command, actor: User): ModelEvent;
  undo(): ModelEvent | undefined;
  redo(): ModelEvent | undefined;
  canUndo(): boolean;
  canRedo(): boolean;
  subscribe(handler: (event: ModelEvent) => void): Unsubscribe;
  events(): readonly ModelEvent[];
  version(): number;
  getHistory(): CommandHistory;
}

export interface CreateCommandBusOptions {
  readonly registry: ElementRegistry;
  readonly can?: PermissionHook;
  readonly provider?: CollaborationProvider;
  readonly now?: () => number;
  readonly eventIdFactory?: () => string;
  // Required only for `update-diagram-position` commands. Bus throws if such
  // a command is dispatched without a positions store wired in.
  readonly positions?: DiagramPositionStore;
  // Required only for `create-diagram` / `delete-diagram` commands. Bus
  // throws if such a command is dispatched without a diagram store wired
  // in. See #413.
  readonly diagrams?: DiagramStore;
  // Seed the undo/redo stacks from a persisted history. Used by the workspace
  // bootstrap to rehydrate operation history across page reloads.
  readonly initialUndoStack?: readonly UndoEntry[];
  readonly initialRedoStack?: readonly UndoEntry[];
  /**
   * Invoked when a dispatched command is rejected by a synchronous guard
   * (`LibraryViolationError`, `PermissionDeniedError`). The error is also
   * re-thrown to the caller; this hook is the surface the workspace uses
   * to convert rejections into a UI banner without wrapping all 60+ store
   * dispatch sites in try/catch. See ADR 0012.
   */
  readonly onError?: (error: Error, command: Command) => void;
}

export interface UndoEntry {
  readonly actor: User;
  readonly forward: Command;
  readonly inverse: Command;
}

export interface CommandHistory {
  readonly undo: readonly UndoEntry[];
  readonly redo: readonly UndoEntry[];
}

export function createCommandBus(options: CreateCommandBusOptions): CommandBus {
  const registry = options.registry;
  const can = options.can ?? defaultCan;
  const provider = options.provider ?? new NoopCollaborationProvider();
  const now = options.now ?? (() => Date.now());
  const eventIdFactory = options.eventIdFactory ?? (() => createElementId());
  const positions = options.positions;
  const diagrams = options.diagrams;
  const onError = options.onError;

  /**
   * Walk from `element` up the `ownerId` chain. Returns the id of the
   * first `PackageElement` whose `isReadOnly` is `true`, or `undefined`
   * if no ancestor (or the element itself) is a read-only Package.
   * O(depth). Skipping `element === undefined` makes this safe to call
   * on commands whose target is being newly created (e.g. `link` whose
   * endpoint is freshly added in the same compound — the guard then
   * uses the to-be-added element's owner).
   */
  function readOnlyAncestorId(element: ModelElement | undefined): ElementId | undefined {
    let current = element;
    while (current) {
      if (current.kind === 'Package' && current.isReadOnly === true) {
        return current.id;
      }
      if (current.ownerId === null) break;
      current = registry.get(current.ownerId);
    }
    return undefined;
  }

  /**
   * Same walk, but starting from an element id rather than a ModelElement.
   * Returns `undefined` if the id is not in the registry — this matches
   * the existing "missing target" error path in `applyAndInvert`, which
   * surfaces a separate Error after the guard short-circuits as a pass.
   */
  function readOnlyAncestorOfId(id: ElementId): ElementId | undefined {
    return readOnlyAncestorId(registry.get(id));
  }

  function checkLibraryGuard(command: Command): void {
    switch (command.kind) {
      case 'create-element': {
        // Newly created elements aren't in the registry yet; walk from the
        // declared owner instead. Root (ownerId === null) is never guarded.
        if (command.element.ownerId === null) return;
        const blocker = readOnlyAncestorOfId(command.element.ownerId);
        if (blocker !== undefined) {
          throw new LibraryViolationError(command, blocker);
        }
        return;
      }
      case 'update-element': {
        const blocker = readOnlyAncestorOfId(command.id);
        if (blocker !== undefined) {
          throw new LibraryViolationError(command, blocker);
        }
        return;
      }
      case 'delete-element': {
        const blocker = readOnlyAncestorOfId(command.id);
        if (blocker !== undefined) {
          throw new LibraryViolationError(command, blocker);
        }
        return;
      }
      case 'link': {
        // An edge is destructive against both endpoints; either being in a
        // read-only subtree rejects the link.
        const sourceBlocker = readOnlyAncestorOfId(command.edge.sourceId);
        if (sourceBlocker !== undefined) {
          throw new LibraryViolationError(command, sourceBlocker);
        }
        const targetBlocker = readOnlyAncestorOfId(command.edge.targetId);
        if (targetBlocker !== undefined) {
          throw new LibraryViolationError(command, targetBlocker);
        }
        return;
      }
      case 'unlink': {
        const edge = registry.getEdge(command.id);
        if (!edge) return;
        const sourceBlocker = readOnlyAncestorOfId(edge.sourceId);
        if (sourceBlocker !== undefined) {
          throw new LibraryViolationError(command, sourceBlocker);
        }
        const targetBlocker = readOnlyAncestorOfId(edge.targetId);
        if (targetBlocker !== undefined) {
          throw new LibraryViolationError(command, targetBlocker);
        }
        return;
      }
      case 'update-edge': {
        const edge = registry.getEdge(command.id);
        if (!edge) return;
        const sourceBlocker = readOnlyAncestorOfId(edge.sourceId);
        if (sourceBlocker !== undefined) {
          throw new LibraryViolationError(command, sourceBlocker);
        }
        const targetBlocker = readOnlyAncestorOfId(edge.targetId);
        if (targetBlocker !== undefined) {
          throw new LibraryViolationError(command, targetBlocker);
        }
        return;
      }
      case 'update-diagram-position':
        // Presentation, not model. Exempt by definition (ADR 0012).
        return;
      case 'create-diagram':
      case 'delete-diagram':
        // Diagram lifecycle mutates the diagrams slice, not the element
        // registry. Diagrams may reference library elements without
        // modifying them; the read-only guard does not apply (see #413).
        return;
      case 'compound':
        for (const sub of command.commands) checkLibraryGuard(sub);
        return;
    }
  }

  const eventLog: ModelEvent[] = [];
  const undoStack: UndoEntry[] = options.initialUndoStack
    ? options.initialUndoStack.slice()
    : [];
  const redoStack: UndoEntry[] = options.initialRedoStack
    ? options.initialRedoStack.slice()
    : [];
  const subscribers = new Set<(event: ModelEvent) => void>();
  let modelVersion = 0;

  function notify(event: ModelEvent): void {
    for (const handler of subscribers) handler(event);
  }

  function recordEvent(actor: User, command: Command, payload: Command): ModelEvent {
    modelVersion += 1;
    const event: ModelEvent = {
      id: eventIdFactory(),
      timestamp: now(),
      actorId: actor.id,
      command,
      payload,
      modelVersion,
    };
    eventLog.push(event);
    notify(event);
    provider.publish(event);
    return event;
  }

  function checkPermissions(actor: User, command: Command): void {
    switch (command.kind) {
      case 'create-element':
        if (!can(actor, 'create', command.element)) {
          throw new PermissionDeniedError('create', command.element);
        }
        return;
      case 'update-element': {
        const target = registry.get(command.id);
        if (!can(actor, 'update', target)) {
          throw new PermissionDeniedError('update', target);
        }
        return;
      }
      case 'delete-element': {
        const target = registry.get(command.id);
        if (!can(actor, 'delete', target)) {
          throw new PermissionDeniedError('delete', target);
        }
        return;
      }
      case 'link':
        if (!can(actor, 'link', command.edge)) {
          throw new PermissionDeniedError('link', command.edge);
        }
        return;
      case 'unlink': {
        const target = registry.getEdge(command.id);
        if (!can(actor, 'unlink', target)) {
          throw new PermissionDeniedError('unlink', target);
        }
        return;
      }
      case 'update-edge': {
        const target = registry.getEdge(command.id);
        if (!can(actor, 'update', target)) {
          throw new PermissionDeniedError('update', target);
        }
        return;
      }
      case 'update-diagram-position':
        // Position changes are presentation, not model: not permission-gated.
        return;
      case 'create-diagram':
      case 'delete-diagram':
        // Diagram lifecycle is a project-level structural change. Today's
        // permission model is "any actor may dispatch"; if/when we add
        // per-diagram ownership we can route through `can(actor, 'edit-project')`
        // here. Mirrors `update-diagram-position`'s exemption — see #413.
        return;
      case 'compound':
        for (const sub of command.commands) checkPermissions(actor, sub);
        return;
    }
  }

  function applyAndInvert(command: Command): Command {
    switch (command.kind) {
      case 'create-element': {
        registry.add(command.element);
        return { kind: 'delete-element', id: command.element.id };
      }
      case 'update-element': {
        const existing = registry.get(command.id);
        if (!existing) {
          throw new Error(`update target not found: ${command.id}`);
        }
        const previousValues: Record<string, unknown> = {};
        const source = existing as unknown as Record<string, unknown>;
        for (const key of Object.keys(command.patch)) {
          previousValues[key] = source[key];
        }
        registry.update(command.id, command.patch);
        const inverse: UpdateElementCommand<ElementKind> = {
          kind: 'update-element',
          id: command.id,
          patch: previousValues as ElementPatch<ElementKind>,
        };
        return inverse;
      }
      case 'delete-element': {
        const existing = registry.get(command.id);
        if (!existing) {
          throw new Error(`delete target not found: ${command.id}`);
        }
        const incident: ModelEdge[] = registry
          .edges()
          .filter(
            (edge) =>
              edge.sourceId === command.id || edge.targetId === command.id,
          );
        registry.remove(command.id);
        const restore: Command[] = [
          { kind: 'create-element', element: existing },
          ...incident.map<Command>((edge) => ({ kind: 'link', edge })),
        ];
        const inverse: CompoundCommand = {
          kind: 'compound',
          commands: restore,
        };
        return inverse;
      }
      case 'link': {
        registry.addEdge(command.edge);
        return { kind: 'unlink', id: command.edge.id };
      }
      case 'unlink': {
        const existing = registry.getEdge(command.id);
        if (!existing) {
          throw new Error(`unlink target not found: ${command.id}`);
        }
        registry.removeEdge(command.id);
        return { kind: 'link', edge: existing };
      }
      case 'update-edge': {
        const existing = registry.getEdge(command.id);
        if (!existing) {
          throw new Error(`update-edge target not found: ${command.id}`);
        }
        const previousValues: Record<string, unknown> = {};
        const source = existing as unknown as Record<string, unknown>;
        for (const key of Object.keys(command.patch)) {
          previousValues[key] = source[key];
        }
        registry.updateEdge(command.id, command.patch);
        const inverse: UpdateEdgeCommand<EdgeKind> = {
          kind: 'update-edge',
          id: command.id,
          patch: previousValues as EdgePatch<EdgeKind>,
        };
        return inverse;
      }
      case 'update-diagram-position': {
        if (!positions) {
          throw new Error(
            'update-diagram-position dispatched without a DiagramPositionStore wired into the bus',
          );
        }
        const prev = positions.getPosition(command.diagramId, command.elementId);
        positions.setPosition(
          command.diagramId,
          command.elementId,
          command.position,
        );
        const inverse: UpdateDiagramPositionCommand = {
          kind: 'update-diagram-position',
          diagramId: command.diagramId,
          elementId: command.elementId,
          position: prev,
        };
        return inverse;
      }
      case 'create-diagram': {
        if (!diagrams) {
          throw new Error(
            'create-diagram dispatched without a DiagramStore wired into the bus',
          );
        }
        diagrams.addDiagram(command.diagram);
        return { kind: 'delete-diagram', id: command.diagram.id };
      }
      case 'delete-diagram': {
        if (!diagrams) {
          throw new Error(
            'delete-diagram dispatched without a DiagramStore wired into the bus',
          );
        }
        const existing = diagrams.getDiagram(command.id);
        if (!existing) {
          throw new Error(`delete-diagram target not found: ${command.id}`);
        }
        // Clear the active-tab pointer if it referenced the diagram about to
        // be removed. The workspace store's DiagramStore implementation
        // handles tab/secondary-pane reconciliation; the bus only needs to
        // make the call. See #413.
        diagrams.clearActiveDiagramIfMatches(command.id);
        diagrams.removeDiagram(command.id);
        return { kind: 'create-diagram', diagram: existing };
      }
      case 'compound': {
        const inverses: Command[] = [];
        for (const sub of command.commands) {
          inverses.push(applyAndInvert(sub));
        }
        const inverse: CompoundCommand = {
          kind: 'compound',
          commands: inverses.reverse(),
        };
        return inverse;
      }
    }
  }

  function applyOnly(command: Command): void {
    switch (command.kind) {
      case 'create-element':
        registry.add(command.element);
        return;
      case 'update-element':
        registry.update(command.id, command.patch);
        return;
      case 'delete-element':
        registry.remove(command.id);
        return;
      case 'link':
        registry.addEdge(command.edge);
        return;
      case 'unlink':
        registry.removeEdge(command.id);
        return;
      case 'update-edge':
        registry.updateEdge(command.id, command.patch);
        return;
      case 'update-diagram-position':
        if (!positions) {
          throw new Error(
            'update-diagram-position replay without a DiagramPositionStore wired into the bus',
          );
        }
        positions.setPosition(
          command.diagramId,
          command.elementId,
          command.position,
        );
        return;
      case 'create-diagram':
        if (!diagrams) {
          throw new Error(
            'create-diagram replay without a DiagramStore wired into the bus',
          );
        }
        diagrams.addDiagram(command.diagram);
        return;
      case 'delete-diagram':
        if (!diagrams) {
          throw new Error(
            'delete-diagram replay without a DiagramStore wired into the bus',
          );
        }
        diagrams.clearActiveDiagramIfMatches(command.id);
        diagrams.removeDiagram(command.id);
        return;
      case 'compound':
        for (const sub of command.commands) applyOnly(sub);
        return;
    }
  }

  return {
    dispatch(command, actor) {
      try {
        checkPermissions(actor, command);
        checkLibraryGuard(command);
      } catch (err) {
        if (
          onError &&
          (err instanceof LibraryViolationError ||
            err instanceof PermissionDeniedError)
        ) {
          onError(err, command);
        }
        throw err;
      }
      const inverse = applyAndInvert(command);
      undoStack.push({ actor, forward: command, inverse });
      redoStack.length = 0;
      return recordEvent(actor, command, inverse);
    },

    undo() {
      const entry = undoStack.pop();
      if (!entry) return undefined;
      applyOnly(entry.inverse);
      redoStack.push(entry);
      return recordEvent(entry.actor, entry.inverse, entry.forward);
    },

    redo() {
      const entry = redoStack.pop();
      if (!entry) return undefined;
      applyOnly(entry.forward);
      undoStack.push(entry);
      return recordEvent(entry.actor, entry.forward, entry.inverse);
    },

    canUndo() {
      return undoStack.length > 0;
    },

    canRedo() {
      return redoStack.length > 0;
    },

    subscribe(handler) {
      subscribers.add(handler);
      return () => {
        subscribers.delete(handler);
      };
    },

    events() {
      return eventLog;
    },

    version() {
      return modelVersion;
    },

    getHistory() {
      return { undo: undoStack.slice(), redo: redoStack.slice() };
    },
  };
}
