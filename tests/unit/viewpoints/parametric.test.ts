import { describe, expect, it } from 'vitest';

import {
  createViewpointRegistry,
  PARAMETRIC_DEFAULT_NODE_HEIGHT,
  PARAMETRIC_DEFAULT_NODE_WIDTH,
  PARAMETRIC_VIEWPOINT_ID,
  parametricViewpoint,
} from '@/viewpoints';

describe('Parametric viewpoint (issue #135)', () => {
  it('exports the expected id, label, and accepted kinds', () => {
    expect(parametricViewpoint.id).toBe('parametric');
    expect(PARAMETRIC_VIEWPOINT_ID).toBe('parametric');
    expect(parametricViewpoint.label).toBe('Parametric Diagram');
    expect(parametricViewpoint.acceptedElementKinds).toEqual([
      'ConstraintUsage',
      'ValueProperty',
    ]);
    expect(parametricViewpoint.acceptedEdgeKinds).toEqual(['ParameterBinding']);
    expect(parametricViewpoint.acceptedEdgeElementKinds).toEqual([]);
    expect(parametricViewpoint.defaultLayout).toBe('dagre');
  });

  it('ships with an empty palette (#136 adds ConstraintUsage + ValueProperty palette items)', () => {
    expect(parametricViewpoint.paletteItems).toEqual([]);
  });

  it('exposes module-scoped (frozen) empty nodeTypes and edgeTypes records', () => {
    expect(Object.isFrozen(parametricViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(parametricViewpoint.edgeTypes)).toBe(true);
    expect(Object.keys(parametricViewpoint.nodeTypes)).toEqual([]);
    expect(Object.keys(parametricViewpoint.edgeTypes)).toEqual([]);
  });

  it('can be registered in a viewpoint registry and looked up by id', () => {
    const registry = createViewpointRegistry();
    registry.register(parametricViewpoint);
    expect(registry.has(PARAMETRIC_VIEWPOINT_ID)).toBe(true);
    expect(registry.get(PARAMETRIC_VIEWPOINT_ID)).toBe(parametricViewpoint);
  });

  it('nodeTypeFor throws — node renderers land in #136', () => {
    expect(() =>
      parametricViewpoint.nodeTypeFor({
        id: 'c-1' as never,
        kind: 'ConstraintUsage',
        name: 'Newton',
        definitionId: 'cd-1' as never,
      }),
    ).toThrow(/parametric viewpoint cannot render element kind/);
  });

  it('edgeTypeFor throws — edge renderers land in #137', () => {
    expect(() =>
      parametricViewpoint.edgeTypeFor({
        id: 'e-1' as never,
        kind: 'ParameterBinding',
        sourceId: 'c-1' as never,
        targetId: 'v-1' as never,
      }),
    ).toThrow(/parametric viewpoint cannot render edge kind/);
  });

  it('edgeTypeForElement throws — Parametric has no element-as-edge kinds', () => {
    expect(() =>
      parametricViewpoint.edgeTypeForElement({
        id: 'c-1' as never,
        kind: 'ConstraintUsage',
        name: 'Newton',
        definitionId: 'cd-1' as never,
      }),
    ).toThrow(/parametric viewpoint cannot render element-as-edge kind/);
  });

  it('nodeSizeFor returns the placeholder layout box for every element', () => {
    const expected = {
      width: PARAMETRIC_DEFAULT_NODE_WIDTH,
      height: PARAMETRIC_DEFAULT_NODE_HEIGHT,
    };
    expect(
      parametricViewpoint.nodeSizeFor({
        id: 'c-1' as never,
        kind: 'ConstraintUsage',
        name: 'Newton',
        definitionId: 'cd-1' as never,
      }),
    ).toEqual(expected);
    expect(
      parametricViewpoint.nodeSizeFor({
        id: 'v-1' as never,
        kind: 'ValueProperty',
        name: 'mass',
        valueType: 'number',
      }),
    ).toEqual(expected);
  });
});
