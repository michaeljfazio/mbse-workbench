/**
 * Containment readers for tests. With the ownerId/ownerRole schema, the
 * parent no longer carries child-id arrays; tests read children by
 * filtering on ownerId/ownerRole instead. These helpers wrap that pattern.
 */
import type { ElementId, ModelElement, OwnerRole } from '@/model';

export function childIdsOf(
  elements: readonly ModelElement[],
  ownerId: ElementId,
  role?: OwnerRole,
): ElementId[] {
  return elements
    .filter(
      (e) =>
        e.ownerId === ownerId && (role === undefined || e.ownerRole === role),
    )
    .sort((a, b) => a.ownerIndex - b.ownerIndex)
    .map((e) => e.id);
}

export function childrenOf(
  elements: readonly ModelElement[],
  ownerId: ElementId,
  role?: OwnerRole,
): ModelElement[] {
  return elements
    .filter(
      (e) =>
        e.ownerId === ownerId && (role === undefined || e.ownerRole === role),
    )
    .sort((a, b) => a.ownerIndex - b.ownerIndex);
}
