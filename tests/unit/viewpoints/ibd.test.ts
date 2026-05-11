import { describe, expect, it } from 'vitest';

import {
  createViewpointRegistry,
  IBD_VIEWPOINT_ID,
  ibdViewpoint,
} from '@/viewpoints';

describe('IBD viewpoint (issue #49)', () => {
  it('exports the expected id, label, and accepted kinds', () => {
    expect(ibdViewpoint.id).toBe('ibd');
    expect(IBD_VIEWPOINT_ID).toBe('ibd');
    expect(ibdViewpoint.label).toBe('Internal Block Diagram');
    expect(ibdViewpoint.acceptedElementKinds).toEqual(['PartUsage']);
    expect(ibdViewpoint.acceptedEdgeKinds).toEqual([]);
    expect(ibdViewpoint.defaultLayout).toBe('dagre');
  });

  it('starts with empty paletteItems — #50 introduces the Part palette entry', () => {
    expect(ibdViewpoint.paletteItems).toEqual([]);
  });

  it('exposes module-scoped (frozen) nodeTypes and edgeTypes records', () => {
    expect(Object.isFrozen(ibdViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(ibdViewpoint.edgeTypes)).toBe(true);
    expect(Object.keys(ibdViewpoint.nodeTypes)).toEqual([]);
    expect(Object.keys(ibdViewpoint.edgeTypes)).toEqual([]);
  });

  it('can be registered in a viewpoint registry and looked up by id', () => {
    const registry = createViewpointRegistry();
    registry.register(ibdViewpoint);
    expect(registry.has(IBD_VIEWPOINT_ID)).toBe(true);
    expect(registry.get(IBD_VIEWPOINT_ID)).toBe(ibdViewpoint);
  });

  it('nodeTypeFor / edgeTypeFor throw — the IBD viewpoint has no renderers in #49', () => {
    expect(() =>
      ibdViewpoint.nodeTypeFor({
        id: 'x' as never,
        kind: 'PartUsage',
        name: 'p',
        definitionId: 'y' as never,
      }),
    ).toThrow(/ibd viewpoint cannot yet render/);
    expect(() =>
      ibdViewpoint.edgeTypeFor({
        id: 'e' as never,
        kind: 'Composition',
        sourceId: 'a' as never,
        targetId: 'b' as never,
      }),
    ).toThrow(/ibd viewpoint cannot yet render/);
  });
});
