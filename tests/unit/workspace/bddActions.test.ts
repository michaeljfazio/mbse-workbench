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

  it('deleting then undoing restores the prior position (delete does not clear the position entry)', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock({ x: 333, y: 222 })!;
    const active = getActiveDiagram(useWorkspaceStore.getState())!;
    expect(active.positions[a]).toEqual({ x: 333, y: 222 });

    useWorkspaceStore.getState().deleteElement(a);
    useWorkspaceStore.getState().undo();
    const restored = getActiveDiagram(useWorkspaceStore.getState())!;
    expect(restored.positions[a]).toEqual({ x: 333, y: 222 });
  });

  it('createBlock is one undo step: model version increments once, and undo clears both element and position', async () => {
    await bootstrap();
    const versionBefore = useWorkspaceStore.getState().modelVersion;
    const id = useWorkspaceStore.getState().createBlock({ x: 90, y: 110 })!;
    expect(useWorkspaceStore.getState().modelVersion).toBe(versionBefore + 1);
    const active = getActiveDiagram(useWorkspaceStore.getState())!;
    expect(active.positions[id]).toEqual({ x: 90, y: 110 });

    useWorkspaceStore.getState().undo();
    const afterUndo = getActiveDiagram(useWorkspaceStore.getState())!;
    expect(useWorkspaceStore.getState().elements.find((e) => e.id === id)).toBeUndefined();
    expect(afterUndo.positions[id]).toBeUndefined();

    useWorkspaceStore.getState().redo();
    const afterRedo = getActiveDiagram(useWorkspaceStore.getState())!;
    expect(useWorkspaceStore.getState().elements.find((e) => e.id === id)).toBeDefined();
    expect(afterRedo.positions[id]).toEqual({ x: 90, y: 110 });
  });

  it('deleteSelection removes every selected element and clears the selection', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().setSelection([a, b]);
    useWorkspaceStore.getState().deleteSelection();
    // Only the project's root Package should remain after deleting both blocks.
    expect(useWorkspaceStore.getState().elements.filter((e) => e.id === a || e.id === b)).toHaveLength(0);
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

  it('setNodePosition dispatches a command and undo restores the prior position', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock({ x: 50, y: 60 })!;
    const active = getActiveDiagram(useWorkspaceStore.getState())!;

    useWorkspaceStore
      .getState()
      .setNodePosition(active.id, id, { x: 240, y: 180 });
    expect(
      getActiveDiagram(useWorkspaceStore.getState())!.positions[id],
    ).toEqual({ x: 240, y: 180 });

    useWorkspaceStore.getState().undo();
    expect(
      getActiveDiagram(useWorkspaceStore.getState())!.positions[id],
    ).toEqual({ x: 50, y: 60 });

    useWorkspaceStore.getState().redo();
    expect(
      getActiveDiagram(useWorkspaceStore.getState())!.positions[id],
    ).toEqual({ x: 240, y: 180 });
  });

  it('setNodePosition is a no-op when the position is unchanged', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock({ x: 50, y: 60 })!;
    const active = getActiveDiagram(useWorkspaceStore.getState())!;
    const versionBefore = useWorkspaceStore.getState().modelVersion;
    useWorkspaceStore
      .getState()
      .setNodePosition(active.id, id, { x: 50, y: 60 });
    expect(useWorkspaceStore.getState().modelVersion).toBe(versionBefore);
  });

  it('runAutoLayout dispatches a compound command and undo reverts every position', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 })!;
    const b = useWorkspaceStore.getState().createBlock({ x: 10, y: 10 })!;
    const c = useWorkspaceStore.getState().createBlock({ x: 20, y: 20 })!;
    useWorkspaceStore.getState().linkBlocks(a, b, 'Composition');
    useWorkspaceStore.getState().linkBlocks(a, c, 'Composition');

    const active = getActiveDiagram(useWorkspaceStore.getState())!;
    const versionBeforeLayout = useWorkspaceStore.getState().modelVersion;

    useWorkspaceStore.getState().runAutoLayout(active.id);

    const afterLayout = getActiveDiagram(useWorkspaceStore.getState())!;
    const newA = afterLayout.positions[a];
    const newB = afterLayout.positions[b];
    const newC = afterLayout.positions[c];
    expect(newA).toBeDefined();
    expect(newB).toBeDefined();
    expect(newC).toBeDefined();
    // Parent A above its children B and C under default TB rankdir.
    expect(newA!.y).toBeLessThan(newB!.y);
    expect(newA!.y).toBeLessThan(newC!.y);
    // One compound dispatch = exactly one model-version bump.
    expect(useWorkspaceStore.getState().modelVersion).toBe(versionBeforeLayout + 1);

    useWorkspaceStore.getState().undo();
    const afterUndo = getActiveDiagram(useWorkspaceStore.getState())!;
    expect(afterUndo.positions[a]).toEqual({ x: 0, y: 0 });
    expect(afterUndo.positions[b]).toEqual({ x: 10, y: 10 });
    expect(afterUndo.positions[c]).toEqual({ x: 20, y: 20 });
  });

  it('runAutoLayout on an empty diagram is a no-op', async () => {
    await bootstrap();
    const active = getActiveDiagram(useWorkspaceStore.getState())!;
    const versionBefore = useWorkspaceStore.getState().modelVersion;
    useWorkspaceStore.getState().runAutoLayout(active.id);
    expect(useWorkspaceStore.getState().modelVersion).toBe(versionBefore);
  });

  it('persists positions through the repository on refresh', async () => {
    const { storage, repository, user } = await bootstrap();
    const a = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 })!;
    const active = getActiveDiagram(useWorkspaceStore.getState())!;
    useWorkspaceStore.getState().setNodePosition(active.id, a, { x: 333, y: 222 });

    // Wait for the autosave triggered by setNodePosition to flush.
    await new Promise((r) => setTimeout(r, 5));

    resetWorkspaceStoreForTests();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const reopened = getActiveDiagram(useWorkspaceStore.getState());
    // The reopened diagram is the persisted one (same id), and the position
    // survives the round-trip through the repository.
    expect(reopened?.id).toBe(active.id);
    expect(reopened?.positions[a]).toEqual({ x: 333, y: 222 });
  });

  it('undo restores the prior model version; redo replays it', async () => {
    await bootstrap();
    const versionBefore = useWorkspaceStore.getState().modelVersion;
    const baselineCount = useWorkspaceStore.getState().elements.length;
    useWorkspaceStore.getState().createBlock();
    const versionAfterCreate = useWorkspaceStore.getState().modelVersion;
    expect(versionAfterCreate).toBeGreaterThan(versionBefore);

    useWorkspaceStore.getState().undo();
    expect(useWorkspaceStore.getState().elements).toHaveLength(baselineCount);

    useWorkspaceStore.getState().redo();
    expect(useWorkspaceStore.getState().elements).toHaveLength(baselineCount + 1);
  });
});
