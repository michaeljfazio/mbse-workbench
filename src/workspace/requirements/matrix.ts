import type {
  ElementId,
  ElementKind,
  ModelEdge,
  ModelElement,
  RequirementElement,
  RequirementTraceEdge,
  RequirementTraceKind,
} from '@/model';
import { TRACE_TARGET_KINDS } from '@/viewpoints/requirements/isValidConnection';

export const TRACE_KIND_GLYPHS: Readonly<Record<RequirementTraceKind, string>> = {
  satisfy: 'S',
  verify: 'V',
  derive: 'D',
  refine: 'R',
};

export const TRACE_KIND_ORDER: readonly RequirementTraceKind[] = [
  'satisfy',
  'verify',
  'derive',
  'refine',
] as const;

export interface TraceabilityRow {
  readonly requirementId: ElementId;
  readonly reqId: string;
  readonly name: string;
  readonly priority: RequirementElement['priority'];
  readonly status: RequirementElement['status'];
  readonly outgoingCount: number;
}

export interface TraceabilityColumn {
  readonly elementId: ElementId;
  readonly kind: ElementKind;
  readonly name: string;
}

export interface TraceabilityCell {
  readonly requirementId: ElementId;
  readonly elementId: ElementId;
  readonly traceKinds: readonly RequirementTraceKind[];
  readonly edgeIds: readonly ModelEdge['id'][];
}

export interface TraceabilityMatrix {
  readonly rows: readonly TraceabilityRow[];
  readonly columns: readonly TraceabilityColumn[];
  readonly cells: ReadonlyMap<string, TraceabilityCell>;
}

export function cellKey(requirementId: ElementId, elementId: ElementId): string {
  return `${requirementId}::${elementId}`;
}

function isRequirementTrace(edge: ModelEdge): edge is RequirementTraceEdge {
  return edge.kind === 'RequirementTrace';
}

/**
 * Pure projection from the element + edge stream into matrix-ready shapes.
 *
 * Rows = every Requirement. Columns = every element referenced as a target of
 * at least one `RequirementTrace` edge whose kind is in `TRACE_TARGET_KINDS`.
 * (Requirement→Requirement traces produce columns too — derive/refine traces
 * are first-class.) The cell map is keyed by `cellKey(req, target)` and only
 * contains entries for non-empty cells.
 *
 * Ordering: rows by `(reqId ?? name)` ascending, columns by `(kind, name)`
 * ascending. Callers re-sort via `sortMatrixRows` / `sortMatrixColumns`.
 */
export function buildTraceabilityMatrix(
  elements: readonly ModelElement[],
  edges: readonly ModelEdge[],
): TraceabilityMatrix {
  const byId = new Map<ElementId, ModelElement>();
  for (const el of elements) byId.set(el.id, el);

  const traces = edges.filter(isRequirementTrace);

  const requirements: RequirementElement[] = [];
  for (const el of elements) {
    if (el.kind === 'Requirement') requirements.push(el);
  }

  const outgoingCounts = new Map<ElementId, number>();
  const columnIds = new Set<ElementId>();
  const cells = new Map<string, {
    traceKinds: Set<RequirementTraceKind>;
    edgeIds: ModelEdge['id'][];
  }>();

  for (const edge of traces) {
    const target = byId.get(edge.targetId);
    if (!target) continue;
    if (!TRACE_TARGET_KINDS.has(target.kind)) continue;
    columnIds.add(edge.targetId);
    outgoingCounts.set(
      edge.sourceId,
      (outgoingCounts.get(edge.sourceId) ?? 0) + 1,
    );
    const key = cellKey(edge.sourceId, edge.targetId);
    let cell = cells.get(key);
    if (!cell) {
      cell = { traceKinds: new Set(), edgeIds: [] };
      cells.set(key, cell);
    }
    cell.traceKinds.add(edge.traceKind);
    cell.edgeIds.push(edge.id);
  }

  const rows: TraceabilityRow[] = requirements
    .map((r) => ({
      requirementId: r.id,
      reqId: r.reqId ?? '',
      name: r.name,
      priority: r.priority,
      status: r.status,
      outgoingCount: outgoingCounts.get(r.id) ?? 0,
    }))
    .sort((a, b) => {
      const ka = a.reqId || a.name;
      const kb = b.reqId || b.name;
      return ka.localeCompare(kb);
    });

  const columns: TraceabilityColumn[] = [...columnIds]
    .map((id) => {
      const el = byId.get(id);
      if (!el) return null;
      return { elementId: id, kind: el.kind, name: el.name };
    })
    .filter((c): c is TraceabilityColumn => c !== null)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
      return a.name.localeCompare(b.name);
    });

  const cellMap = new Map<string, TraceabilityCell>();
  for (const [key, value] of cells) {
    const [requirementId, elementId] = key.split('::') as [ElementId, ElementId];
    cellMap.set(key, {
      requirementId,
      elementId,
      traceKinds: TRACE_KIND_ORDER.filter((k) => value.traceKinds.has(k)),
      edgeIds: [...value.edgeIds],
    });
  }

  return { rows, columns, cells: cellMap };
}

export type MatrixRowSortKey = 'reqId' | 'name' | 'outgoingCount';

export function sortMatrixRows(
  rows: readonly TraceabilityRow[],
  key: MatrixRowSortKey,
  direction: 'asc' | 'desc' = 'asc',
): TraceabilityRow[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === 'outgoingCount') {
      return sign * (a.outgoingCount - b.outgoingCount);
    }
    const av = key === 'reqId' ? a.reqId || a.name : a.name;
    const bv = key === 'reqId' ? b.reqId || b.name : b.name;
    return sign * av.localeCompare(bv);
  });
}

export interface MatrixFilters {
  readonly text?: string;
  readonly traceKinds?: ReadonlySet<RequirementTraceKind>;
  readonly columnKinds?: ReadonlySet<ElementKind>;
}

/**
 * Apply text + trace-kind + column-kind filters to a matrix. Filtering is
 * pure: returns a new `TraceabilityMatrix` with rows/columns/cells narrowed
 * accordingly. Text matches a row's `reqId` or `name` (case-insensitive);
 * `traceKinds` keeps only cells with at least one matching kind (a cell is
 * dropped if all its kinds are filtered out); `columnKinds` narrows the
 * column set by element kind.
 */
export function filterMatrix(
  matrix: TraceabilityMatrix,
  filters: MatrixFilters,
): TraceabilityMatrix {
  const text = filters.text?.trim().toLowerCase() ?? '';
  const traceKinds = filters.traceKinds;
  const columnKinds = filters.columnKinds;

  const rows = matrix.rows.filter((row) => {
    if (text.length === 0) return true;
    return (
      row.reqId.toLowerCase().includes(text) ||
      row.name.toLowerCase().includes(text)
    );
  });

  const columns = matrix.columns.filter((col) =>
    columnKinds === undefined || columnKinds.has(col.kind),
  );

  const rowIds = new Set(rows.map((r) => r.requirementId));
  const colIds = new Set(columns.map((c) => c.elementId));

  const cells = new Map<string, TraceabilityCell>();
  for (const [key, cell] of matrix.cells) {
    if (!rowIds.has(cell.requirementId)) continue;
    if (!colIds.has(cell.elementId)) continue;
    if (traceKinds !== undefined) {
      const kept = cell.traceKinds.filter((k) => traceKinds.has(k));
      if (kept.length === 0) continue;
      cells.set(key, { ...cell, traceKinds: kept });
    } else {
      cells.set(key, cell);
    }
  }

  return { rows, columns, cells };
}
