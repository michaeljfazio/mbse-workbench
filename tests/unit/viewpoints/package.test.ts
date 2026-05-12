import { describe, expect, it } from 'vitest';

import {
  createViewpointRegistry,
  PACKAGE_DEFAULT_NODE_HEIGHT,
  PACKAGE_DEFAULT_NODE_WIDTH,
  PACKAGE_MEMBER_ELEMENT_KINDS,
  PACKAGE_VIEWPOINT_ID,
  packageViewpoint,
} from '@/viewpoints';

describe('Package viewpoint (issue #154)', () => {
  it('exports the expected id, label, and accepted kinds', () => {
    expect(packageViewpoint.id).toBe('package');
    expect(PACKAGE_VIEWPOINT_ID).toBe('package');
    expect(packageViewpoint.label).toBe('Package Diagram');
    expect(packageViewpoint.acceptedElementKinds).toEqual([
      'Package',
      ...PACKAGE_MEMBER_ELEMENT_KINDS,
    ]);
    expect(packageViewpoint.acceptedEdgeKinds).toEqual(['PackageImport']);
    // ADR 0009 § 2: containment is a memberIds list, not an element-as-edge.
    expect(packageViewpoint.acceptedEdgeElementKinds).toEqual([]);
    expect(packageViewpoint.defaultLayout).toBe('dagre');
  });

  it('accepts every kind that can be a Package member', () => {
    // Keep this list in sync with PackageElement.memberIds admissible kinds.
    expect(PACKAGE_MEMBER_ELEMENT_KINDS).toContain('PartDefinition');
    expect(PACKAGE_MEMBER_ELEMENT_KINDS).toContain('Requirement');
    expect(PACKAGE_MEMBER_ELEMENT_KINDS).toContain('UseCase');
    expect(PACKAGE_MEMBER_ELEMENT_KINDS).toContain('ConstraintDefinition');
    // Package itself is NOT in the member list — it's added separately.
    expect(PACKAGE_MEMBER_ELEMENT_KINDS).not.toContain('Package');
  });

  it('ships with an empty palette (#155 adds Package palette item)', () => {
    expect(packageViewpoint.paletteItems).toEqual([]);
  });

  it('exposes module-scoped (frozen) empty nodeTypes and edgeTypes records', () => {
    expect(Object.isFrozen(packageViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(packageViewpoint.edgeTypes)).toBe(true);
    expect(Object.keys(packageViewpoint.nodeTypes)).toEqual([]);
    expect(Object.keys(packageViewpoint.edgeTypes)).toEqual([]);
  });

  it('can be registered in a viewpoint registry and looked up by id', () => {
    const registry = createViewpointRegistry();
    registry.register(packageViewpoint);
    expect(registry.has(PACKAGE_VIEWPOINT_ID)).toBe(true);
    expect(registry.get(PACKAGE_VIEWPOINT_ID)).toBe(packageViewpoint);
  });

  it('nodeTypeFor throws — node renderers land in #155', () => {
    expect(() =>
      packageViewpoint.nodeTypeFor({
        id: 'p-1' as never,
        kind: 'Package',
        name: 'Root',
        memberIds: [],
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

  it('nodeSizeFor returns the placeholder layout box for every element', () => {
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
