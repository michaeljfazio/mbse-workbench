import {
  createElementId,
  type ElementKind,
  type ElementPatch,
  type ElementRegistry,
  type ModelEdge,
} from '@/model';
import { allowAll, type PermissionHook, type User } from '@/collab';
import { PermissionDeniedError } from './errors';
import type { Command, CompoundCommand, UpdateElementCommand } from './types';
import type { ModelEvent, Unsubscribe } from './events';

export interface CommandBus {
  dispatch(command: Command, actor: User): ModelEvent;
  undo(): ModelEvent | undefined;
  redo(): ModelEvent | undefined;
  subscribe(handler: (event: ModelEvent) => void): Unsubscribe;
  events(): readonly ModelEvent[];
  version(): number;
}

export interface CreateCommandBusOptions {
  readonly registry: ElementRegistry;
  readonly can?: PermissionHook;
  readonly now?: () => number;
  readonly eventIdFactory?: () => string;
}

interface UndoEntry {
  readonly actor: User;
  readonly forward: Command;
  readonly inverse: Command;
}

export function createCommandBus(options: CreateCommandBusOptions): CommandBus {
  const registry = options.registry;
  const can = options.can ?? allowAll;
  const now = options.now ?? (() => Date.now());
  const eventIdFactory = options.eventIdFactory ?? (() => createElementId());

  const eventLog: ModelEvent[] = [];
  const undoStack: UndoEntry[] = [];
  const redoStack: UndoEntry[] = [];
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
  };
}
