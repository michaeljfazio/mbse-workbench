import { describe, expect, it } from 'vitest';

import {
  createViewpointRegistry,
  IBD_CONNECTION_USAGE_EDGE_TYPE,
  IBD_PART_USAGE_NODE_TYPE,
  IBD_VIEWPOINT_ID,
  ibdViewpoint,
} from '@/viewpoints';

describe('IBD viewpoint', () => {
  it('exports the expected id, label, and accepted kinds', () => {
    expect(ibdViewpoint.id).toBe('ibd');
    expect(IBD_VIEWPOINT_ID).toBe('ibd');
    expect(ibdViewpoint.label).toBe('Internal Block Diagram');
    expect(ibdViewpoint.acceptedElementKinds).toEqual(['PartUsage']);
    expect(ibdViewpoint.acceptedEdgeKinds).toEqual([]);
    expect(ibdViewpoint.acceptedEdgeElementKinds).toEqual(['ConnectionUsage']);
    expect(ibdViewpoint.defaultLayout).toBe('dagre');
  });

  it('includes a Part palette item (PartUsage) — #50', () => {
    expect(ibdViewpoint.paletteItems).toHaveLength(1);
    expect(ibdViewpoint.paletteItems[0]?.elementKind).toBe('PartUsage');
    expect(ibdViewpoint.paletteItems[0]?.label).toBe('Part');
  });

  it('exposes module-scoped (frozen) nodeTypes and edgeTypes records', () => {
    expect(Object.isFrozen(ibdViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(ibdViewpoint.edgeTypes)).toBe(true);
    expect(Object.keys(ibdViewpoint.nodeTypes)).toContain(IBD_PART_USAGE_NODE_TYPE);
    expect(Object.keys(ibdViewpoint.edgeTypes)).toEqual([
      IBD_CONNECTION_USAGE_EDGE_TYPE,
    ]);
  });

  it('can be registered in a viewpoint registry and looked up by id', () => {
    const registry = createViewpointRegistry();
    registry.register(ibdViewpoint);
    expect(registry.has(IBD_VIEWPOINT_ID)).toBe(true);
    expect(registry.get(IBD_VIEWPOINT_ID)).toBe(ibdViewpoint);
  });

  it('nodeTypeFor returns the PartUsage node type for a PartUsage element', () => {
    expect(
      ibdViewpoint.nodeTypeFor({
        id: 'pu-1' as never,
        kind: 'PartUsage',
        name: 'p',
        definitionId: 'pd-1' as never,
        portUsageIds: [],
      }),
    ).toBe(IBD_PART_USAGE_NODE_TYPE);
  });

  it('nodeTypeFor throws for any element kind other than PartUsage', () => {
    expect(() =>
      ibdViewpoint.nodeTypeFor({
        id: 'pd-1' as never,
        kind: 'PartDefinition',
        name: 'V',
        isAbstract: false,
        propertyIds: [],
        portIds: [],
      }),
    ).toThrow(/ibd viewpoint cannot render element kind/);
  });

  it('edgeTypeFor throws — IBD has no ModelEdge renderers (edges are elements)', () => {
    expect(() =>
      ibdViewpoint.edgeTypeFor({
        id: 'e' as never,
        kind: 'Composition',
        sourceId: 'a' as never,
        targetId: 'b' as never,
      }),
    ).toThrow(/ibd viewpoint cannot render edge kind/);
  });

  it('edgeTypeForElement returns the ConnectionUsage edge type', () => {
    expect(
      ibdViewpoint.edgeTypeForElement({
        id: 'cu' as never,
        kind: 'ConnectionUsage',
        name: 'connection1',
        sourceId: 'pu-a' as never,
        targetId: 'pu-b' as never,
      }),
    ).toBe(IBD_CONNECTION_USAGE_EDGE_TYPE);
  });

  it('edgeTypeForElement throws for non-edge element kinds', () => {
    expect(() =>
      ibdViewpoint.edgeTypeForElement({
        id: 'pd' as never,
        kind: 'PartDefinition',
        name: 'V',
        isAbstract: false,
        propertyIds: [],
        portIds: [],
      }),
    ).toThrow(/ibd viewpoint cannot render element-as-edge kind/);
  });
});
