import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ActorElement, ElementId, UseCaseElement } from '@/model';
import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { USE_CASE_VIEWPOINT_ID } from '@/viewpoints';
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
}

function findActor(id: ElementId): ActorElement | undefined {
  return useWorkspaceStore
    .getState()
    .elements.find((e): e is ActorElement => e.id === id && e.kind === 'Actor');
}

function findUseCase(id: ElementId): UseCaseElement | undefined {
  return useWorkspaceStore
    .getState()
    .elements.find(
      (e): e is UseCaseElement => e.id === id && e.kind === 'UseCase',
    );
}

function ensureUseCaseDiagram(): DiagramId {
  const id = useWorkspaceStore
    .getState()
    .createDiagram(USE_CASE_VIEWPOINT_ID, { name: 'Use Cases' });
  if (!id) throw new Error('failed to create use case diagram');
  useWorkspaceStore.getState().setActiveDiagram(id);
  return id;
}

describe('workspace store — Use Case actions', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('createActor adds an Actor with cascading default Actor1, Actor2, …', async () => {
    await bootstrap();
    const diagramId = ensureUseCaseDiagram();
    const a = useWorkspaceStore
      .getState()
      .createActor(diagramId, { x: 10, y: 20 });
    const b = useWorkspaceStore
      .getState()
      .createActor(diagramId, { x: 30, y: 40 });
    const c = useWorkspaceStore
      .getState()
      .createActor(diagramId, { x: 50, y: 60 });
    expect(findActor(a!)?.name).toBe('Actor1');
    expect(findActor(b!)?.name).toBe('Actor2');
    expect(findActor(c!)?.name).toBe('Actor3');
    const diagram = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.id === diagramId)!;
    expect(diagram.positions[a!]).toEqual({ x: 10, y: 20 });
  });

  it('createUseCase adds a UseCase with cascading default UC1, UC2, …', async () => {
    await bootstrap();
    const diagramId = ensureUseCaseDiagram();
    const a = useWorkspaceStore
      .getState()
      .createUseCase(diagramId, { x: 0, y: 0 });
    const b = useWorkspaceStore
      .getState()
      .createUseCase(diagramId, { x: 0, y: 100 });
    expect(findUseCase(a!)?.name).toBe('UC1');
    expect(findUseCase(b!)?.name).toBe('UC2');
  });

  it('createActor fills gaps in the Actor1..N sequence', async () => {
    await bootstrap();
    const diagramId = ensureUseCaseDiagram();
    const a = useWorkspaceStore
      .getState()
      .createActor(diagramId, { x: 0, y: 0 });
    const b = useWorkspaceStore
      .getState()
      .createActor(diagramId, { x: 0, y: 100 });
    const c = useWorkspaceStore
      .getState()
      .createActor(diagramId, { x: 0, y: 200 });
    expect(findActor(a!)?.name).toBe('Actor1');
    expect(findActor(b!)?.name).toBe('Actor2');
    expect(findActor(c!)?.name).toBe('Actor3');
    useWorkspaceStore.getState().deleteElement(b!);
    const d = useWorkspaceStore
      .getState()
      .createActor(diagramId, { x: 0, y: 300 });
    // Actor2 freed up — next default should reuse it.
    expect(findActor(d!)?.name).toBe('Actor2');
  });

  it('createUseCase respects an explicit name option', async () => {
    await bootstrap();
    const diagramId = ensureUseCaseDiagram();
    const id = useWorkspaceStore
      .getState()
      .createUseCase(diagramId, { x: 0, y: 0 }, { name: 'Start Engine' });
    expect(findUseCase(id!)?.name).toBe('Start Engine');
  });

  it('createActor compound undo reverts both element and position in one step', async () => {
    await bootstrap();
    const diagramId = ensureUseCaseDiagram();
    const id = useWorkspaceStore
      .getState()
      .createActor(diagramId, { x: 11, y: 22 });
    expect(findActor(id!)).toBeDefined();
    useWorkspaceStore.getState().undo();
    expect(findActor(id!)).toBeUndefined();
    const diagram = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.id === diagramId)!;
    expect(diagram.positions[id!]).toBeUndefined();
  });

  it('setUseCaseText updates the text field; empty string clears it', async () => {
    await bootstrap();
    const diagramId = ensureUseCaseDiagram();
    const id = useWorkspaceStore
      .getState()
      .createUseCase(diagramId, { x: 0, y: 0 });
    useWorkspaceStore.getState().setUseCaseText(id!, 'Driver starts the car');
    expect(findUseCase(id!)?.text).toBe('Driver starts the car');
    useWorkspaceStore.getState().setUseCaseText(id!, '');
    expect(findUseCase(id!)?.text).toBeUndefined();
  });
});
