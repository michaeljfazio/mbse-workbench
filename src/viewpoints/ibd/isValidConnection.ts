import type { Connection } from '@xyflow/react';

import type {
  ElementId,
  ElementRegistry,
  ModelElement,
  PortDirection,
} from '@/model';

/**
 * IBD connection typing rules per ADR 0003:
 *  - both directions `inout` ✓
 *  - `out` → `in` ✓
 *  - `in` → `out` ✓ (canonicalize on apply)
 *  - one side `inout`, other side `in`/`out` ✓
 *  - `in` ↔ `in` ✗
 *  - `out` ↔ `out` ✗
 *
 * Endpoint identity rules:
 *  - both source/target node ids and handle ids must be present
 *  - source PartUsage ≠ target PartUsage (no connections inside a single part)
 *  - sourceHandle ≠ targetHandle
 *  - each handle id must appear in its parent PartUsage's `portUsageIds`
 */

const VALID_DIRECTION_PAIRS: ReadonlySet<string> = new Set([
  'out:in',
  'in:out',
  'inout:inout',
  'inout:in',
  'in:inout',
  'inout:out',
  'out:inout',
]);

interface MinimalRegistry {
  get(id: ElementId): ModelElement | undefined;
}

function portUsageDirection(
  registry: MinimalRegistry,
  portUsageId: ElementId,
): PortDirection | null {
  const portUsage = registry.get(portUsageId);
  if (!portUsage || portUsage.kind !== 'PortUsage') return null;
  const def = registry.get(portUsage.definitionId);
  if (!def || def.kind !== 'PortDefinition') return null;
  return def.direction;
}

interface ResolvedConnection {
  readonly sourcePortUsageId: ElementId;
  readonly targetPortUsageId: ElementId;
  readonly sourceDirection: PortDirection;
  readonly targetDirection: PortDirection;
}

function resolveConnection(
  connection: Connection,
  registry: Pick<ElementRegistry, 'get'>,
): ResolvedConnection | null {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (!source || !target) return null;
  if (!sourceHandle || !targetHandle) return null;
  if (source === target) return null;
  if (sourceHandle === targetHandle) return null;

  const sourcePart = registry.get(source as ElementId);
  if (!sourcePart || sourcePart.kind !== 'PartUsage') return null;
  const targetPart = registry.get(target as ElementId);
  if (!targetPart || targetPart.kind !== 'PartUsage') return null;

  const sourcePortUsageId = sourceHandle as ElementId;
  const targetPortUsageId = targetHandle as ElementId;
  if (!sourcePart.portUsageIds.includes(sourcePortUsageId)) return null;
  if (!targetPart.portUsageIds.includes(targetPortUsageId)) return null;

  const sourceDirection = portUsageDirection(registry, sourcePortUsageId);
  const targetDirection = portUsageDirection(registry, targetPortUsageId);
  if (!sourceDirection || !targetDirection) return null;

  return { sourcePortUsageId, targetPortUsageId, sourceDirection, targetDirection };
}

export function isValidIbdConnection(
  connection: Connection,
  registry: Pick<ElementRegistry, 'get'>,
): boolean {
  const resolved = resolveConnection(connection, registry);
  if (!resolved) return false;
  return VALID_DIRECTION_PAIRS.has(
    `${resolved.sourceDirection}:${resolved.targetDirection}`,
  );
}

export interface IbdConnectionEndpoints {
  readonly sourcePortUsageId: ElementId;
  readonly targetPortUsageId: ElementId;
}

/**
 * Returns the canonical endpoints (source = providing side, target = consuming
 * side) for a valid IBD connection, or null if the connection is invalid.
 * Specifically: `in` → `out` is normalised to `out` → `in`. All other valid
 * pairs are kept as-is.
 */
export function canonicalizeIbdConnection(
  connection: Connection,
  registry: Pick<ElementRegistry, 'get'>,
): IbdConnectionEndpoints | null {
  const resolved = resolveConnection(connection, registry);
  if (!resolved) return null;
  if (
    !VALID_DIRECTION_PAIRS.has(
      `${resolved.sourceDirection}:${resolved.targetDirection}`,
    )
  ) {
    return null;
  }
  if (resolved.sourceDirection === 'in' && resolved.targetDirection === 'out') {
    return {
      sourcePortUsageId: resolved.targetPortUsageId,
      targetPortUsageId: resolved.sourcePortUsageId,
    };
  }
  return {
    sourcePortUsageId: resolved.sourcePortUsageId,
    targetPortUsageId: resolved.targetPortUsageId,
  };
}
