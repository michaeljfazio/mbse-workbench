import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  RequirementElement,
  RequirementTraceKind,
} from '@/model';

const ALL_KINDS: readonly {
  id: RequirementTraceKind;
  label: string;
}[] = [
  { id: 'derive', label: 'Derive' },
  { id: 'satisfy', label: 'Satisfy' },
  { id: 'verify', label: 'Verify' },
  { id: 'refine', label: 'Refine' },
];

export interface LinkRequirementPopoverProps {
  readonly x: number;
  readonly y: number;
  readonly requirements: readonly RequirementElement[];
  readonly allowedKindsFor: (
    requirement: RequirementElement,
  ) => readonly RequirementTraceKind[];
  readonly onPick: (
    requirement: RequirementElement,
    kind: RequirementTraceKind,
  ) => void;
  readonly onCancel: () => void;
}

function matches(requirement: RequirementElement, query: string): boolean {
  if (query.length === 0) return true;
  const q = query.toLowerCase();
  return (
    requirement.name.toLowerCase().includes(q) ||
    (requirement.reqId ?? '').toLowerCase().includes(q) ||
    requirement.text.toLowerCase().includes(q)
  );
}

export function LinkRequirementPopover({
  x,
  y,
  requirements,
  allowedKindsFor,
  onPick,
  onCancel,
}: LinkRequirementPopoverProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    requirements[0]?.id ?? null,
  );

  const filtered = useMemo(
    () => requirements.filter((r) => matches(r, query)),
    [requirements, query],
  );

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!filtered.some((r) => r.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => requirements.find((r) => r.id === selectedId) ?? null,
    [requirements, selectedId],
  );

  const allowedSet = useMemo(
    () =>
      selected
        ? new Set<RequirementTraceKind>(allowedKindsFor(selected))
        : new Set<RequirementTraceKind>(),
    [selected, allowedKindsFor],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    const onPointerDown = (e: PointerEvent): void => {
      if (!ref.current) return;
      if (e.target instanceof Node && ref.current.contains(e.target)) return;
      onCancel();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [onCancel]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Link requirement"
      data-testid="link-requirement-popover"
      style={{ left: x, top: y, position: 'fixed' }}
      className="z-50 flex w-80 flex-col gap-2 rounded-md border border-border bg-card p-2 shadow-lg"
    >
      <p className="px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-foreground/75">
        Link requirement
      </p>
      <label htmlFor="link-requirement-search" className="sr-only">
        Search requirements
      </label>
      <input
        id="link-requirement-search"
        type="text"
        value={query}
        data-testid="link-requirement-search"
        placeholder="Search by name, id or text"
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
      />
      {requirements.length === 0 ? (
        <p
          data-testid="link-requirement-empty"
          className="rounded-md border border-dashed border-border bg-muted/40 px-2 py-3 text-center text-xs text-foreground/75"
        >
          No requirements available — create one on the Requirements diagram
          first.
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label="Requirements"
          data-testid="link-requirement-list"
          className="flex max-h-48 flex-col gap-1 overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <p
              data-testid="link-requirement-no-matches"
              className="rounded-md border border-dashed border-border bg-muted/40 px-2 py-2 text-center text-xs text-foreground/75"
            >
              No matches for &ldquo;{query}&rdquo;
            </p>
          ) : (
            filtered.map((r) => {
              const isSelected = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-testid={`link-requirement-row-${r.id}`}
                  onClick={() => setSelectedId(r.id)}
                  className={`flex w-full flex-col items-start gap-0.5 rounded px-2 py-1 text-left text-sm transition focus:outline-none ${
                    isSelected
                      ? 'bg-accent text-foreground ring-1 ring-primary'
                      : 'text-foreground hover:bg-accent/60'
                  }`}
                >
                  <span className="flex items-baseline gap-2">
                    {r.reqId ? (
                      <span className="font-mono text-[10px] text-foreground/75">
                        {r.reqId}
                      </span>
                    ) : null}
                    <span className="font-medium">{r.name}</span>
                  </span>
                  {r.text ? (
                    <span className="line-clamp-1 text-xs text-foreground/75">
                      {r.text}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      )}
      <div
        data-testid="link-requirement-kinds"
        className="flex flex-wrap gap-1 border-t border-border pt-2"
      >
        {ALL_KINDS.map((kind) => {
          const allowed = selected ? allowedSet.has(kind.id) : false;
          return (
            <button
              key={kind.id}
              type="button"
              data-testid={`link-requirement-kind-${kind.id}`}
              disabled={!allowed}
              onClick={() => {
                if (selected && allowed) onPick(selected, kind.id);
              }}
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition hover:bg-accent focus:bg-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {kind.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        data-testid="link-requirement-cancel"
        onClick={onCancel}
        className="self-end rounded px-2 py-1 text-xs text-foreground/75 hover:bg-accent focus:bg-accent focus:outline-none"
      >
        Cancel (Esc)
      </button>
    </div>
  );
}
