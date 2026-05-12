import type { ElementKind } from '@/model';

import { PROJECT_TREE_DRAG_TYPE } from './tree/ProjectTree';

interface PaletteChip {
  readonly elementKind: Extract<ElementKind, 'ConstraintUsage' | 'ValueProperty'>;
  readonly label: string;
  readonly description: string;
}

const PALETTE_CHIPS: readonly PaletteChip[] = [
  {
    elementKind: 'ConstraintUsage',
    label: 'Constraint',
    description: 'Equation between parameters',
  },
  {
    elementKind: 'ValueProperty',
    label: 'Value',
    description: 'Typed value property',
  },
];

export function ParametricPalette(): JSX.Element {
  return (
    <div
      data-testid="parametric-palette"
      role="toolbar"
      aria-label="Parametric palette"
      className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-card px-3"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Drag onto canvas
      </span>
      <span aria-hidden="true" className="h-4 w-px bg-border" />
      {PALETTE_CHIPS.map((chip) => (
        <div
          key={chip.elementKind}
          data-testid={`parametric-palette-${
            chip.elementKind === 'ConstraintUsage' ? 'constraint' : 'value'
          }`}
          data-element-kind={chip.elementKind}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(PROJECT_TREE_DRAG_TYPE, chip.elementKind);
            event.dataTransfer.effectAllowed = 'copy';
          }}
          title={chip.description}
          className="cursor-grab select-none rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent active:cursor-grabbing"
        >
          {chip.label}
        </div>
      ))}
    </div>
  );
}
