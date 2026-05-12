import type { Connection } from '@xyflow/react';

import type { ElementId, ElementRegistry } from '@/model';

/**
 * Activity viewpoint connection rules per ADR 0005 § 4:
 *  - source and target must both resolve to an `ActionUsage` in the registry
 *  - self-loops are rejected
 *  - the `initial` pseudostate cannot be a flow target
 *  - the `final` pseudostate cannot be a flow source
 *
 * The same rules apply to both ControlFlow and ObjectFlow — the choice
 * between the two kinds happens at the drag step (Shift modifier), not in
 * the typing layer.
 */
export function isValidActivityConnection(
  connection: Connection,
  registry: Pick<ElementRegistry, 'get'>,
): boolean {
  const { source, target } = connection;
  if (!source || !target) return false;
  if (source === target) return false;

  const sourceEl = registry.get(source as ElementId);
  const targetEl = registry.get(target as ElementId);
  if (!sourceEl || !targetEl) return false;
  if (sourceEl.kind !== 'ActionUsage' || targetEl.kind !== 'ActionUsage') {
    return false;
  }

  if (sourceEl.nodeType === 'final') return false;
  if (targetEl.nodeType === 'initial') return false;

  return true;
}
