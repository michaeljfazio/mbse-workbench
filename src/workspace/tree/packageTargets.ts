import type { ElementId, ModelElement } from '@/model';

import { acceptedChildKinds } from './childAcceptance';

export type PackageTargetDisabledReason = 'cycle' | 'kind-not-accepted';

export interface PackageTargetOption {
  readonly id: ElementId;
  readonly label: string;
  readonly disabled: boolean;
  readonly disabledReason?: PackageTargetDisabledReason;
}

export interface ComputePackageTargetsArgs {
  readonly element: ModelElement;
  readonly elements: readonly ModelElement[];
}

/**
 * Build the list of `Package` move-targets shown in the row menu's
 * "Move to package…" picker. Self and the element's current owner are
 * omitted entirely. Descendant Packages are kept and flagged
 * `cycle`; Packages whose `acceptedChildKinds` reject this element's
 * kind are kept and flagged `kind-not-accepted`. Result is sorted by
 * label (case-insensitive), id as tiebreak.
 */
export function computePackageTargets({
  element,
  elements,
}: ComputePackageTargetsArgs): readonly PackageTargetOption[] {
  const byId = new Map<ElementId, ModelElement>();
  for (const e of elements) byId.set(e.id, e);

  function isDescendantOf(candidate: ElementId, ancestorId: ElementId): boolean {
    let cur = byId.get(candidate);
    const seen = new Set<ElementId>();
    while (cur && cur.ownerId && !seen.has(cur.ownerId)) {
      if (cur.ownerId === ancestorId) return true;
      seen.add(cur.ownerId);
      cur = byId.get(cur.ownerId);
    }
    return false;
  }

  const out: PackageTargetOption[] = [];
  for (const candidate of elements) {
    if (candidate.kind !== 'Package') continue;
    if (candidate.id === element.id) continue;
    if (candidate.id === element.ownerId) continue;

    let disabledReason: PackageTargetDisabledReason | undefined;
    if (isDescendantOf(candidate.id, element.id)) {
      disabledReason = 'cycle';
    } else if (
      !acceptedChildKinds('Package').some((o) => o.kind === element.kind)
    ) {
      disabledReason = 'kind-not-accepted';
    }

    const label = candidate.name.length > 0 ? candidate.name : '(untitled Package)';
    out.push({
      id: candidate.id,
      label,
      disabled: disabledReason !== undefined,
      ...(disabledReason ? { disabledReason } : {}),
    });
  }

  out.sort((a, b) => {
    const cmp = a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    if (cmp !== 0) return cmp;
    return a.id.localeCompare(b.id);
  });

  return out;
}

export function packageTargetDisabledTitle(
  reason: PackageTargetDisabledReason,
): string {
  switch (reason) {
    case 'cycle':
      return 'Cannot move into a descendant package';
    case 'kind-not-accepted':
      return 'This element kind is not accepted in a Package';
  }
}
