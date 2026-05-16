/**
 * DragCoordOverlay — floating label that shows canvas-space (x, y) coordinates
 * while the user is dragging a node on the React Flow canvas.
 *
 * Usage:
 *   <DragCoordOverlay dragPos={dragPos} />
 *
 * Where `dragPos` is null when no drag is active, or `{ x, y }` (canvas-space
 * node position, as reported by React Flow's `onNodeDrag` event).  The overlay
 * is pointer-events: none so it never intercepts drag events.
 *
 * Refs #375
 */

export interface DragPos {
  readonly x: number;
  readonly y: number;
}

/**
 * Format a canvas-space position as the `(x, y)` label shown in the overlay.
 * Coordinates are rounded to the nearest integer.
 */
export function formatDragCoord(pos: DragPos): string {
  return `(${Math.round(pos.x)}, ${Math.round(pos.y)})`;
}

interface DragCoordOverlayProps {
  readonly dragPos: DragPos | null;
}

export function DragCoordOverlay({ dragPos }: DragCoordOverlayProps): JSX.Element | null {
  if (!dragPos) return null;

  return (
    <div
      data-testid="drag-coord-overlay"
      role="status"
      aria-live="off"
      aria-label={`Node position: ${formatDragCoord(dragPos)}`}
      className="pointer-events-none absolute bottom-10 left-3 z-50 select-none rounded-md border border-border bg-card/90 px-2 py-1 text-xs font-mono text-foreground shadow-md backdrop-blur-sm"
    >
      {formatDragCoord(dragPos)}
    </div>
  );
}
