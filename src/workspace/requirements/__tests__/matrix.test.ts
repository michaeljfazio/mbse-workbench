import { describe, expect, it } from 'vitest';

import {
  createEdgeId,
  createElementId,
  type ModelEdge,
  type ModelElement,
  type RequirementElement,
  type RequirementTraceEdge,
} from '@/model';

import {
  buildTraceabilityMatrix,
  cellKey,
  filterMatrix,
  sortMatrixRows,
  TRACE_KIND_GLYPHS,
  TRACE_KIND_ORDER,
} from '../matrix';

function req(
  id: string,
  overrides: Partial<RequirementElement> = {},
): RequirementElement {
  return {
    id: createElementId(),
    kind: 'Requirement',
    name: `R-${id}`,
    reqId: `REQ-${id}`,
    text: '',
    priority: 'medium',
    status: 'draft',
    ...overrides,
  } as RequirementElement;
}

function partDef(name: string): ModelElement {
  return {
    id: createElementId(),
    kind: 'PartDefinition',
    name,
    isAbstract: false,
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
  };
}

function action(name: string): ModelElement {
  return {
    id: createElementId(),
    kind: 'ActionUsage',
    name,
    nodeType: 'action',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
  };
}

function trace(
  source: ModelElement,
  target: ModelElement,
  kind: RequirementTraceEdge['traceKind'],
): ModelEdge {
  return {
    id: createEdgeId(),
    kind: 'RequirementTrace',
    sourceId: source.id,
    targetId: target.id,
    traceKind: kind,
  };
}

describe('buildTraceabilityMatrix', () => {
  it('returns empty matrix when there are no requirements', () => {
    const m = buildTraceabilityMatrix([partDef('B1')], []);
    expect(m.rows).toEqual([]);
    expect(m.columns).toEqual([]);
    expect(m.cells.size).toBe(0);
  });

  it('rows include every Requirement even when untraced; columns are only edge targets', () => {
    const r1 = req('001');
    const r2 = req('002', { name: 'R-second' });
    const b1 = partDef('Block A');
    const m = buildTraceabilityMatrix([r1, r2, b1], []);
    expect(m.rows.map((r) => r.requirementId)).toEqual([r1.id, r2.id]);
    expect(m.columns).toEqual([]);
  });

  it('builds rows sorted by reqId and columns sorted by (kind, name)', () => {
    const r1 = req('002');
    const r2 = req('001');
    const a1 = action('act-z');
    const b1 = partDef('Block A');
    const e1 = trace(r1, b1, 'satisfy');
    const e2 = trace(r2, a1, 'verify');
    const m = buildTraceabilityMatrix([r1, r2, a1, b1], [e1, e2]);
    expect(m.rows.map((r) => r.reqId)).toEqual(['REQ-001', 'REQ-002']);
    expect(m.columns.map((c) => c.kind)).toEqual(['ActionUsage', 'PartDefinition']);
  });

  it('cell collects multiple trace kinds and edge ids for the same (req, target) pair', () => {
    const r1 = req('001');
    const b1 = partDef('Block A');
    const e1 = trace(r1, b1, 'satisfy');
    const e2 = trace(r1, b1, 'verify');
    const m = buildTraceabilityMatrix([r1, b1], [e1, e2]);
    const cell = m.cells.get(cellKey(r1.id, b1.id));
    expect(cell).toBeDefined();
    expect(cell?.traceKinds).toEqual(['satisfy', 'verify']);
    expect(cell?.edgeIds).toHaveLength(2);
  });

  it('outgoingCount on each row equals the number of trace edges with that requirement as source', () => {
    const r1 = req('001');
    const r2 = req('002');
    const b1 = partDef('B1');
    const b2 = partDef('B2');
    const m = buildTraceabilityMatrix(
      [r1, r2, b1, b2],
      [trace(r1, b1, 'satisfy'), trace(r1, b2, 'verify'), trace(r2, b1, 'satisfy')],
    );
    const r1Row = m.rows.find((r) => r.requirementId === r1.id);
    const r2Row = m.rows.find((r) => r.requirementId === r2.id);
    expect(r1Row?.outgoingCount).toBe(2);
    expect(r2Row?.outgoingCount).toBe(1);
  });

  it('Requirement→Requirement derive/refine traces produce a Requirement column', () => {
    const parent = req('001');
    const child = req('002');
    const m = buildTraceabilityMatrix(
      [parent, child],
      [trace(child, parent, 'derive')],
    );
    expect(m.columns).toEqual([
      { elementId: parent.id, kind: 'Requirement', name: parent.name },
    ]);
    const cell = m.cells.get(cellKey(child.id, parent.id));
    expect(cell?.traceKinds).toEqual(['derive']);
  });

  it('ignores trace edges whose target is missing or not in TRACE_TARGET_KINDS', () => {
    const r1 = req('001');
    const b1 = partDef('B1');
    const ghost: RequirementTraceEdge = {
      id: createEdgeId(),
      kind: 'RequirementTrace',
      sourceId: r1.id,
      targetId: createElementId(),
      traceKind: 'satisfy',
    };
    const m = buildTraceabilityMatrix([r1, b1], [ghost, trace(r1, b1, 'satisfy')]);
    expect(m.columns).toHaveLength(1);
    expect(m.cells.size).toBe(1);
  });
});

