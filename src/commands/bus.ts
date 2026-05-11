import {
  createElementId,
  type EdgeKind,
  type EdgePatch,
  type ElementKind,
  type ElementPatch,
  type ElementRegistry,
  type ModelEdge,
} from '@/model';
import {
  can as defaultCan,
  NoopCollaborationProvider,
  type CollaborationProvider,
  type PermissionHook,
  type User,
} from '@/collab';
import type { DiagramPositionStore } from './diagramPositions';
import { PermissionDeniedError } from './errors';
import type {
  Command,
  CompoundCommand,
  UpdateDiagramPositionCommand,
  UpdateEdgeCommand,
  UpdateElementCommand,
} from './types';
import type { ModelEvent, Unsubscribe } from './events';

export interface CommandBus {
  dispatch(command: Command, actor: User): ModelEvent;
  undo(): ModelEvent | undefined;
  redo(): ModelEvent | undefined;
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
  // Seed the undo/redo stacks from a persisted history. Used by the workspace
  // bootstrap to rehydrate operation history across page reloads.
  readonly initialUndoStack?: readonly UndoEntry[];
  readonly initialRedoStack?: readonly UndoEntry[];
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
      case 'compound':
        for (const sub of command.commands) applyOnly(sub);
        return;
    }
  }

  return {
    dispatch(command, actor) {
      checkPermissions(actor, command);
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
