// Phase 13 / T-13.05a — Command-palette scaffold.
// Phase 13 / T-13.05b — Scoring + unified ranked list + open-chat /
// show-inspector / rename-selection commands.
//
// The Cmd-K palette grew up as element-search-only (Phase 12 slice D). T-13.05a
// introduced a typed command registry so the same palette can host actions
// alongside element navigation; T-13.05b adds a small scoring helper so command
// matches and element matches can be ranked against each other in one list.
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
  readonly hasSingleDiagramSelection: boolean;
  readonly hasProject: boolean;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly save: () => void;
  readonly deleteSelection: () => void;
  readonly openChat: () => void;
  readonly showInspector: () => void;
  readonly renameSelection: () => void;
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
  {
    id: 'workspace.open-chat',
    label: 'Open chat',
    description: 'Switch the sidebar to the chat tab',
    keywords: ['ai', 'llm', 'assistant'],
    isEnabled: (c) => c.hasProject,
    run: (c) => {
      c.openChat();
    },
  },
  {
    id: 'workspace.show-inspector',
    label: 'Show inspector',
    description: 'Switch the sidebar to the inspector tab',
    keywords: ['properties', 'panel'],
    isEnabled: (c) => c.hasProject,
    run: (c) => {
      c.showInspector();
    },
  },
  {
    id: 'workspace.rename-selection',
    label: 'Rename selection',
    description: 'Inline-rename the selected element in the project tree',
    keywords: ['edit'],
    isEnabled: (c) => c.hasSingleDiagramSelection,
    run: (c) => {
      c.renameSelection();
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
  return enabled.filter((c) => scoreCommandMatch(c, trimmed) > 0);
}

// Scoring scale (T-13.05b). All scorers return values in [0, 1]; 0 means
// "no match". Tiers chosen so an exact label match always outranks a prefix
// match, prefix outranks word-prefix, word-prefix outranks substring.
//   exact         = 1.00
//   prefix        = 0.80
//   word-prefix   = 0.60
//   substring     = 0.40
// The CommandPalette adds a small constant bias to command scores so that
// when a user types an action keyword (e.g. "save") the matching command
// out-ranks an element whose name happens to contain the same substring.

const SCORE_EXACT = 1;
const SCORE_PREFIX = 0.8;
const SCORE_WORD_PREFIX = 0.6;
const SCORE_SUBSTRING = 0.4;

const WORD_BOUNDARY_CHARS = [' ', '-', '_', '.', '/'];

function scoreSubstring(needle: string, haystack: string): number {
  const lc = haystack.toLowerCase();
  if (lc === needle) return SCORE_EXACT;
  if (lc.startsWith(needle)) return SCORE_PREFIX;
  for (const sep of WORD_BOUNDARY_CHARS) {
    if (lc.includes(sep + needle)) return SCORE_WORD_PREFIX;
  }
  if (lc.includes(needle)) return SCORE_SUBSTRING;
  return 0;
}

function scoreAcrossHaystacks(
  needle: string,
  haystacks: readonly string[],
): number {
  let best = 0;
  for (const h of haystacks) {
    if (!h) continue;
    const s = scoreSubstring(needle, h);
    if (s > best) best = s;
    if (best === SCORE_EXACT) return best;
  }
  return best;
}

export function scoreCommandMatch(
  command: PaletteCommand,
  trimmedLowerQuery: string,
): number {
  if (trimmedLowerQuery.length === 0) return 0;
  const haystacks: string[] = [
    command.label,
    command.description ?? '',
    ...(command.keywords ?? []),
  ];
  return scoreAcrossHaystacks(trimmedLowerQuery, haystacks);
}

export function scoreElementMatch(
  candidate: { readonly name: string; readonly id: string },
  trimmedLowerQuery: string,
): number {
  if (trimmedLowerQuery.length === 0) return 0;
  return scoreAcrossHaystacks(trimmedLowerQuery, [
    candidate.name,
    candidate.id,
  ]);
}