describe('sortMatrixRows', () => {
  const rows = [
    { requirementId: 'a' as never, reqId: 'REQ-002', name: 'beta', priority: 'low' as const, status: 'draft' as const, outgoingCount: 3 },
    { requirementId: 'b' as never, reqId: 'REQ-001', name: 'alpha', priority: 'low' as const, status: 'draft' as const, outgoingCount: 1 },
    { requirementId: 'c' as never, reqId: '',         name: 'gamma', priority: 'low' as const, status: 'draft' as const, outgoingCount: 2 },
  ];

  it('sorts by reqId ascending by default (empty reqId falls back to name)', () => {
    const sorted = sortMatrixRows(rows, 'reqId');
    // locale-aware compare: 'gamma' < 'REQ-001' < 'REQ-002' (lowercase g sorts before R)
    expect(sorted.map((r) => r.name)).toEqual(['gamma', 'alpha', 'beta']);
  });

  it('sorts by name descending when direction=desc', () => {
    const sorted = sortMatrixRows(rows, 'name', 'desc');
    expect(sorted.map((r) => r.name)).toEqual(['gamma', 'beta', 'alpha']);
  });

  it('sorts by outgoingCount numerically', () => {
    const sorted = sortMatrixRows(rows, 'outgoingCount', 'desc');
    expect(sorted.map((r) => r.outgoingCount)).toEqual([3, 2, 1]);
  });

  it('does not mutate the input array', () => {
    const before = rows.map((r) => r.name);
    sortMatrixRows(rows, 'outgoingCount', 'desc');
    expect(rows.map((r) => r.name)).toEqual(before);
  });
});

describe('filterMatrix', () => {
  function fixture() {
    const r1 = req('001', { name: 'alpha' });
    const r2 = req('002', { name: 'beta' });
    const b1 = partDef('Block-A');
    const a1 = action('act-1');
    return buildTraceabilityMatrix(
      [r1, r2, b1, a1],
      [
        trace(r1, b1, 'satisfy'),
        trace(r1, a1, 'verify'),
        trace(r2, b1, 'satisfy'),
      ],
    );
  }

  it('narrows rows by text on reqId or name (case-insensitive)', () => {
    const m = fixture();
    const byReqId = filterMatrix(m, { text: 'REQ-001' });
    expect(byReqId.rows).toHaveLength(1);
    const byName = filterMatrix(m, { text: 'BETA' });
    expect(byName.rows).toHaveLength(1);
    expect(byName.rows[0]?.reqId).toBe('REQ-002');
  });

  it('narrows columns by element kind', () => {
    const m = fixture();
    const out = filterMatrix(m, { columnKinds: new Set(['PartDefinition']) });
    expect(out.columns.map((c) => c.kind)).toEqual(['PartDefinition']);
    expect([...out.cells.values()].every((c) => c.elementId === out.columns[0]?.elementId)).toBe(true);
  });

  it('keeps only cells whose trace kinds intersect the filter', () => {
    const m = fixture();
    const out = filterMatrix(m, { traceKinds: new Set(['verify']) });
    expect(out.cells.size).toBe(1);
    const [only] = [...out.cells.values()];
    expect(only?.traceKinds).toEqual(['verify']);
  });

  it('drops cells whose row or column was filtered out', () => {
    const m = fixture();
    const out = filterMatrix(m, {
      text: 'alpha',
      columnKinds: new Set(['ActionUsage']),
    });
    expect(out.cells.size).toBe(1);
  });
});

describe('TRACE_KIND_GLYPHS', () => {
  it('covers every kind in TRACE_KIND_ORDER and uses one-character glyphs', () => {
    for (const k of TRACE_KIND_ORDER) {
      expect(TRACE_KIND_GLYPHS[k]).toMatch(/^.$/);
    }
  });
});
