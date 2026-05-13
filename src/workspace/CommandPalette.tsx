import { useEffect, useId, useMemo, useRef, useState } from 'react';

import {
  COMMAND_PALETTE_RESULT_CAP,
  searchElements,
  type CommandPaletteMatch,
} from './commandPaletteSearch';
import { useWorkspaceStore } from './store';

export interface CommandPaletteProps {
  readonly onClose: () => void;
}

// Phase 12 slice D (#234). Modal palette for searching every element by name
// or id; selecting a result navigates to the first diagram containing the
// element and focuses it.
export function CommandPalette({ onClose }: CommandPaletteProps): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const diagrams = useWorkspaceStore((s) => s.diagrams);
  const navigate = useWorkspaceStore((s) => s.navigateToElementOnDiagram);
  const setActiveSurface = useWorkspaceStore((s) => s.setActiveSurface);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const listboxId = useId();

  const matches = useMemo(
    () =>
      searchElements(query, elements, diagrams, COMMAND_PALETTE_RESULT_CAP),
    [query, elements, diagrams],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function choose(match: CommandPaletteMatch): void {
    setActiveSurface('diagram');
    navigate(match.id, match.diagramId);
    onClose();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'ArrowDown') {
      if (matches.length === 0) return;
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      if (matches.length === 0) return;
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
      return;
    }
    if (event.key === 'Enter') {
      const m = matches[activeIndex];
      if (!m) return;
      event.preventDefault();
      choose(m);
      return;
    }
    if (event.key === 'Tab') {
      // Keep focus inside the palette so screen-reader users don't tab into
      // the obscured workspace beneath the modal backdrop.
      event.preventDefault();
      inputRef.current?.focus();
    }
  }

  const showEmpty = query.trim().length > 0 && matches.length === 0;
  const activeOptionId =
    matches[activeIndex] !== undefined
      ? `${listboxId}-opt-${matches[activeIndex]!.id}`
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
          Search elements
        </label>
        <input
          id="command-palette-input"
          ref={inputRef}
          data-testid="command-palette-input"
          type="text"
          role="combobox"
          aria-expanded={matches.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          placeholder="Type a name or id…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mx-4 mt-2 block w-[calc(100%-2rem)] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <ul
          id={listboxId}
          data-testid="command-palette-results"
          role="listbox"
          aria-label="Search results"
          className="mt-3 max-h-72 overflow-y-auto border-t border-border"
        >
          {matches.map((match, index) => {
            const optionId = `${listboxId}-opt-${match.id}`;
            const isActive = index === activeIndex;
            return (
              <li
                key={match.id}
                id={optionId}
                role="option"
                aria-selected={isActive}
                data-testid={`command-palette-result-${match.id}`}
                data-active={isActive ? 'true' : 'false'}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(match)}
                className={
                  (isActive
                    ? 'bg-accent text-accent-foreground '
                    : 'text-foreground ') +
                  'flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm'
                }
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
            No elements match “{query.trim()}”.
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
