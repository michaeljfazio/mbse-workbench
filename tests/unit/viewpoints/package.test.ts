import { describe, expect, it } from 'vitest';

import {
  createViewpointRegistry,
  PACKAGE_DEFAULT_NODE_HEIGHT,
  PACKAGE_DEFAULT_NODE_WIDTH,
  PACKAGE_MEMBER_ELEMENT_KINDS,
  PACKAGE_NODE_TYPE,
  PACKAGE_VIEWPOINT_ID,
  packageViewpoint,
} from '@/viewpoints';

describe('Package viewpoint', () => {
  it('exports the expected id, label, and accepted kinds', () => {
    expect(packageViewpoint.id).toBe('package');
    expect(PACKAGE_VIEWPOINT_ID).toBe('package');
    expect(packageViewpoint.label).toBe('Package Diagram');
    // Only Package nodes render in this viewpoint. Member kinds are
    // tracked separately via PACKAGE_MEMBER_ELEMENT_KINDS for #156's
    // cross-package drop affordance; they are not rendered here.
    expect(packageViewpoint.acceptedElementKinds).toEqual(['Package']);
    expect(packageViewpoint.acceptedEdgeKinds).toEqual(['PackageImport']);
    expect(packageViewpoint.acceptedEdgeElementKinds).toEqual([]);
    expect(packageViewpoint.defaultLayout).toBe('dagre');
  });

  it('accepts every kind that can be a Package member', () => {
    expect(PACKAGE_MEMBER_ELEMENT_KINDS).toContain('PartDefinition');
    expect(PACKAGE_MEMBER_ELEMENT_KINDS).toContain('Requirement');
    expect(PACKAGE_MEMBER_ELEMENT_KINDS).toContain('UseCase');
    expect(PACKAGE_MEMBER_ELEMENT_KINDS).toContain('ConstraintDefinition');
    expect(PACKAGE_MEMBER_ELEMENT_KINDS).not.toContain('Package');
  });

  it('palette exposes the Package item (issue #155)', () => {
    expect(packageViewpoint.paletteItems).toEqual([
      {
        elementKind: 'Package',
        label: 'Package',
        description:
          'A namespace that groups related model elements. Drop onto the canvas to create one.',
      },
    ]);
  });

  it('exposes module-scoped (frozen) nodeTypes including the Package node, and empty edgeTypes', () => {
    expect(Object.isFrozen(packageViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(packageViewpoint.edgeTypes)).toBe(true);
    expect(Object.keys(packageViewpoint.nodeTypes)).toEqual([PACKAGE_NODE_TYPE]);
    expect(Object.keys(packageViewpoint.edgeTypes)).toEqual([]);
  });

  it('can be registered in a viewpoint registry and looked up by id', () => {
    const registry = createViewpointRegistry();
    registry.register(packageViewpoint);
    expect(registry.has(PACKAGE_VIEWPOINT_ID)).toBe(true);
    expect(registry.get(PACKAGE_VIEWPOINT_ID)).toBe(packageViewpoint);
  });

  it('nodeTypeFor resolves Package elements to the Package node type', () => {
    expect(
      packageViewpoint.nodeTypeFor({
        id: 'p-1' as never,
        kind: 'Package',
        name: 'Root',
        memberIds: [],
      }),
    ).toBe(PACKAGE_NODE_TYPE);
  });

  it('nodeTypeFor throws for other element kinds — they only appear via membership, not as nodes', () => {
    expect(() =>
      packageViewpoint.nodeTypeFor({
        id: 'pd-1' as never,
        kind: 'PartDefinition',
        name: 'Wheel',
        isAbstract: false,
        propertyIds: [],
        portIds: [],
      }),
    ).toThrow(/package viewpoint cannot render element kind/);
  });

  it('edgeTypeFor throws — edge renderers land in #156', () => {
    expect(() =>
      packageViewpoint.edgeTypeFor({
        id: 'e-1' as never,
        kind: 'PackageImport',
        sourceId: 'p-1' as never,
        targetId: 'p-2' as never,
      }),
    ).toThrow(/package viewpoint cannot render edge kind/);
  });

  it('edgeTypeForElement throws — Package has no element-as-edge kinds', () => {
    expect(() =>
      packageViewpoint.edgeTypeForElement({
        id: 'p-1' as never,
        kind: 'Package',
        name: 'Root',
        memberIds: [],
      }),
    ).toThrow(/package viewpoint cannot render element-as-edge kind/);
  });

  it('nodeSizeFor returns the Package layout box for every element', () => {
    const expected = {
      width: PACKAGE_DEFAULT_NODE_WIDTH,
      height: PACKAGE_DEFAULT_NODE_HEIGHT,
    };
    expect(
      packageViewpoint.nodeSizeFor({
        id: 'p-1' as never,
        kind: 'Package',
        name: 'Root',
        memberIds: [],
      }),
    ).toEqual(expected);
    expect(
      packageViewpoint.nodeSizeFor({
        id: 'pd-1' as never,
        kind: 'PartDefinition',
        name: 'Wheel',
        isAbstract: false,
        propertyIds: [],
        portIds: [],
      }),
    ).toEqual(expected);
  });
});
