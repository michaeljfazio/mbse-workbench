import { describe, expect, it } from 'vitest';

import {
  bddViewpoint,
  BDD_VIEWPOINT_ID,
  createViewpointRegistry,
  DuplicateViewpointError,
  type Viewpoint,
} from '@/viewpoints';

function makeStub(id: string, label: string): Viewpoint {
  return {
    id,
    label,
    acceptedElementKinds: [],
    acceptedEdgeKinds: [],
    acceptedEdgeElementKinds: [],
    defaultLayout: 'manual',
    paletteItems: [],
    nodeTypes: {},
    edgeTypes: {},
    nodeTypeFor() {
      throw new Error(`stub viewpoint ${id} cannot render nodes`);
    },
    edgeTypeFor() {
      throw new Error(`stub viewpoint ${id} cannot render edges`);
    },
    edgeTypeForElement() {
      throw new Error(`stub viewpoint ${id} cannot render element-as-edge`);
    },
  };
}

describe('Viewpoint registry', () => {
  it('registers and looks up a viewpoint by id', () => {
    const registry = createViewpointRegistry();
    registry.register(bddViewpoint);

    expect(registry.has(BDD_VIEWPOINT_ID)).toBe(true);
    expect(registry.get(BDD_VIEWPOINT_ID)).toBe(bddViewpoint);
    expect(registry.list()).toEqual([bddViewpoint]);
  });

  it('returns undefined for an unknown viewpoint id', () => {
    const registry = createViewpointRegistry();
    expect(registry.has('unknown')).toBe(false);
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('rejects duplicate registrations with DuplicateViewpointError', () => {
    const registry = createViewpointRegistry();
    registry.register(bddViewpoint);

    const duplicate = makeStub(BDD_VIEWPOINT_ID, 'Duplicate');
    expect(() => registry.register(duplicate)).toThrowError(DuplicateViewpointError);
  });

  it('preserves registration order in list()', () => {
    const registry = createViewpointRegistry();
    const a = makeStub('a', 'A');
    const b = makeStub('b', 'B');
    const c = makeStub('c', 'C');
    registry.register(b);
    registry.register(a);
    registry.register(c);
    expect(registry.list().map((v) => v.id)).toEqual(['b', 'a', 'c']);
  });

  it('BDD viewpoint reports BDD-specific element and edge kinds and a Block palette item', () => {
    expect(bddViewpoint.id).toBe('bdd');
    expect(bddViewpoint.acceptedElementKinds).toContain('PartDefinition');
    expect(bddViewpoint.acceptedEdgeKinds).toEqual(
      expect.arrayContaining(['Composition', 'Generalization']),
    );
    expect(bddViewpoint.defaultLayout).toBe('dagre');
    expect(bddViewpoint.paletteItems.map((p) => p.elementKind)).toContain(
      'PartDefinition',
    );
    expect(Object.keys(bddViewpoint.nodeTypes)).toContain('bdd-block');
    expect(Object.keys(bddViewpoint.edgeTypes)).toContain('bdd-composition');
    expect(Object.keys(bddViewpoint.edgeTypes)).toContain('bdd-generalization');
  });
});
