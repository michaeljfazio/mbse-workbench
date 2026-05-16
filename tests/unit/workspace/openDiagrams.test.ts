import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { BDD_VIEWPOINT_ID } from '@/viewpoints';
import {
  LAYOUT_STORAGE_KEY,
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';
import type { DiagramId } from '@/workspace';

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

async function bootstrappedStore(storage: Storage = makeMemoryStorage()) {
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
  return { storage, state: () => useWorkspaceStore.getState() };
}

describe('openDiagram / closeDiagramTab', () => {
  beforeEach(() => {
    resetWorkspaceStoreForTests();
  });

  afterEach(() => {
    resetWorkspaceStoreForTests();
  });

  it('bootstraps with the seed diagram open and active', async () => {
    const { state } = await bootstrappedStore();
    const s = state();
    expect(s.diagrams.length).toBeGreaterThan(0);
    const firstId = s.diagrams[0]!.id;
    expect(s.activeDiagramId).toBe(firstId);
    expect(s.openDiagramIds).toEqual([firstId]);
  });

  it('openDiagram appends each new diagram once and activates it', async () => {
    const { state } = await bootstrappedStore();
    const first = state().diagrams[0]!.id;
    const second = state().createDiagram(BDD_VIEWPOINT_ID);
    const third = state().createDiagram(BDD_VIEWPOINT_ID);
    if (!second || !third) throw new Error('createDiagram returned null');

    state().openDiagram(second);
    state().openDiagram(third);
    // Calling again with an already-open id is a no-op for the open set
    // but still activates.
    state().openDiagram(first);

    const s = state();
    expect(s.openDiagramIds).toEqual([first, second, third]);
    expect(s.activeDiagramId).toBe(first);
  });

  it('openDiagram is a no-op for an unknown diagram id', async () => {
    const { state } = await bootstrappedStore();
    const before = state();
    state().openDiagram('does-not-exist' as DiagramId);
    const after = state();
    expect(after.activeDiagramId).toBe(before.activeDiagramId);
    expect(after.openDiagramIds).toEqual(before.openDiagramIds);
  });

  it('closeDiagramTab removes from open set without deleting the diagram', async () => {
    const { state } = await bootstrappedStore();
    const first = state().diagrams[0]!.id;
    const second = state().createDiagram(BDD_VIEWPOINT_ID)!;
    state().openDiagram(second);

    expect(state().openDiagramIds).toEqual([first, second]);

    state().closeDiagramTab(second);
    const s = state();
    expect(s.openDiagramIds).toEqual([first]);
    expect(s.diagrams.some((d) => d.id === second)).toBe(true);
  });

  it('closing the active tab activates the next remaining open tab', async () => {
    const { state } = await bootstrappedStore();
    const first = state().diagrams[0]!.id;
    const second = state().createDiagram(BDD_VIEWPOINT_ID)!;
    const third = state().createDiagram(BDD_VIEWPOINT_ID)!;
    state().openDiagram(second);
    state().openDiagram(third);

    // Now active is `third`. Closing it should fall back to `first` (the
    // first surviving open id in insertion order).
    expect(state().activeDiagramId).toBe(third);
    state().closeDiagramTab(third);

    const s = state();
    expect(s.openDiagramIds).toEqual([first, second]);
    expect(s.activeDiagramId).toBe(first);
  });

  it('closing the last open tab leaves activeDiagramId null', async () => {
    const { state } = await bootstrappedStore();
    const first = state().diagrams[0]!.id;
    state().closeDiagramTab(first);

    const s = state();
    expect(s.openDiagramIds).toEqual([]);
    expect(s.activeDiagramId).toBeNull();
    // Diagram itself remains in the project.
    expect(s.diagrams.some((d) => d.id === first)).toBe(true);
  });

  it('closeDiagramTab is a no-op for an id not in the open set', async () => {
    const { state } = await bootstrappedStore();
    const second = state().createDiagram(BDD_VIEWPOINT_ID)!;
    // `second` exists in `diagrams` but was never opened.
    const before = state();
    state().closeDiagramTab(second);
    const after = state();
    expect(after.openDiagramIds).toEqual(before.openDiagramIds);
    expect(after.activeDiagramId).toBe(before.activeDiagramId);
  });

  it('setActiveDiagram of an unopened diagram opens its tab as a side effect', async () => {
    const { state } = await bootstrappedStore();
    const first = state().diagrams[0]!.id;
    const second = state().createDiagram(BDD_VIEWPOINT_ID)!;
    // `second` was created but not opened; setActiveDiagram should still
    // succeed and pull it into the open set.
    state().setActiveDiagram(second);
    const s = state();
    expect(s.openDiagramIds).toEqual([first, second]);
    expect(s.activeDiagramId).toBe(second);
  });

  it('deleteDiagram strips the id from the open set', async () => {
    const { state } = await bootstrappedStore();
    const first = state().diagrams[0]!.id;
    const second = state().createDiagram(BDD_VIEWPOINT_ID)!;
    state().openDiagram(second);
    expect(state().openDiagramIds).toEqual([first, second]);

    state().deleteDiagram(second);
    const s = state();
    expect(s.openDiagramIds).toEqual([first]);
    expect(s.activeDiagramId).toBe(first);
  });

  it('persists openDiagramIds in the layout snapshot across bootstraps', async () => {
    const storage = makeMemoryStorage();
    const { state } = await bootstrappedStore(storage);
    const first = state().diagrams[0]!.id;
    const second = state().createDiagram(BDD_VIEWPOINT_ID)!;
    state().openDiagram(second);

    // Round-trip: tear down, re-bootstrap against the same storage.
    resetWorkspaceStoreForTests();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore
      .getState()
      .bootstrap({ repository, user, storage });

    const restored = useWorkspaceStore.getState();
    // Persisted open set is preserved; active falls back to the first
    // diagram in the project, which is still in the persisted set.
    expect(restored.openDiagramIds).toEqual([first, second]);
    expect(restored.activeDiagramId).toBe(first);
  });

  it('closed tabs do not reappear after reload (closeDiagramTab persists)', async () => {
    const storage = makeMemoryStorage();
    const { state } = await bootstrappedStore(storage);
    const first = state().diagrams[0]!.id;
    const second = state().createDiagram(BDD_VIEWPOINT_ID)!;
    state().openDiagram(second);
    state().closeDiagramTab(second);

    resetWorkspaceStoreForTests();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore
      .getState()
      .bootstrap({ repository, user, storage });

    const restored = useWorkspaceStore.getState();
    expect(restored.openDiagramIds).toEqual([first]);
    // The second diagram is still in the project — just closed.
    expect(restored.diagrams.some((d) => d.id === second)).toBe(true);
  });

  it('bootstrap opens every project diagram when no layout snapshot has been persisted yet', async () => {
    // Cold-load case: the project already has multiple diagrams (e.g. an
    // e2e seed wrote it directly to sessionStorage) but no LayoutSnapshot
    // exists yet. Bootstrap should open every diagram so tab-by-name
    // locators resolve immediately — the alternative (open only the
    // first) made the entire e2e suite hang waiting for the second tab
    // to appear (CI run 25949230853, T-13.37 regression).
    const storage = makeMemoryStorage();
    // First bootstrap creates the seed project with one diagram. Add a
    // second through the public API — createDiagram persists the project
    // but does not touch LAYOUT_STORAGE_KEY.
    const repository1 = createInMemorySessionRepository({ storage });
    const user1 = createSessionUser();
    await useWorkspaceStore
      .getState()
      .bootstrap({ repository: repository1, user: user1, storage });
    const first = useWorkspaceStore.getState().diagrams[0]!.id;
    const second = useWorkspaceStore.getState().createDiagram(BDD_VIEWPOINT_ID);
    if (!second) throw new Error('createDiagram returned null');

    // Tear down. Explicitly wipe the layout key so the next bootstrap
    // looks at a project-with-two-diagrams but a fresh-session layout.
    resetWorkspaceStoreForTests();
    storage.removeItem(LAYOUT_STORAGE_KEY);

    const repository2 = createInMemorySessionRepository({ storage });
    const user2 = createSessionUser();
    await useWorkspaceStore
      .getState()
      .bootstrap({ repository: repository2, user: user2, storage });
    const restored = useWorkspaceStore.getState();
    expect(restored.openDiagramIds).toEqual([first, second]);
    expect(restored.activeDiagramId).toBe(first);
  });

  it('bootstrap filters out persisted open ids whose diagram no longer exists', async () => {
    const storage = makeMemoryStorage();
    // Seed the layout with a phantom id alongside whatever the bootstrap
    // diagram ends up being. The phantom must be dropped on load.
    storage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        leftPaneWidth: 256,
        rightPaneWidth: 360,
        secondaryDiagramId: null,
        openDiagramIds: ['phantom-diagram-id'],
      }),
    );
    const { state } = await bootstrappedStore(storage);
    const s = state();
    expect(s.openDiagramIds).not.toContain('phantom-diagram-id' as DiagramId);
    // Always contains at least the bootstrap-active diagram.
    expect(s.openDiagramIds).toContain(s.activeDiagramId!);
  });

  it('splitDiagram adds the secondary diagram to the open set', async () => {
    const { state } = await bootstrappedStore();
    const first = state().diagrams[0]!.id;
    const second = state().createDiagram(BDD_VIEWPOINT_ID)!;
    // Don't open `second` explicitly — split-from-tree should pull it in.
    state().splitDiagram(second);
    const s = state();
    expect(s.secondaryDiagramId).toBe(second);
    expect(s.openDiagramIds).toEqual([first, second]);
  });
});
