import { useEffect, useRef } from 'react';

import type { ElementKind } from '@/model';

export interface CreateParametricOwnerPopoverProps {
  readonly x: number;
  readonly y: number;
  readonly kinds: readonly ElementKind[];
  readonly onPick: (kind: ElementKind) => void;
  readonly onCancel: () => void;
}

// Per ADR 0014 §"Why option (a) for three of the four, and (b) for
// Parametric": picking "Parametric…" from a Package row opens this popover
// to disambiguate which owner kind to create — `PartDefinition` (today's
// only `parametricViewpoint.acceptedContextKinds` entry) and, once the
// viewpoint config widens, `ConstraintDefinition`. Mirrors the shape of
// `PartUsageTypePopover` (cursor anchoring, Escape + click-outside dismiss,
// auto-focus on the default button).
const KIND_LABELS: Partial<Record<ElementKind, string>> = {
  PartDefinition: 'Owned by a new Part Definition',
  ConstraintDefinition: 'Owned by a new Constraint Definition',
};

export function CreateParametricOwnerPopover({
  x,
  y,
  kinds,
  onPick,
  onCancel,
}: CreateParametricOwnerPopoverProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

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
      aria-label="Choose Parametric owner kind"
      data-testid="parametric-owner-popover"
      style={{ left: x, top: y }}
      className="fixed z-30 flex w-72 flex-col gap-1 rounded-md border border-border bg-card p-2 shadow-lg"
    >
      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        New Parametric diagram — pick owner
      </p>
      {kinds.map((kind, idx) => (
        <button
          key={kind}
          type="button"
          data-testid={`parametric-owner-option-${kind}`}
          data-default={idx === 0 || undefined}
          onClick={() => onPick(kind)}
          className="rounded px-2 py-1.5 text-left text-sm text-foreground hover:bg-accent focus:bg-accent focus:outline-none"
        >
          {KIND_LABELS[kind] ?? `Owned by a new ${kind}`}
        </button>
      ))}
      <button
        type="button"
        data-testid="parametric-owner-popover-cancel"
        onClick={onCancel}
        className="rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent focus:bg-accent focus:outline-none"
      >
        Cancel (Esc)
      </button>
    </div>
  );
}
