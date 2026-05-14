import { describe, expect, it } from 'vitest';

import type { PartDefinitionElement } from '@/model';
import {
  createViewpointRegistry,
  REQUIREMENTS_REQUIREMENT_NODE_TYPE,
  REQUIREMENTS_TRACE_EDGE_TYPE,
  REQUIREMENTS_VIEWPOINT_ID,
  requirementsViewpoint,
} from '@/viewpoints';

describe('Requirements viewpoint', () => {
  it('exports the expected id, label, and accepted kinds', () => {
    expect(requirementsViewpoint.id).toBe('requirements');
    expect(REQUIREMENTS_VIEWPOINT_ID).toBe('requirements');
    expect(requirementsViewpoint.label).toBe('Requirements Diagram');
    expect(requirementsViewpoint.acceptedElementKinds).toEqual(['Requirement']);
    expect(requirementsViewpoint.acceptedEdgeKinds).toEqual(['RequirementTrace']);
    expect(requirementsViewpoint.acceptedEdgeElementKinds).toEqual([]);
    expect(requirementsViewpoint.defaultLayout).toBe('dagre');
  });

  it('exposes a Requirement palette item (#71)', () => {
    expect(requirementsViewpoint.paletteItems).toHaveLength(1);
    const item = requirementsViewpoint.paletteItems[0]!;
    expect(item.elementKind).toBe('Requirement');
    expect(item.label).toBe('Requirement');
    expect(typeof item.description).toBe('string');
  });

  it('registers the Requirement custom node type at module-scope (frozen)', () => {
    expect(Object.isFrozen(requirementsViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(requirementsViewpoint.edgeTypes)).toBe(true);
    expect(Object.keys(requirementsViewpoint.nodeTypes)).toEqual([
      REQUIREMENTS_REQUIREMENT_NODE_TYPE,
    ]);
    expect(Object.keys(requirementsViewpoint.edgeTypes)).toEqual([
      REQUIREMENTS_TRACE_EDGE_TYPE,
    ]);
  });

  it('can be registered in a viewpoint registry and looked up by id', () => {
    const registry = createViewpointRegistry();
    registry.register(requirementsViewpoint);
    expect(registry.has(REQUIREMENTS_VIEWPOINT_ID)).toBe(true);
    expect(registry.get(REQUIREMENTS_VIEWPOINT_ID)).toBe(requirementsViewpoint);
  });

  it('nodeTypeFor maps Requirement → requirements-requirement', () => {
    expect(
      requirementsViewpoint.nodeTypeFor({
        id: 'r-1' as never,
        kind: 'Requirement',
        ownerId: null,
        ownerRole: 'member',
        ownerIndex: 0,
        name: 'R1',
        reqId: 'REQ-1',
        text: 'Something',
        priority: 'medium',
        status: 'draft',
      }),
    ).toBe(REQUIREMENTS_REQUIREMENT_NODE_TYPE);
  });

  it('nodeTypeFor throws for non-Requirement kinds', () => {
    const block: PartDefinitionElement = {
      id: 'p-1' as never,
      kind: 'PartDefinition',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'Block',
      isAbstract: false,
    };
    expect(() => requirementsViewpoint.nodeTypeFor(block)).toThrow(
      /requirements viewpoint cannot render element kind/,
    );
  });

  it('edgeTypeFor maps RequirementTrace → requirements-trace', () => {
    expect(
      requirementsViewpoint.edgeTypeFor({
        id: 'e-1' as never,
        kind: 'RequirementTrace',
        sourceId: 'r-1' as never,
        targetId: 'r-2' as never,
        traceKind: 'derive',
      }),
    ).toBe(REQUIREMENTS_TRACE_EDGE_TYPE);
  });

  it('edgeTypeFor throws for non-RequirementTrace kinds', () => {
    expect(() =>
      requirementsViewpoint.edgeTypeFor({
        id: 'e-1' as never,
        kind: 'Composition',
        sourceId: 'r-1' as never,
        targetId: 'r-2' as never,
      }),
    ).toThrow(/requirements viewpoint cannot render edge kind/);
  });

  it('edgeTypeForElement throws — Requirements has no element-as-edge kinds', () => {
    expect(() =>
      requirementsViewpoint.edgeTypeForElement({
        id: 'r-1' as never,
        kind: 'Requirement',
        ownerId: null,
        ownerRole: 'member',
        ownerIndex: 0,
        name: 'R1',
        reqId: 'REQ-1',
        text: 'Something',
        priority: 'medium',
        status: 'draft',
      }),
    ).toThrow(/requirements viewpoint cannot render element-as-edge kind/);
  });
});
