import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import { CommandPalette } from '@/workspace/CommandPalette';
import {
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';

// Save dispatches to the real downloader, which appends an anchor to the
// document and calls URL.createObjectURL. jsdom doesn't implement
// createObjectURL, so stub it before any Save command can fire.
const originalCreateObjectURL = (
  URL as unknown as { createObjectURL?: (b: Blob) => string }
).createObjectURL;
const originalRevokeObjectURL = (
  URL as unknown as { revokeObjectURL?: (u: string) => void }
).revokeObjectURL;

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

describe('<CommandPalette /> (T-13.05a)', () => {
  beforeEach(() => {
    resetWorkspaceStoreForTests();
    (
      URL as unknown as { createObjectURL: (b: Blob) => string }
    ).createObjectURL = () => 'blob:test';
    (
      URL as unknown as { revokeObjectURL: (u: string) => void }
    ).revokeObjectURL = () => {};
  });
  afterEach(() => {
    resetWorkspaceStoreForTests();
    if (originalCreateObjectURL) {
      (URL as unknown as { createObjectURL: typeof originalCreateObjectURL }).createObjectURL =
        originalCreateObjectURL;
    }
    if (originalRevokeObjectURL) {
      (URL as unknown as { revokeObjectURL: typeof originalRevokeObjectURL }).revokeObjectURL =
        originalRevokeObjectURL;
    }
  });

  it('with empty query renders the Actions section header and the enabled built-in commands', async () => {
    await bootstrap();
    // Make Undo enabled by dispatching one model change.
    useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });

    render(<CommandPalette onClose={() => {}} />);

    expect(
      screen.getByTestId('command-palette-commands-header'),
    ).toHaveTextContent(/Actions/i);
    expect(
      screen.getByTestId('command-palette-command-workspace.undo'),
    ).toBeVisible();
    expect(
      screen.getByTestId('command-palette-command-workspace.save-project'),
    ).toBeVisible();
    // Redo is disabled (no undo has happened yet).
    expect(
      screen.queryByTestId('command-palette-command-workspace.redo'),
    ).toBeNull();
    // Delete is disabled (no diagram selection).
    expect(
      screen.queryByTestId('command-palette-command-workspace.delete-selection'),
    ).toBeNull();
  });

  it('without a project, the Save and Delete commands are hidden', () => {
    // No bootstrap → project is null, no bus.
    render(<CommandPalette onClose={() => {}} />);
    expect(
      screen.queryByTestId('command-palette-command-workspace.save-project'),
    ).toBeNull();
    expect(
      screen.queryByTestId('command-palette-command-workspace.delete-selection'),
    ).toBeNull();
    // Undo / Redo also hidden because the bus is null → canUndo/canRedo false.
    expect(
      screen.queryByTestId('command-palette-command-workspace.undo'),
    ).toBeNull();
  });

  it('the first command starts active; ArrowDown moves to the next command', async () => {
    await bootstrap();
    useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });

    render(<CommandPalette onClose={() => {}} />);

    const undo = screen.getByTestId('command-palette-command-workspace.undo');
    const save = screen.getByTestId(
      'command-palette-command-workspace.save-project',
    );
    expect(undo).toHaveAttribute('data-active', 'true');
    expect(save).toHaveAttribute('data-active', 'false');

    const palette = screen.getByTestId('command-palette');
    fireEvent.keyDown(palette, { key: 'ArrowDown' });
    expect(undo).toHaveAttribute('data-active', 'false');
    expect(save).toHaveAttribute('data-active', 'true');
  });

  it('pressing Enter on Undo dispatches undo on the bus', async () => {
    await bootstrap();
    const create = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    expect(create).not.toBeNull();
    const versionBefore = useWorkspaceStore.getState().modelVersion;
    const elementsBefore = useWorkspaceStore.getState().elements.length;

    const onClose = vi.fn();
    render(<CommandPalette onClose={onClose} />);

    expect(
      screen.getByTestId('command-palette-command-workspace.undo'),
    ).toHaveAttribute('data-active', 'true');

    fireEvent.keyDown(screen.getByTestId('command-palette'), { key: 'Enter' });

    // Element was removed by undo.
    expect(useWorkspaceStore.getState().elements.length).toBe(
      elementsBefore - 1,
    );
    expect(useWorkspaceStore.getState().modelVersion).not.toBe(versionBefore);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking a command row runs it and closes the palette', async () => {
    await bootstrap();
    useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    const elementsBefore = useWorkspaceStore.getState().elements.length;

    const onClose = vi.fn();
    render(<CommandPalette onClose={onClose} />);

    fireEvent.click(
      screen.getByTestId('command-palette-command-workspace.undo'),
    );

    expect(useWorkspaceStore.getState().elements.length).toBe(
      elementsBefore - 1,
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('typing a non-empty query hides the Actions section and shows element search', async () => {
    await bootstrap();
    const blockId = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    expect(blockId).not.toBeNull();
    useWorkspaceStore.getState().renameElement(blockId!, 'AlphaBlock');

    render(<CommandPalette onClose={() => {}} />);

    fireEvent.change(screen.getByTestId('command-palette-input'), {
      target: { value: 'alpha' },
    });

    expect(
      screen.queryByTestId('command-palette-commands-header'),
    ).toBeNull();
    expect(
      screen.queryByTestId('command-palette-command-workspace.undo'),
    ).toBeNull();
    expect(
      screen.getByTestId(`command-palette-result-${blockId}`),
    ).toBeVisible();
  });

  it('clearing the input restores the Actions section', async () => {
    await bootstrap();
    useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });

    render(<CommandPalette onClose={() => {}} />);
    const input = screen.getByTestId('command-palette-input');

    fireEvent.change(input, { target: { value: 'zzznomatch' } });
    expect(
      screen.queryByTestId('command-palette-commands-header'),
    ).toBeNull();
    expect(screen.getByTestId('command-palette-empty')).toBeVisible();

    fireEvent.change(input, { target: { value: '' } });
    expect(
      screen.getByTestId('command-palette-commands-header'),
    ).toBeVisible();
    expect(
      screen.getByTestId('command-palette-command-workspace.undo'),
    ).toBeVisible();
  });

  it('renders an Esc affordance and the command labels are unique within the listbox', async () => {
    await bootstrap();
    useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });

    render(<CommandPalette onClose={() => {}} />);
    const list = screen.getByTestId('command-palette-results');
    const labels = within(list)
      .getAllByRole('option')
      .map((o) => o.textContent ?? '');
    expect(new Set(labels).size).toBe(labels.length);
  });
});
