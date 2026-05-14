import { describe, expect, it } from 'vitest';

import {
  createEdgeId,
  createElementId,
  type CompositionEdge,
  type ControlFlowEdge,
  type ModelEdge,
  type ModelElement,
  type RequirementElement,
  type RequirementTraceEdge,
} from '@/model';

import { computeImpactSet, isInImpactSet } from '../impact-set';

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

function partUsage(name: string, definitionId: ModelElement['id']): ModelElement {
  return {
    id: createElementId(),
    kind: 'PartUsage',
    name,
    definitionId,
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

function req(reqId: string, overrides: Partial<RequirementElement> = {}): RequirementElement {
  return {
    id: createElementId(),
    kind: 'Requirement',
    name: `R-${reqId}`,
    reqId: `REQ-${reqId}`,
    text: '',
    priority: 'medium',
    status: 'draft',
    ...overrides,
  } as RequirementElement;
}

function composition(source: ModelElement, target: ModelElement): CompositionEdge {
  return {
    id: createEdgeId(),
    kind: 'Composition',
    sourceId: source.id,
    targetId: target.id,
  };
}

function controlFlow(source: ModelElement, target: ModelElement): ControlFlowEdge {
  return {
    id: createEdgeId(),
    kind: 'ControlFlow',
    sourceId: source.id,
    targetId: target.id,
  };
}

function trace(
  source: ModelElement,
  target: ModelElement,
  kind: RequirementTraceEdge['traceKind'] = 'satisfy',
): RequirementTraceEdge {
  return {
    id: createEdgeId(),
    kind: 'RequirementTrace',
    sourceId: source.id,
    targetId: target.id,
    traceKind: kind,
  };
}

describe('computeImpactSet', () => {
  it('returns just the root for an isolated element', () => {
    const a = partDef('A');
    const set = computeImpactSet({
      rootElementId: a.id,
      elements: [a],
      edges: [],
    });
    expect([...set.elementIds]).toEqual([a.id]);
    expect(set.edgeIds.size).toBe(0);
    expect(set.rootId).toBe(a.id);
  });

  it('returns an empty set when the root is unknown', () => {
    const a = partDef('A');
    const ghost = createElementId();
    const set = computeImpactSet({
      rootElementId: ghost,
      elements: [a],
      edges: [],
    });
    expect(set.elementIds.size).toBe(0);
    expect(set.edgeIds.size).toBe(0);
    expect(set.rootId).toBe(ghost);
  });

  it('walks outgoing structural edges (Composition)', () => {
    const a = partDef('A');
    const b = partUsage('b', a.id);
    const c = partUsage('c', a.id);
    const ab = composition(a, b);
    const bc = composition(b, c);
    const set = computeImpactSet({
      rootElementId: a.id,
      elements: [a, b, c],
      edges: [ab, bc],
    });
    expect(set.elementIds.has(a.id)).toBe(true);
    expect(set.elementIds.has(b.id)).toBe(true);
    expect(set.elementIds.has(c.id)).toBe(true);
    expect(set.edgeIds.has(ab.id)).toBe(true);
    expect(set.edgeIds.has(bc.id)).toBe(true);
  });

  it('does not walk structural edges backwards', () => {
    const a = partDef('A');
    const b = partUsage('b', a.id);
    const ba = composition(b, a);
    const set = computeImpactSet({
      rootElementId: a.id,
      elements: [a, b],
      edges: [ba],
    });
    expect(set.elementIds.has(b.id)).toBe(false);
    expect(set.edgeIds.has(ba.id)).toBe(false);
  });

  it('walks incoming RequirementTrace edges (Requirement → element)', () => {
    const block = partDef('Engine');
    const r1 = req('001');
    const r2 = req('002');
    const t1 = trace(r1, block, 'satisfy');
    const t2 = trace(r2, block, 'verify');
    const set = computeImpactSet({
      rootElementId: block.id,
      elements: [block, r1, r2],
      edges: [t1, t2],
    });
    expect(set.elementIds.has(r1.id)).toBe(true);
    expect(set.elementIds.has(r2.id)).toBe(true);
    expect(set.edgeIds.has(t1.id)).toBe(true);
    expect(set.edgeIds.has(t2.id)).toBe(true);
  });

  it('does not walk RequirementTrace edges forwards (out from a Requirement)', () => {
    const block = partDef('Engine');
    const r1 = req('001');
    const t1 = trace(r1, block, 'satisfy');
    const set = computeImpactSet({
      rootElementId: r1.id,
      elements: [block, r1],
      edges: [t1],
    });
    expect(set.elementIds.has(block.id)).toBe(false);
    expect(set.edgeIds.has(t1.id)).toBe(false);
  });

  it('combines structural descent and trace ascent transitively', () => {
    const a = partDef('A');
    const b = partUsage('b', a.id);
    const c = partUsage('c', a.id);
    const r1 = req('001');
    const r2 = req('002');
    const set = computeImpactSet({
      rootElementId: a.id,
      elements: [a, b, c, r1, r2],
      edges: [
        composition(a, b),
        composition(b, c),
        trace(r1, b, 'satisfy'),
        trace(r2, c, 'verify'),
      ],
    });
    expect([...set.elementIds].sort()).toEqual(
      [a.id, b.id, c.id, r1.id, r2.id].sort(),
    );
  });

  it('terminates on cycles in structural edges', () => {
    const a = partDef('A');
    const b = partDef('B');
    const set = computeImpactSet({
      rootElementId: a.id,
      elements: [a, b],
      edges: [composition(a, b), composition(b, a)],
    });
    expect(set.elementIds.size).toBe(2);
    expect(set.edgeIds.size).toBe(2);
  });

  it('ignores edges whose endpoints are missing from the element map', () => {
    const a = partDef('A');
    const danglingTarget = createElementId();
    const dangling: ModelEdge = {
      id: createEdgeId(),
      kind: 'Composition',
      sourceId: a.id,
      targetId: danglingTarget,
    };
    const set = computeImpactSet({
      rootElementId: a.id,
      elements: [a],
      edges: [dangling],
    });
    expect(set.elementIds.has(danglingTarget)).toBe(false);
    expect(set.edgeIds.has(dangling.id)).toBe(false);
  });

  it('walks ControlFlow as a structural edge', () => {
    const a1 = action('a1');
    const a2 = action('a2');
    const e = controlFlow(a1, a2);
    const set = computeImpactSet({
      rootElementId: a1.id,
      elements: [a1, a2],
      edges: [e],
    });
    expect(set.elementIds.has(a2.id)).toBe(true);
    expect(set.edgeIds.has(e.id)).toBe(true);
  });

  it('accepts Map inputs for both elements and edges', () => {
    const a = partDef('A');
    const b = partUsage('b', a.id);
    const ab = composition(a, b);
    const elements = new Map([
      [a.id, a],
      [b.id, b],
    ]);
    const edges = new Map([[ab.id, ab as ModelEdge]]);
    const set = computeImpactSet({
      rootElementId: a.id,
      elements,
      edges,
    });
    expect(set.elementIds.has(b.id)).toBe(true);
    expect(set.edgeIds.has(ab.id)).toBe(true);
  });
});

describe('isInImpactSet', () => {
  it('returns true for ids in either set, false otherwise', () => {
    const a = partDef('A');
    const b = partUsage('b', a.id);
    const ab = composition(a, b);
    const set = computeImpactSet({
      rootElementId: a.id,
      elements: [a, b],
      edges: [ab],
    });
    expect(isInImpactSet(set, a.id)).toBe(true);
    expect(isInImpactSet(set, b.id)).toBe(true);
    expect(isInImpactSet(set, ab.id)).toBe(true);
    expect(isInImpactSet(set, createElementId())).toBe(false);
  });
});
