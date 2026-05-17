import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { ReactElement } from 'react';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { EmptyState } from '@/workspace/EmptyState';
import {
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';

// ADR 0015 step 2: <EmptyState /> now calls `useReactFlow()` to compute
// canvas centre in flow coordinates. In production it's mounted inside
// the <ReactFlowProvider> on <CanvasPane>; the unit test render must do
// the same.
function renderEmptyState(element: ReactElement): ReturnType<typeof render> {
  return render(<ReactFlowProvider>{element}</ReactFlowProvider>);
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

async function bootstrap(): Promise<void> {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
}

describe('<EmptyState /> CTAs (T-13.34, ADR 0015 step 2)', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('New Part Definition dispatches the shared createBlock command and queues rename', async () => {
    // ADR 0015 step 2 (#376): the card click goes through the same
    // `createBlock` entry point that the palette drag's
    // `CanvasPane.handleDrop` BDD branch calls, so empty-state click and
    // palette drag emit indistinguishable elements (auto-name "Block N",
    // owned by the root Package, placed via an `update-diagram-position`
    // compound).
    await bootstrap();
    const rootId = useWorkspaceStore.getState().project!.rootId;

    renderEmptyState(<EmptyState onImportJson={() => {}} />);
    fireEvent.click(screen.getByTestId('empty-state-new-part-definition'));

    const elements = useWorkspaceStore.getState().elements;
    const created = elements.find(
      (e) =>
        e.kind === 'PartDefinition' &&
        e.ownerId === rootId &&
        e.name.startsWith('Block '),
    );
    expect(
      created,
      'PartDefinition should be created under the root with the shared autoname',
    ).toBeDefined();

    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([
      created!.id,
    ]);
    expect(useWorkspaceStore.getState().pendingRenameElementId).toBe(
      created!.id,
    );
  });

  it('New Requirement dispatches the shared createRequirement command, switches to the Requirements surface, and queues rename', async () => {
    // Same shape as Part Definition: the card delegates to the same
    // `createRequirement(diagramId, position)` entry point that
    // `CanvasPane.handleDrop`'s Requirements branch calls — auto-name
    // "ReqN", owned by the root Package.
    await bootstrap();
    const rootId = useWorkspaceStore.getState().project!.rootId;

    renderEmptyState(<EmptyState onImportJson={() => {}} />);
    fireEvent.click(screen.getByTestId('empty-state-new-requirement'));

    const elements = useWorkspaceStore.getState().elements;
    const created = elements.find(
      (e) =>
        e.kind === 'Requirement' &&
        e.ownerId === rootId &&
        /^Req\d+$/.test(e.name),
    );
    expect(
      created,
      'Requirement should be created under the root with the shared autoname',
    ).toBeDefined();

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

    renderEmptyState(<EmptyState onImportJson={onImportJson} />);
    fireEvent.click(screen.getByTestId('empty-state-import-json'));

    expect(onImportJson).toHaveBeenCalledTimes(1);
  });

  it('Open Chat switches the inspector tab to chat', async () => {
    await bootstrap();

    renderEmptyState(<EmptyState onImportJson={() => {}} />);
    expect(useWorkspaceStore.getState().inspectorTab).toBe('inspector');

    fireEvent.click(screen.getByTestId('empty-state-open-chat'));
    expect(useWorkspaceStore.getState().inspectorTab).toBe('chat');
  });

  it('New Part Definition and New Requirement are disabled when no project is loaded', () => {
    // Skip bootstrap: store is fresh, project is null.
    renderEmptyState(<EmptyState onImportJson={() => {}} />);
    expect(
      screen.getByTestId('empty-state-new-part-definition'),
    ).toBeDisabled();
    expect(
      screen.getByTestId('empty-state-new-requirement'),
    ).toBeDisabled();
  });
});
