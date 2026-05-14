import { useEffect, useRef } from 'react';

import type { ElementId, PartDefinitionElement } from '@/model';

export interface PartUsageTypePopoverProps {
  readonly x: number;
  readonly y: number;
  readonly definitions: readonly PartDefinitionElement[];
  readonly portCountFor: (definitionId: ElementId) => number;
  readonly onPick: (definitionId: ElementId) => void;
  readonly onCancel: () => void;
}

export function PartUsageTypePopover({
  x,
  y,
  definitions,
  portCountFor,
  onPick,
  onCancel,
}: PartUsageTypePopoverProps): JSX.Element {
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
      aria-label="Choose part type"
      data-testid="part-type-popover"
      style={{ left: x, top: y }}
      className="absolute z-30 flex w-64 flex-col gap-1 rounded-md border border-border bg-card p-2 shadow-lg"
    >
      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Type the part as…
      </p>
      {definitions.length === 0 ? (
        <p
          data-testid="part-type-popover-empty"
          className="px-2 py-1.5 text-xs text-muted-foreground"
        >
          No PartDefinition exists. Create one on a BDD first.
        </p>
      ) : (
        definitions.map((def, idx) => (
          <button
            key={def.id}
            type="button"
            data-testid={`part-type-option-${def.id}`}
            data-default={idx === 0 || undefined}
            onClick={() => onPick(def.id)}
            className="flex flex-col items-start rounded px-2 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
          >
            <span className="font-medium text-foreground">{def.name}</span>
            <span className="text-xs text-muted-foreground">
              {(() => {
                const n = portCountFor(def.id);
                return n === 0 ? 'no ports' : `${n} port${n === 1 ? '' : 's'}`;
              })()}
            </span>
          </button>
        ))
      )}
      <button
        type="button"
        data-testid="part-type-popover-cancel"
        onClick={onCancel}
        className="rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent focus:bg-accent focus:outline-none"
      >
        Cancel (Esc)
      </button>
    </div>
  );
}
