import { describe, expect, it } from 'vitest';

import {
  createViewpointRegistry,
  REQUIREMENTS_VIEWPOINT_ID,
  requirementsViewpoint,
} from '@/viewpoints';

describe('Requirements viewpoint (issue #70)', () => {
  it('exports the expected id, label, and accepted kinds', () => {
    expect(requirementsViewpoint.id).toBe('requirements');
    expect(REQUIREMENTS_VIEWPOINT_ID).toBe('requirements');
    expect(requirementsViewpoint.label).toBe('Requirements Diagram');
    expect(requirementsViewpoint.acceptedElementKinds).toEqual(['Requirement']);
    expect(requirementsViewpoint.acceptedEdgeKinds).toEqual(['RequirementTrace']);
    expect(requirementsViewpoint.acceptedEdgeElementKinds).toEqual([]);
    expect(requirementsViewpoint.defaultLayout).toBe('dagre');
  });

  it('ships with an empty palette (#71 adds the Requirement palette item)', () => {
    expect(requirementsViewpoint.paletteItems).toEqual([]);
  });

  it('exposes module-scoped (frozen) empty nodeTypes and edgeTypes records', () => {
    expect(Object.isFrozen(requirementsViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(requirementsViewpoint.edgeTypes)).toBe(true);
    expect(Object.keys(requirementsViewpoint.nodeTypes)).toEqual([]);
    expect(Object.keys(requirementsViewpoint.edgeTypes)).toEqual([]);
  });

  it('can be registered in a viewpoint registry and looked up by id', () => {
    const registry = createViewpointRegistry();
    registry.register(requirementsViewpoint);
    expect(registry.has(REQUIREMENTS_VIEWPOINT_ID)).toBe(true);
    expect(registry.get(REQUIREMENTS_VIEWPOINT_ID)).toBe(requirementsViewpoint);
  });

  it('nodeTypeFor throws — node renderers land in #71', () => {
    expect(() =>
      requirementsViewpoint.nodeTypeFor({
        id: 'r-1' as never,
        kind: 'Requirement',
        name: 'R1',
        reqId: 'REQ-1',
        text: 'Something',
        priority: 'medium',
        status: 'draft',
      }),
    ).toThrow(/requirements viewpoint cannot render element kind/);
  });

  it('edgeTypeFor throws — edge renderers land in #72', () => {
    expect(() =>
      requirementsViewpoint.edgeTypeFor({
        id: 'e-1' as never,
        kind: 'RequirementTrace',
        sourceId: 'r-1' as never,
        targetId: 'r-2' as never,
        traceKind: 'derive',
      }),
    ).toThrow(/requirements viewpoint cannot render edge kind/);
  });

  it('edgeTypeForElement throws — Requirements has no element-as-edge kinds', () => {
    expect(() =>
      requirementsViewpoint.edgeTypeForElement({
        id: 'r-1' as never,
        kind: 'Requirement',
        name: 'R1',
        reqId: 'REQ-1',
        text: 'Something',
        priority: 'medium',
        status: 'draft',
      }),
    ).toThrow(/requirements viewpoint cannot render element-as-edge kind/);
  });
});
