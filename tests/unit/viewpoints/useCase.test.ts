import { describe, expect, it } from 'vitest';

import type {
  ActorElement,
  PartDefinitionElement,
  UseCaseElement,
} from '@/model';
import {
  createViewpointRegistry,
  USE_CASE_ACTOR_HEIGHT,
  USE_CASE_ACTOR_NODE_TYPE,
  USE_CASE_ACTOR_WIDTH,
  USE_CASE_ASSOCIATION_EDGE_TYPE,
  USE_CASE_EXTEND_EDGE_TYPE,
  USE_CASE_GENERALIZATION_EDGE_TYPE,
  USE_CASE_INCLUDE_EDGE_TYPE,
  USE_CASE_USE_CASE_HEIGHT,
  USE_CASE_USE_CASE_NODE_TYPE,
  USE_CASE_USE_CASE_WIDTH,
  USE_CASE_VIEWPOINT_ID,
  useCaseViewpoint,
} from '@/viewpoints';

function makeActor(): ActorElement {
  return {
    id: 'a-1' as never,
    kind: 'Actor',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: 'Driver',
  };
}

function makeUseCase(): UseCaseElement {
  return {
    id: 'uc-1' as never,
    kind: 'UseCase',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: 'Start Engine',
  };
}

describe('Use Case viewpoint (ADR 0007)', () => {
  it('exports the expected id, label, and accepted kinds', () => {
    expect(useCaseViewpoint.id).toBe('use-case');
    expect(USE_CASE_VIEWPOINT_ID).toBe('use-case');
    expect(useCaseViewpoint.label).toBe('Use Case Diagram');
    // Per ADR 0007 § 2: Actor + UseCase as first-class nodes.
    expect(useCaseViewpoint.acceptedElementKinds).toEqual(['Actor', 'UseCase']);
    // Per ADR 0007 § 3+§ 4 + phase-15 #517 amendment: Include + Extend are
    // ModelEdges; Generalization is reused for actor-actor and
    // use-case-use-case inheritance; Association covers cross-kind
    // Actor↔UseCase per the closed § 5 / § 7 deferral.
    expect(useCaseViewpoint.acceptedEdgeKinds).toEqual([
      'Include',
      'Extend',
      'Generalization',
      'Association',
    ]);
    // Per ADR 0007 § 3 consequence: no element-as-edge kinds.
    expect(useCaseViewpoint.acceptedEdgeElementKinds).toEqual([]);
    expect(useCaseViewpoint.defaultLayout).toBe('dagre');
  });

  it('ships Actor + Use case palette items (#118)', () => {
    expect(useCaseViewpoint.paletteItems.map((p) => p.elementKind)).toEqual([
      'Actor',
      'UseCase',
    ]);
  });

  it('keeps nodeTypes and edgeTypes frozen at module scope', () => {
    expect(Object.isFrozen(useCaseViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(useCaseViewpoint.edgeTypes)).toBe(true);
    expect(Object.keys(useCaseViewpoint.nodeTypes).sort()).toEqual(
      [USE_CASE_ACTOR_NODE_TYPE, USE_CASE_USE_CASE_NODE_TYPE].sort(),
    );
    expect(Object.keys(useCaseViewpoint.edgeTypes).sort()).toEqual(
      [
        USE_CASE_INCLUDE_EDGE_TYPE,
        USE_CASE_EXTEND_EDGE_TYPE,
        USE_CASE_GENERALIZATION_EDGE_TYPE,
        USE_CASE_ASSOCIATION_EDGE_TYPE,
      ].sort(),
    );
  });

  it('nodeSizeFor returns per-kind sizes (ADR 0007)', () => {
    expect(useCaseViewpoint.nodeSizeFor(makeActor())).toEqual({
      width: USE_CASE_ACTOR_WIDTH,
      height: USE_CASE_ACTOR_HEIGHT,
    });
    expect(useCaseViewpoint.nodeSizeFor(makeUseCase())).toEqual({
      width: USE_CASE_USE_CASE_WIDTH,
      height: USE_CASE_USE_CASE_HEIGHT,
    });
  });

  it('can be registered in a viewpoint registry and looked up by id', () => {
    const registry = createViewpointRegistry();
    registry.register(useCaseViewpoint);
    expect(registry.has(USE_CASE_VIEWPOINT_ID)).toBe(true);
    expect(registry.get(USE_CASE_VIEWPOINT_ID)).toBe(useCaseViewpoint);
  });

  it('nodeTypeFor maps Actor and UseCase to their custom node strings', () => {
    expect(useCaseViewpoint.nodeTypeFor(makeActor())).toBe(
      USE_CASE_ACTOR_NODE_TYPE,
    );
    expect(useCaseViewpoint.nodeTypeFor(makeUseCase())).toBe(
      USE_CASE_USE_CASE_NODE_TYPE,
    );
  });

  it('nodeTypeFor throws for non-Actor/UseCase kinds', () => {
    const block: PartDefinitionElement = {
      id: 'p-1' as never,
      kind: 'PartDefinition',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'Block',
      isAbstract: false,
    };
    expect(() => useCaseViewpoint.nodeTypeFor(block)).toThrow(
      /use case viewpoint cannot render element kind/,
    );
  });

  it('edgeTypeFor maps Include/Extend/Generalization/Association to their use-case edge type strings', () => {
    expect(
      useCaseViewpoint.edgeTypeFor({
        id: 'e-1' as never,
        kind: 'Include',
        sourceId: 'uc-1' as never,
        targetId: 'uc-2' as never,
      }),
    ).toBe(USE_CASE_INCLUDE_EDGE_TYPE);
    expect(
      useCaseViewpoint.edgeTypeFor({
        id: 'e-2' as never,
        kind: 'Extend',
        sourceId: 'uc-1' as never,
        targetId: 'uc-2' as never,
      }),
    ).toBe(USE_CASE_EXTEND_EDGE_TYPE);
    expect(
      useCaseViewpoint.edgeTypeFor({
        id: 'e-3' as never,
        kind: 'Generalization',
        sourceId: 'uc-1' as never,
        targetId: 'uc-2' as never,
      }),
    ).toBe(USE_CASE_GENERALIZATION_EDGE_TYPE);
    expect(
      useCaseViewpoint.edgeTypeFor({
        id: 'e-4' as never,
        kind: 'Association',
        sourceId: 'actor-1' as never,
        targetId: 'uc-1' as never,
      }),
    ).toBe(USE_CASE_ASSOCIATION_EDGE_TYPE);
  });

  it('edgeTypeFor throws for kinds Use Case does not accept', () => {
    expect(() =>
      useCaseViewpoint.edgeTypeFor({
        id: 'e-4' as never,
        kind: 'Composition',
        sourceId: 'a' as never,
        targetId: 'b' as never,
      }),
    ).toThrow(/use case viewpoint cannot render edge kind/);
  });

  it('edgeTypeForElement throws — Use Case has no element-as-edge kinds (ADR 0007 § 3)', () => {
    expect(() => useCaseViewpoint.edgeTypeForElement(makeActor())).toThrow(
      /use case viewpoint cannot render element-as-edge kind/,
    );
  });
});
