import { useEffect, useRef } from 'react';

export interface CommandPaletteStubProps {
  readonly onClose: () => void;
}

/**
 * Placeholder modal opened by Cmd/Ctrl-K. The real search palette lands in
 * Phase 12 slice D (#234); this stub exists so the shortcut binding can be
 * exercised and the docs / empty-state crib aren't lying about Cmd-K.
 */
export function CommandPaletteStub({
  onClose,
}: CommandPaletteStubProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      data-testid="command-palette-stub"
      role="dialog"
      aria-modal="true"
      aria-label="Search elements"
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 pt-32"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-md border border-border bg-card p-4 shadow-xl">
        <label
          htmlFor="command-palette-stub-input"
          className="block text-xs font-semibold text-foreground"
        >
          Search elements
        </label>
        <input
          id="command-palette-stub-input"
          ref={inputRef}
          data-testid="command-palette-stub-input"
          type="text"
          placeholder="Search arrives in slice D…"
          disabled
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Press <kbd className="font-mono">Esc</kbd> to close.
        </p>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            data-testid="command-palette-stub-close"
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
