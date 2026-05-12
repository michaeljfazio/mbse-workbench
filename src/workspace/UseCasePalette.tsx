import type { ElementKind } from '@/model';

import { PROJECT_TREE_DRAG_TYPE } from './tree/ProjectTree';

interface PaletteChip {
  readonly elementKind: Extract<ElementKind, 'Actor' | 'UseCase'>;
  readonly label: string;
  readonly description: string;
}

const PALETTE_CHIPS: readonly PaletteChip[] = [
  { elementKind: 'Actor', label: 'Actor', description: 'External participant' },
  { elementKind: 'UseCase', label: 'Use case', description: 'System capability' },
];

export function UseCasePalette(): JSX.Element {
  return (
    <div
      data-testid="use-case-palette"
      role="toolbar"
      aria-label="Use Case palette"
      className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-card px-3"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Drag onto canvas
      </span>
      <span aria-hidden="true" className="h-4 w-px bg-border" />
      {PALETTE_CHIPS.map((chip) => (
        <div
          key={chip.elementKind}
          data-testid={`use-case-palette-${chip.elementKind.toLowerCase()}`}
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
