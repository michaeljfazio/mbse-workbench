import { describe, expect, it } from 'vitest';

import type { ActionUsageElement, PartDefinitionElement } from '@/model';
import {
  ACTIVITY_ACTION_HEIGHT,
  ACTIVITY_ACTION_NODE_TYPE,
  ACTIVITY_ACTION_WIDTH,
  ACTIVITY_BAR_HEIGHT,
  ACTIVITY_BAR_WIDTH,
  ACTIVITY_CONTROL_FLOW_EDGE_TYPE,
  ACTIVITY_DECISION_NODE_TYPE,
  ACTIVITY_DIAMOND_SIZE,
  ACTIVITY_FINAL_NODE_TYPE,
  ACTIVITY_FORK_NODE_TYPE,
  ACTIVITY_INITIAL_NODE_TYPE,
  ACTIVITY_JOIN_NODE_TYPE,
  ACTIVITY_MERGE_NODE_TYPE,
  ACTIVITY_OBJECT_FLOW_EDGE_TYPE,
  ACTIVITY_PSEUDOSTATE_CIRCLE_SIZE,
  ACTIVITY_VIEWPOINT_ID,
  activityViewpoint,
  createViewpointRegistry,
} from '@/viewpoints';

function makeAction(nodeType: ActionUsageElement['nodeType']): ActionUsageElement {
  return {
    id: 'a-1' as never,
    kind: 'ActionUsage',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: 'Action',
    nodeType,
  };
}

