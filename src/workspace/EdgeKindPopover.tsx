import { useEffect, useRef } from 'react';

import type { BddEdgeKind } from '@/viewpoints';

export interface EdgeKindPopoverProps {
  readonly x: number;
  readonly y: number;
  readonly onPick: (kind: BddEdgeKind) => void;
  readonly onCancel: () => void;
}

const KINDS: ReadonlyArray<{ id: BddEdgeKind; label: string; hint: string }> = [
  { id: 'Composition', label: 'Composition', hint: 'Filled diamond on whole' },
  {
    id: 'Aggregation',
    label: 'Aggregation',
    hint: 'Shared part — open (hollow) diamond on whole',
  },
  { id: 'Generalization', label: 'Generalization', hint: 'Hollow triangle on parent' },
  {
    id: 'Association',
    label: 'Association',
    hint: 'Loose coupling — plain line, no end adornments',
  },
  {
    id: 'Dependency',
    label: 'Dependency',
    hint: 'Loose dependency — dashed line, open arrow on target',
  },
];

export function EdgeKindPopover({
  x,
  y,
  onPick,
  onCancel,
}: EdgeKindPopoverProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onPick('Composition');
      }
    };
    const onPointerDown = (e: PointerEvent) => {
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
  }, [onCancel, onPick]);

  useEffect(() => {
    const first = ref.current?.querySelector<HTMLButtonElement>('button[data-default]');
    first?.focus();
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Pick edge kind"
      data-testid="edge-kind-popover"
      style={{ left: x, top: y }}
      className="absolute z-30 flex w-56 flex-col gap-1 rounded-md border border-border bg-card p-2 shadow-lg"
    >
      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Relationship
      </p>
      {KINDS.map((kind, idx) => (
        <button
          key={kind.id}
          type="button"
          data-testid={`edge-kind-${kind.id}`}
          data-default={idx === 0 || undefined}
          onClick={() => onPick(kind.id)}
          className="flex flex-col items-start rounded px-2 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
        >
          <span className="font-medium text-foreground">{kind.label}</span>
          <span className="text-xs text-muted-foreground">{kind.hint}</span>
        </button>
      ))}
      <button
        type="button"
        data-testid="edge-kind-cancel"
        onClick={onCancel}
        className="rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent focus:bg-accent focus:outline-none"
      >
        Cancel (Esc)
      </button>
    </div>
  );
}
