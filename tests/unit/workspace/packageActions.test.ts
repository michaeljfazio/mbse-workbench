import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import type { PackageElement } from '@/model';
import {
  getActiveDiagram,
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';
import { packageViewpoint } from '@/viewpoints';

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
  // Seed a Package diagram so createPackage has a valid drop target.
  const id = useWorkspaceStore
    .getState()
    .createDiagram(packageViewpoint.id, { name: 'System Packages' });
  expect(id).not.toBeNull();
  useWorkspaceStore.getState().setActiveDiagram(id!);
  return { storage, repository, user, packageDiagramId: id! };
}

function pkgById(id: string): PackageElement | undefined {
  return useWorkspaceStore
    .getState()
    .elements.find((e) => e.id === id) as PackageElement | undefined;
}

describe('workspace store — Package actions', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('createPackage adds a Package element, cascades the default name, and stores a position', async () => {
    const { packageDiagramId } = await bootstrap();
    const a = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 80, y: 80 });
    const b = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 200, y: 200 });
    const c = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 320, y: 320 });
    expect(a && b && c).toBeTruthy();
    expect(pkgById(a!)?.name).toBe('Package1');
    expect(pkgById(b!)?.name).toBe('Package2');
    expect(pkgById(c!)?.name).toBe('Package3');
    const diagram = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.id === packageDiagramId)!;
    expect(diagram.positions[a!]).toEqual({ x: 80, y: 80 });
    expect(diagram.positions[b!]).toEqual({ x: 200, y: 200 });
  });

  it('createPackage default name fills the lowest free slot (gap-aware)', async () => {
    const { packageDiagramId } = await bootstrap();
    const a = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 0, y: 0 });
    const b = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 0, y: 0 });
    // Rename `a` to free up "Package1"; the next create should reclaim it.
    useWorkspaceStore.getState().renameElement(a!, 'Custom');
    const c = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 0, y: 0 });
    expect(pkgById(b!)?.name).toBe('Package2');
    expect(pkgById(c!)?.name).toBe('Package1');
  });

  it('createPackage is one undo step: undo clears element and position together', async () => {
    const { packageDiagramId } = await bootstrap();
    const id = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 50, y: 50 })!;
    expect(pkgById(id)).toBeDefined();
    useWorkspaceStore.getState().undo();
    expect(pkgById(id)).toBeUndefined();
    const diagram = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.id === packageDiagramId)!;
    expect(diagram.positions[id]).toBeUndefined();
    useWorkspaceStore.getState().redo();
    expect(pkgById(id)?.name).toBe('Package1');
  });

  it('addPackageMember / removePackageMember round-trip with undo and redo', async () => {
    const { packageDiagramId } = await bootstrap();
    const pkgId = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 0, y: 0 })!;
    // Switch to the default BDD diagram to create a Block as a candidate member.
    const defaultDiagramId = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.viewpointId !== packageViewpoint.id)!.id;
    useWorkspaceStore.getState().setActiveDiagram(defaultDiagramId);
    const blockId = useWorkspaceStore.getState().createBlock()!;

    useWorkspaceStore.getState().addPackageMember(pkgId, blockId);
    expect(pkgById(pkgId)?.memberIds).toEqual([blockId]);

    useWorkspaceStore.getState().undo();
    expect(pkgById(pkgId)?.memberIds).toEqual([]);

    useWorkspaceStore.getState().redo();
    expect(pkgById(pkgId)?.memberIds).toEqual([blockId]);

    useWorkspaceStore.getState().removePackageMember(pkgId, blockId);
    expect(pkgById(pkgId)?.memberIds).toEqual([]);

    useWorkspaceStore.getState().undo();
    expect(pkgById(pkgId)?.memberIds).toEqual([blockId]);
  });

  it('addPackageMember is a no-op when the member is already in the list', async () => {
    const { packageDiagramId } = await bootstrap();
    const pkgId = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 0, y: 0 })!;
    const defaultDiagramId = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.viewpointId !== packageViewpoint.id)!.id;
    useWorkspaceStore.getState().setActiveDiagram(defaultDiagramId);
    const blockId = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().addPackageMember(pkgId, blockId);
    const versionAfterAdd = useWorkspaceStore.getState().modelVersion;
    useWorkspaceStore.getState().addPackageMember(pkgId, blockId);
    expect(useWorkspaceStore.getState().modelVersion).toBe(versionAfterAdd);
    expect(pkgById(pkgId)?.memberIds).toEqual([blockId]);
  });

  it('deleteElement removes a Package and undo restores its memberIds', async () => {
    const { packageDiagramId } = await bootstrap();
    const pkgId = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 0, y: 0 })!;
    const defaultDiagramId = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.viewpointId !== packageViewpoint.id)!.id;
    useWorkspaceStore.getState().setActiveDiagram(defaultDiagramId);
    const blockId = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().addPackageMember(pkgId, blockId);

    useWorkspaceStore.getState().deleteElement(pkgId);
    expect(pkgById(pkgId)).toBeUndefined();

    useWorkspaceStore.getState().undo();
    expect(pkgById(pkgId)?.memberIds).toEqual([blockId]);
  });

  it('getActiveDiagram returns the seeded Package diagram after bootstrap', async () => {
    const { packageDiagramId } = await bootstrap();
    const active = getActiveDiagram(useWorkspaceStore.getState());
    expect(active?.id).toBe(packageDiagramId);
  });
});