describe('Activity viewpoint', () => {
  it('exports the expected id, label, and accepted kinds (ADR 0005)', () => {
    expect(activityViewpoint.id).toBe('activity');
    expect(ACTIVITY_VIEWPOINT_ID).toBe('activity');
    expect(activityViewpoint.label).toBe('Activity Diagram');
    expect(activityViewpoint.acceptedElementKinds).toEqual([
      'ActionUsage',
      'ActionDefinition',
    ]);
    expect(activityViewpoint.acceptedEdgeKinds).toEqual([
      'ControlFlow',
      'ObjectFlow',
    ]);
    expect(activityViewpoint.acceptedEdgeElementKinds).toEqual([]);
    expect(activityViewpoint.defaultLayout).toBe('dagre');
  });

  it('exposes seven ActionUsage palette items, one per ActionNodeType', () => {
    expect(activityViewpoint.paletteItems).toHaveLength(7);
    const nodeTypes = activityViewpoint.paletteItems.map(
      (item) => item.defaultData?.nodeType,
    );
    expect(nodeTypes).toEqual([
      'action',
      'initial',
      'final',
      'fork',
      'join',
      'decision',
      'merge',
    ]);
    for (const item of activityViewpoint.paletteItems) {
      expect(item.elementKind).toBe('ActionUsage');
      expect(typeof item.label).toBe('string');
      expect(typeof item.description).toBe('string');
    }
  });

  it('keeps nodeTypes and edgeTypes frozen at module scope', () => {
    // Per docs/CONTEXT.md, React Flow needs referentially-stable
    // nodeTypes/edgeTypes — frozen records (whether empty or populated).
    expect(Object.isFrozen(activityViewpoint.nodeTypes)).toBe(true);
    expect(Object.isFrozen(activityViewpoint.edgeTypes)).toBe(true);
    // #88 registers all seven ActionUsage renderers (one per nodeType).
    expect(Object.keys(activityViewpoint.nodeTypes).sort()).toEqual(
      [
        ACTIVITY_ACTION_NODE_TYPE,
        ACTIVITY_DECISION_NODE_TYPE,
        ACTIVITY_FINAL_NODE_TYPE,
        ACTIVITY_FORK_NODE_TYPE,
        ACTIVITY_INITIAL_NODE_TYPE,
        ACTIVITY_JOIN_NODE_TYPE,
        ACTIVITY_MERGE_NODE_TYPE,
      ].sort(),
    );
    // #89 registers ControlFlow + ObjectFlow renderers.
    expect(Object.keys(activityViewpoint.edgeTypes).sort()).toEqual(
      [ACTIVITY_CONTROL_FLOW_EDGE_TYPE, ACTIVITY_OBJECT_FLOW_EDGE_TYPE].sort(),
    );
  });

  it('nodeSizeFor returns per-pseudostate sizes (ADR 0005 / #88)', () => {
    const cases: ReadonlyArray<
      readonly [ActionUsageElement['nodeType'], { width: number; height: number }]
    > = [
      ['action', { width: ACTIVITY_ACTION_WIDTH, height: ACTIVITY_ACTION_HEIGHT }],
      [
        'initial',
        {
          width: ACTIVITY_PSEUDOSTATE_CIRCLE_SIZE,
          height: ACTIVITY_PSEUDOSTATE_CIRCLE_SIZE,
        },
      ],
      [
        'final',
        {
          width: ACTIVITY_PSEUDOSTATE_CIRCLE_SIZE,
          height: ACTIVITY_PSEUDOSTATE_CIRCLE_SIZE,
        },
      ],
      ['fork', { width: ACTIVITY_BAR_WIDTH, height: ACTIVITY_BAR_HEIGHT }],
      ['join', { width: ACTIVITY_BAR_WIDTH, height: ACTIVITY_BAR_HEIGHT }],
      ['decision', { width: ACTIVITY_DIAMOND_SIZE, height: ACTIVITY_DIAMOND_SIZE }],
      ['merge', { width: ACTIVITY_DIAMOND_SIZE, height: ACTIVITY_DIAMOND_SIZE }],
    ];
    for (const [nodeType, expected] of cases) {
      expect(activityViewpoint.nodeSizeFor(makeAction(nodeType))).toEqual(expected);
    }
  });

  it('can be registered in a viewpoint registry and looked up by id', () => {
    const registry = createViewpointRegistry();
    registry.register(activityViewpoint);
    expect(registry.has(ACTIVITY_VIEWPOINT_ID)).toBe(true);
    expect(registry.get(ACTIVITY_VIEWPOINT_ID)).toBe(activityViewpoint);
  });

  it('nodeTypeFor maps each ActionUsage.nodeType to its custom node string', () => {
    const cases: ReadonlyArray<
      readonly [ActionUsageElement['nodeType'], string]
    > = [
      ['action', ACTIVITY_ACTION_NODE_TYPE],
      ['initial', ACTIVITY_INITIAL_NODE_TYPE],
      ['final', ACTIVITY_FINAL_NODE_TYPE],
      ['fork', ACTIVITY_FORK_NODE_TYPE],
      ['join', ACTIVITY_JOIN_NODE_TYPE],
      ['decision', ACTIVITY_DECISION_NODE_TYPE],
      ['merge', ACTIVITY_MERGE_NODE_TYPE],
    ];
    for (const [nodeType, expected] of cases) {
      expect(activityViewpoint.nodeTypeFor(makeAction(nodeType))).toBe(expected);
    }
  });

  it('nodeTypeFor throws for non-ActionUsage kinds', () => {
    const block: PartDefinitionElement = {
      id: 'p-1' as never,
      kind: 'PartDefinition',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'Block',
      isAbstract: false,
    };
    expect(() => activityViewpoint.nodeTypeFor(block)).toThrow(
      /activity viewpoint cannot render element kind/,
    );
  });

  it('edgeTypeFor maps ControlFlow and ObjectFlow to their custom edge strings', () => {
    expect(
      activityViewpoint.edgeTypeFor({
        id: 'e-1' as never,
        kind: 'ControlFlow',
        sourceId: 'a-1' as never,
        targetId: 'a-2' as never,
      }),
    ).toBe(ACTIVITY_CONTROL_FLOW_EDGE_TYPE);
    expect(
      activityViewpoint.edgeTypeFor({
        id: 'e-2' as never,
        kind: 'ObjectFlow',
        sourceId: 'a-1' as never,
        targetId: 'a-2' as never,
      }),
    ).toBe(ACTIVITY_OBJECT_FLOW_EDGE_TYPE);
  });

  it('edgeTypeFor throws for unsupported edge kinds', () => {
    expect(() =>
      activityViewpoint.edgeTypeFor({
        id: 'e-1' as never,
        kind: 'Composition',
        sourceId: 'a-1' as never,
        targetId: 'a-2' as never,
      }),
    ).toThrow(/activity viewpoint cannot render edge kind/);
  });

  it('edgeTypeForElement throws — Activity has no element-as-edge kinds', () => {
    expect(() =>
      activityViewpoint.edgeTypeForElement(makeAction('action')),
    ).toThrow(/activity viewpoint cannot render element-as-edge kind/);
  });
});
