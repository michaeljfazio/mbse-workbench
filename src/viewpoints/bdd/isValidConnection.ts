import type { Connection } from '@xyflow/react';

import type { ElementId, ElementRegistry } from '@/model';

/**
 * BDD connection validity:
 * - source and target must both be present
 * - no self-loops
 * - both endpoints must resolve to PartDefinition elements (i.e. BDD blocks)
 *
 * Returns a plain boolean so it can be passed directly to React Flow's
 * `isValidConnection` prop.
 */
export function isValidBddConnection(
  connection: Connection,
  registry: Pick<ElementRegistry, 'get'>,
): boolean {
  const { source, target } = connection;
  if (!source || !target) return false;
  if (source === target) return false;

  const sourceEl = registry.get(source as ElementId);
  const targetEl = registry.get(target as ElementId);
  if (!sourceEl || !targetEl) return false;
  if (sourceEl.kind !== 'PartDefinition') return false;
  if (targetEl.kind !== 'PartDefinition') return false;
  return true;
}
