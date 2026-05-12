import type { Connection } from '@xyflow/react';

import type {
  ElementId,
  ElementRegistry,
  ModelEdge,
} from '@/model';

/**
 * Package viewpoint connection rules (ADR 0009 § 3, this issue #156):
 *  - source and target must both resolve in the registry
 *  - both endpoints must be Package elements
 *  - no self-loops
 *  - no duplicate PackageImport between the same ordered (source, target) pair
 *    (PackageImport is directional — `P1 imports P2` ≠ `P2 imports P1`)
 */
export function isValidPackageConnection(
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
  if (sourceEl.kind !== 'Package' || targetEl.kind !== 'Package') return false;

  for (const e of existingEdges) {
    if (e.kind !== 'PackageImport') continue;
    if (e.sourceId === source && e.targetId === target) return false;
  }

  return true;
}
