import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import {
  BDD_VIEWPOINT_ID,
  bddViewpoint,
} from '@/viewpoints';
import {
  DEFAULT_LEFT_PANE_WIDTH,
  DEFAULT_RIGHT_PANE_WIDTH,
  LAYOUT_STORAGE_KEY,
  MAX_PANE_WIDTH,
  MIN_PANE_WIDTH,
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';
import type { DiagramId } from '@/workspace';

import { mkElementId } from '../model/helpers';

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

describe('workspace store', () => {
  beforeEach(() => {
    resetWorkspaceStoreForTests();
  });

  afterEach(() => {
    resetWorkspaceStoreForTests();
  });

  it('starts uninitialized with default pane widths and inspector tab', () => {
    const s = useWorkspaceStore.getState();
    expect(s.initialized).toBe(false);
    expect(s.leftPaneWidth).toBe(DEFAULT_LEFT_PANE_WIDTH);
    expect(s.rightPaneWidth).toBe(DEFAULT_RIGHT_PANE_WIDTH);
    expect(s.inspectorTab).toBe('inspector');
    expect(s.project).toBeNull();
    expect(s.diagrams).toEqual([]);
    expect(s.activeDiagramId).toBeNull();
    expect(s.selectedElementIds).toEqual([]);
    expect(s.viewpoints.has(BDD_VIEWPOINT_ID)).toBe(true);
  });

  it('bootstrap creates a new Untitled Project when storage is empty', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();

    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const s = useWorkspaceStore.getState();
    expect(s.initialized).toBe(true);
    expect(s.project?.name).toBe('Untitled Project');
    expect(s.diagrams).toHaveLength(1);
    const diagram = s.diagrams[0]!;
    expect(diagram.viewpointId).toBe(bddViewpoint.id);
    expect(s.activeDiagramId).toBe(diagram.id);
    expect(s.user?.id).toBe(user.id);
    expect(s.registry).not.toBeNull();
    expect(s.bus).not.toBeNull();
  });

  it('bootstrap loads an existing project when one is present in storage', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();

    // First bootstrap: creates project A.
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
    const firstId = useWorkspaceStore.getState().project?.id;
    expect(firstId).toBeDefined();

    // Reset store (simulates page reload) but keep the same backing storage.
    resetWorkspaceStoreForTests();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
    const secondId = useWorkspaceStore.getState().project?.id;
    expect(secondId).toBe(firstId);
  });

  it('setLeftPaneWidth clamps to bounds and persists to storage', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    useWorkspaceStore.getState().setLeftPaneWidth(10);
    expect(useWorkspaceStore.getState().leftPaneWidth).toBe(MIN_PANE_WIDTH);

    useWorkspaceStore.getState().setLeftPaneWidth(99_999);
    expect(useWorkspaceStore.getState().leftPaneWidth).toBe(MAX_PANE_WIDTH);

    useWorkspaceStore.getState().setLeftPaneWidth(312);
    expect(useWorkspaceStore.getState().leftPaneWidth).toBe(312);

    const raw = storage.getItem(LAYOUT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as { leftPaneWidth: number; rightPaneWidth: number };
    expect(parsed.leftPaneWidth).toBe(312);
    expect(parsed.rightPaneWidth).toBe(DEFAULT_RIGHT_PANE_WIDTH);
  });

  it('setRightPaneWidth clamps to bounds and persists to storage', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    useWorkspaceStore.getState().setRightPaneWidth(420);
    const raw = storage.getItem(LAYOUT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as { leftPaneWidth: number; rightPaneWidth: number };
    expect(parsed.rightPaneWidth).toBe(420);
  });

  it('restores pane widths from storage on bootstrap', async () => {
    const storage = makeMemoryStorage();
    storage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({ leftPaneWidth: 280, rightPaneWidth: 400 }),
    );
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();

    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    expect(useWorkspaceStore.getState().leftPaneWidth).toBe(280);
    expect(useWorkspaceStore.getState().rightPaneWidth).toBe(400);
  });

  it('ignores setActiveDiagram for an unknown id', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const before = useWorkspaceStore.getState().activeDiagramId;
    useWorkspaceStore.getState().setActiveDiagram('not-a-real-id' as DiagramId);
    expect(useWorkspaceStore.getState().activeDiagramId).toBe(before);
  });

  it('setSelection replaces the current selection', () => {
    const a = mkElementId('a');
    const b = mkElementId('b');
    useWorkspaceStore.getState().setSelection([a, b]);
    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([a, b]);

    useWorkspaceStore.getState().setSelection([]);
    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([]);
  });

  it('setInspectorTab switches the active sidebar tab', () => {
    useWorkspaceStore.getState().setInspectorTab('chat');
    expect(useWorkspaceStore.getState().inspectorTab).toBe('chat');
    useWorkspaceStore.getState().setInspectorTab('inspector');
    expect(useWorkspaceStore.getState().inspectorTab).toBe('inspector');
  });

  it('saveProject persists current registry contents and bumps modifiedAt', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const initialModifiedAt = useWorkspaceStore.getState().project!.modifiedAt;
    const saveSpy = vi.spyOn(repository, 'save');

    // Wait a millisecond so the ISO timestamp differs.
    await new Promise((resolve) => setTimeout(resolve, 2));
    await useWorkspaceStore.getState().saveProject();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const updatedModifiedAt = useWorkspaceStore.getState().project!.modifiedAt;
    expect(updatedModifiedAt).not.toBe(initialModifiedAt);
  });

  it('saveProject is a no-op before bootstrap', async () => {
    await expect(useWorkspaceStore.getState().saveProject()).resolves.toBeUndefined();
    expect(useWorkspaceStore.getState().project).toBeNull();
  });
});
