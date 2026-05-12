import type {
  ElementId,
  ModelEdge,
  ModelElement,
  RequirementElement,
  RequirementStatus,
  RequirementTraceEdge,
} from '@/model';

export interface RequirementsCoverageOptions {
  /**
   * If provided, only Requirements whose `status` is in this set are included
   * in the totals and gap lists. Other Requirements are ignored as
   * out-of-scope (e.g. drafts or rejected entries).
   */
  readonly statusFilter?: ReadonlySet<RequirementStatus>;
}

export interface RequirementsCoverage {
  readonly totalRequirements: number;
  readonly satisfied: ReadonlySet<ElementId>;
  readonly verified: ReadonlySet<ElementId>;
  readonly unsatisfied: readonly RequirementElement[];
  readonly unverified: readonly RequirementElement[];
}

function isRequirementTrace(edge: ModelEdge): edge is RequirementTraceEdge {
  return edge.kind === 'RequirementTrace';
}

/**
 * Pure projection over the element + edge stream that summarises requirement
 * coverage. A Requirement is **satisfied** if it has at least one outgoing
 * `RequirementTrace` of kind `satisfy`; **verified** if it has at least one
 * outgoing `verify`. The `unsatisfied` / `unverified` lists are the
 * Requirements that fall short, ordered by `(reqId ?? name)` ascending so the
 * UI gets a stable reading order without re-sorting.
 *
 * When `statusFilter` is supplied, only Requirements whose `status` is in the
 * set are counted (and only those can appear in the gap lists). Traces from
 * out-of-scope Requirements are ignored entirely.
 */
export function computeRequirementsCoverage(
  elements: readonly ModelElement[],
  edges: readonly ModelEdge[],
  options: RequirementsCoverageOptions = {},
): RequirementsCoverage {
  const statusFilter = options.statusFilter;

  const requirements: RequirementElement[] = [];
  for (const el of elements) {
    if (el.kind !== 'Requirement') continue;
    if (statusFilter !== undefined && !statusFilter.has(el.status)) continue;
    requirements.push(el);
  }

  const inScope = new Set<ElementId>(requirements.map((r) => r.id));
  const satisfied = new Set<ElementId>();
  const verified = new Set<ElementId>();

  for (const edge of edges) {
    if (!isRequirementTrace(edge)) continue;
    if (!inScope.has(edge.sourceId)) continue;
    if (edge.traceKind === 'satisfy') satisfied.add(edge.sourceId);
    else if (edge.traceKind === 'verify') verified.add(edge.sourceId);
  }

  const order = (a: RequirementElement, b: RequirementElement): number => {
    const ka = a.reqId || a.name;
    const kb = b.reqId || b.name;
    return ka.localeCompare(kb);
  };

  const unsatisfied = requirements
    .filter((r) => !satisfied.has(r.id))
    .sort(order);
  const unverified = requirements
    .filter((r) => !verified.has(r.id))
    .sort(order);

  return {
    totalRequirements: requirements.length,
    satisfied,
    verified,
    unsatisfied,
    unverified,
  };
}
