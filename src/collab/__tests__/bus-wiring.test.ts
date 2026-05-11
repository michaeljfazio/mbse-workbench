import { describe, expect, it } from 'vitest';
import {
  createElementId,
  createElementRegistry,
  type ElementId,
  type PartDefinitionElement,
} from '@/model';
import {
  createCommandBus,
  PermissionDeniedError,
  type ModelEvent,
} from '@/commands';
import { createSessionUser } from '../user';
import { NoopCollaborationProvider, type CollaborationProvider } from '../provider';
import type { PermissionHook } from '../permissions';

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

class RecordingProvider implements CollaborationProvider {
  readonly published: ModelEvent[] = [];
  publish(event: ModelEvent): void {
    this.published.push(event);
  }
  subscribe(): () => void {
    return () => {};
  }
}

describe('command bus → CollaborationProvider wiring', () => {
  it('publishes a ModelEvent to the provider after a successful dispatch', () => {
    const registry = createElementRegistry();
    const provider = new RecordingProvider();
    const bus = createCommandBus({ registry, provider });
    const user = createSessionUser();
    const block = mkPartDef('A');

    const event = bus.dispatch({ kind: 'create-element', element: block }, user);

    expect(provider.published).toHaveLength(1);
    expect(provider.published[0]).toBe(event);
  });

  it('publishes an event for undo and redo as well', () => {
    const registry = createElementRegistry();
    const provider = new RecordingProvider();
    const bus = createCommandBus({ registry, provider });
    const user = createSessionUser();
    const block = mkPartDef('A');

    bus.dispatch({ kind: 'create-element', element: block }, user);
    bus.undo();
    bus.redo();

    expect(provider.published).toHaveLength(3);
    expect(provider.published.map((e) => e.modelVersion)).toEqual([1, 2, 3]);
  });

  it('does NOT publish when permission is denied (publish is post-apply only)', () => {
    const registry = createElementRegistry();
    const provider = new RecordingProvider();
    const deny: PermissionHook = () => false;
    const bus = createCommandBus({ registry, provider, can: deny });
    const user = createSessionUser();
    const block = mkPartDef('A');

    expect(() =>
      bus.dispatch({ kind: 'create-element', element: block }, user),
    ).toThrow(PermissionDeniedError);
    expect(provider.published).toEqual([]);
  });

  it('defaults to NoopCollaborationProvider when no provider is supplied (no throw)', () => {
    const registry = createElementRegistry();
    const bus = createCommandBus({ registry });
    const user = createSessionUser();
    const block = mkPartDef('A');

    expect(() =>
      bus.dispatch({ kind: 'create-element', element: block }, user),
    ).not.toThrow();
  });

  it('NoopCollaborationProvider plugged in does not break the bus', () => {
    const registry = createElementRegistry();
    const provider = new NoopCollaborationProvider();
    const bus = createCommandBus({ registry, provider });
    const user = createSessionUser();
    const block = mkPartDef('A');
    expect(() =>
      bus.dispatch({ kind: 'create-element', element: block }, user),
    ).not.toThrow();
  });
});
