import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import type { ElementId, ModelElement } from '@/model';
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

async function bootstrap(): Promise<void> {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
}

function rootId(): ElementId {
  const id = useWorkspaceStore.getState().project?.rootId;
  if (!id) throw new Error('no root');
  return id;
}

function elementById(id: ElementId): ModelElement | undefined {
  return useWorkspaceStore.getState().elements.find((e) => e.id === id);
}

describe('workspace store — moveElement (generalized)', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('moves a PartDefinition between two Packages and is a single undo step', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const p1 = store().createChildElement(rootId(), 'Package', 'member', 'P1')!;
    const p2 = store().createChildElement(rootId(), 'Package', 'member', 'P2')!;
    const part = store().createChildElement(
      p1,
      'PartDefinition',
      'member',
      'Engine',
    )!;
    expect(elementById(part)?.ownerId).toBe(p1);

    const moved = store().moveElement(part, p2);
    expect(moved).toBe(true);

    const after = elementById(part)!;
    expect(after.ownerId).toBe(p2);
    expect(after.ownerRole).toBe('member');
    expect(after.ownerIndex).toBe(0);

    store().undo();
    expect(elementById(part)?.ownerId).toBe(p1);

    store().redo();
    expect(elementById(part)?.ownerId).toBe(p2);
  });

  it('moves a PortDefinition into a PartDefinition with ownerRole=port', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const part = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'Engine',
    )!;
    const port = store().createChildElement(
      rootId(),
      'PortDefinition',
      'member',
      'Inlet',
    )!;
    expect(elementById(port)?.ownerRole).toBe('member');

    const moved = store().moveElement(port, part);
    expect(moved).toBe(true);

    const after = elementById(port)!;
    expect(after.ownerId).toBe(part);
    expect(after.ownerRole).toBe('port');
  });

  it('moves a ValueProperty into an ActionDefinition with ownerRole=parameter', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const action = store().createChildElement(
      rootId(),
      'ActionDefinition',
      'member',
      'Run',
    )!;
    const part = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'Engine',
    )!;
    const value = store().createChildElement(
      part,
      'ValueProperty',
      'property',
      'power',
    )!;
    expect(elementById(value)?.ownerRole).toBe('property');

    const moved = store().moveElement(value, action);
    expect(moved).toBe(true);

    const after = elementById(value)!;
    expect(after.ownerId).toBe(action);
    expect(after.ownerRole).toBe('parameter');
  });

  it('rejects a self-move (target === element)', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const pkg = store().createChildElement(rootId(), 'Package', 'member', 'P')!;
    expect(store().moveElement(pkg, pkg)).toBe(false);
    expect(elementById(pkg)?.ownerId).toBe(rootId());
  });

  it('rejects a cycle: moving a Package into one of its descendants', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const outer = store().createChildElement(
      rootId(),
      'Package',
      'member',
      'Outer',
    )!;
    const inner = store().createChildElement(outer, 'Package', 'member', 'Inner')!;
    const deep = store().createChildElement(inner, 'Package', 'member', 'Deep')!;

    expect(store().moveElement(outer, inner)).toBe(false);
    expect(store().moveElement(outer, deep)).toBe(false);
    expect(elementById(outer)?.ownerId).toBe(rootId());
  });

  it('rejects a move when the target does not accept the element kind', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const req = store().createChildElement(
      rootId(),
      'Requirement',
      'member',
      'R1',
    )!;
    const part = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'Engine',
    )!;
    // PartDefinition accepts only PortDefinition and ValueProperty, not Requirement.
    expect(store().moveElement(req, part)).toBe(false);
    expect(elementById(req)?.ownerId).toBe(rootId());
  });

  it('rejects a no-op move when the element is already at the target', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const p1 = store().createChildElement(rootId(), 'Package', 'member', 'P1')!;
    const part = store().createChildElement(
      p1,
      'PartDefinition',
      'member',
      'Engine',
    )!;
    expect(store().moveElement(part, p1)).toBe(false);
  });

  it('rejects a move when element or target is unknown', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const p1 = store().createChildElement(rootId(), 'Package', 'member', 'P1')!;
    const part = store().createChildElement(
      rootId(),
      'PartDefinition',
      'member',
      'Engine',
    )!;
    expect(
      store().moveElement('ghost' as unknown as ElementId, p1),
    ).toBe(false);
    expect(
      store().moveElement(part, 'ghost' as unknown as ElementId),
    ).toBe(false);
  });

  it('assigns ownerIndex at the end of the target slot', async () => {
    await bootstrap();
    const store = () => useWorkspaceStore.getState();
    const p1 = store().createChildElement(rootId(), 'Package', 'member', 'P1')!;
    const p2 = store().createChildElement(rootId(), 'Package', 'member', 'P2')!;
    // Pre-populate p2 with two members.
    store().createChildElement(p2, 'PartDefinition', 'member', 'A')!;
    store().createChildElement(p2, 'PartDefinition', 'member', 'B')!;
    const moved = store().createChildElement(
      p1,
      'PartDefinition',
      'member',
      'C',
    )!;

    expect(store().moveElement(moved, p2)).toBe(true);
    expect(elementById(moved)?.ownerIndex).toBe(2);
  });
});
