// Phase 13 / T-13.05a — Command-palette scaffold.
//
// The Cmd-K palette grew up as element-search-only (Phase 12 slice D). This
// module introduces a typed command registry so the same palette can host
// actions ("Undo", "Save project as JSON", …) alongside element navigation.
//
// Each command is pure metadata + two pure functions (`isEnabled`, `run`) that
// consume a small `PaletteCommandContext`. The CommandPalette component
// constructs the context from the workspace store and dispatches the command
// when the user picks it. Keeping commands free of any direct store import
// makes them trivially unit-testable without bootstrapping the store, and
// keeps the API surface stable as future slices add more groups.

export interface PaletteCommandContext {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly hasDiagramSelection: boolean;
  readonly hasProject: boolean;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly save: () => void;
  readonly deleteSelection: () => void;
}

export interface PaletteCommand {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly keywords?: readonly string[];
  readonly shortcut?: string;
  isEnabled(context: PaletteCommandContext): boolean;
  run(context: PaletteCommandContext): void;
}

export const BUILT_IN_PALETTE_COMMANDS: readonly PaletteCommand[] = [
  {
    id: 'workspace.undo',
    label: 'Undo',
    description: 'Reverse the last model change',
    keywords: ['revert'],
    shortcut: '⌘Z',
    isEnabled: (c) => c.canUndo,
    run: (c) => {
      c.undo();
    },
  },
  {
    id: 'workspace.redo',
    label: 'Redo',
    description: 'Reapply the last undone change',
    keywords: [],
    shortcut: '⌘⇧Z',
    isEnabled: (c) => c.canRedo,
    run: (c) => {
      c.redo();
    },
  },
  {
    id: 'workspace.save-project',
    label: 'Save project as JSON',
    description: 'Download a snapshot of the current project',
    keywords: ['download', 'export'],
    shortcut: '⌘S',
    isEnabled: (c) => c.hasProject,
    run: (c) => {
      c.save();
    },
  },
  {
    id: 'workspace.delete-selection',
    label: 'Delete selection',
    description: 'Remove the selected elements on the active diagram',
    keywords: ['remove'],
    shortcut: 'Delete',
    isEnabled: (c) => c.hasDiagramSelection,
    run: (c) => {
      c.deleteSelection();
    },
  },
];

export function filterPaletteCommands(
  query: string,
  commands: readonly PaletteCommand[],
  context: PaletteCommandContext,
): readonly PaletteCommand[] {
  const enabled = commands.filter((c) => c.isEnabled(context));
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return enabled;
  return enabled.filter((c) => {
    if (c.label.toLowerCase().includes(trimmed)) return true;
    if (c.description && c.description.toLowerCase().includes(trimmed)) {
      return true;
    }
    for (const k of c.keywords ?? []) {
      if (k.toLowerCase().includes(trimmed)) return true;
    }
    return false;
  });
}
