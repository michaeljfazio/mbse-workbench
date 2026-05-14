import { describe, expect, it } from 'vitest';

import type { Connection } from '@xyflow/react';

import {
  createElementRegistry,
  type ModelEdge,
  type ModelElement,
} from '@/model';
import {
  canonicalizeParametricConnection,
  isValidParametricConnection,
} from '@/viewpoints';

import { mkEdgeId, mkElementId } from '../../model/helpers';

function mkConstraintUsage(idSlug: string): ModelElement {
  return {
    id: mkElementId(idSlug),
    kind: 'ConstraintUsage',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: idSlug,
    definitionId: mkElementId(`${idSlug}-def`),
  };
}

function mkValueProperty(idSlug: string): ModelElement {
  return {
    id: mkElementId(idSlug),
    kind: 'ValueProperty',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: idSlug,
    valueType: 'number',
  };
}

function mkBlock(idSlug: string): ModelElement {
  return {
    id: mkElementId(idSlug),
    kind: 'PartDefinition',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: idSlug,
    isAbstract: false,
  };
}

function setup(elements: readonly ModelElement[]) {
  const registry = createElementRegistry();
  for (const el of elements) registry.add(el);
  return registry;
}

function conn(
  source: ModelElement,
  target: ModelElement,
): Connection {
  return {
    source: source.id,
    target: target.id,
    sourceHandle: 'bottom',
    targetHandle: 'top',
  };
}

describe('isValidParametricConnection', () => {
  it('accepts ConstraintUsage → ValueProperty', () => {
    const cu = mkConstraintUsage('cu');
    const vp = mkValueProperty('vp');
    const reg = setup([cu, vp]);
    expect(isValidParametricConnection(conn(cu, vp), reg)).toBe(true);
  });

  it('accepts ValueProperty → ConstraintUsage', () => {
    const cu = mkConstraintUsage('cu');
    const vp = mkValueProperty('vp');
    const reg = setup([cu, vp]);
    expect(isValidParametricConnection(conn(vp, cu), reg)).toBe(true);
  });

  it('accepts ConstraintUsage → ConstraintUsage (chained)', () => {
    const a = mkConstraintUsage('a');
    const b = mkConstraintUsage('b');
    const reg = setup([a, b]);
    expect(isValidParametricConnection(conn(a, b), reg)).toBe(true);
  });

  it('rejects self-loop', () => {
    const cu = mkConstraintUsage('cu');
    const reg = setup([cu]);
    expect(isValidParametricConnection(conn(cu, cu), reg)).toBe(false);
  });

  it('rejects non-parametric endpoint kinds', () => {
    const cu = mkConstraintUsage('cu');
    const block = mkBlock('block');
    const reg = setup([cu, block]);
    expect(isValidParametricConnection(conn(cu, block), reg)).toBe(false);
  });

  it('rejects missing endpoint', () => {
    const cu = mkConstraintUsage('cu');
    const reg = setup([cu]);
    expect(
      isValidParametricConnection(
        { source: cu.id, target: 'missing', sourceHandle: null, targetHandle: null },
        reg,
      ),
    ).toBe(false);
  });

  it('rejects duplicate edge (either direction)', () => {
    const cu = mkConstraintUsage('cu');
    const vp = mkValueProperty('vp');
    const reg = setup([cu, vp]);
    const existing: ModelEdge[] = [
      {
        id: mkEdgeId('e1'),
        kind: 'ParameterBinding',
        sourceId: cu.id,
        targetId: vp.id,
      },
    ];
    expect(isValidParametricConnection(conn(cu, vp), reg, existing)).toBe(false);
    expect(isValidParametricConnection(conn(vp, cu), reg, existing)).toBe(false);
  });
});

describe('canonicalizeParametricConnection', () => {
  it('flips ValueProperty → ConstraintUsage to ConstraintUsage → ValueProperty', () => {
    const cu = mkConstraintUsage('cu');
    const vp = mkValueProperty('vp');
    const reg = setup([cu, vp]);
    const out = canonicalizeParametricConnection(conn(vp, cu), reg);
    expect(out.source).toBe(cu.id);
    expect(out.target).toBe(vp.id);
  });

  it('preserves order when source is already ConstraintUsage', () => {
    const cu = mkConstraintUsage('cu');
    const vp = mkValueProperty('vp');
    const reg = setup([cu, vp]);
    const out = canonicalizeParametricConnection(conn(cu, vp), reg);
    expect(out.source).toBe(cu.id);
    expect(out.target).toBe(vp.id);
  });

  it('preserves order for same-kind pairs', () => {
    const a = mkConstraintUsage('a');
    const b = mkConstraintUsage('b');
    const reg = setup([a, b]);
    const out = canonicalizeParametricConnection(conn(a, b), reg);
    expect(out.source).toBe(a.id);
    expect(out.target).toBe(b.id);
  });
});
