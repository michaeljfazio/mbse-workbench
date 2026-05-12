import type { StateNodeType } from '@/model';
import { STATE_NODE_TYPE_VALUES } from '@/model';
import {
  PROJECT_TREE_DRAG_STATE_TYPE,
  PROJECT_TREE_DRAG_TYPE,
} from './tree/ProjectTree';

interface PaletteChip {
  readonly stateType: StateNodeType;
  readonly label: string;
  readonly description: string;
}

const PALETTE_CHIPS: readonly PaletteChip[] = [
  { stateType: 'state', label: 'State', description: 'Behavioral mode' },
  { stateType: 'initial', label: 'Initial', description: 'State machine entry' },
  { stateType: 'final', label: 'Final', description: 'State machine exit' },
];

const PALETTE_STATE_TYPES = PALETTE_CHIPS.map((c) => c.stateType);
const _paletteCoverage: readonly StateNodeType[] =
  PALETTE_STATE_TYPES as readonly StateNodeType[];
void _paletteCoverage;
if (PALETTE_CHIPS.length !== STATE_NODE_TYPE_VALUES.length) {
  throw new Error(
    `StateMachinePalette is missing chips for some StateNodeType variants: ` +
      `${PALETTE_CHIPS.length} chips vs ${STATE_NODE_TYPE_VALUES.length} kinds`,
  );
}

export function StateMachinePalette(): JSX.Element {
  return (
    <div
      data-testid="state-machine-palette"
      role="toolbar"
      aria-label="State Machine palette"
      className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-card px-3"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Drag onto canvas
      </span>
      <span aria-hidden="true" className="h-4 w-px bg-border" />
      {PALETTE_CHIPS.map((chip) => (
        <div
          key={chip.stateType}
          data-testid={`state-machine-palette-${chip.stateType}`}
          data-state-node-type={chip.stateType}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(PROJECT_TREE_DRAG_TYPE, 'StateUsage');
            event.dataTransfer.setData(
              PROJECT_TREE_DRAG_STATE_TYPE,
              chip.stateType,
            );
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
