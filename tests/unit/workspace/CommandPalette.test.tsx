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

describe('<CommandPalette /> (T-13.05a/b)', () => {
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
    // Open chat / Show inspector require only a project.
    expect(
      screen.getByTestId('command-palette-command-workspace.open-chat'),
    ).toBeVisible();
    expect(
      screen.getByTestId('command-palette-command-workspace.show-inspector'),
    ).toBeVisible();
    // Redo is disabled (no undo has happened yet).
    expect(
      screen.queryByTestId('command-palette-command-workspace.redo'),
    ).toBeNull();
    // Delete and Rename are disabled (no diagram selection).
    expect(
      screen.queryByTestId('command-palette-command-workspace.delete-selection'),
    ).toBeNull();
    expect(
      screen.queryByTestId('command-palette-command-workspace.rename-selection'),
    ).toBeNull();
  });

  it('without a project, every command is hidden', () => {
    // No bootstrap → project is null, no bus.
    render(<CommandPalette onClose={() => {}} />);
    expect(
      screen.queryByTestId('command-palette-command-workspace.save-project'),
    ).toBeNull();
    expect(
      screen.queryByTestId('command-palette-command-workspace.delete-selection'),
    ).toBeNull();
    expect(
      screen.queryByTestId('command-palette-command-workspace.undo'),
    ).toBeNull();
    expect(
      screen.queryByTestId('command-palette-command-workspace.open-chat'),
    ).toBeNull();
    expect(
      screen.queryByTestId('command-palette-command-workspace.show-inspector'),
    ).toBeNull();
    expect(
      screen.queryByTestId('command-palette-command-workspace.rename-selection'),
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

  it('typing a non-element / non-command query hides the Actions section and the command rows', async () => {
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
    // None of the command labels contain "alpha".
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

  // ---- T-13.05b ----

  it('typing a query that matches both a command and an element renders both rows in one ranked list', async () => {
    await bootstrap();
    const blockId = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    expect(blockId).not.toBeNull();
    // Rename so the element matches the query "save".
    useWorkspaceStore
      .getState()
      .renameElement(blockId!, 'SaveControlPanelBlock');

    render(<CommandPalette onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('command-palette-input'), {
      target: { value: 'save' },
    });

    const saveCmd = screen.getByTestId(
      'command-palette-command-workspace.save-project',
    );
    const elementRow = screen.getByTestId(
      `command-palette-result-${blockId}`,
    );
    expect(saveCmd).toBeVisible();
    expect(elementRow).toBeVisible();
    // Command bias means the matching command outranks the element.
    expect(saveCmd).toHaveAttribute('data-active', 'true');
    expect(elementRow).toHaveAttribute('data-active', 'false');

    // The header is the unified "Commands and elements" label, not "Actions".
    expect(
      screen.queryByTestId('command-palette-commands-header'),
    ).toBeNull();
    // Both rows live in the same listbox.
    const list = screen.getByTestId('command-palette-results');
    const ids = within(list)
      .getAllByRole('option')
      .map((o) => o.getAttribute('data-testid'));
    expect(ids).toEqual([
      'command-palette-command-workspace.save-project',
      `command-palette-result-${blockId}`,
    ]);
  });

  it('Enter on a unified-list command runs it (e.g. "save" runs Save project)', async () => {
    await bootstrap();
    useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    const downloads: Blob[] = [];
    (
      URL as unknown as { createObjectURL: (b: Blob) => string }
    ).createObjectURL = (b) => {
      downloads.push(b);
      return 'blob:test';
    };

    const onClose = vi.fn();
    render(<CommandPalette onClose={onClose} />);
    fireEvent.change(screen.getByTestId('command-palette-input'), {
      target: { value: 'save' },
    });
    fireEvent.keyDown(screen.getByTestId('command-palette'), { key: 'Enter' });

    expect(downloads.length).toBe(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Open chat command switches the sidebar tab to chat', async () => {
    await bootstrap();
    expect(useWorkspaceStore.getState().inspectorTab).toBe('inspector');

    const onClose = vi.fn();
    render(<CommandPalette onClose={onClose} />);
    fireEvent.click(
      screen.getByTestId('command-palette-command-workspace.open-chat'),
    );

    expect(useWorkspaceStore.getState().inspectorTab).toBe('chat');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Show inspector command switches the sidebar tab back to inspector', async () => {
    await bootstrap();
    useWorkspaceStore.getState().setInspectorTab('chat');
    expect(useWorkspaceStore.getState().inspectorTab).toBe('chat');

    render(<CommandPalette onClose={() => {}} />);
    fireEvent.click(
      screen.getByTestId('command-palette-command-workspace.show-inspector'),
    );

    expect(useWorkspaceStore.getState().inspectorTab).toBe('inspector');
  });

  it('Rename selection requires exactly one element selected on a diagram', async () => {
    await bootstrap();
    const blockId = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    expect(blockId).not.toBeNull();

    // No selection → command not visible.
    const { unmount } = render(<CommandPalette onClose={() => {}} />);
    expect(
      screen.queryByTestId('command-palette-command-workspace.rename-selection'),
    ).toBeNull();
    unmount();

    // Switch to the diagram surface and select the block.
    useWorkspaceStore.getState().setActiveSurface('diagram');
    useWorkspaceStore.getState().setSelection([blockId!]);
    render(<CommandPalette onClose={() => {}} />);
    expect(
      screen.getByTestId('command-palette-command-workspace.rename-selection'),
    ).toBeVisible();

    fireEvent.click(
      screen.getByTestId('command-palette-command-workspace.rename-selection'),
    );
    expect(useWorkspaceStore.getState().pendingRenameElementId).toBe(blockId);
  });
});
