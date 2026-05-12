import { describe, expect, it } from 'vitest';

import type {
  PartDefinitionElement,
  StateUsageElement,
  TransitionElement,
} from '@/model';
import {
  createViewpointRegistry,
  STATE_MACHINE_FINAL_NODE_TYPE,
  STATE_MACHINE_INITIAL_NODE_TYPE,
  STATE_MACHINE_PSEUDOSTATE_SIZE,
  STATE_MACHINE_STATE_HEIGHT,
  STATE_MACHINE_STATE_NODE_TYPE,
  STATE_MACHINE_STATE_WIDTH,
  STATE_MACHINE_TRANSITION_EDGE_TYPE,
  STATE_MACHINE_VIEWPOINT_ID,
  stateMachineViewpoint,
} from '@/viewpoints';

function makeState(stateType: StateUsageElement['stateType']): StateUsageElement {
  return {
    id: 's-1' as never,
    kind: 'StateUsage',
    name: 'State',
    stateType,
  };
}

function makeTransition(): TransitionElement {
  return {
    id: 't-1' as never,
    kind: 'Transition',
    name: 'transition',
    sourceId: 's-1' as never,
    targetId: 's-2' as never,
  };
}

describe('State Machine viewpoint (ADR 0006)', () => {
  it('exports the expected id, label, and accepted kinds', () => {
    expect(stateMachineViewpoint.id).toBe('state-machine');
    expect(STATE_MACHINE_VIEWPOINT_ID).toBe('state-machine');
    expect(stateMachineViewpoint.label).toBe('State Machine Diagram');
    expect(stateMachineViewpoint.acceptedElementKinds).toEqual([
      'StateUsage',
      'StateDefinition',
    ]);
    expect(stateMachineViewpoint.acceptedEdgeKinds).toEqual([]);
    // Per ADR 0006 § 3: Transition is element-as-edge.
    expect(stateMachineViewpoint.acceptedEdgeElementKinds).toEqual(['Transition']);
    expect(stateMachineViewpoint.defaultLayout).toBe('dagre');
  });

  it('exposes three StateUsage palette items, one per StateNodeType', () => {
    expect(stateMachineViewpoint.paletteItems).toHaveLength(3);
    const stateTypes = stateMachineViewpoint.paletteItems.map(
      (item) => item.defaultData?.stateType,
    );
    expect(stateTypes).toEqual(['state', 'initial', 'final']);
    for (const item of stateMachineViewpoint.paletteItems) {
      expect(item.elementKind).toBe('StateUsage');
      expect(typeof item.label).toBe('string');
      expect(typeof item.description).toBe('string');
    }
  });

  it('keeps nodeTypes and edgeTypes frozen at module scope', () => {
    // Per docs/CONTEXT.md, React Flow needs referentially-stable
    // nodeTypes/edgeTypes — frozen records (whether empty or populated).
    expect(Object.isFrozen(stateMachineViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(stateMachineViewpoint.edgeTypes)).toBe(true);
    // #105 / #106 populate these — #104 ships them empty.
    expect(Object.keys(stateMachineViewpoint.nodeTypes)).toEqual([]);
    expect(Object.keys(stateMachineViewpoint.edgeTypes)).toEqual([]);
  });

  it('nodeSizeFor returns per-stateType sizes (ADR 0006)', () => {
    const cases: ReadonlyArray<
      readonly [StateUsageElement['stateType'], { width: number; height: number }]
    > = [
      [
        'state',
        { width: STATE_MACHINE_STATE_WIDTH, height: STATE_MACHINE_STATE_HEIGHT },
      ],
      [
        'initial',
        {
          width: STATE_MACHINE_PSEUDOSTATE_SIZE,
          height: STATE_MACHINE_PSEUDOSTATE_SIZE,
        },
      ],
      [
        'final',
        {
          width: STATE_MACHINE_PSEUDOSTATE_SIZE,
          height: STATE_MACHINE_PSEUDOSTATE_SIZE,
        },
      ],
    ];
    for (const [stateType, expected] of cases) {
      expect(stateMachineViewpoint.nodeSizeFor(makeState(stateType))).toEqual(
        expected,
      );
    }
  });

  it('nodeSizeFor falls back to state-sized box for the reserved StateDefinition', () => {
    // Per ADR 0006 § 2 / consequences: StateDefinition is in
    // acceptedElementKinds for a future "called state machine" frame; a safe
    // default size keeps layout from blowing up if one slips through.
    expect(
      stateMachineViewpoint.nodeSizeFor({
        id: 's-def-1' as never,
        kind: 'StateDefinition',
        name: 'Brewing',
        isComposite: false,
      }),
    ).toEqual({
      width: STATE_MACHINE_STATE_WIDTH,
      height: STATE_MACHINE_STATE_HEIGHT,
    });
  });

  it('can be registered in a viewpoint registry and looked up by id', () => {
    const registry = createViewpointRegistry();
    registry.register(stateMachineViewpoint);
    expect(registry.has(STATE_MACHINE_VIEWPOINT_ID)).toBe(true);
    expect(registry.get(STATE_MACHINE_VIEWPOINT_ID)).toBe(stateMachineViewpoint);
  });

  it('nodeTypeFor maps each StateUsage.stateType to its custom node string', () => {
    const cases: ReadonlyArray<
      readonly [StateUsageElement['stateType'], string]
    > = [
      ['state', STATE_MACHINE_STATE_NODE_TYPE],
      ['initial', STATE_MACHINE_INITIAL_NODE_TYPE],
      ['final', STATE_MACHINE_FINAL_NODE_TYPE],
    ];
    for (const [stateType, expected] of cases) {
      expect(stateMachineViewpoint.nodeTypeFor(makeState(stateType))).toBe(
        expected,
      );
    }
  });

  it('nodeTypeFor throws for non-StateUsage kinds', () => {
    const block: PartDefinitionElement = {
      id: 'p-1' as never,
      kind: 'PartDefinition',
      name: 'Block',
      isAbstract: false,
      propertyIds: [],
      portIds: [],
    };
    expect(() => stateMachineViewpoint.nodeTypeFor(block)).toThrow(
      /state machine viewpoint cannot render element kind/,
    );
  });

  it('edgeTypeFor throws — State Machine has no ModelEdge kinds (ADR 0006 § 3)', () => {
    expect(() =>
      stateMachineViewpoint.edgeTypeFor({
        id: 'e-1' as never,
        kind: 'Composition',
        sourceId: 's-1' as never,
        targetId: 's-2' as never,
      }),
    ).toThrow(/state machine viewpoint cannot render edge kind/);
  });

  it('edgeTypeForElement maps Transition to the transition edge string', () => {
    expect(stateMachineViewpoint.edgeTypeForElement(makeTransition())).toBe(
      STATE_MACHINE_TRANSITION_EDGE_TYPE,
    );
  });

  it('edgeTypeForElement throws for unsupported element-as-edge kinds', () => {
    expect(() =>
      stateMachineViewpoint.edgeTypeForElement(makeState('state')),
    ).toThrow(/state machine viewpoint cannot render element-as-edge kind/);
  });
});
