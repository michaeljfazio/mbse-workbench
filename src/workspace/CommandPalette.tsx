import { useEffect, useId, useMemo, useRef, useState } from 'react';

import {
  COMMAND_PALETTE_RESULT_CAP,
  searchElements,
  type CommandPaletteMatch,
} from './commandPaletteSearch';
import { downloadProjectJson } from './export';
import {
  BUILT_IN_PALETTE_COMMANDS,
  filterPaletteCommands,
  type PaletteCommand,
  type PaletteCommandContext,
} from './paletteCommands';
import { useWorkspaceStore } from './store';

export interface CommandPaletteProps {
  readonly onClose: () => void;
}

type PaletteItem =
  | { readonly kind: 'command'; readonly command: PaletteCommand }
  | { readonly kind: 'element'; readonly match: CommandPaletteMatch };

// Phase 12 slice D (#234) introduced the modal palette as element search.
// Phase 13 / T-13.05a layers in a typed command registry: with no query the
// palette lists actions (Undo / Redo / Save / Delete selection); once the user
// types, the palette switches to the search view so existing element
// navigation keeps working unchanged. Later slices unify command + element
// matches and add more groups.
export function CommandPalette({ onClose }: CommandPaletteProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const diagrams = useWorkspaceStore((s) => s.diagrams);
  const navigate = useWorkspaceStore((s) => s.navigateToElementOnDiagram);
  const setActiveSurface = useWorkspaceStore((s) => s.setActiveSurface);
  const bus = useWorkspaceStore((s) => s.bus);
  const modelVersion = useWorkspaceStore((s) => s.modelVersion);
  const project = useWorkspaceStore((s) => s.project);
  const selectedElementIds = useWorkspaceStore((s) => s.selectedElementIds);
  const activeSurfaceKind = useWorkspaceStore((s) => s.activeSurfaceKind);
  const undo = useWorkspaceStore((s) => s.undo);
  const redo = useWorkspaceStore((s) => s.redo);
  const deleteSelection = useWorkspaceStore((s) => s.deleteSelection);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const listboxId = useId();

  const trimmedQuery = query.trim();
  const queryIsEmpty = trimmedQuery.length === 0;

  const commandContext = useMemo<PaletteCommandContext>(() => {
    // `modelVersion` ticks on every bus dispatch/undo/redo, so canUndo/canRedo
    // re-read from the bus each render. Reading it here also brings selection
    // and surface state into the dependency list.
    void modelVersion;
    return {
      canUndo: bus?.canUndo() ?? false,
      canRedo: bus?.canRedo() ?? false,
      hasDiagramSelection:
        activeSurfaceKind === 'diagram' && selectedElementIds.length > 0,
      hasProject: project !== null,
      undo,
      redo,
      save: () => {
        if (project) downloadProjectJson({ project });
      },
      deleteSelection,
    };
  }, [
    bus,
    modelVersion,
    project,
    selectedElementIds,
    activeSurfaceKind,
    undo,
    redo,
    deleteSelection,
  ]);

  const commands = useMemo(
    () =>
      filterPaletteCommands(
        queryIsEmpty ? '' : trimmedQuery,
        BUILT_IN_PALETTE_COMMANDS,
        commandContext,
      ),
    [queryIsEmpty, trimmedQuery, commandContext],
  );

  const elementMatches = useMemo(
    () =>
      queryIsEmpty
        ? []
        : searchElements(query, elements, diagrams, COMMAND_PALETTE_RESULT_CAP),
    [queryIsEmpty, query, elements, diagrams],
  );

  const items = useMemo<readonly PaletteItem[]>(() => {
    if (queryIsEmpty) {
      return commands.map((c) => ({ kind: 'command', command: c }) as const);
    }
    return elementMatches.map(
      (m) => ({ kind: 'element', match: m }) as const,
    );
  }, [queryIsEmpty, commands, elementMatches]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function runItem(item: PaletteItem): void {
    if (item.kind === 'command') {
      item.command.run(commandContext);
      onClose();
      return;
    }
    setActiveSurface('diagram');
    navigate(item.match.id, item.match.diagramId);
    onClose();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'ArrowDown') {
      if (items.length === 0) return;
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      if (items.length === 0) return;
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
      return;
    }
    if (event.key === 'Enter') {
      const item = items[activeIndex];
      if (!item) return;
      event.preventDefault();
      runItem(item);
      return;
    }
    if (event.key === 'Tab') {
      // Keep focus inside the palette so screen-reader users don't tab into
      // the obscured workspace beneath the modal backdrop.
      event.preventDefault();
      inputRef.current?.focus();
    }
  }

  const showEmpty = !queryIsEmpty && elementMatches.length === 0;
  const showCommandsHeader = queryIsEmpty && items.length > 0;
  const activeItem = items[activeIndex];
  const activeOptionId = activeItem
    ? `${listboxId}-opt-${itemKey(activeItem)}`
    : undefined;

  return (
    <div
      data-testid="command-palette"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 pt-24"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div className="w-full max-w-xl rounded-md border border-border bg-card shadow-xl">
        <label
          id={labelId}
          htmlFor="command-palette-input"
          className="block px-4 pt-4 text-xs font-semibold text-foreground"
        >
          {queryIsEmpty ? 'Run a command or search elements' : 'Search elements'}
        </label>
        <input
          id="command-palette-input"
          ref={inputRef}
          data-testid="command-palette-input"
          type="text"
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          placeholder={
            queryIsEmpty
              ? 'Type to search elements, or pick a command below…'
              : 'Type a name or id…'
          }
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mx-4 mt-2 block w-[calc(100%-2rem)] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
        {showCommandsHeader ? (
          <div
            data-testid="command-palette-commands-header"
            className="mt-3 border-t border-border px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Actions
          </div>
        ) : null}
        <ul
          id={listboxId}
          data-testid="command-palette-results"
          role="listbox"
          aria-label={queryIsEmpty ? 'Available commands' : 'Search results'}
          className={
            (showCommandsHeader ? '' : 'mt-3 border-t border-border ') +
            'max-h-72 overflow-y-auto'
          }
        >
          {items.map((item, index) => {
            const key = itemKey(item);
            const optionId = `${listboxId}-opt-${key}`;
            const isActive = index === activeIndex;
            const baseClasses =
              'flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm';
            const stateClasses = isActive
              ? 'bg-accent text-accent-foreground'
              : 'text-foreground';
            if (item.kind === 'command') {
              const { command } = item;
              return (
                <li
                  key={key}
                  id={optionId}
                  role="option"
                  aria-selected={isActive}
                  data-testid={`command-palette-command-${command.id}`}
                  data-active={isActive ? 'true' : 'false'}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => runItem(item)}
                  className={`${stateClasses} ${baseClasses}`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{command.label}</span>
                    {command.description ? (
                      <span className="truncate text-xs opacity-80">
                        {command.description}
                      </span>
                    ) : null}
                  </span>
                  {command.shortcut ? (
                    <kbd className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                      {command.shortcut}
                    </kbd>
                  ) : null}
                </li>
              );
            }
            const { match } = item;
            return (
              <li
                key={key}
                id={optionId}
                role="option"
                aria-selected={isActive}
                data-testid={`command-palette-result-${match.id}`}
                data-active={isActive ? 'true' : 'false'}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => runItem(item)}
                className={`${stateClasses} ${baseClasses}`}
              >
                <span className="truncate">
                  <span className="font-medium">{match.name}</span>
                  <span className="ml-2 text-xs opacity-80">{match.kind}</span>
                </span>
                <span className="shrink-0 text-xs opacity-80">
                  {match.diagramName}
                </span>
              </li>
            );
          })}
        </ul>
        {showEmpty ? (
          <p
            data-testid="command-palette-empty"
            className="px-4 py-3 text-xs text-muted-foreground"
          >
            No elements match “{trimmedQuery}”.
          </p>
        ) : null}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-foreground">
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate ·{' '}
            <kbd className="font-mono">Enter</kbd> select ·{' '}
            <kbd className="font-mono">Esc</kbd> close
          </span>
          <button
            type="button"
            data-testid="command-palette-close"
            onClick={onClose}
            className="rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition hover:bg-accent"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function itemKey(item: PaletteItem): string {
  return item.kind === 'command'
    ? `command-${item.command.id}`
    : `element-${item.match.id}`;
}
