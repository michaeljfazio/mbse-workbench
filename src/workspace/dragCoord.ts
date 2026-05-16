/**
 * Drag-coord types + formatting helper for the DragCoordOverlay.
 *
 * Kept in a `.ts` (no `x`) sibling of `DragCoordOverlay.tsx` so the React-only
 * file exports a component, satisfying `react-refresh/only-export-components`.
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
