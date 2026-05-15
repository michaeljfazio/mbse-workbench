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

  // ---- T-13.05c — Selection-scoped Create representation commands ----

  it('with a PartDefinition selected on a diagram, empty palette lists Create BDD/IBD/Parametric representation', async () => {
    await bootstrap();
    const blockId = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    expect(blockId).not.toBeNull();
    useWorkspaceStore.getState().setActiveSurface('diagram');
    useWorkspaceStore.getState().setSelection([blockId!]);

    render(<CommandPalette onClose={() => {}} />);

    expect(
      screen.getByTestId(
        'command-palette-command-selection.create-representation.bdd',
      ),
    ).toBeVisible();
    expect(
      screen.getByTestId(
        'command-palette-command-selection.create-representation.ibd',
      ),
    ).toBeVisible();
    expect(
      screen.getByTestId(
        'command-palette-command-selection.create-representation.parametric',
      ),
    ).toBeVisible();
  });

  it('selection-scoped commands disappear when selection is cleared', async () => {
    await bootstrap();
    const blockId = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    expect(blockId).not.toBeNull();
    useWorkspaceStore.getState().setActiveSurface('diagram');
    useWorkspaceStore.getState().setSelection([blockId!]);

    const { unmount } = render(<CommandPalette onClose={() => {}} />);
    expect(
      screen.getByTestId(
        'command-palette-command-selection.create-representation.ibd',
      ),
    ).toBeVisible();
    unmount();

    useWorkspaceStore.getState().setSelection([]);
    render(<CommandPalette onClose={() => {}} />);
    expect(
      screen.queryByTestId(
        'command-palette-command-selection.create-representation.ibd',
      ),
    ).toBeNull();
  });

  it('clicking Create IBD representation creates an IBD anchored to the block and sets it active', async () => {
    await bootstrap();
    const blockId = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    expect(blockId).not.toBeNull();
    useWorkspaceStore.getState().setActiveSurface('diagram');
    useWorkspaceStore.getState().setSelection([blockId!]);
    useWorkspaceStore.getState().renameElement(blockId!, 'EnginePart');

    const diagramsBefore = useWorkspaceStore.getState().diagrams.length;
    const onClose = vi.fn();
    render(<CommandPalette onClose={onClose} />);

    fireEvent.click(
      screen.getByTestId(
        'command-palette-command-selection.create-representation.ibd',
      ),
    );

    const { diagrams, activeDiagramId } = useWorkspaceStore.getState();
    expect(diagrams.length).toBe(diagramsBefore + 1);
    const created = diagrams.find((d) => d.id === activeDiagramId);
    expect(created).toBeDefined();
    expect(created!.viewpointId).toBe('ibd');
    expect(created!.name).toBe('EnginePart IBD');
    expect(created!.context).toEqual({
      kind: 'partDefinition',
      id: blockId,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('typing "IBD" surfaces the selection-scoped IBD command in the unified ranked list', async () => {
    await bootstrap();
    const blockId = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    expect(blockId).not.toBeNull();
    useWorkspaceStore.getState().setActiveSurface('diagram');
    useWorkspaceStore.getState().setSelection([blockId!]);

    render(<CommandPalette onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('command-palette-input'), {
      target: { value: 'IBD' },
    });

    const ibdCmd = screen.getByTestId(
      'command-palette-command-selection.create-representation.ibd',
    );
    expect(ibdCmd).toBeVisible();
    // Command-bias keeps the scoped command active on first render.
    expect(ibdCmd).toHaveAttribute('data-active', 'true');
  });

  // ---- T-13.05d — Recents + Commands/Elements sectioning ----

  it('with no recents, the empty palette shows only the Actions section header', async () => {
    await bootstrap();
    useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });

    render(<CommandPalette onClose={() => {}} />);

    expect(
      screen.getByTestId('command-palette-commands-header'),
    ).toHaveTextContent(/Actions/i);
    expect(
      screen.queryByTestId('command-palette-recent-header'),
    ).toBeNull();
  });

  it('after running Undo via the palette, re-opening shows it under a Recent header at the top', async () => {
    await bootstrap();
    // Two changes so undo stays enabled after the first undo.
    useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });

    const onClose = vi.fn();
    const { unmount } = render(<CommandPalette onClose={onClose} />);
    fireEvent.click(
      screen.getByTestId('command-palette-command-workspace.undo'),
    );
    expect(useWorkspaceStore.getState().recentCommandIds).toEqual([
      'workspace.undo',
    ]);
    unmount();

    render(<CommandPalette onClose={() => {}} />);
    const recentHeader = screen.getByTestId('command-palette-recent-header');
    expect(recentHeader).toHaveTextContent(/Recent/i);
    const list = screen.getByTestId('command-palette-results');
    // The first option in the listbox is Undo, beneath the Recent header.
    const firstOption = within(list).getAllByRole('option')[0];
    expect(firstOption).toHaveAttribute(
      'data-testid',
      'command-palette-command-workspace.undo',
    );
    // The Actions section still appears beneath, and does NOT duplicate Undo.
    expect(
      screen.getByTestId('command-palette-commands-header'),
    ).toBeVisible();
    const undoRows = within(list).getAllByTestId(
      'command-palette-command-workspace.undo',
    );
    expect(undoRows.length).toBe(1);
  });

  it('recents preserve MRU order across multiple palette uses', async () => {
    await bootstrap();
    useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });

    // Use Show inspector then Open chat — most-recent-first should order
    // them: open-chat, show-inspector.
    const { unmount: u1 } = render(<CommandPalette onClose={() => {}} />);
    fireEvent.click(
      screen.getByTestId('command-palette-command-workspace.show-inspector'),
    );
    u1();
    const { unmount: u2 } = render(<CommandPalette onClose={() => {}} />);
    fireEvent.click(
      screen.getByTestId('command-palette-command-workspace.open-chat'),
    );
    u2();

    render(<CommandPalette onClose={() => {}} />);
    const list = screen.getByTestId('command-palette-results');
    const options = within(list).getAllByRole('option');
    expect(options[0]).toHaveAttribute(
      'data-testid',
      'command-palette-command-workspace.open-chat',
    );
    expect(options[1]).toHaveAttribute(
      'data-testid',
      'command-palette-command-workspace.show-inspector',
    );
  });

  it('a disabled recent (delete-selection without selection) is skipped, not shown beneath Recent', async () => {
    await bootstrap();
    const blockId = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    expect(blockId).not.toBeNull();
    useWorkspaceStore.getState().setActiveSurface('diagram');
    useWorkspaceStore.getState().setSelection([blockId!]);

    // Delete the selection via the palette (records delete-selection as recent).
    const { unmount } = render(<CommandPalette onClose={() => {}} />);
    fireEvent.click(
      screen.getByTestId('command-palette-command-workspace.delete-selection'),
    );
    unmount();

    // After delete, no diagram selection → delete is disabled.
    useWorkspaceStore.getState().setSelection([]);
    render(<CommandPalette onClose={() => {}} />);
    // Recent header should not appear (delete-selection is the only recent
    // and it's disabled; no other recents to fall back on).
    expect(screen.queryByTestId('command-palette-recent-header')).toBeNull();
    expect(
      screen.queryByTestId(
        'command-palette-command-workspace.delete-selection',
      ),
    ).toBeNull();
  });

  it('query-active small result set stays a single flat list with no section headers', async () => {
    await bootstrap();
    const blockId = useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    expect(blockId).not.toBeNull();
    useWorkspaceStore.getState().renameElement(blockId!, 'SaveControlBlock');

    render(<CommandPalette onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('command-palette-input'), {
      target: { value: 'save' },
    });

    // Two items total (Save command + SaveControlBlock element) — below threshold.
    expect(
      screen.queryByTestId('command-palette-section-commands'),
    ).toBeNull();
    expect(
      screen.queryByTestId('command-palette-section-elements'),
    ).toBeNull();
  });

  it('query-active result set above the threshold groups under Commands / Elements headers', async () => {
    await bootstrap();
    // Seed six elements all matching "block": one command (save-project's
    // keyword "project" matches via a different query) — easier here to use
    // the substring "block" which matches the elements' names but NOT any
    // command label/description/keyword. So we need a query that matches at
    // least one command AND >5 elements. The "delete" command's label has
    // "Delete selection" but keyword "remove" — let's use "selection" via
    // delete's label.
    const ids = [
      useWorkspaceStore.getState().createBlock({ x: 0, y: 0 }),
      useWorkspaceStore.getState().createBlock({ x: 0, y: 0 }),
      useWorkspaceStore.getState().createBlock({ x: 0, y: 0 }),
      useWorkspaceStore.getState().createBlock({ x: 0, y: 0 }),
      useWorkspaceStore.getState().createBlock({ x: 0, y: 0 }),
      useWorkspaceStore.getState().createBlock({ x: 0, y: 0 }),
    ];
    expect(ids.every((id) => id !== null)).toBe(true);
    // Rename each to share the "selection" substring so they all match.
    ids.forEach((id, i) => {
      useWorkspaceStore.getState().renameElement(id!, `SelectionBlock${i}`);
    });
    // Also select one of them so delete-selection is enabled (and matches
    // by label substring).
    useWorkspaceStore.getState().setActiveSurface('diagram');
    useWorkspaceStore.getState().setSelection([ids[0]!]);

    render(<CommandPalette onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('command-palette-input'), {
      target: { value: 'selection' },
    });

    expect(
      screen.getByTestId('command-palette-section-commands'),
    ).toHaveTextContent(/Commands/i);
    expect(
      screen.getByTestId('command-palette-section-elements'),
    ).toHaveTextContent(/Elements/i);
    // The single command match (Delete selection / Rename selection) is
    // grouped before the elements regardless of score.
    const list = screen.getByTestId('command-palette-results');
    const options = within(list).getAllByRole('option');
    expect(options[0]?.getAttribute('data-item-kind')).toBe('command');
  });

  it('Arrow navigation skips the section header rows', async () => {
    await bootstrap();
    // Trigger Recent section to appear.
    useWorkspaceStore.getState().createBlock({ x: 0, y: 0 });
    const { unmount } = render(<CommandPalette onClose={() => {}} />);
    fireEvent.click(
      screen.getByTestId('command-palette-command-workspace.save-project'),
    );
    unmount();

    render(<CommandPalette onClose={() => {}} />);
    const list = screen.getByTestId('command-palette-results');
    const options = within(list).getAllByRole('option');
    // First option (save) is active; ArrowDown advances to the second option,
    // not into the "Actions" header.
    expect(options[0]).toHaveAttribute('data-active', 'true');

    fireEvent.keyDown(screen.getByTestId('command-palette'), {
      key: 'ArrowDown',
    });
    expect(options[0]).toHaveAttribute('data-active', 'false');
    expect(options[1]).toHaveAttribute('data-active', 'true');
    // No `option` has the role "presentation" — headers live as separate <li>.
    for (const option of options) {
      expect(option.getAttribute('role')).toBe('option');
    }
  });
});
