import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import type { ElementId, PackageElement } from '@/model';
import {
  getActiveDiagram,
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';
import { packageViewpoint } from '@/viewpoints';
import { childIdsOf } from '../helpers/registryReaders';

function memberIdsOf(pkgId: ElementId): ElementId[] {
  return childIdsOf(useWorkspaceStore.getState().elements, pkgId, 'member');
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
    expect(memberIdsOf(pkgId)).toEqual([blockId]);

    useWorkspaceStore.getState().undo();
    expect(memberIdsOf(pkgId)).toEqual([]);

    useWorkspaceStore.getState().redo();
    expect(memberIdsOf(pkgId)).toEqual([blockId]);

    useWorkspaceStore.getState().removePackageMember(pkgId, blockId);
    expect(memberIdsOf(pkgId)).toEqual([]);

    useWorkspaceStore.getState().undo();
    expect(memberIdsOf(pkgId)).toEqual([blockId]);
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
    expect(memberIdsOf(pkgId)).toEqual([blockId]);
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
    expect(memberIdsOf(pkgId)).toEqual([blockId]);
  });

  it('getActiveDiagram returns the seeded Package diagram after bootstrap', async () => {
    const { packageDiagramId } = await bootstrap();
    const active = getActiveDiagram(useWorkspaceStore.getState());
    expect(active?.id).toBe(packageDiagramId);
  });

  it('linkPackageImport round-trips with undo / redo', async () => {
    const { packageDiagramId } = await bootstrap();
    const a = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 0, y: 0 })!;
    const b = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 200, y: 0 })!;
    const edgeId = useWorkspaceStore
      .getState()
      .linkPackageImport({
        source: a,
        target: b,
        sourceHandle: null,
        targetHandle: null,
      });
    expect(edgeId).not.toBeNull();
    const edge = useWorkspaceStore.getState().edges.find((e) => e.id === edgeId);
    expect(edge?.kind).toBe('PackageImport');
    expect(edge?.sourceId).toBe(a);
    expect(edge?.targetId).toBe(b);

    useWorkspaceStore.getState().undo();
    expect(
      useWorkspaceStore.getState().edges.find((e) => e.id === edgeId),
    ).toBeUndefined();
    useWorkspaceStore.getState().redo();
    expect(
      useWorkspaceStore.getState().edges.find((e) => e.id === edgeId),
    ).toBeDefined();
  });

  it('linkPackageImport rejects non-Package endpoints, self-loops, and duplicates', async () => {
    const { packageDiagramId } = await bootstrap();
    const a = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 0, y: 0 })!;
    const b = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 200, y: 0 })!;
    // Block under default BDD diagram to exercise the non-Package rejection.
    const defaultDiagramId = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.viewpointId !== packageViewpoint.id)!.id;
    useWorkspaceStore.getState().setActiveDiagram(defaultDiagramId);
    const blockId = useWorkspaceStore.getState().createBlock()!;

    // Non-Package source
    expect(
      useWorkspaceStore.getState().linkPackageImport({
        source: blockId,
        target: a,
        sourceHandle: null,
        targetHandle: null,
      }),
    ).toBeNull();
    // Self-loop
    expect(
      useWorkspaceStore.getState().linkPackageImport({
        source: a,
        target: a,
        sourceHandle: null,
        targetHandle: null,
      }),
    ).toBeNull();
    // First import succeeds
    const first = useWorkspaceStore.getState().linkPackageImport({
      source: a,
      target: b,
      sourceHandle: null,
      targetHandle: null,
    });
    expect(first).not.toBeNull();
    // Duplicate (same direction) rejected
    expect(
      useWorkspaceStore.getState().linkPackageImport({
        source: a,
        target: b,
        sourceHandle: null,
        targetHandle: null,
      }),
    ).toBeNull();
    // Reverse direction is a different edge — allowed.
    const reverse = useWorkspaceStore.getState().linkPackageImport({
      source: b,
      target: a,
      sourceHandle: null,
      targetHandle: null,
    });
    expect(reverse).not.toBeNull();
  });

  it('moveElementBetweenPackages moves an element and is a single undo step', async () => {
    const { packageDiagramId } = await bootstrap();
    const p1 = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 0, y: 0 })!;
    const p2 = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 300, y: 0 })!;
    const defaultDiagramId = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.viewpointId !== packageViewpoint.id)!.id;
    useWorkspaceStore.getState().setActiveDiagram(defaultDiagramId);
    const blockId = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().addPackageMember(p1, blockId);
    expect(memberIdsOf(p1)).toEqual([blockId]);

    const moved = useWorkspaceStore
      .getState()
      .moveElementBetweenPackages(blockId, p2);
    expect(moved).toBe(true);
    expect(memberIdsOf(p1)).toEqual([]);
    expect(memberIdsOf(p2)).toEqual([blockId]);

    useWorkspaceStore.getState().undo();
    expect(memberIdsOf(p1)).toEqual([blockId]);
    expect(memberIdsOf(p2)).toEqual([]);

    useWorkspaceStore.getState().redo();
    expect(memberIdsOf(p2)).toEqual([blockId]);
  });

  it('moveElementBetweenPackages also handles the "no current owner" case', async () => {
    const { packageDiagramId } = await bootstrap();
    const p1 = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 0, y: 0 })!;
    const defaultDiagramId = useWorkspaceStore
      .getState()
      .diagrams.find((d) => d.viewpointId !== packageViewpoint.id)!.id;
    useWorkspaceStore.getState().setActiveDiagram(defaultDiagramId);
    const blockId = useWorkspaceStore.getState().createBlock()!;
    const moved = useWorkspaceStore
      .getState()
      .moveElementBetweenPackages(blockId, p1);
    expect(moved).toBe(true);
    expect(memberIdsOf(p1)).toEqual([blockId]);
    useWorkspaceStore.getState().undo();
    expect(memberIdsOf(p1)).toEqual([]);
  });

  it('moveElementBetweenPackages rejects invalid moves', async () => {
    const { packageDiagramId } = await bootstrap();
    const p1 = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 0, y: 0 })!;
    const p2 = useWorkspaceStore
      .getState()
      .createPackage(packageDiagramId, { x: 300, y: 0 })!;
    // Same target as current owner
    useWorkspaceStore.getState().setActiveDiagram(
      useWorkspaceStore
        .getState()
        .diagrams.find((d) => d.viewpointId !== packageViewpoint.id)!.id,
    );
    const blockId = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().addPackageMember(p1, blockId);
    expect(
      useWorkspaceStore.getState().moveElementBetweenPackages(blockId, p1),
    ).toBe(false);
    // Packages cannot be moved into other Packages
    expect(
      useWorkspaceStore.getState().moveElementBetweenPackages(p1, p2),
    ).toBe(false);
    // Unknown elements rejected
    expect(
      useWorkspaceStore
        .getState()
        .moveElementBetweenPackages(
          'unknown' as unknown as ElementId,
          p2,
        ),
    ).toBe(false);
  });
});
