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
