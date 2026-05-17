import type { ElementKind } from '@/model';

import { PROJECT_TREE_DRAG_TYPE } from './tree/ProjectTree';

interface PaletteChip {
  readonly elementKind: ElementKind;
  readonly testIdSuffix: string;
  readonly label: string;
  readonly description: string;
}

// Mirrors ActivityPalette/StateMachinePalette: the IBD canvas exposes its
// primary element-creation affordance as a draggable chip in a top strip.
// Today only PartUsage is creatable via drag onto the canvas (the drop
// handler in CanvasPane defers to a PartDefinition-typing popover).
// PortUsage / ConnectionUsage / ItemFlow are created via different gestures
// (inspector / port-to-port edge drag) and are intentionally not chips.
const PALETTE_CHIPS: readonly PaletteChip[] = [
  {
    elementKind: 'PartUsage',
    testIdSuffix: 'PartUsage',
    label: 'Part',
    description:
      'Drag onto the canvas to add a Part Usage. Choose which Part Definition to type it as.',
  },
];

export function IbdPalette(): JSX.Element {
  return (
    <div
      data-testid="ibd-palette"
      role="toolbar"
      aria-label="Internal Block Diagram palette"
      className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-card px-3"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Drag onto canvas
      </span>
      <span aria-hidden="true" className="h-4 w-px bg-border" />
      {PALETTE_CHIPS.map((chip) => (
        <div
          key={chip.testIdSuffix}
          data-testid={`ibd-palette-${chip.testIdSuffix}`}
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
      <span
        data-testid="ibd-palette-edge-hint"
        className="ml-auto text-[10px] text-muted-foreground"
      >
        Connections & Item Flows: drag from a port handle to another port.
      </span>
    </div>
  );
}
