import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  ActionDefinitionElement,
  ActionUsageElement,
  ElementId,
  ValuePropertyElement,
} from '@/model';
import { createElementId } from '@/model';
import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { ACTIVITY_VIEWPOINT_ID } from '@/viewpoints';
import type { DiagramId } from '@/workspace/diagram';
import {
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';
import { childIdsOf } from '../helpers/registryReaders';

function parameterIdsOf(defId: ElementId): ElementId[] {
  return childIdsOf(useWorkspaceStore.getState().elements, defId, 'parameter');
}

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

function findAction(id: ElementId): ActionUsageElement | undefined {
  return useWorkspaceStore
    .getState()
    .elements.find((e): e is ActionUsageElement => e.id === id && e.kind === 'ActionUsage');
}

function ensureActivityDiagram(): DiagramId {
  // Activity viewpoint requires an `actionDefinition` context per ADR 0011 /
  // JOURNAL iter-531. These unit tests don't exercise the context-vs-element
  // resolution; a synthetic ActionDefinition id is sufficient.
  const id = useWorkspaceStore.getState().createDiagram(ACTIVITY_VIEWPOINT_ID, {
    name: 'Activity',
    context: { kind: 'actionDefinition', id: createElementId() },
  });
  if (!id) throw new Error('failed to create activity diagram');
  useWorkspaceStore.getState().setActiveDiagram(id);
  return id;
}

describe('workspace store — Activity actions', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('createActionUsage adds an ActionUsage with the given nodeType and position', async () => {
    await bootstrap();
    const diagramId = ensureActivityDiagram();
    const id = useWorkspaceStore
      .getState()
      .createActionUsage(diagramId, { x: 60, y: 80 }, 'action');
    expect(id).not.toBeNull();
    const action = findAction(id!);
    expect(action?.nodeType).toBe('action');
    expect(action?.name).toBe('Action1');
    const diagram = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.id === diagramId)!;
    expect(diagram.positions[id!]).toEqual({ x: 60, y: 80 });
  });

  it('createActionUsage gives initial and final nodes an empty default name', async () => {
    await bootstrap();
    const diagramId = ensureActivityDiagram();
    const initialId = useWorkspaceStore
      .getState()
      .createActionUsage(diagramId, { x: 0, y: 0 }, 'initial');
    const finalId = useWorkspaceStore
      .getState()
      .createActionUsage(diagramId, { x: 0, y: 200 }, 'final');
    expect(findAction(initialId!)?.name).toBe('');
    expect(findAction(finalId!)?.name).toBe('');
  });

  it('createActionUsage cascades default names — Action1, Action2, …', async () => {
    await bootstrap();
    const diagramId = ensureActivityDiagram();
    const a = useWorkspaceStore
      .getState()
      .createActionUsage(diagramId, { x: 0, y: 0 }, 'action');
    const b = useWorkspaceStore
      .getState()
      .createActionUsage(diagramId, { x: 0, y: 100 }, 'decision');
    const c = useWorkspaceStore
      .getState()
      .createActionUsage(diagramId, { x: 0, y: 200 }, 'fork');
    expect(findAction(a!)?.name).toBe('Action1');
    expect(findAction(b!)?.name).toBe('Action2');
    expect(findAction(c!)?.name).toBe('Action3');
  });

  it('createActionUsage is a single undo step (compound command)', async () => {
    await bootstrap();
    const diagramId = ensureActivityDiagram();
    const id = useWorkspaceStore
      .getState()
      .createActionUsage(diagramId, { x: 20, y: 40 }, 'action');
    expect(findAction(id!)).toBeDefined();
    useWorkspaceStore.getState().undo();
    expect(findAction(id!)).toBeUndefined();
    const diagram = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.id === diagramId)!;
    expect(Object.keys(diagram.positions)).not.toContain(id);
    // Redo should bring it back with position intact.
    useWorkspaceStore.getState().redo();
    const after = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.id === diagramId)!;
    expect(after.positions[id!]).toEqual({ x: 20, y: 40 });
    expect(findAction(id!)?.nodeType).toBe('action');
  });

  it('createActionUsage returns null when the diagram id is unknown', async () => {
    await bootstrap();
    const id = useWorkspaceStore
      .getState()
      .createActionUsage('nonexistent' as never, { x: 0, y: 0 }, 'action');
    expect(id).toBeNull();
  });

  it('setActionDefinition links a created ActionUsage to a registry ActionDefinition', async () => {
    await bootstrap();
    const diagramId = ensureActivityDiagram();
    const usageId = useWorkspaceStore
      .getState()
      .createActionUsage(diagramId, { x: 0, y: 0 }, 'action')!;

    // Seed an ActionDefinition directly via the bus — there is no UI-facing
    // creator in #88, but the store action must accept any registry-resolving
    // id of the correct kind.
    const registry = useWorkspaceStore.getState().registry!;
    const bus = useWorkspaceStore.getState().bus!;
    const user = useWorkspaceStore.getState().user!;
    const defId = createElementId();
    const definition: ActionDefinitionElement = {
      id: defId,
      kind: 'ActionDefinition',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'PrintLine',
    };
    bus.dispatch({ kind: 'create-element', element: definition }, user);
    expect(registry.get(defId)?.kind).toBe('ActionDefinition');

    useWorkspaceStore.getState().setActionDefinition(usageId, defId);
    expect(findAction(usageId)?.definitionId).toBe(defId);

    // Clearing via null removes the link.
    useWorkspaceStore.getState().setActionDefinition(usageId, null);
    expect(findAction(usageId)?.definitionId).toBeUndefined();
  });

  it('addActionDefinitionParameter / removeActionDefinitionParameter mutate the parameterIds list', async () => {
    await bootstrap();
    const bus = useWorkspaceStore.getState().bus!;
    const user = useWorkspaceStore.getState().user!;

    // Seed an ActionDefinition + two ValueProperty parameters.
    const defId = createElementId();
    const definition: ActionDefinitionElement = {
      id: defId,
      kind: 'ActionDefinition',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'Sum',
    };
    bus.dispatch({ kind: 'create-element', element: definition }, user);

    const pAId = createElementId();
    const pBId = createElementId();
    const valueA: ValuePropertyElement = {
      id: pAId,
      kind: 'ValueProperty',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'lhs',
      valueType: 'number',
    };
    const valueB: ValuePropertyElement = {
      id: pBId,
      kind: 'ValueProperty',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'rhs',
      valueType: 'number',
    };
    bus.dispatch({ kind: 'create-element', element: valueA }, user);
    bus.dispatch({ kind: 'create-element', element: valueB }, user);

    useWorkspaceStore.getState().addActionDefinitionParameter(defId, pAId);
    useWorkspaceStore.getState().addActionDefinitionParameter(defId, pBId);
    expect(parameterIdsOf(defId)).toEqual([pAId, pBId]);

    // Duplicate add is a no-op.
    useWorkspaceStore.getState().addActionDefinitionParameter(defId, pAId);
    expect(parameterIdsOf(defId)).toEqual([pAId, pBId]);

    useWorkspaceStore.getState().removeActionDefinitionParameter(defId, pAId);
    expect(parameterIdsOf(defId)).toEqual([pBId]);
  });
});
