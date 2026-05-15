import { describe, expect, it } from 'vitest';

import type { ModelElement } from '@/model';

import type { Diagram } from '@/workspace/diagram';
import type {
  ContainmentElementNode,
  ContainmentRepresentationNode,
} from '@/workspace/tree/buildContainmentTree';
import {
  computeFilteredKeys,
  tokenizeFilter,
  type TreeFilterKey,
} from '@/workspace/tree/treeFilter';

const k = (s: string): TreeFilterKey => s as TreeFilterKey;

function el(id: string, name: string, kind: ModelElement['kind'] = 'PartDefinition'): ModelElement {
  return {
    id,
    kind,
    name,
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
  } as unknown as ModelElement;
}

function diagram(id: string, name: string): Diagram {
  return { id, name } as unknown as Diagram;
}

function elNode(
  e: ModelElement,
  children: readonly (ContainmentElementNode | ContainmentRepresentationNode)[] = [],
): ContainmentElementNode {
  return { kind: 'element', element: e, children };
}

function repNode(d: Diagram): ContainmentRepresentationNode {
  return { kind: 'representation', diagram: d };
}

describe('tokenizeFilter', () => {
  it('returns empty for whitespace-only input', () => {
    expect(tokenizeFilter('')).toEqual([]);
    expect(tokenizeFilter('   ')).toEqual([]);
  });

  it('splits on whitespace and lowercases', () => {
    expect(tokenizeFilter('  Pump  Engine ')).toEqual(['pump', 'engine']);
  });
});

describe('computeFilteredKeys', () => {
  const root = elNode(el('root', 'Project', 'Package'), [
    elNode(el('pump', 'Pump'), [elNode(el('shaft', 'Shaft'))]),
    elNode(el('vessel', 'Vessel')),
    repNode(diagram('d-bdd', 'System BDD')),
  ]);

  it('returns null when no tokens (filter inactive)', () => {
    expect(computeFilteredKeys(root, [])).toBeNull();
  });

  it('returns empty set when root is null', () => {
    expect(computeFilteredKeys(null, ['x'])).toEqual(new Set());
  });

  it('matches an element by name and includes its ancestors', () => {
    const keys = computeFilteredKeys(root, ['pump'])!;
    expect(keys.has(k('el:root'))).toBe(true);
    expect(keys.has(k('el:pump'))).toBe(true);
    expect(keys.has(k('el:vessel'))).toBe(false);
    expect(keys.has(k('el:shaft'))).toBe(false);
    expect(keys.has(k('dg:d-bdd'))).toBe(false);
  });

  it('matches a diagram by name and includes its parent element', () => {
    const keys = computeFilteredKeys(root, ['bdd'])!;
    expect(keys.has(k('dg:d-bdd'))).toBe(true);
    expect(keys.has(k('el:root'))).toBe(true);
    expect(keys.has(k('el:pump'))).toBe(false);
  });

  it('matches a kind name', () => {
    const keys = computeFilteredKeys(root, ['package'])!;
    expect(keys.has(k('el:root'))).toBe(true);
    expect(keys.has(k('el:pump'))).toBe(false);
  });

  it('applies AND semantics across multiple tokens', () => {
    // "shaft pump" — only Shaft matches (its haystack is "shaft partdefinition"
    // and contains neither "pump") so the result is empty for shaft, and
    // since pump matches "pump" but not "shaft", neither qualifies on its own.
    // Verify both tokens must match the SAME node's haystack.
    const keys = computeFilteredKeys(root, ['shaft', 'pump'])!;
    expect(keys.size).toBe(0);
  });

  it('keeps a deep descendant match by including its full ancestor chain', () => {
    const keys = computeFilteredKeys(root, ['shaft'])!;
    expect(keys.has(k('el:shaft'))).toBe(true);
    expect(keys.has(k('el:pump'))).toBe(true);
    expect(keys.has(k('el:root'))).toBe(true);
    expect(keys.has(k('el:vessel'))).toBe(false);
  });

  it('returns empty set when nothing matches', () => {
    const keys = computeFilteredKeys(root, ['zzz']);
    expect(keys).toEqual(new Set());
  });
});
