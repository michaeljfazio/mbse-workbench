import { describe, expect, it } from 'vitest';

import type { Connection } from '@xyflow/react';

import { createElementId, createElementRegistry, type ElementId } from '@/model';
import {
  createViewpointRegistry,
  isValidPackageConnection,
  PACKAGE_DEFAULT_NODE_HEIGHT,
  PACKAGE_DEFAULT_NODE_WIDTH,
  PACKAGE_IMPORT_EDGE_TYPE,
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

  it('exposes module-scoped (frozen) nodeTypes including the Package node, and the PackageImport edge type', () => {
    expect(Object.isFrozen(packageViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(packageViewpoint.edgeTypes)).toBe(true);
    expect(Object.keys(packageViewpoint.nodeTypes)).toEqual([PACKAGE_NODE_TYPE]);
    expect(Object.keys(packageViewpoint.edgeTypes)).toEqual([
      PACKAGE_IMPORT_EDGE_TYPE,
    ]);
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
        ownerId: null,
        ownerRole: 'member' as const,
        ownerIndex: 0,
        name: 'Root',
      }),
    ).toBe(PACKAGE_NODE_TYPE);
  });

  it('nodeTypeFor throws for other element kinds — they only appear via membership, not as nodes', () => {
    expect(() =>
      packageViewpoint.nodeTypeFor({
        id: 'pd-1' as never,
        kind: 'PartDefinition',
        ownerId: null,
        ownerRole: 'member' as const,
        ownerIndex: 0,
        name: 'Wheel',
        isAbstract: false,
      }),
    ).toThrow(/package viewpoint cannot render element kind/);
  });

  it('edgeTypeFor resolves PackageImport edges to the PackageImport edge type', () => {
    expect(
      packageViewpoint.edgeTypeFor({
        id: 'e-1' as never,
        kind: 'PackageImport',
        sourceId: 'p-1' as never,
        targetId: 'p-2' as never,
      }),
    ).toBe(PACKAGE_IMPORT_EDGE_TYPE);
  });

  it('edgeTypeFor throws for unsupported edge kinds', () => {
    expect(() =>
      packageViewpoint.edgeTypeFor({
        id: 'e-2' as never,
        kind: 'Composition',
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
        ownerId: null,
        ownerRole: 'member' as const,
        ownerIndex: 0,
        name: 'Root',
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
        ownerId: null,
        ownerRole: 'member' as const,
        ownerIndex: 0,
        name: 'Root',
      }),
    ).toEqual(expected);
    expect(
      packageViewpoint.nodeSizeFor({
        id: 'pd-1' as never,
        kind: 'PartDefinition',
        ownerId: null,
        ownerRole: 'member' as const,
        ownerIndex: 0,
        name: 'Wheel',
        isAbstract: false,
      }),
    ).toEqual(expected);
  });
});

describe('isValidPackageConnection', () => {
  function seedTwoPackagesAndABlock() {
    const registry = createElementRegistry();
    const p1 = {
      id: createElementId(),
      kind: 'Package' as const,
      ownerId: null,
      ownerRole: 'member' as const,
      ownerIndex: 0,
      name: 'P1',
    };
    const p2 = {
      id: createElementId(),
      kind: 'Package' as const,
      ownerId: null,
      ownerRole: 'member' as const,
      ownerIndex: 0,
      name: 'P2',
    };
    const block = {
      id: createElementId(),
      kind: 'PartDefinition' as const,
      ownerId: null,
      ownerRole: 'member' as const,
      ownerIndex: 0,
      name: 'B',
      isAbstract: false,
    };
    registry.add(p1);
    registry.add(p2);
    registry.add(block);
    return { registry, p1: p1.id, p2: p2.id, block: block.id };
  }

  function conn(source: ElementId, target: ElementId): Connection {
    return { source, target, sourceHandle: null, targetHandle: null };
  }

  it('accepts a Package→Package connection between distinct packages', () => {
    const { registry, p1, p2 } = seedTwoPackagesAndABlock();
    expect(isValidPackageConnection(conn(p1, p2), registry, [])).toBe(true);
  });

  it('rejects self-loops', () => {
    const { registry, p1 } = seedTwoPackagesAndABlock();
    expect(isValidPackageConnection(conn(p1, p1), registry, [])).toBe(false);
  });

  it('rejects non-Package endpoints (either side)', () => {
    const { registry, p1, block } = seedTwoPackagesAndABlock();
    expect(isValidPackageConnection(conn(block, p1), registry, [])).toBe(false);
    expect(isValidPackageConnection(conn(p1, block), registry, [])).toBe(false);
  });

  it('rejects duplicate PackageImport in the same direction but allows the reverse', () => {
    const { registry, p1, p2 } = seedTwoPackagesAndABlock();
    const existing = [
      {
        id: 'e-1' as never,
        kind: 'PackageImport' as const,
        sourceId: p1,
        targetId: p2,
      },
    ];
    expect(isValidPackageConnection(conn(p1, p2), registry, existing)).toBe(
      false,
    );
    expect(isValidPackageConnection(conn(p2, p1), registry, existing)).toBe(
      true,
    );
  });

  it('rejects connections with missing source/target', () => {
    const { registry, p1 } = seedTwoPackagesAndABlock();
    expect(
      isValidPackageConnection(
        {
          source: null,
          target: p1,
          sourceHandle: null,
          targetHandle: null,
        } as unknown as Connection,
        registry,
        [],
      ),
    ).toBe(false);
  });
});
