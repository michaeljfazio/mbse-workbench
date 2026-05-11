import { useEffect, useMemo, useRef } from 'react';

import type { RequirementTraceKind } from '@/model';

export interface TraceKindPopoverProps {
  readonly x: number;
  readonly y: number;
  readonly allowedKinds: ReadonlyArray<RequirementTraceKind>;
  readonly onPick: (kind: RequirementTraceKind) => void;
  readonly onCancel: () => void;
}

interface KindEntry {
  readonly id: RequirementTraceKind;
  readonly label: string;
  readonly hint: string;
}

const KINDS: ReadonlyArray<KindEntry> = [
  {
    id: 'derive',
    label: 'Derive',
    hint: 'Requirement derived from another (dashed)',
  },
  {
    id: 'satisfy',
    label: 'Satisfy',
    hint: 'Element satisfies the requirement (solid)',
  },
  {
    id: 'verify',
    label: 'Verify',
    hint: 'Element verifies the requirement (solid)',
  },
  {
    id: 'refine',
    label: 'Refine',
    hint: 'Requirement refines another (dashed)',
  },
];

export function TraceKindPopover({
  x,
  y,
  allowedKinds,
  onPick,
  onCancel,
}: TraceKindPopoverProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const allowedSet = useMemo(() => new Set(allowedKinds), [allowedKinds]);
  const defaultKind = allowedKinds[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter' && defaultKind) {
        e.preventDefault();
        onPick(defaultKind);
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
  }, [onCancel, onPick, defaultKind]);

  useEffect(() => {
    const first = ref.current?.querySelector<HTMLButtonElement>(
      'button[data-default]',
    );
    first?.focus();
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Pick trace kind"
      data-testid="trace-kind-popover"
      style={{ left: x, top: y }}
      className="absolute z-30 flex w-64 flex-col gap-1 rounded-md border border-border bg-card p-2 shadow-lg"
    >
      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/75">
        Trace kind
      </p>
      {KINDS.map((kind) => {
        const allowed = allowedSet.has(kind.id);
        const isDefault = kind.id === defaultKind;
        return (
          <button
            key={kind.id}
            type="button"
            data-testid={`trace-kind-${kind.id}`}
            data-default={isDefault || undefined}
            disabled={!allowed}
            onClick={() => onPick(kind.id)}
            className="flex flex-col items-start rounded px-2 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="font-medium text-foreground">{kind.label}</span>
            <span className="text-xs text-foreground/75">{kind.hint}</span>
          </button>
        );
      })}
      <button
        type="button"
        data-testid="trace-kind-cancel"
        onClick={onCancel}
        className="rounded px-2 py-1.5 text-left text-xs text-foreground/75 hover:bg-accent focus:bg-accent focus:outline-none"
      >
        Cancel (Esc)
      </button>
    </div>
  );
}
