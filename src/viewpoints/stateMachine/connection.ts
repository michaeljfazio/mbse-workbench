import type { Connection } from '@xyflow/react';

import type { ElementId, ElementRegistry } from '@/model';

/**
 * State Machine viewpoint connection rules per ADR 0006 § 4:
 *  - source and target must both resolve to a `StateUsage` in the registry
 *  - self-loops are rejected
 *  - the `initial` pseudostate cannot be a transition target
 *  - the `final` pseudostate cannot be a transition source
 *
 * Same shape as the Activity equivalent (`isValidActivityConnection`); the
 * key difference is that there is only one transition kind in the state
 * machine viewpoint — no shift-modifier branch on commit.
 */
export function isValidStateMachineConnection(
  connection: Connection,
  registry: Pick<ElementRegistry, 'get'>,
): boolean {
  const { source, target } = connection;
  if (!source || !target) return false;
  if (source === target) return false;

  const sourceEl = registry.get(source as ElementId);
  const targetEl = registry.get(target as ElementId);
  if (!sourceEl || !targetEl) return false;
  if (sourceEl.kind !== 'StateUsage' || targetEl.kind !== 'StateUsage') {
    return false;
  }

  if (sourceEl.stateType === 'final') return false;
  if (targetEl.stateType === 'initial') return false;

  return true;
}
