/**
 * DragCoordOverlay — floating label that shows canvas-space (x, y) coordinates
 * while the user is dragging a node on the React Flow canvas.
 *
 * Usage:
 *   <DragCoordOverlay dragPos={dragPos} />
 *
 * Where `dragPos` is null when no drag is active, or `{ x, y }` (canvas-space
 * node position, as reported by React Flow's `onNodeDrag` event).  The overlay
 * is `pointer-events: none` so it never intercepts drag events, and
 * `aria-hidden` because it duplicates information already available via the
 * Inspector's position field — exposing it to screen readers would be redundant
 * announce-spam during continuous drag.
 *
 * Refs #375
 */

import type { DragPos } from './dragCoord';
import { formatDragCoord } from './dragCoord';

interface DragCoordOverlayProps {
  readonly dragPos: DragPos | null;
}

export function DragCoordOverlay({ dragPos }: DragCoordOverlayProps): JSX.Element | null {
  if (!dragPos) return null;

  return (
    <div
      data-testid="drag-coord-overlay"
      aria-hidden="true"
      className="pointer-events-none absolute bottom-10 left-3 z-50 select-none rounded-md border border-border bg-card/90 px-2 py-1 text-xs font-mono text-foreground shadow-md backdrop-blur-sm"
    >
      {formatDragCoord(dragPos)}
    </div>
  );
}
