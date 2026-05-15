import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { EmptyState } from '@/workspace/EmptyState';
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

describe('<EmptyState /> CTAs (T-13.34)', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('New Block creates a PartDefinition under the project root and queues rename', async () => {
    await bootstrap();
    const rootId = useWorkspaceStore.getState().project!.rootId;

    render(<EmptyState onImportJson={() => {}} />);
    fireEvent.click(screen.getByTestId('empty-state-new-block'));

    const elements = useWorkspaceStore.getState().elements;
    const created = elements.find(
      (e) => e.kind === 'PartDefinition' && e.ownerId === rootId,
    );
    expect(created, 'PartDefinition should be created under the root').toBeDefined();
    expect(created!.name).toBe('New Part Definition');

    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([
      created!.id,
    ]);
    expect(useWorkspaceStore.getState().pendingRenameElementId).toBe(
      created!.id,
    );
  });

  it('New Requirement creates a Requirement under the project root, switches to the Requirements surface, and queues rename', async () => {
    await bootstrap();
    const rootId = useWorkspaceStore.getState().project!.rootId;

    render(<EmptyState onImportJson={() => {}} />);
    fireEvent.click(screen.getByTestId('empty-state-new-requirement'));

    const elements = useWorkspaceStore.getState().elements;
    const created = elements.find(
      (e) => e.kind === 'Requirement' && e.ownerId === rootId,
    );
    expect(created, 'Requirement should be created under the root').toBeDefined();
    expect(created!.name).toBe('New Requirement');

    expect(useWorkspaceStore.getState().activeSurfaceKind).toBe('requirements');
    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([
      created!.id,
    ]);
    expect(useWorkspaceStore.getState().pendingRenameElementId).toBe(
      created!.id,
    );
  });

  it('Import JSON invokes the parent-provided handler', async () => {
    await bootstrap();
    const onImportJson = vi.fn();

    render(<EmptyState onImportJson={onImportJson} />);
    fireEvent.click(screen.getByTestId('empty-state-import-json'));

    expect(onImportJson).toHaveBeenCalledTimes(1);
  });

  it('Open Chat switches the inspector tab to chat', async () => {
    await bootstrap();

    render(<EmptyState onImportJson={() => {}} />);
    expect(useWorkspaceStore.getState().inspectorTab).toBe('inspector');

    fireEvent.click(screen.getByTestId('empty-state-open-chat'));
    expect(useWorkspaceStore.getState().inspectorTab).toBe('chat');
  });

  it('New Block and New Requirement are disabled when no project is loaded', () => {
    // Skip bootstrap: store is fresh, project is null.
    render(<EmptyState onImportJson={() => {}} />);
    expect(
      screen.getByTestId('empty-state-new-block'),
    ).toBeDisabled();
    expect(
      screen.getByTestId('empty-state-new-requirement'),
    ).toBeDisabled();
  });
});
