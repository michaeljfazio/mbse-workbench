import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import type { DiagramId } from '@/workspace/diagram';
import { useUrlFragmentSync } from '@/workspace/useUrlFragmentSync';
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

function HookHost(): null {
  useUrlFragmentSync();
  return null;
}

function setHash(hash: string): void {
  window.history.replaceState(null, '', `${window.location.pathname}${hash}`);
}

function clearHash(): void {
  window.history.replaceState(null, '', window.location.pathname);
}

describe('useUrlFragmentSync', () => {
  beforeEach(() => {
    resetWorkspaceStoreForTests();
    clearHash();
  });
  afterEach(() => {
    resetWorkspaceStoreForTests();
    clearHash();
  });

  it('selects the element named by #/element/<id> on cold mount', async () => {
    await act(async () => {
      await bootstrap();
    });
    const blockId = useWorkspaceStore.getState().createBlock();
    expect(blockId).not.toBeNull();

    setHash(`#/element/${encodeURIComponent(blockId!)}`);

    await act(async () => {
      render(<HookHost />);
    });

    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([blockId]);
  });

  it('opens the diagram named by #/diagram/<id> on cold mount', async () => {
    await act(async () => {
      await bootstrap();
    });
    const diagramId = useWorkspaceStore
      .getState()
      .diagrams[0]!.id as DiagramId;
    // Default-bootstrap activates that diagram already; close the tab so the
    // hook has work to do.
    act(() => {
      useWorkspaceStore.getState().closeDiagramTab(diagramId);
    });
    expect(useWorkspaceStore.getState().activeDiagramId).toBeNull();

    setHash(`#/diagram/${encodeURIComponent(diagramId)}`);

    await act(async () => {
      render(<HookHost />);
    });

    expect(useWorkspaceStore.getState().activeDiagramId).toBe(diagramId);
  });

  it('writes #/element/<id> when selection changes after hydration', async () => {
    await act(async () => {
      await bootstrap();
    });
    const blockId = useWorkspaceStore.getState().createBlock();
    expect(blockId).not.toBeNull();

    await act(async () => {
      render(<HookHost />);
    });

    act(() => {
      useWorkspaceStore.getState().setSelection([blockId!]);
    });

    expect(window.location.hash).toBe(
      `#/element/${encodeURIComponent(blockId!)}`,
    );
  });

  it('writes #/diagram/<id> when selection clears but a diagram is active', async () => {
    await act(async () => {
      await bootstrap();
    });
    const blockId = useWorkspaceStore.getState().createBlock();
    expect(blockId).not.toBeNull();
    const diagramId = useWorkspaceStore.getState().activeDiagramId!;

    await act(async () => {
      render(<HookHost />);
    });

    act(() => {
      useWorkspaceStore.getState().setSelection([blockId!]);
    });
    expect(window.location.hash).toBe(
      `#/element/${encodeURIComponent(blockId!)}`,
    );

    act(() => {
      useWorkspaceStore.getState().setSelection([]);
    });

    expect(window.location.hash).toBe(
      `#/diagram/${encodeURIComponent(diagramId)}`,
    );
  });

  it('responds to back/forward hashchange events by re-applying the URL', async () => {
    await act(async () => {
      await bootstrap();
    });
    const blockA = useWorkspaceStore.getState().createBlock();
    const blockB = useWorkspaceStore.getState().createBlock();
    expect(blockA).not.toBeNull();
    expect(blockB).not.toBeNull();

    await act(async () => {
      render(<HookHost />);
    });

    act(() => {
      useWorkspaceStore.getState().setSelection([blockA!]);
    });

    // Simulate a back-button navigation that moves the URL to blockB.
    setHash(`#/element/${encodeURIComponent(blockB!)}`);
    await act(async () => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([blockB]);
  });

  it('ignores #/element/<id> when the id does not resolve', async () => {
    await act(async () => {
      await bootstrap();
    });

    setHash('#/element/nonexistent-id-xyz');

    await act(async () => {
      render(<HookHost />);
    });

    expect(useWorkspaceStore.getState().selectedElementIds).toEqual([]);
  });

  it('ignores #/diagram/<id> when the id does not resolve', async () => {
    await act(async () => {
      await bootstrap();
    });
    const initialActive = useWorkspaceStore.getState().activeDiagramId;

    setHash('#/diagram/nonexistent-id-xyz');

    await act(async () => {
      render(<HookHost />);
    });

    expect(useWorkspaceStore.getState().activeDiagramId).toBe(initialActive);
  });

  it('does not write the URL before bootstrap completes', async () => {
    setHash('#/diagram/somewhere');

    await act(async () => {
      render(<HookHost />);
    });

    expect(window.location.hash).toBe('#/diagram/somewhere');
  });
});
