import { describe, expect, it } from 'vitest';

import {
  createViewpointRegistry,
  PARAMETRIC_CONSTRAINT_USAGE_HEIGHT,
  PARAMETRIC_CONSTRAINT_USAGE_NODE_TYPE,
  PARAMETRIC_CONSTRAINT_USAGE_WIDTH,
  PARAMETRIC_VALUE_PROPERTY_HEIGHT,
  PARAMETRIC_VALUE_PROPERTY_NODE_TYPE,
  PARAMETRIC_VALUE_PROPERTY_WIDTH,
  PARAMETRIC_VIEWPOINT_ID,
  parametricViewpoint,
} from '@/viewpoints';

describe('Parametric viewpoint (issues #135 / #136)', () => {
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

  it('ships palette items for ConstraintUsage and ValueProperty (#136)', () => {
    const kinds = parametricViewpoint.paletteItems.map((p) => p.elementKind);
    expect(kinds).toEqual(['ConstraintUsage', 'ValueProperty']);
  });

  it('exposes module-scoped (frozen) nodeTypes for both kinds', () => {
    expect(Object.isFrozen(parametricViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(parametricViewpoint.edgeTypes)).toBe(true);
    expect(Object.keys(parametricViewpoint.nodeTypes).sort()).toEqual(
      [
        PARAMETRIC_CONSTRAINT_USAGE_NODE_TYPE,
        PARAMETRIC_VALUE_PROPERTY_NODE_TYPE,
      ].sort(),
    );
    expect(Object.keys(parametricViewpoint.edgeTypes)).toEqual([]);
  });

  it('can be registered in a viewpoint registry and looked up by id', () => {
    const registry = createViewpointRegistry();
    registry.register(parametricViewpoint);
    expect(registry.has(PARAMETRIC_VIEWPOINT_ID)).toBe(true);
    expect(registry.get(PARAMETRIC_VIEWPOINT_ID)).toBe(parametricViewpoint);
  });

  it('nodeTypeFor maps ConstraintUsage and ValueProperty to their node types', () => {
    expect(
      parametricViewpoint.nodeTypeFor({
        id: 'c-1' as never,
        kind: 'ConstraintUsage',
        name: 'Newton',
        definitionId: 'cd-1' as never,
      }),
    ).toBe(PARAMETRIC_CONSTRAINT_USAGE_NODE_TYPE);
    expect(
      parametricViewpoint.nodeTypeFor({
        id: 'v-1' as never,
        kind: 'ValueProperty',
        name: 'mass',
        valueType: 'number',
      }),
    ).toBe(PARAMETRIC_VALUE_PROPERTY_NODE_TYPE);
  });

  it('nodeTypeFor throws for unsupported element kinds', () => {
    expect(() =>
      parametricViewpoint.nodeTypeFor({
        id: 'b-1' as never,
        kind: 'PartDefinition',
        name: 'Block',
        isAbstract: false,
        propertyIds: [],
        portIds: [],
      }),
    ).toThrow(/parametric viewpoint cannot render element kind/);
  });

  it('edgeTypeFor still throws — ParameterBinding edge ships in #137', () => {
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

  it('nodeSizeFor returns per-kind layout boxes', () => {
    expect(
      parametricViewpoint.nodeSizeFor({
        id: 'c-1' as never,
        kind: 'ConstraintUsage',
        name: 'Newton',
        definitionId: 'cd-1' as never,
      }),
    ).toEqual({
      width: PARAMETRIC_CONSTRAINT_USAGE_WIDTH,
      height: PARAMETRIC_CONSTRAINT_USAGE_HEIGHT,
    });
    expect(
      parametricViewpoint.nodeSizeFor({
        id: 'v-1' as never,
        kind: 'ValueProperty',
        name: 'mass',
        valueType: 'number',
      }),
    ).toEqual({
      width: PARAMETRIC_VALUE_PROPERTY_WIDTH,
      height: PARAMETRIC_VALUE_PROPERTY_HEIGHT,
    });
  });
});
