import { Position } from '@xyflow/react';

import type {
  ElementId,
  ModelElement,
  PartDefinitionElement,
  PortDefinitionElement,
  PortDirection,
} from '@/model';

import type { IbdPartHandleSpec } from './PartUsageNode';

export interface SidePlacement {
  readonly position: Position;
  readonly top: number;
}

// Alternates handles between the left and right sides, then spaces them
// evenly within each side. Stable for any port count and deterministic
// across renders.
export function placeHandle(index: number, total: number): SidePlacement {
  if (total <= 0) return { position: Position.Left, top: 50 };
  const isRight = index % 2 === 1;
  const sideIndex = Math.floor(index / 2);
  const sideTotal = Math.ceil((total - (isRight ? 1 : 0)) / 2);
  const denominator = sideTotal === 0 ? 1 : sideTotal;
  const top = ((sideIndex + 0.5) / denominator) * 100;
  return {
    position: isRight ? Position.Right : Position.Left,
    top,
  };
}

export const HANDLE_TYPE_BY_DIRECTION: Record<
  PortDirection,
  'source' | 'target'
> = {
  in: 'target',
  out: 'source',
  // `inout` resolves to source by default. #51 introduces the typed
  // `isValidConnection` check that allows either role per ADR 0003.
  inout: 'source',
};

interface MinimalRegistry {
  get(id: ElementId): ModelElement | undefined;
}

interface PortUsageOwner {
  readonly portUsageIds: readonly ElementId[];
}

export interface BuildPartHandleSpecsInput {
  readonly partUsage: PortUsageOwner;
  readonly registry: MinimalRegistry;
}

// Resolves the (PortUsage → PortDefinition) chain from the registry and
// produces a stable, deterministic spec list. Used by both the canvas-side
// renderer and the inspector to keep handles and the inspector port list in
// sync.
export function resolvePartHandles({
  partUsage,
  registry,
}: BuildPartHandleSpecsInput): IbdPartHandleSpec[] {
  const out: IbdPartHandleSpec[] = [];
  for (const portUsageId of partUsage.portUsageIds) {
    const portUsage = registry.get(portUsageId);
    if (!portUsage || portUsage.kind !== 'PortUsage') continue;
    const def = registry.get(portUsage.definitionId);
    if (!def || def.kind !== 'PortDefinition') continue;
    out.push({
      portUsageId: portUsage.id,
      portDefinitionId: def.id,
      label: def.name,
      direction: def.direction,
    });
  }
  return out;
}

export function isPartDefinition(
  element: ModelElement | undefined,
): element is PartDefinitionElement {
  return element?.kind === 'PartDefinition';
}

export function isPortDefinition(
  element: ModelElement | undefined,
): element is PortDefinitionElement {
  return element?.kind === 'PortDefinition';
}

export interface IbdEdgeEndpoints {
  readonly sourceNodeId: ElementId;
  readonly targetNodeId: ElementId;
  readonly sourceHandleId: ElementId;
  readonly targetHandleId: ElementId;
}

/**
 * Resolves the parent PartUsage of each port endpoint and produces the
 * ReactFlow-shaped endpoints needed for an IBD edge. Returns `null` if
 * either port cannot be located on a PartUsage (orphaned ConnectionUsage).
 *
 * Scans `elements` once per call. Caller is expected to memoize a
 * `Map<PortUsageId, PartUsageId>` and call this helper only after a registry
 * change; production code does this inside `CanvasPane.toFlowEdges`.
 */
export function resolveIbdEdgeEndpoints(input: {
  readonly sourcePortUsageId: ElementId;
  readonly targetPortUsageId: ElementId;
  readonly portUsageToPartUsage: ReadonlyMap<ElementId, ElementId>;
}): IbdEdgeEndpoints | null {
  const sourceNodeId = input.portUsageToPartUsage.get(input.sourcePortUsageId);
  if (!sourceNodeId) return null;
  const targetNodeId = input.portUsageToPartUsage.get(input.targetPortUsageId);
  if (!targetNodeId) return null;
  return {
    sourceNodeId,
    targetNodeId,
    sourceHandleId: input.sourcePortUsageId,
    targetHandleId: input.targetPortUsageId,
  };
}

/**
 * Builds the reverse lookup `Map<PortUsageId, PartUsageId>` from an element
 * snapshot. O(N + total portUsageIds).
 */
export function buildPortUsageOwnership(
  elements: readonly ModelElement[],
): Map<ElementId, ElementId> {
  const ownership = new Map<ElementId, ElementId>();
  for (const el of elements) {
    if (el.kind !== 'PartUsage') continue;
    for (const portUsageId of el.portUsageIds) {
      ownership.set(portUsageId, el.id);
    }
  }
  return ownership;
}
