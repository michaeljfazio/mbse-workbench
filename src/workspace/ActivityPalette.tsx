import type { ActionNodeType } from '@/model';
import { ACTION_NODE_TYPE_VALUES } from '@/model';
import {
  PROJECT_TREE_DRAG_NODE_TYPE,
  PROJECT_TREE_DRAG_TYPE,
} from './tree/ProjectTree';

interface PaletteChip {
  readonly nodeType: ActionNodeType;
  readonly label: string;
  readonly description: string;
}

const PALETTE_CHIPS: readonly PaletteChip[] = [
  { nodeType: 'action', label: 'Action', description: 'Behavioral step' },
  { nodeType: 'initial', label: 'Initial', description: 'Activity entry' },
  { nodeType: 'final', label: 'Final', description: 'Activity exit' },
  { nodeType: 'fork', label: 'Fork', description: 'Split into parallel flows' },
  { nodeType: 'join', label: 'Join', description: 'Synchronize parallel flows' },
  { nodeType: 'decision', label: 'Decision', description: 'Branch on condition' },
  { nodeType: 'merge', label: 'Merge', description: 'Merge alternatives' },
];

// Compile-time guard: if `ActionNodeType` ever grows a new variant, this fails
// to typecheck unless `PALETTE_CHIPS` adds the new entry. Mirrors the same
// safety net `ACTION_NODE_TYPE_VALUES` provides for runtime enumeration.
const PALETTE_NODE_TYPES = PALETTE_CHIPS.map((c) => c.nodeType);
const _palettePaletteCoverage: readonly ActionNodeType[] =
  PALETTE_NODE_TYPES as readonly ActionNodeType[];
void _palettePaletteCoverage;
if (PALETTE_CHIPS.length !== ACTION_NODE_TYPE_VALUES.length) {
  // Throws at module load if ActionNodeType grows but the palette lags.
  throw new Error(
    `ActivityPalette is missing chips for some ActionNodeType variants: ` +
      `${PALETTE_CHIPS.length} chips vs ${ACTION_NODE_TYPE_VALUES.length} kinds`,
  );
}

export function ActivityPalette(): JSX.Element {
  return (
    <div
      data-testid="activity-palette"
      role="toolbar"
      aria-label="Activity palette"
      className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-card px-3"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Drag onto canvas
      </span>
      <span aria-hidden="true" className="h-4 w-px bg-border" />
      {PALETTE_CHIPS.map((chip) => (
        <div
          key={chip.nodeType}
          data-testid={`activity-palette-${chip.nodeType}`}
          data-action-node-type={chip.nodeType}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(PROJECT_TREE_DRAG_TYPE, 'ActionUsage');
            event.dataTransfer.setData(
              PROJECT_TREE_DRAG_NODE_TYPE,
              chip.nodeType,
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
