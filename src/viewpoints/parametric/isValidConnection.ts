import type { Connection } from '@xyflow/react';

import type {
  ElementId,
  ElementRegistry,
  ModelEdge,
} from '@/model';

/**
 * Parametric viewpoint connection rules per ADR 0008 § 3:
 *  - source and target must both resolve in the registry
 *  - both endpoints must be ConstraintUsage or ValueProperty
 *  - no self-loops
 *  - no duplicate edge between the same unordered pair
 */
export function isValidParametricConnection(
  connection: Connection,
  registry: Pick<ElementRegistry, 'get'>,
  existingEdges: readonly ModelEdge[] = [],
): boolean {
  const { source, target } = connection;
  if (!source || !target) return false;
  if (source === target) return false;

  const sourceEl = registry.get(source as ElementId);
  const targetEl = registry.get(target as ElementId);
  if (!sourceEl || !targetEl) return false;

  const ok = (kind: string): boolean =>
    kind === 'ConstraintUsage' || kind === 'ValueProperty';
  if (!ok(sourceEl.kind) || !ok(targetEl.kind)) return false;

  for (const e of existingEdges) {
    if (e.kind !== 'ParameterBinding') continue;
    if (
      (e.sourceId === source && e.targetId === target) ||
      (e.sourceId === target && e.targetId === source)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Canonicalize a parametric connection so the ConstraintUsage end is always
 * stored as `source` (per ADR 0008 § 3 — bindings are symmetric, but stored
 * direction is deterministic). When both endpoints are the same kind the
 * order is preserved.
 */
export function canonicalizeParametricConnection(
  connection: Connection,
  registry: Pick<ElementRegistry, 'get'>,
): Connection {
  const { source, target } = connection;
  if (!source || !target) return connection;
  const sourceEl = registry.get(source as ElementId);
  const targetEl = registry.get(target as ElementId);
  if (!sourceEl || !targetEl) return connection;
  if (
    sourceEl.kind === 'ValueProperty' &&
    targetEl.kind === 'ConstraintUsage'
  ) {
    return {
      source: target,
      sourceHandle: connection.targetHandle ?? null,
      target: source,
      targetHandle: connection.sourceHandle ?? null,
    };
  }
  return connection;
}
