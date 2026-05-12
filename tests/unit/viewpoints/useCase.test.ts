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
    name: 'Driver',
  };
}

function makeUseCase(): UseCaseElement {
  return {
    id: 'uc-1' as never,
    kind: 'UseCase',
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
    // Per ADR 0007 § 3+§ 4: Include + Extend are ModelEdges; Generalization
    // is reused for actor-actor and use-case-use-case inheritance.
    expect(useCaseViewpoint.acceptedEdgeKinds).toEqual([
      'Include',
      'Extend',
      'Generalization',
    ]);
    // Per ADR 0007 § 3 consequence: no element-as-edge kinds.
    expect(useCaseViewpoint.acceptedEdgeElementKinds).toEqual([]);
    expect(useCaseViewpoint.defaultLayout).toBe('dagre');
  });

  it('ships no palette items in #117 (populated by #118)', () => {
    expect(useCaseViewpoint.paletteItems).toEqual([]);
  });

  it('keeps nodeTypes and edgeTypes frozen at module scope', () => {
    expect(Object.isFrozen(useCaseViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(useCaseViewpoint.edgeTypes)).toBe(true);
    // #117 registers empty records; #118/#119 populate them.
    expect(Object.keys(useCaseViewpoint.nodeTypes)).toEqual([]);
    expect(Object.keys(useCaseViewpoint.edgeTypes)).toEqual([]);
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
      name: 'Block',
      isAbstract: false,
      propertyIds: [],
      portIds: [],
    };
    expect(() => useCaseViewpoint.nodeTypeFor(block)).toThrow(
      /use case viewpoint cannot render element kind/,
    );
  });

  it('edgeTypeFor throws — #119 populates the Include/Extend/Generalization renderers', () => {
    expect(() =>
      useCaseViewpoint.edgeTypeFor({
        id: 'e-1' as never,
        kind: 'Include',
        sourceId: 'uc-1' as never,
        targetId: 'uc-2' as never,
      }),
    ).toThrow(/use case viewpoint edge renderer not registered yet/);
  });

  it('edgeTypeForElement throws — Use Case has no element-as-edge kinds (ADR 0007 § 3)', () => {
    expect(() => useCaseViewpoint.edgeTypeForElement(makeActor())).toThrow(
      /use case viewpoint cannot render element-as-edge kind/,
    );
  });
});
