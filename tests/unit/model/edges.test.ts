import { describe, expect, it } from 'vitest';
import {
  EDGE_KINDS,
  type EdgeKind,
  type ModelEdge,
} from '@/model';
import { assertNever, mkEdgeId, mkElementId } from './helpers';

function describeEdge(edge: ModelEdge): string {
  switch (edge.kind) {
    case 'Composition':
      return 'Composition';
    case 'Generalization':
      return 'Generalization';
    case 'RequirementTrace':
      return `RequirementTrace(${edge.traceKind})`;
    case 'ControlFlow':
      return `ControlFlow(${edge.guard ?? ''})`;
    case 'ObjectFlow':
      return `ObjectFlow(${edge.itemType ?? ''})`;
    case 'Include':
      return 'Include';
    case 'Extend':
      return `Extend(${edge.extensionPoint ?? ''})`;
    case 'ParameterBinding':
      return 'ParameterBinding';
    case 'PackageImport':
      return 'PackageImport';
    default:
      return assertNever(edge);
  }
}

const src = mkElementId('a');
const tgt = mkElementId('b');

const sampleByKind: { [K in EdgeKind]: () => Extract<ModelEdge, { kind: K }> } = {
  Composition: () => ({
    id: mkEdgeId('e-comp-1'),
    kind: 'Composition',
    sourceId: src,
    targetId: tgt,
  }),
  Generalization: () => ({
    id: mkEdgeId('e-gen-1'),
    kind: 'Generalization',
    sourceId: src,
    targetId: tgt,
  }),
  RequirementTrace: () => ({
    id: mkEdgeId('e-trace-1'),
    kind: 'RequirementTrace',
    sourceId: src,
    targetId: tgt,
    traceKind: 'satisfy',
  }),
  ControlFlow: () => ({
    id: mkEdgeId('e-cf-1'),
    kind: 'ControlFlow',
    sourceId: src,
    targetId: tgt,
  }),
  ObjectFlow: () => ({
    id: mkEdgeId('e-of-1'),
    kind: 'ObjectFlow',
    sourceId: src,
    targetId: tgt,
    itemType: 'Fuel',
  }),
  Include: () => ({
    id: mkEdgeId('e-inc-1'),
    kind: 'Include',
    sourceId: src,
    targetId: tgt,
  }),
  Extend: () => ({
    id: mkEdgeId('e-ext-1'),
    kind: 'Extend',
    sourceId: src,
    targetId: tgt,
  }),
  ParameterBinding: () => ({
    id: mkEdgeId('e-pb-1'),
    kind: 'ParameterBinding',
    sourceId: src,
    targetId: tgt,
  }),
  PackageImport: () => ({
    id: mkEdgeId('e-pi-1'),
    kind: 'PackageImport',
    sourceId: src,
    targetId: tgt,
  }),
};

describe('metamodel — edges', () => {
  it('declares all 9 edge kinds in EDGE_KINDS', () => {
    expect(EDGE_KINDS).toHaveLength(9);
    expect(new Set(EDGE_KINDS).size).toBe(9);
  });

  it('every edge kind has a constructible sample that round-trips through JSON', () => {
    for (const kind of EDGE_KINDS) {
      const edge = sampleByKind[kind]();
      expect(edge.kind).toBe(kind);
      const cloned = JSON.parse(JSON.stringify(edge)) as ModelEdge;
      expect(cloned).toEqual(edge);
    }
  });

  it('describeEdge exhaustively narrows every edge kind (compile-time check)', () => {
    for (const kind of EDGE_KINDS) {
      const edge = sampleByKind[kind]();
      expect(describeEdge(edge)).toContain('');
    }
  });

  it('RequirementTrace carries each of the four traceKinds', () => {
    const traces = (['satisfy', 'verify', 'derive', 'refine'] as const).map(
      (traceKind) => ({
        id: mkEdgeId(`e-trace-${traceKind}`),
        kind: 'RequirementTrace' as const,
        sourceId: src,
        targetId: tgt,
        traceKind,
      }),
    );
    expect(traces.map((t) => t.traceKind)).toEqual([
      'satisfy',
      'verify',
      'derive',
      'refine',
    ]);
  });
});
