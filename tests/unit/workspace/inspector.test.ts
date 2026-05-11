import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSessionUser } from '@/collab';
import type { ElementId } from '@/model';
import { createInMemorySessionRepository } from '@/repository';
import { resetWorkspaceStoreForTests, useWorkspaceStore } from '@/workspace';

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

async function bootstrap() {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
  return { storage, repository, user };
}

describe('workspace store — inspector edits', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('renameElement dispatches an update-element command with the trimmed name', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;
    const versionBefore = useWorkspaceStore.getState().modelVersion;

    useWorkspaceStore.getState().renameElement(id, '  Engine  ');

    const versionAfter = useWorkspaceStore.getState().modelVersion;
    expect(versionAfter).toBeGreaterThan(versionBefore);
    const el = useWorkspaceStore
      .getState()
      .elements.find((e) => e.id === id);
    expect(el?.name).toBe('Engine');
  });

  it('renameElement rejects an empty or whitespace-only name (no dispatch)', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;
    const before = useWorkspaceStore.getState().modelVersion;

    useWorkspaceStore.getState().renameElement(id, '');
    useWorkspaceStore.getState().renameElement(id, '   ');

    expect(useWorkspaceStore.getState().modelVersion).toBe(before);
  });

  it('renameElement is a no-op when the name is unchanged', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;
    const before = useWorkspaceStore.getState().modelVersion;

    const current = useWorkspaceStore
      .getState()
      .elements.find((e) => e.id === id)!.name;
    useWorkspaceStore.getState().renameElement(id, current);

    expect(useWorkspaceStore.getState().modelVersion).toBe(before);
  });

  it('setElementDescription sets documentation when the element had none', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;

    useWorkspaceStore.getState().setElementDescription(id, 'A test block');

    const el = useWorkspaceStore
      .getState()
      .elements.find((e) => e.id === id);
    expect(el?.documentation).toBe('A test block');
  });

  it('setElementDescription with empty string clears the documentation', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().setElementDescription(id, 'first');

    useWorkspaceStore.getState().setElementDescription(id, '');

    const el = useWorkspaceStore
      .getState()
      .elements.find((e) => e.id === id);
    expect(el?.documentation).toBeUndefined();
  });

  it('setElementDescription is a no-op when value is unchanged', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().setElementDescription(id, 'same');

    const before = useWorkspaceStore.getState().modelVersion;
    useWorkspaceStore.getState().setElementDescription(id, 'same');

    expect(useWorkspaceStore.getState().modelVersion).toBe(before);
  });

  it('setElementDescription is a no-op when the element id is unknown', async () => {
    await bootstrap();
    const before = useWorkspaceStore.getState().modelVersion;

    useWorkspaceStore
      .getState()
      .setElementDescription(mkElementId('missing') as ElementId, 'X');

    expect(useWorkspaceStore.getState().modelVersion).toBe(before);
  });

  it('undo restores the previous documentation; redo re-applies it', async () => {
    await bootstrap();
    const id = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().setElementDescription(id, 'first');
    useWorkspaceStore.getState().setElementDescription(id, 'second');

    useWorkspaceStore.getState().undo();
    expect(
      useWorkspaceStore.getState().elements.find((e) => e.id === id)
        ?.documentation,
    ).toBe('first');

    useWorkspaceStore.getState().redo();
    expect(
      useWorkspaceStore.getState().elements.find((e) => e.id === id)
        ?.documentation,
    ).toBe('second');
  });

  it('autosaves the project to the repository after every command dispatch', async () => {
    const { repository } = await bootstrap();
    const saveSpy = vi.spyOn(repository, 'save');

    const id = useWorkspaceStore.getState().createBlock()!;
    await Promise.resolve();
    expect(saveSpy).toHaveBeenCalled();
    const callsAfterCreate = saveSpy.mock.calls.length;

    useWorkspaceStore.getState().renameElement(id, 'Renamed');
    await Promise.resolve();
    expect(saveSpy.mock.calls.length).toBeGreaterThan(callsAfterCreate);
  });
});
