import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import {
  ACTIVITY_VIEWPOINT_ID,
  BDD_VIEWPOINT_ID,
  bddViewpoint,
  IBD_VIEWPOINT_ID,
  ibdViewpoint,
  PACKAGE_VIEWPOINT_ID,
  packageViewpoint,
  PARAMETRIC_VIEWPOINT_ID,
  parametricViewpoint,
  REQUIREMENTS_VIEWPOINT_ID,
  requirementsViewpoint,
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

  it('registers both BDD and IBD viewpoints at bootstrap (issue #49)', () => {
    const s = useWorkspaceStore.getState();
    expect(s.viewpoints.has(BDD_VIEWPOINT_ID)).toBe(true);
    expect(s.viewpoints.has(IBD_VIEWPOINT_ID)).toBe(true);
    expect(s.viewpoints.get(IBD_VIEWPOINT_ID)).toBe(ibdViewpoint);
    expect(s.viewpoints.get(BDD_VIEWPOINT_ID)).toBe(bddViewpoint);
  });

  it('registers the Requirements viewpoint at bootstrap (issue #70)', () => {
    const s = useWorkspaceStore.getState();
    expect(s.viewpoints.has(REQUIREMENTS_VIEWPOINT_ID)).toBe(true);
    expect(s.viewpoints.get(REQUIREMENTS_VIEWPOINT_ID)).toBe(requirementsViewpoint);
  });

  it('registers the Parametric viewpoint at bootstrap (issue #135)', () => {
    const s = useWorkspaceStore.getState();
    expect(s.viewpoints.has(PARAMETRIC_VIEWPOINT_ID)).toBe(true);
    expect(s.viewpoints.get(PARAMETRIC_VIEWPOINT_ID)).toBe(parametricViewpoint);
  });

  it('registers the Package viewpoint at bootstrap (issue #154)', () => {
    const s = useWorkspaceStore.getState();
    expect(s.viewpoints.has(PACKAGE_VIEWPOINT_ID)).toBe(true);
    expect(s.viewpoints.get(PACKAGE_VIEWPOINT_ID)).toBe(packageViewpoint);
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

  it('setPendingRename round-trips an ElementId and clears via null (T-13.34)', () => {
    expect(useWorkspaceStore.getState().pendingRenameElementId).toBeNull();
    const id = mkElementId('p13-34');
    useWorkspaceStore.getState().setPendingRename(id);
    expect(useWorkspaceStore.getState().pendingRenameElementId).toBe(id);
    useWorkspaceStore.getState().setPendingRename(null);
    expect(useWorkspaceStore.getState().pendingRenameElementId).toBeNull();
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

  it('renameProject trims, updates project.name, and persists (T-13.08)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const saveSpy = vi.spyOn(repository, 'save');
    useWorkspaceStore.getState().renameProject('  Acme System  ');
    expect(useWorkspaceStore.getState().project?.name).toBe('Acme System');
    expect(saveSpy).toHaveBeenCalledTimes(1);

    // Persistence round-trip.
    resetWorkspaceStoreForTests();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
    expect(useWorkspaceStore.getState().project?.name).toBe('Acme System');
  });

  it('renameProject is a no-op on empty / whitespace-only input (T-13.08)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
    const before = useWorkspaceStore.getState().project!.name;

    const saveSpy = vi.spyOn(repository, 'save');
    useWorkspaceStore.getState().renameProject('');
    useWorkspaceStore.getState().renameProject('   ');
    expect(useWorkspaceStore.getState().project?.name).toBe(before);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('renameProject is a no-op when the trimmed name is unchanged (T-13.08)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
    const current = useWorkspaceStore.getState().project!.name;

    const saveSpy = vi.spyOn(repository, 'save');
    useWorkspaceStore.getState().renameProject(`  ${current}  `);
    expect(useWorkspaceStore.getState().project?.name).toBe(current);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('renameProject is a no-op before bootstrap (T-13.08)', () => {
    useWorkspaceStore.getState().renameProject('Anything');
    expect(useWorkspaceStore.getState().project).toBeNull();
  });

  it('bootstrap seeds lastSavedAt and lastSavedVersion (T-13.09)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
    const s = useWorkspaceStore.getState();
    expect(s.lastSavedAt).toBe(s.project!.modifiedAt);
    expect(s.lastSavedVersion).toBe(s.modelVersion);
  });

  it('saveProject advances lastSavedAt + lastSavedVersion (T-13.09)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const beforeAt = useWorkspaceStore.getState().lastSavedAt;
    await new Promise((resolve) => setTimeout(resolve, 2));
    await useWorkspaceStore.getState().saveProject();
    const after = useWorkspaceStore.getState();
    expect(after.lastSavedAt).not.toBe(beforeAt);
    expect(after.lastSavedAt).toBe(after.project!.modifiedAt);
    expect(after.lastSavedVersion).toBe(after.modelVersion);
  });

  it('store starts with lastSavedAt=null / lastSavedVersion=0 (T-13.09)', () => {
    const s = useWorkspaceStore.getState();
    expect(s.lastSavedAt).toBeNull();
    expect(s.lastSavedVersion).toBe(0);
  });

  it('createDiagram appends a new IBD diagram and persists it (#49)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const partDefinitionId = mkElementId('engine');
    const id = useWorkspaceStore.getState().createDiagram(IBD_VIEWPOINT_ID, {
      name: 'Engine IBD',
      context: { kind: 'partDefinition', id: partDefinitionId },
    });
    expect(id).not.toBeNull();

    const s = useWorkspaceStore.getState();
    expect(s.diagrams).toHaveLength(2);
    const ibd = s.diagrams.find((d) => d.viewpointId === IBD_VIEWPOINT_ID);
    expect(ibd).toBeDefined();
    expect(ibd!.name).toBe('Engine IBD');
    expect(ibd!.context).toEqual({
      kind: 'partDefinition',
      id: partDefinitionId,
    });
    expect(ibd!.positions).toEqual({});

    // Persistence: simulate a reload and confirm the IBD diagram is back.
    resetWorkspaceStoreForTests();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
    const reloaded = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.viewpointId === IBD_VIEWPOINT_ID);
    expect(reloaded).toBeDefined();
    expect(reloaded!.name).toBe('Engine IBD');
    expect(reloaded!.context).toEqual({
      kind: 'partDefinition',
      id: partDefinitionId,
    });
  });

  it('createDiagram(IBD) without context returns null — IBD requires partDefinition context (T-13.30)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    // IBD's acceptedContextKinds = ['partDefinition']; no synthesized default
    // because 'package' is not in the accepted set.
    const before = useWorkspaceStore.getState().diagrams.length;
    const id = useWorkspaceStore.getState().createDiagram(IBD_VIEWPOINT_ID);
    expect(id).toBeNull();
    expect(useWorkspaceStore.getState().diagrams).toHaveLength(before);
  });

  it('createDiagram appends a Requirements diagram defaulted to root-Package context and persists it (#70 / T-13.30)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const rootId = useWorkspaceStore.getState().project!.rootId;
    const id = useWorkspaceStore
      .getState()
      .createDiagram(REQUIREMENTS_VIEWPOINT_ID);
    expect(id).not.toBeNull();

    const s = useWorkspaceStore.getState();
    const reqs = s.diagrams.find((d) => d.id === id);
    expect(reqs).toBeDefined();
    expect(reqs!.viewpointId).toBe(REQUIREMENTS_VIEWPOINT_ID);
    // ADR 0011 / JOURNAL iter-531: Requirements accepts 'package'; the
    // default context anchors the diagram to the project's root Package.
    expect(reqs!.context).toEqual({ kind: 'package', id: rootId });
    expect(reqs!.name).toBe('Requirements Diagram');
    expect(reqs!.positions).toEqual({});

    // Persistence: simulate a reload and confirm the diagram is back.
    resetWorkspaceStoreForTests();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
    const reloaded = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.viewpointId === REQUIREMENTS_VIEWPOINT_ID);
    expect(reloaded).toBeDefined();
    expect(reloaded!.name).toBe('Requirements Diagram');
    expect(reloaded!.context).toEqual({ kind: 'package', id: rootId });
  });

  it('createDiagram(Parametric) requires explicit partDefinition context (T-13.30)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    // Without context — rejected. Parametric.acceptedContextKinds = ['partDefinition'].
    const noCtxId = useWorkspaceStore
      .getState()
      .createDiagram(PARAMETRIC_VIEWPOINT_ID);
    expect(noCtxId).toBeNull();

    // With explicit partDefinition context — accepted.
    const partDefId = mkElementId('engine-def');
    const id = useWorkspaceStore.getState().createDiagram(PARAMETRIC_VIEWPOINT_ID, {
      context: { kind: 'partDefinition', id: partDefId },
    });
    expect(id).not.toBeNull();

    const s = useWorkspaceStore.getState();
    const param = s.diagrams.find((d) => d.id === id);
    expect(param).toBeDefined();
    expect(param!.context).toEqual({ kind: 'partDefinition', id: partDefId });
    expect(param!.name).toBe('Parametric Diagram');
  });

  it('createDiagram appends a Package diagram defaulted to root-Package context and persists it (#154 / T-13.30)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const rootId = useWorkspaceStore.getState().project!.rootId;
    const id = useWorkspaceStore
      .getState()
      .createDiagram(PACKAGE_VIEWPOINT_ID);
    expect(id).not.toBeNull();

    const s = useWorkspaceStore.getState();
    const pkg = s.diagrams.find((d) => d.id === id);
    expect(pkg).toBeDefined();
    expect(pkg!.viewpointId).toBe(PACKAGE_VIEWPOINT_ID);
    // ADR 0011 / JOURNAL iter-531: Package viewpoint accepts 'package'; the
    // default context anchors the diagram to the project's root Package.
    expect(pkg!.context).toEqual({ kind: 'package', id: rootId });
    expect(pkg!.name).toBe('Package Diagram');
    expect(pkg!.positions).toEqual({});

    // Persistence: simulate a reload and confirm the diagram is back.
    resetWorkspaceStoreForTests();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
    const reloaded = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.viewpointId === PACKAGE_VIEWPOINT_ID);
    expect(reloaded).toBeDefined();
    expect(reloaded!.name).toBe('Package Diagram');
    expect(reloaded!.context).toEqual({ kind: 'package', id: rootId });
  });

  it('createDiagram returns null for an unknown viewpoint id', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const before = useWorkspaceStore.getState().diagrams.length;
    const id = useWorkspaceStore.getState().createDiagram('does-not-exist');
    expect(id).toBeNull();
    expect(useWorkspaceStore.getState().diagrams).toHaveLength(before);
  });

  it('createDiagram rejects a context whose kind is not in viewpoint.acceptedContextKinds (T-13.30)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    // Activity.acceptedContextKinds = ['actionDefinition'] — a package context
    // is not accepted and must be rejected.
    const rootId = useWorkspaceStore.getState().project!.rootId;
    const before = useWorkspaceStore.getState().diagrams.length;
    const id = useWorkspaceStore.getState().createDiagram(ACTIVITY_VIEWPOINT_ID, {
      context: { kind: 'package', id: rootId },
    });
    expect(id).toBeNull();
    expect(useWorkspaceStore.getState().diagrams).toHaveLength(before);
  });

  it('createDiagram synthesizes a root-Package default context when the viewpoint accepts "package" (T-13.30)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const rootId = useWorkspaceStore.getState().project!.rootId;
    // BDD.acceptedContextKinds = ['package','partDefinition']; defaults to root.
    const id = useWorkspaceStore.getState().createDiagram(BDD_VIEWPOINT_ID);
    expect(id).not.toBeNull();
    const bdd = useWorkspaceStore.getState().diagrams.find((d) => d.id === id);
    expect(bdd?.context).toEqual({ kind: 'package', id: rootId });
  });

  it('createDiagram makes the new diagram switchable via setActiveDiagram (#49)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    const id = useWorkspaceStore.getState().createDiagram(IBD_VIEWPOINT_ID, {
      context: { kind: 'partDefinition', id: mkElementId('engine-def') },
    });
    expect(id).not.toBeNull();
    useWorkspaceStore.getState().setActiveDiagram(id!);
    expect(useWorkspaceStore.getState().activeDiagramId).toBe(id);
  });

  it('persists command-bus history through save and rehydrates it on reload (#44)', async () => {
    const storage = makeMemoryStorage();
    const repository = createInMemorySessionRepository({ storage });
    const user = createSessionUser();

    // Bootstrap, create a block (which goes through the command bus).
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
    const baseline = useWorkspaceStore.getState().elements.length;
    const blockId = useWorkspaceStore.getState().createBlock();
    expect(blockId).not.toBeNull();
    expect(useWorkspaceStore.getState().elements).toHaveLength(baseline + 1);
    // Confirm the bus has one undo entry to persist (compound: create + position).
    expect(useWorkspaceStore.getState().bus!.getHistory().undo).toHaveLength(1);

    // Reset store (simulates page reload). The underlying sessionStorage keeps
    // the saved project — including its history.
    resetWorkspaceStoreForTests();
    await useWorkspaceStore.getState().bootstrap({ repository, user, storage });

    // After rehydration the bus has the same undo entry; undo() reverts the
    // block creation.
    const rehydrated = useWorkspaceStore.getState();
    expect(rehydrated.elements).toHaveLength(baseline + 1);
    expect(rehydrated.bus!.getHistory().undo).toHaveLength(1);
    rehydrated.undo();
    expect(useWorkspaceStore.getState().elements).toHaveLength(baseline);

    // Redo restores the block.
    useWorkspaceStore.getState().redo();
    expect(useWorkspaceStore.getState().elements).toHaveLength(baseline + 1);
  });

  describe('split view (#235)', () => {
    async function bootWithTwoDiagrams(): Promise<{
      storage: Storage;
      primary: DiagramId;
      secondary: DiagramId;
    }> {
      const storage = makeMemoryStorage();
      const repository = createInMemorySessionRepository({ storage });
      const user = createSessionUser();
      await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
      const primary = useWorkspaceStore.getState().activeDiagramId!;
      const secondary = useWorkspaceStore
        .getState()
        .createDiagram(BDD_VIEWPOINT_ID, { name: 'Second BDD' })!;
      return { storage, primary, secondary };
    }

    it('starts with no secondary diagram and empty secondary selection', () => {
      const s = useWorkspaceStore.getState();
      expect(s.secondaryDiagramId).toBeNull();
      expect(s.secondarySelectedElementIds).toEqual([]);
    });

    it('splitDiagram sets secondaryDiagramId and persists to layout storage', async () => {
      const { storage, secondary } = await bootWithTwoDiagrams();
      useWorkspaceStore.getState().splitDiagram(secondary);
      expect(useWorkspaceStore.getState().secondaryDiagramId).toBe(secondary);

      const raw = storage.getItem(LAYOUT_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!) as { secondaryDiagramId: string };
      expect(parsed.secondaryDiagramId).toBe(secondary);
    });

    it('splitDiagram refuses unknown diagram id', async () => {
      await bootWithTwoDiagrams();
      useWorkspaceStore
        .getState()
        .splitDiagram('not-a-real-id' as DiagramId);
      expect(useWorkspaceStore.getState().secondaryDiagramId).toBeNull();
    });

    it('splitDiagram with the active primary id is a no-op', async () => {
      const { primary } = await bootWithTwoDiagrams();
      useWorkspaceStore.getState().splitDiagram(primary);
      expect(useWorkspaceStore.getState().secondaryDiagramId).toBeNull();
    });

    it('closeSplit clears state and persists null to layout', async () => {
      const { storage, secondary } = await bootWithTwoDiagrams();
      useWorkspaceStore.getState().splitDiagram(secondary);
      useWorkspaceStore.getState().setSecondarySelection([
        mkElementId('x'),
      ]);
      useWorkspaceStore.getState().closeSplit();
      expect(useWorkspaceStore.getState().secondaryDiagramId).toBeNull();
      expect(useWorkspaceStore.getState().secondarySelectedElementIds).toEqual([]);
      const parsed = JSON.parse(storage.getItem(LAYOUT_STORAGE_KEY)!) as {
        secondaryDiagramId: string | null;
      };
      expect(parsed.secondaryDiagramId).toBeNull();
    });

    it('setActiveDiagram to the current secondary auto-closes the split', async () => {
      const { secondary } = await bootWithTwoDiagrams();
      useWorkspaceStore.getState().splitDiagram(secondary);
      useWorkspaceStore.getState().setActiveDiagram(secondary);
      const s = useWorkspaceStore.getState();
      expect(s.activeDiagramId).toBe(secondary);
      expect(s.secondaryDiagramId).toBeNull();
    });

    it('bootstrap restores secondaryDiagramId from layout when the diagram still exists', async () => {
      const { storage, secondary } = await bootWithTwoDiagrams();
      useWorkspaceStore.getState().splitDiagram(secondary);
      // Simulate reload.
      resetWorkspaceStoreForTests();
      const repository = createInMemorySessionRepository({ storage });
      const user = createSessionUser();
      await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
      expect(useWorkspaceStore.getState().secondaryDiagramId).toBe(secondary);
    });

    it('bootstrap drops a stale secondaryDiagramId pointing at a missing diagram', async () => {
      const storage = makeMemoryStorage();
      storage.setItem(
        LAYOUT_STORAGE_KEY,
        JSON.stringify({
          leftPaneWidth: DEFAULT_LEFT_PANE_WIDTH,
          rightPaneWidth: DEFAULT_RIGHT_PANE_WIDTH,
          secondaryDiagramId: 'nonexistent-diagram-id',
        }),
      );
      const repository = createInMemorySessionRepository({ storage });
      const user = createSessionUser();
      await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
      expect(useWorkspaceStore.getState().secondaryDiagramId).toBeNull();
    });

    it('setSecondarySelection replaces the secondary selection', () => {
      const a = mkElementId('a');
      const b = mkElementId('b');
      useWorkspaceStore.getState().setSecondarySelection([a, b]);
      expect(useWorkspaceStore.getState().secondarySelectedElementIds).toEqual([
        a,
        b,
      ]);
      // Primary selection is untouched.
      expect(useWorkspaceStore.getState().selectedElementIds).toEqual([]);
    });
  });
});
