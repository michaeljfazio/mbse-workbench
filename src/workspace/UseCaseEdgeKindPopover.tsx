import { useEffect, useMemo, useRef } from 'react';

import type { UseCaseEdgeKind } from '@/viewpoints';

export interface UseCaseEdgeKindPopoverProps {
  readonly x: number;
  readonly y: number;
  readonly allowedKinds: ReadonlyArray<UseCaseEdgeKind>;
  readonly defaultKind: UseCaseEdgeKind;
  readonly onPick: (kind: UseCaseEdgeKind) => void;
  readonly onCancel: () => void;
}

interface KindEntry {
  readonly id: UseCaseEdgeKind;
  readonly label: string;
  readonly hint: string;
}

const KINDS: ReadonlyArray<KindEntry> = [
  {
    id: 'Include',
    label: 'Include',
    hint: 'Target is always invoked by the source use case',
  },
  {
    id: 'Extend',
    label: 'Extend',
    hint: 'Target may add behaviour to the source under a condition',
  },
  {
    id: 'Generalization',
    label: 'Generalization',
    hint: 'Source inherits from target (no stereotype label)',
  },
  {
    id: 'Association',
    label: 'Association',
    hint: 'Actor participates in the use case (plain solid line)',
  },
];

export function UseCaseEdgeKindPopover({
  x,
  y,
  allowedKinds,
  defaultKind,
  onPick,
  onCancel,
}: UseCaseEdgeKindPopoverProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const allowedSet = useMemo(() => new Set(allowedKinds), [allowedKinds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
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
      aria-label="Pick use case edge kind"
      data-testid="use-case-edge-kind-popover"
      style={{ left: x, top: y }}
      className="absolute z-30 flex w-64 flex-col gap-1 rounded-md border border-border bg-card p-2 shadow-lg"
    >
      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/75">
        Relationship
      </p>
      {KINDS.map((kind) => {
        const allowed = allowedSet.has(kind.id);
        const isDefault = kind.id === defaultKind;
        return (
          <button
            key={kind.id}
            type="button"
            data-testid={`use-case-edge-kind-${kind.id}`}
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
        data-testid="use-case-edge-kind-cancel"
        onClick={onCancel}
        className="rounded px-2 py-1.5 text-left text-xs text-foreground/75 hover:bg-accent focus:bg-accent focus:outline-none"
      >
        Cancel (Esc)
      </button>
    </div>
  );
}
