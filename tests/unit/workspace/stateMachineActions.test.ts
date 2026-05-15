import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createElementId, type ElementId, type StateUsageElement } from '@/model';
import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { STATE_MACHINE_VIEWPOINT_ID } from '@/viewpoints';
import type { DiagramId } from '@/workspace/diagram';
import {
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';

function makeMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

async function bootstrap() {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
  return { storage, repository, user };
}

function findState(id: ElementId): StateUsageElement | undefined {
  return useWorkspaceStore
    .getState()
    .elements.find(
      (e): e is StateUsageElement => e.id === id && e.kind === 'StateUsage',
    );
}

function ensureStateMachineDiagram(): DiagramId {
  // State Machine viewpoint requires a `stateDefinition` context per ADR 0011 /
  // JOURNAL iter-531. Synthetic id suffices for unit tests.
  const id = useWorkspaceStore.getState().createDiagram(STATE_MACHINE_VIEWPOINT_ID, {
    name: 'State Machine',
    context: { kind: 'stateDefinition', id: createElementId() },
  });
  if (!id) throw new Error('failed to create state machine diagram');
  useWorkspaceStore.getState().setActiveDiagram(id);
  return id;
}

describe('workspace store — State Machine actions', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('createStateUsage adds a StateUsage with the given stateType and position', async () => {
    await bootstrap();
    const diagramId = ensureStateMachineDiagram();
    const id = useWorkspaceStore
      .getState()
      .createStateUsage(diagramId, { x: 60, y: 80 }, 'state');
    expect(id).not.toBeNull();
    const state = findState(id!);
    expect(state?.stateType).toBe('state');
    expect(state?.name).toBe('State1');
    const diagram = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.id === diagramId)!;
    expect(diagram.positions[id!]).toEqual({ x: 60, y: 80 });
  });

  it('createStateUsage gives initial and final pseudostates an empty default name', async () => {
    await bootstrap();
    const diagramId = ensureStateMachineDiagram();
    const initialId = useWorkspaceStore
      .getState()
      .createStateUsage(diagramId, { x: 0, y: 0 }, 'initial');
    const finalId = useWorkspaceStore
      .getState()
      .createStateUsage(diagramId, { x: 0, y: 200 }, 'final');
    expect(findState(initialId!)?.name).toBe('');
    expect(findState(finalId!)?.name).toBe('');
  });

  it('createStateUsage cascades default names — State1, State2, … for back-to-back state drops', async () => {
    await bootstrap();
    const diagramId = ensureStateMachineDiagram();
    const a = useWorkspaceStore
      .getState()
      .createStateUsage(diagramId, { x: 0, y: 0 }, 'state');
    const b = useWorkspaceStore
      .getState()
      .createStateUsage(diagramId, { x: 0, y: 100 }, 'state');
    const c = useWorkspaceStore
      .getState()
      .createStateUsage(diagramId, { x: 0, y: 200 }, 'state');
    expect(findState(a!)?.name).toBe('State1');
    expect(findState(b!)?.name).toBe('State2');
    expect(findState(c!)?.name).toBe('State3');
  });

  it('createStateUsage is a single undo step (compound command)', async () => {
    await bootstrap();
    const diagramId = ensureStateMachineDiagram();
    const id = useWorkspaceStore
      .getState()
      .createStateUsage(diagramId, { x: 20, y: 40 }, 'state');
    expect(findState(id!)).toBeDefined();
    useWorkspaceStore.getState().undo();
    expect(findState(id!)).toBeUndefined();
    useWorkspaceStore.getState().redo();
    const after = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.id === diagramId)!;
    expect(after.positions[id!]).toEqual({ x: 20, y: 40 });
    expect(findState(id!)?.stateType).toBe('state');
  });

  it('createStateUsage returns null when the diagram id is unknown', async () => {
    await bootstrap();
    const id = useWorkspaceStore
      .getState()
      .createStateUsage('nonexistent' as never, { x: 0, y: 0 }, 'state');
    expect(id).toBeNull();
  });

  it('setStateEntryAction / setStateExitAction / setStateDoAction set the corresponding optional fields', async () => {
    await bootstrap();
    const diagramId = ensureStateMachineDiagram();
    const id = useWorkspaceStore
      .getState()
      .createStateUsage(diagramId, { x: 0, y: 0 }, 'state')!;
    useWorkspaceStore.getState().setStateEntryAction(id, 'turnOn()');
    useWorkspaceStore.getState().setStateExitAction(id, 'turnOff()');
    useWorkspaceStore.getState().setStateDoAction(id, 'monitor()');
    expect(findState(id)?.entryAction).toBe('turnOn()');
    expect(findState(id)?.exitAction).toBe('turnOff()');
    expect(findState(id)?.doAction).toBe('monitor()');
  });

  it('setStateEntryAction clears the field when given an empty string', async () => {
    await bootstrap();
    const diagramId = ensureStateMachineDiagram();
    const id = useWorkspaceStore
      .getState()
      .createStateUsage(diagramId, { x: 0, y: 0 }, 'state')!;
    useWorkspaceStore.getState().setStateEntryAction(id, 'turnOn()');
    expect(findState(id)?.entryAction).toBe('turnOn()');
    useWorkspaceStore.getState().setStateEntryAction(id, '');
    expect(findState(id)?.entryAction).toBeUndefined();
  });

  it('setStateEntryAction undo restores the previous value', async () => {
    await bootstrap();
    const diagramId = ensureStateMachineDiagram();
    const id = useWorkspaceStore
      .getState()
      .createStateUsage(diagramId, { x: 0, y: 0 }, 'state')!;
    useWorkspaceStore.getState().setStateEntryAction(id, 'first');
    useWorkspaceStore.getState().setStateEntryAction(id, 'second');
    useWorkspaceStore.getState().undo();
    expect(findState(id)?.entryAction).toBe('first');
    useWorkspaceStore.getState().undo();
    expect(findState(id)?.entryAction).toBeUndefined();
  });

  it('setStateEntryAction is a no-op on non-StateUsage elements', async () => {
    await bootstrap();
    const before = useWorkspaceStore.getState().elements.length;
    useWorkspaceStore
      .getState()
      .setStateEntryAction('nonexistent' as never, 'turnOn()');
    const after = useWorkspaceStore.getState().elements.length;
    expect(after).toBe(before);
  });
});
