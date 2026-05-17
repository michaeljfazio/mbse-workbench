import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { readApiKey, requestApiKeyModal } from '@/llm/api-key';

import {
  COMMAND_PALETTE_RESULT_CAP,
  searchElements,
  type CommandPaletteMatch,
} from './commandPaletteSearch';
import { downloadProjectJson } from './export';
import {
  BUILT_IN_PALETTE_COMMANDS,
  UNIFIED_LIST_SECTION_THRESHOLD,
  recentPaletteCommands,
  scoreCommandMatch,
  scoreElementMatch,
  selectionScopedCommands,
  type PaletteCommand,
  type PaletteCommandContext,
} from './paletteCommands';
import { useWorkspaceStore } from './store';
import { acceptedChildKinds } from './tree/childAcceptance';

export interface CommandPaletteProps {
  readonly onClose: () => void;
}

type PaletteItem =
  | { readonly kind: 'command'; readonly command: PaletteCommand }
  | { readonly kind: 'element'; readonly match: CommandPaletteMatch };

type PaletteSection = {
  readonly header: string | null;
  readonly headerTestId?: string;
  readonly items: readonly PaletteItem[];
};

// Phase 12 slice D (#234) introduced the modal palette as element search.
// Phase 13 / T-13.05a layered in a typed command registry: with no query the
// palette lists actions; once the user typed, the palette switched to the
// search view. Phase 13 / T-13.05b unifies the typed-query view: matching
// commands and matching elements share a single ranked list, so action
// keywords ("save", "open chat") put the relevant command above any element
// whose name happens to contain the same substring.
const COMMAND_RANK_BIAS = 0.05;

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
  const setInspectorTab = useWorkspaceStore((s) => s.setInspectorTab);
  const setPendingRename = useWorkspaceStore((s) => s.setPendingRename);
  const createDiagram = useWorkspaceStore((s) => s.createDiagram);
  const createRepresentationWithImplicitOwner = useWorkspaceStore(
    (s) => s.createRepresentationWithImplicitOwner,
  );
  const setSelection = useWorkspaceStore((s) => s.setSelection);
  const setActiveDiagram = useWorkspaceStore((s) => s.setActiveDiagram);
  const recentCommandIds = useWorkspaceStore((s) => s.recentCommandIds);
  const recordCommandUse = useWorkspaceStore((s) => s.recordCommandUse);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const listboxId = useId();

  const trimmedQuery = query.trim();
  const queryIsEmpty = trimmedQuery.length === 0;
  const trimmedLowerQuery = trimmedQuery.toLowerCase();

  const commandContext = useMemo<PaletteCommandContext>(() => {
    // `modelVersion` ticks on every bus dispatch/undo/redo, so canUndo/canRedo
    // re-read from the bus each render. Reading it here also brings selection
    // and surface state into the dependency list.
    void modelVersion;
    const onDiagram =
      activeSurfaceKind === 'diagram' && selectedElementIds.length > 0;
    const singleSelection =
      activeSurfaceKind === 'diagram' && selectedElementIds.length === 1;
    const singleId = singleSelection ? selectedElementIds[0] : undefined;
    const selectionTarget = singleId
      ? (elements.find((e) => e.id === singleId) ?? null)
      : null;
    return {
      canUndo: bus?.canUndo() ?? false,
      canRedo: bus?.canRedo() ?? false,
      hasDiagramSelection: onDiagram,
      hasSingleDiagramSelection: singleSelection,
      hasProject: project !== null,
      selectionTargetElement: selectionTarget,
      undo,
      redo,
      save: () => {
        if (project) downloadProjectJson({ project });
      },
      deleteSelection,
      openChat: () => {
        setInspectorTab('chat');
        if (readApiKey() === null) requestApiKeyModal();
      },
      showInspector: () => {
        setInspectorTab('inspector');
      },
      renameSelection: () => {
        const id = selectedElementIds[0];
        if (id) setPendingRename(id);
      },
      createRepresentation: (option) => {
        const owner = selectionTarget;
        if (!owner) return;
        // Per ADR 0014 / #413: if the option carries an `implicitOwnerKind`
        // (or the prompt variant — Cmd-K has no popover affordance, so we
        // default to the first candidate), dispatch ONE compound command
        // wrapping the implicit owner's `create-element` and the new
        // diagram's `create-diagram` so Cmd-Z reverses both atomically.
        const resolvedOwnerKind =
          option.implicitOwnerKind ??
          option.implicitOwnerPromptKinds?.[0] ??
          null;
        if (resolvedOwnerKind !== null) {
          const childOpt = acceptedChildKinds('Package').find(
            (o) => o.kind === resolvedOwnerKind,
          );
          if (!childOpt) return;
          const ownerName = `New ${childOpt.label}`;
          const diagramName = `${ownerName} ${option.label.split(' (')[0]}`;
          const result = createRepresentationWithImplicitOwner(
            owner.id,
            childOpt.kind,
            childOpt.ownerRole,
            ownerName,
            option.viewpointId,
            diagramName,
            option.contextKind,
          );
          if (!result) return;
          setSelection([result.ownerId]);
          setActiveDiagram(result.diagramId);
          return;
        }
        // Single-step path: no implicit owner.
        const ownerName =
          owner.name.length > 0 ? owner.name : owner.kind;
        const name = `${ownerName} ${option.label.split(' (')[0]}`;
        const newId = createDiagram(option.viewpointId, {
          name,
          context: { kind: option.contextKind, id: owner.id },
        });
        if (newId) setActiveDiagram(newId);
      },
    };
  }, [
    bus,
    modelVersion,
    project,
    elements,
    selectedElementIds,
    activeSurfaceKind,
    undo,
    redo,
    deleteSelection,
    setInspectorTab,
    setPendingRename,
    createDiagram,
    createRepresentationWithImplicitOwner,
    setActiveDiagram,
    setSelection,
  ]);

  const allCommands = useMemo<readonly PaletteCommand[]>(
    () => [
      ...BUILT_IN_PALETTE_COMMANDS,
      ...selectionScopedCommands(commandContext),
    ],
    [commandContext],
  );

  const enabledCommands = useMemo(
    () => allCommands.filter((c) => c.isEnabled(commandContext)),
    [allCommands, commandContext],
  );

  const sections = useMemo<readonly PaletteSection[]>(() => {
    if (queryIsEmpty) {
      const recents = recentPaletteCommands(
        allCommands,
        recentCommandIds,
        commandContext,
      );
      const recentIdSet = new Set(recents.map((c) => c.id));
      const remaining = enabledCommands.filter(
        (command) => !recentIdSet.has(command.id),
      );
      const actionItems: readonly PaletteItem[] = remaining.map(
        (command) => ({ kind: 'command', command }) as const,
      );
      if (recents.length === 0) {
        return [
          {
            header: 'Actions',
            headerTestId: 'command-palette-commands-header',
            items: actionItems,
          },
        ];
      }
      const recentItems: readonly PaletteItem[] = recents.map(
        (command) => ({ kind: 'command', command }) as const,
      );
      return [
        {
          header: 'Recent',
          headerTestId: 'command-palette-recent-header',
          items: recentItems,
        },
        {
          header: 'Actions',
          headerTestId: 'command-palette-commands-header',
          items: actionItems,
        },
      ];
    }
    const cmdItems: { item: PaletteItem; score: number }[] = [];
    for (const command of enabledCommands) {
      const s = scoreCommandMatch(command, trimmedLowerQuery);
      if (s > 0) {
        cmdItems.push({
          item: { kind: 'command', command },
          score: s + COMMAND_RANK_BIAS,
        });
      }
    }
    const elemMatches = searchElements(
      trimmedQuery,
      elements,
      diagrams,
      COMMAND_PALETTE_RESULT_CAP,
    );
    const elemItems: { item: PaletteItem; score: number }[] = [];
    for (const match of elemMatches) {
      const s = scoreElementMatch(match, trimmedLowerQuery);
      if (s > 0) {
        elemItems.push({ item: { kind: 'element', match }, score: s });
      }
    }
    const merged = [...cmdItems, ...elemItems];
    // Stable sort by score desc; insertion order breaks ties so commands keep
    // their registry order and elements keep document order within each tier.
    merged.sort((a, b) => b.score - a.score);
    const flat = merged.map((m) => m.item);
    // Below the threshold the flat ranked list reads cleaner than sectioned
    // headers; the header pair only earns its space once the user actually
    // sees enough mixed rows for the type distinction to help.
    const bothKinds = cmdItems.length > 0 && elemItems.length > 0;
    if (flat.length <= UNIFIED_LIST_SECTION_THRESHOLD || !bothKinds) {
      return [{ header: null, items: flat }];
    }
    const cmdsInOrder = flat.filter(
      (item): item is PaletteItem & { kind: 'command' } =>
        item.kind === 'command',
    );
    const elemsInOrder = flat.filter(
      (item): item is PaletteItem & { kind: 'element' } =>
        item.kind === 'element',
    );
    return [
      {
        header: 'Commands',
        headerTestId: 'command-palette-section-commands',
        items: cmdsInOrder,
      },
      {
        header: 'Elements',
        headerTestId: 'command-palette-section-elements',
        items: elemsInOrder,
      },
    ];
  }, [
    queryIsEmpty,
    trimmedQuery,
    trimmedLowerQuery,
    allCommands,
    enabledCommands,
    commandContext,
    elements,
    diagrams,
    recentCommandIds,
  ]);

  const items = useMemo<readonly PaletteItem[]>(
    () => sections.flatMap((s) => s.items),
    [sections],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function runItem(item: PaletteItem): void {
    if (item.kind === 'command') {
      // Record the use BEFORE running. If `run` triggers a re-render (it
      // usually does, e.g. via `setInspectorTab`) the new recents order is
      // already in the store by the time the palette closes.
      recordCommandUse(item.command.id);
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

  const showEmpty = !queryIsEmpty && items.length === 0;
  const hasAnyHeader = sections.some((s) => s.header !== null);
  const activeItem = items[activeIndex];
  const activeOptionId = activeItem
    ? `${listboxId}-opt-${itemKey(activeItem)}`
    : undefined;
  const rows = buildRows(sections);

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
          {queryIsEmpty
            ? 'Run a command or search elements'
            : 'Commands and elements'}
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
              : 'Type a name, id, or command…'
          }
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mx-4 mt-2 block w-[calc(100%-2rem)] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <ul
          id={listboxId}
          data-testid="command-palette-results"
          role="listbox"
          aria-label={
            queryIsEmpty ? 'Available commands' : 'Commands and search results'
          }
          className={
            (hasAnyHeader ? 'mt-3 ' : 'mt-3 border-t border-border ') +
            'max-h-72 overflow-y-auto'
          }
        >
          {rows.map((row) => {
            if (row.kind === 'header') {
              return (
                <li
                  key={`header-${row.headerTestId ?? row.label}`}
                  role="presentation"
                  data-testid={row.headerTestId}
                  className="border-t border-border px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {row.label}
                </li>
              );
            }
            const { item, index } = row;
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
                  data-item-kind="command"
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
                data-item-kind="element"
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
            No commands or elements match “{trimmedQuery}”.
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

type PaletteRow =
  | { readonly kind: 'header'; readonly label: string; readonly headerTestId: string | undefined }
  | { readonly kind: 'item'; readonly item: PaletteItem; readonly index: number };

function buildRows(sections: readonly PaletteSection[]): readonly PaletteRow[] {
  const rows: PaletteRow[] = [];
  let flatIndex = 0;
  for (const section of sections) {
    if (section.header !== null) {
      rows.push({
        kind: 'header',
        label: section.header,
        headerTestId: section.headerTestId,
      });
    }
    for (const item of section.items) {
      rows.push({ kind: 'item', item, index: flatIndex });
      flatIndex++;
    }
  }
  return rows;
}
