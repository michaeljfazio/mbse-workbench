import type {
  ElementId,
  ModelEdge,
  RequirementElement,
  RequirementPriority,
  RequirementStatus,
} from '@/model';

export type RequirementSortKey =
  | 'reqId'
  | 'name'
  | 'priority'
  | 'status'
  | 'traceCount';

export type SortDirection = 'asc' | 'desc';

export interface RequirementRow {
  readonly id: ElementId;
  readonly reqId: string;
  readonly name: string;
  readonly text: string;
  readonly priority: RequirementPriority;
  readonly status: RequirementStatus;
  readonly traceCount: number;
}

const PRIORITY_ORDER: Record<RequirementPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const STATUS_ORDER: Record<RequirementStatus, number> = {
  draft: 0,
  approved: 1,
  implemented: 2,
  verified: 3,
  rejected: 4,
};

export function buildRequirementRows(
  requirements: readonly RequirementElement[],
  edges: readonly ModelEdge[],
): RequirementRow[] {
  const traceCounts = new Map<ElementId, number>();
  for (const edge of edges) {
    if (edge.kind !== 'RequirementTrace') continue;
    traceCounts.set(edge.sourceId, (traceCounts.get(edge.sourceId) ?? 0) + 1);
    if (edge.targetId !== edge.sourceId) {
      traceCounts.set(edge.targetId, (traceCounts.get(edge.targetId) ?? 0) + 1);
    }
  }

  return requirements.map((req) => ({
    id: req.id,
    reqId: req.reqId ?? '',
    name: req.name,
    text: req.text,
    priority: req.priority,
    status: req.status,
    traceCount: traceCounts.get(req.id) ?? 0,
  }));
}

export function filterRequirements(
  rows: readonly RequirementRow[],
  query: string,
): RequirementRow[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...rows];
  return rows.filter((row) => {
    return (
      row.name.toLowerCase().includes(needle) ||
      row.text.toLowerCase().includes(needle) ||
      row.reqId.toLowerCase().includes(needle)
    );
  });
}

export function sortRequirements(
  rows: readonly RequirementRow[],
  key: RequirementSortKey,
  direction: SortDirection,
): RequirementRow[] {
  const factor = direction === 'asc' ? 1 : -1;
  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((a, b) => {
    if (key === 'reqId') {
      const emptyBias = compareEmptyBias(a.row.reqId, b.row.reqId);
      if (emptyBias !== 0) return emptyBias;
    }
    const cmp = compareBy(a.row, b.row, key);
    if (cmp !== 0) return cmp * factor;
    return a.index - b.index;
  });
  return indexed.map((entry) => entry.row);
}

function compareBy(
  a: RequirementRow,
  b: RequirementRow,
  key: RequirementSortKey,
): number {
  switch (key) {
    case 'name':
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    case 'reqId':
      return a.reqId.localeCompare(b.reqId);
    case 'priority':
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    case 'status':
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case 'traceCount':
      return a.traceCount - b.traceCount;
  }
}

function compareEmptyBias(a: string, b: string): number {
  const aEmpty = a === '';
  const bEmpty = b === '';
  if (aEmpty === bEmpty) return 0;
  return aEmpty ? 1 : -1;
}
