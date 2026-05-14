import { describe, expect, it } from 'vitest';

import {
  createEdgeId,
  createElementId,
  type ModelEdge,
  type ModelElement,
  type RequirementElement,
  type RequirementStatus,
  type RequirementTraceEdge,
} from '@/model';

import { computeRequirementsCoverage } from '../coverage';

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

function trace(
  source: RequirementElement,
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

describe('computeRequirementsCoverage', () => {
  it('returns zeros when there are no requirements', () => {
    const c = computeRequirementsCoverage([partDef('B1')], []);
    expect(c.totalRequirements).toBe(0);
    expect(c.satisfied.size).toBe(0);
    expect(c.verified.size).toBe(0);
    expect(c.unsatisfied).toEqual([]);
    expect(c.unverified).toEqual([]);
  });

  it('a requirement with no traces is both unsatisfied and unverified', () => {
    const r1 = req('001');
    const c = computeRequirementsCoverage([r1], []);
    expect(c.totalRequirements).toBe(1);
    expect(c.satisfied.size).toBe(0);
    expect(c.verified.size).toBe(0);
    expect(c.unsatisfied).toEqual([r1]);
    expect(c.unverified).toEqual([r1]);
  });

  it('satisfy edge moves a requirement out of unsatisfied but not unverified', () => {
    const r1 = req('001');
    const b1 = partDef('B1');
    const c = computeRequirementsCoverage([r1, b1], [trace(r1, b1, 'satisfy')]);
    expect(c.satisfied.has(r1.id)).toBe(true);
    expect(c.verified.has(r1.id)).toBe(false);
    expect(c.unsatisfied).toEqual([]);
    expect(c.unverified).toEqual([r1]);
  });

  it('verify edge moves a requirement out of unverified but not unsatisfied', () => {
    const r1 = req('001');
    const b1 = partDef('B1');
    const c = computeRequirementsCoverage([r1, b1], [trace(r1, b1, 'verify')]);
    expect(c.satisfied.has(r1.id)).toBe(false);
    expect(c.verified.has(r1.id)).toBe(true);
    expect(c.unsatisfied).toEqual([r1]);
    expect(c.unverified).toEqual([]);
  });

  it('derive and refine traces do NOT count toward satisfy or verify coverage', () => {
    const r1 = req('001');
    const r2 = req('002');
    const c = computeRequirementsCoverage(
      [r1, r2],
      [trace(r1, r2, 'derive'), trace(r1, r2, 'refine')],
    );
    expect(c.satisfied.size).toBe(0);
    expect(c.verified.size).toBe(0);
    expect(c.unsatisfied).toHaveLength(2);
    expect(c.unverified).toHaveLength(2);
  });

  it('counts a requirement only once even with multiple satisfy edges', () => {
    const r1 = req('001');
    const b1 = partDef('B1');
    const b2 = partDef('B2');
    const c = computeRequirementsCoverage(
      [r1, b1, b2],
      [trace(r1, b1, 'satisfy'), trace(r1, b2, 'satisfy')],
    );
    expect(c.satisfied.size).toBe(1);
    expect(c.unsatisfied).toEqual([]);
  });

  it('orders unsatisfied/unverified by reqId then name ascending', () => {
    const r1 = req('003', { reqId: 'REQ-003', name: 'Zebra' });
    const r2 = req('001', { reqId: 'REQ-001', name: 'Alpha' });
    const r3 = req('002', { reqId: 'REQ-002', name: 'Mango' });
    const c = computeRequirementsCoverage([r1, r2, r3], []);
    expect(c.unsatisfied.map((r) => r.reqId)).toEqual([
      'REQ-001',
      'REQ-002',
      'REQ-003',
    ]);
    expect(c.unverified.map((r) => r.reqId)).toEqual([
      'REQ-001',
      'REQ-002',
      'REQ-003',
    ]);
  });

  it('falls back to name when reqId is missing in the ordering', () => {
    const r1 = req('001', { reqId: undefined, name: 'Beta' });
    const r2 = req('002', { reqId: undefined, name: 'Alpha' });
    const c = computeRequirementsCoverage([r1, r2], []);
    expect(c.unsatisfied.map((r) => r.name)).toEqual(['Alpha', 'Beta']);
  });

  it('statusFilter narrows the total and the gap lists', () => {
    const approved: RequirementStatus = 'approved';
    const draft = req('001', { status: 'draft' });
    const approvedReq = req('002', { status: 'approved' });
    const b1 = partDef('B1');
    const c = computeRequirementsCoverage(
      [draft, approvedReq, b1],
      [trace(approvedReq, b1, 'satisfy')],
      { statusFilter: new Set([approved]) },
    );
    expect(c.totalRequirements).toBe(1);
    expect(c.satisfied.has(approvedReq.id)).toBe(true);
    expect(c.satisfied.has(draft.id)).toBe(false);
    expect(c.unsatisfied).toEqual([]);
    expect(c.unverified).toEqual([approvedReq]);
  });

  it('ignores satisfy traces sourced from out-of-scope requirements', () => {
    const draft = req('001', { status: 'draft' });
    const approvedReq = req('002', { status: 'approved' });
    const b1 = partDef('B1');
    const c = computeRequirementsCoverage(
      [draft, approvedReq, b1],
      [trace(draft, b1, 'satisfy')],
      { statusFilter: new Set<RequirementStatus>(['approved']) },
    );
    expect(c.satisfied.size).toBe(0);
    expect(c.totalRequirements).toBe(1);
    expect(c.unsatisfied).toEqual([approvedReq]);
  });

  it('does not mutate the input arrays', () => {
    const r1 = req('002');
    const r2 = req('001');
    const elements: ModelElement[] = [r1, r2];
    const edges: ModelEdge[] = [];
    const snapshot = [...elements];
    computeRequirementsCoverage(elements, edges);
    expect(elements).toEqual(snapshot);
  });
});
