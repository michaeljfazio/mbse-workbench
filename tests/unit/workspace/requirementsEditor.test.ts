import { describe, expect, it } from 'vitest';

import type {
  ModelEdge,
  RequirementElement,
  RequirementTraceEdge,
} from '@/model';
import {
  buildRequirementRows,
  filterRequirements,
  sortRequirements,
  type RequirementRow,
} from '@/workspace/requirements/editor';

import { mkEdgeId, mkElementId } from '../model/helpers';

function makeReq(
  id: string,
  overrides: Partial<RequirementElement> = {},
): RequirementElement {
  return {
    id: mkElementId(id),
    kind: 'Requirement',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: `Req-${id}`,
    text: '',
    priority: 'medium',
    status: 'draft',
    ...overrides,
  };
}

function trace(
  id: string,
  sourceId: string,
  targetId: string,
  traceKind: RequirementTraceEdge['traceKind'] = 'satisfy',
): RequirementTraceEdge {
  return {
    id: mkEdgeId(id),
    kind: 'RequirementTrace',
    sourceId: mkElementId(sourceId),
    targetId: mkElementId(targetId),
    traceKind,
  };
}

describe('buildRequirementRows', () => {
  it('projects each Requirement into a row with reqId/name/text/priority/status', () => {
    const reqs: RequirementElement[] = [
      makeReq('r1', {
        name: 'Brakes work',
        reqId: 'R-001',
        text: 'The brakes shall stop the car',
        priority: 'high',
        status: 'approved',
      }),
    ];
    const rows = buildRequirementRows(reqs, []);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row).toBeDefined();
    expect(row?.id).toBe(mkElementId('r1'));
    expect(row?.reqId).toBe('R-001');
    expect(row?.name).toBe('Brakes work');
    expect(row?.text).toBe('The brakes shall stop the car');
    expect(row?.priority).toBe('high');
    expect(row?.status).toBe('approved');
    expect(row?.traceCount).toBe(0);
  });

  it('emits empty-string reqId when the Requirement has none', () => {
    const rows = buildRequirementRows([makeReq('r1')], []);
    expect(rows[0]?.reqId).toBe('');
  });

  it('counts RequirementTrace edges that touch the requirement on either side', () => {
    const reqs = [makeReq('r1'), makeReq('r2')];
    const edges: ModelEdge[] = [
      trace('t1', 'r1', 'block1'),
      trace('t2', 'r1', 'block2', 'verify'),
      trace('t3', 'r2', 'r1', 'derive'),
    ];
    const rows = buildRequirementRows(reqs, edges);
    const r1 = rows.find((r) => r.id === mkElementId('r1'));
    const r2 = rows.find((r) => r.id === mkElementId('r2'));
    expect(r1?.traceCount).toBe(3);
    expect(r2?.traceCount).toBe(1);
  });

  it('ignores non-RequirementTrace edges in the trace count', () => {
    const edges: ModelEdge[] = [
      {
        id: mkEdgeId('c1'),
        kind: 'Composition',
        sourceId: mkElementId('r1'),
        targetId: mkElementId('block1'),
      },
    ];
    const rows = buildRequirementRows([makeReq('r1')], edges);
    expect(rows[0]?.traceCount).toBe(0);
  });
});

describe('filterRequirements', () => {
  const rows: RequirementRow[] = [
    {
      id: mkElementId('r1'),
      reqId: 'R-001',
      name: 'Brakes work',
      text: 'The brakes shall stop the car',
      priority: 'high',
      status: 'approved',
      traceCount: 0,
    },
    {
      id: mkElementId('r2'),
      reqId: 'R-002',
      name: 'Lights on',
      text: 'Headlights illuminate the road at night',
      priority: 'medium',
      status: 'draft',
      traceCount: 0,
    },
    {
      id: mkElementId('r3'),
      reqId: '',
      name: 'Tyres grip',
      text: '',
      priority: 'low',
      status: 'draft',
      traceCount: 0,
    },
  ];

  it('returns all rows for an empty query', () => {
    expect(filterRequirements(rows, '')).toHaveLength(3);
    expect(filterRequirements(rows, '   ')).toHaveLength(3);
  });

  it('matches case-insensitively against name, text, and reqId', () => {
    expect(filterRequirements(rows, 'BRAKES').map((r) => r.id)).toEqual([
      mkElementId('r1'),
    ]);
    expect(filterRequirements(rows, 'night').map((r) => r.id)).toEqual([
      mkElementId('r2'),
    ]);
    expect(filterRequirements(rows, 'r-00').map((r) => r.id)).toEqual([
      mkElementId('r1'),
      mkElementId('r2'),
    ]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterRequirements(rows, 'zzz-no-match')).toEqual([]);
  });
});

describe('sortRequirements', () => {
  const base: RequirementRow[] = [
    {
      id: mkElementId('r1'),
      reqId: 'R-002',
      name: 'Beta',
      text: '',
      priority: 'low',
      status: 'draft',
      traceCount: 2,
    },
    {
      id: mkElementId('r2'),
      reqId: 'R-001',
      name: 'Alpha',
      text: '',
      priority: 'critical',
      status: 'verified',
      traceCount: 0,
    },
    {
      id: mkElementId('r3'),
      reqId: '',
      name: 'gamma',
      text: '',
      priority: 'medium',
      status: 'approved',
      traceCount: 5,
    },
  ];

  it('sorts by name ascending (case-insensitive) and is stable on ties', () => {
    const sorted = sortRequirements(base, 'name', 'asc').map((r) => r.id);
    expect(sorted).toEqual([
      mkElementId('r2'),
      mkElementId('r1'),
      mkElementId('r3'),
    ]);
  });

  it('sorts by name descending', () => {
    const sorted = sortRequirements(base, 'name', 'desc').map((r) => r.id);
    expect(sorted).toEqual([
      mkElementId('r3'),
      mkElementId('r1'),
      mkElementId('r2'),
    ]);
  });

  it('sorts by reqId with empty values landing last (asc)', () => {
    const sorted = sortRequirements(base, 'reqId', 'asc').map((r) => r.id);
    expect(sorted).toEqual([
      mkElementId('r2'),
      mkElementId('r1'),
      mkElementId('r3'),
    ]);
  });

  it('sorts by reqId with empty values landing last (desc)', () => {
    const sorted = sortRequirements(base, 'reqId', 'desc').map((r) => r.id);
    expect(sorted).toEqual([
      mkElementId('r1'),
      mkElementId('r2'),
      mkElementId('r3'),
    ]);
  });

  it('sorts by priority in domain order (asc: low → critical)', () => {
    const sorted = sortRequirements(base, 'priority', 'asc').map(
      (r) => r.priority,
    );
    expect(sorted).toEqual(['low', 'medium', 'critical']);
  });

  it('sorts by status in domain order (asc: draft → rejected)', () => {
    const sorted = sortRequirements(base, 'status', 'asc').map((r) => r.status);
    expect(sorted).toEqual(['draft', 'approved', 'verified']);
  });

  it('sorts by traceCount numerically', () => {
    const asc = sortRequirements(base, 'traceCount', 'asc').map(
      (r) => r.traceCount,
    );
    expect(asc).toEqual([0, 2, 5]);
    const desc = sortRequirements(base, 'traceCount', 'desc').map(
      (r) => r.traceCount,
    );
    expect(desc).toEqual([5, 2, 0]);
  });

  it('does not mutate the input array', () => {
    const snapshot = [...base];
    sortRequirements(base, 'name', 'asc');
    expect(base).toEqual(snapshot);
  });
});
