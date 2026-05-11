import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import {
  getActiveDiagram,
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

describe('workspace store — BDD actions', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('createBlock adds a PartDefinition element, names it, and stores a position on the active diagram', async () => {
    await bootstrap();
    const before = useWorkspaceStore.getState().elements.length;
    const id = useWorkspaceStore.getState().createBlock({ x: 100, y: 100 });
    expect(id).not.toBeNull();
    const s = useWorkspaceStore.getState();
    expect(s.elements.length).toBe(before + 1);
    const block = s.elements.find((e) => e.id === id);
    expect(block?.kind).toBe('PartDefinition');
    expect(block?.name).toBe('Block 1');
    const active = getActiveDiagram(s)!;
    expect(active.positions[id!]).toEqual({ x: 100, y: 100 });
  });

  it('createBlock assigns cascading names and positions when called multiple times', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock();
    const b = useWorkspaceStore.getState().createBlock();
    const c = useWorkspaceStore.getState().createBlock();
    const s = useWorkspaceStore.getState();
    expect(s.elements.find((e) => e.id === a)?.name).toBe('Block 1');
    expect(s.elements.find((e) => e.id === b)?.name).toBe('Block 2');
    expect(s.elements.find((e) => e.id === c)?.name).toBe('Block 3');
    const active = getActiveDiagram(s)!;
    expect(Object.keys(active.positions).length).toBe(3);
  });

  it('linkBlocks creates a Composition edge between two distinct blocks', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    const edgeId = useWorkspaceStore.getState().linkBlocks(a, b, 'Composition');
    expect(edgeId).not.toBeNull();
    const edge = useWorkspaceStore.getState().edges.find((e) => e.id === edgeId);
    expect(edge?.kind).toBe('Composition');
    expect(edge?.sourceId).toBe(a);
    expect(edge?.targetId).toBe(b);
  });

  it('linkBlocks creates a Generalization edge between two distinct blocks', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    const edgeId = useWorkspaceStore
      .getState()
      .linkBlocks(a, b, 'Generalization');
    const edge = useWorkspaceStore.getState().edges.find((e) => e.id === edgeId);
    expect(edge?.kind).toBe('Generalization');
  });

  it('linkBlocks refuses a self-loop', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const edgeId = useWorkspaceStore.getState().linkBlocks(a, a, 'Composition');
    expect(edgeId).toBeNull();
    expect(useWorkspaceStore.getState().edges).toHaveLength(0);
  });

  it('deleteElement removes the element and its incident edges, and undo restores both', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().linkBlocks(a, b, 'Composition');
    expect(useWorkspaceStore.getState().edges).toHaveLength(1);

    useWorkspaceStore.getState().deleteElement(a);
    expect(useWorkspaceStore.getState().elements.find((e) => e.id === a)).toBeUndefined();
    expect(useWorkspaceStore.getState().edges).toHaveLength(0);

    useWorkspaceStore.getState().undo();
    expect(useWorkspaceStore.getState().elements.find((e) => e.id === a)).toBeDefined();
    expect(useWorkspaceStore.getState().edges).toHaveLength(1);
  });

  it('deleteSelection removes every selected element and clears the selection', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().setSelection([a, b]);
    useWorkspaceStore.getState().deleteSelection();
    expect(useWorkspaceStore.getState().elements).toHaveLength(0);
    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([]);
  });

  it('unlinkEdge removes the edge through the command bus', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    const edgeId = useWorkspaceStore
      .getState()
      .linkBlocks(a, b, 'Composition')!;
    useWorkspaceStore.getState().unlinkEdge(edgeId);
    expect(useWorkspaceStore.getState().edges).toHaveLength(0);
  });

  it('setNodePosition updates only the targeted diagram', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 })!;
    const active = getActiveDiagram(useWorkspaceStore.getState())!;
    useWorkspaceStore
      .getState()
      .setNodePosition(active.id, id, { x: 240, y: 180 });
    const updated = getActiveDiagram(useWorkspaceStore.getState())!;
    expect(updated.positions[id]).toEqual({ x: 240, y: 180 });
  });

  it('undo restores the prior model version; redo replays it', async () => {
    await bootstrap();
    const versionBefore = useWorkspaceStore.getState().modelVersion;
    useWorkspaceStore.getState().createBlock();
    const versionAfterCreate = useWorkspaceStore.getState().modelVersion;
    expect(versionAfterCreate).toBeGreaterThan(versionBefore);

    useWorkspaceStore.getState().undo();
    expect(useWorkspaceStore.getState().elements).toHaveLength(0);

    useWorkspaceStore.getState().redo();
    expect(useWorkspaceStore.getState().elements).toHaveLength(1);
  });
});
