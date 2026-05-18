import type { ElementId, ModelElement } from '@/model';
import type { Diagram } from '@/workspace/diagram';

export const IBD_ENCLOSING_FRAME_PADDING = 48;
export const IBD_ENCLOSING_FRAME_HEADER_HEIGHT = 32;

/**
 * Default dimensions rendered for a freshly-created (empty) IBD — i.e. when
 * the diagram has a context PartDefinition but no PartUsage nodes yet.
 * Sized to accommodate two standard PartUsage columns with padding.
 */
export const IBD_ENCLOSING_FRAME_DEFAULT_WIDTH = 640;
export const IBD_ENCLOSING_FRAME_DEFAULT_HEIGHT = 320;

export interface IbdRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface IbdEnclosingFrameBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ComputeEnclosingFrameBoundsOptions {
  readonly padding?: number;
  readonly headerHeight?: number;
}

export function computeEnclosingFrameBounds(
  rects: readonly IbdRect[],
  options: ComputeEnclosingFrameBoundsOptions = {},
): IbdEnclosingFrameBounds | null {
  if (rects.length === 0) return null;
  const padding = options.padding ?? IBD_ENCLOSING_FRAME_PADDING;
  const headerHeight = options.headerHeight ?? IBD_ENCLOSING_FRAME_HEADER_HEIGHT;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const rect of rects) {
    if (rect.x < minX) minX = rect.x;
    if (rect.y < minY) minY = rect.y;
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }
  return {
    x: minX - padding,
    y: minY - padding - headerHeight,
    width: maxX - minX + 2 * padding,
    height: maxY - minY + 2 * padding + headerHeight,
  };
}

export interface IbdEnclosingFrameLabel {
  readonly id: ElementId;
  readonly name: string;
}

interface MinimalRegistry {
  get(id: ElementId): ModelElement | undefined;
}

export function resolveIbdEnclosingFrameLabel(
  diagram: Diagram,
  registry: MinimalRegistry,
): IbdEnclosingFrameLabel | null {
  const context = diagram.context;
  if (!context || context.kind !== 'partDefinition') return null;
  const element = registry.get(context.id);
  if (!element || element.kind !== 'PartDefinition') return null;
  return { id: element.id, name: element.name };
}
