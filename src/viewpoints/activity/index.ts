import type { ActionNodeType, ModelEdge, ModelElement } from '@/model';

import type {
  PaletteItem,
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';

export const ACTIVITY_VIEWPOINT_ID: ViewpointId = 'activity';

// One ReactFlow node-type string per ActionUsage `nodeType` discriminator.
// Per ADR 0005 § 2, pseudostates are tags on ActionUsage rather than
// separate metamodel kinds — the viewpoint's `nodeTypeFor` translates
// `nodeType` into one of these strings, and #88 will register the actual
// node renderers under the same keys.
export const ACTIVITY_ACTION_NODE_TYPE = 'activity-action';
export const ACTIVITY_INITIAL_NODE_TYPE = 'activity-initial';
export const ACTIVITY_FINAL_NODE_TYPE = 'activity-final';
export const ACTIVITY_FORK_NODE_TYPE = 'activity-fork';
export const ACTIVITY_JOIN_NODE_TYPE = 'activity-join';
export const ACTIVITY_DECISION_NODE_TYPE = 'activity-decision';
export const ACTIVITY_MERGE_NODE_TYPE = 'activity-merge';

export const ACTIVITY_CONTROL_FLOW_EDGE_TYPE = 'activity-control-flow';
export const ACTIVITY_OBJECT_FLOW_EDGE_TYPE = 'activity-object-flow';

const NODE_TYPE_BY_ACTION_NODE_TYPE: Readonly<Record<ActionNodeType, string>> = {
  action: ACTIVITY_ACTION_NODE_TYPE,
  initial: ACTIVITY_INITIAL_NODE_TYPE,
  final: ACTIVITY_FINAL_NODE_TYPE,
  fork: ACTIVITY_FORK_NODE_TYPE,
  join: ACTIVITY_JOIN_NODE_TYPE,
  decision: ACTIVITY_DECISION_NODE_TYPE,
  merge: ACTIVITY_MERGE_NODE_TYPE,
};

// Module-scoped (frozen) so React Flow can rely on referential stability.
// #87 leaves both records empty; #88 populates `ACTIVITY_NODE_TYPES` with
// the seven custom node renderers and #89 populates `ACTIVITY_EDGE_TYPES`
// with the ControlFlow + ObjectFlow renderers.
const ACTIVITY_NODE_TYPES = Object.freeze({}) as unknown as ViewpointNodeTypes;
const ACTIVITY_EDGE_TYPES = Object.freeze({}) as unknown as ViewpointEdgeTypes;

const ACTIVITY_PALETTE_ITEMS: readonly PaletteItem[] = [
  {
    elementKind: 'ActionUsage',
    label: 'Action',
    description: 'A SysMLv2 action — the default behavioral step on an activity.',
    defaultData: { nodeType: 'action' satisfies ActionNodeType },
  },
  {
    elementKind: 'ActionUsage',
    label: 'Initial node',
    description: 'Activity entry. Cannot be a flow target.',
    defaultData: { nodeType: 'initial' satisfies ActionNodeType },
  },
  {
    elementKind: 'ActionUsage',
    label: 'Final node',
    description: 'Activity exit. Cannot be a flow source.',
    defaultData: { nodeType: 'final' satisfies ActionNodeType },
  },
  {
    elementKind: 'ActionUsage',
    label: 'Fork',
    description: 'Splits a single flow into concurrent parallel flows.',
    defaultData: { nodeType: 'fork' satisfies ActionNodeType },
  },
  {
    elementKind: 'ActionUsage',
    label: 'Join',
    description: 'Synchronizes concurrent flows into one.',
    defaultData: { nodeType: 'join' satisfies ActionNodeType },
  },
  {
    elementKind: 'ActionUsage',
    label: 'Decision',
    description: 'Routes a single flow to one of several outgoing branches.',
    defaultData: { nodeType: 'decision' satisfies ActionNodeType },
  },
  {
    elementKind: 'ActionUsage',
    label: 'Merge',
    description: 'Joins alternative incoming flows into one outgoing flow.',
    defaultData: { nodeType: 'merge' satisfies ActionNodeType },
  },
];

export const activityViewpoint: Viewpoint = {
  id: ACTIVITY_VIEWPOINT_ID,
  label: 'Activity Diagram',
  // Per ADR 0005 § 2: pseudostates ride on ActionUsage's `nodeType` tag;
  // `ActionDefinition` is reserved for a future "called activity" frame
  // and accepted here so it does not need an ADR revision later.
  acceptedElementKinds: ['ActionUsage', 'ActionDefinition'],
  // Per ADR 0005 § 3: ControlFlow + ObjectFlow are ModelEdge entries,
  // not element-as-edge.
  acceptedEdgeKinds: ['ControlFlow', 'ObjectFlow'],
  acceptedEdgeElementKinds: [],
  defaultLayout: 'dagre',
  paletteItems: ACTIVITY_PALETTE_ITEMS,
  nodeTypes: ACTIVITY_NODE_TYPES,
  edgeTypes: ACTIVITY_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
    if (element.kind === 'ActionUsage') {
      return NODE_TYPE_BY_ACTION_NODE_TYPE[element.nodeType];
    }
    throw new Error(
      `activity viewpoint cannot render element kind: ${element.kind}`,
    );
  },
  edgeTypeFor(edge: ModelEdge): string {
    if (edge.kind === 'ControlFlow') return ACTIVITY_CONTROL_FLOW_EDGE_TYPE;
    if (edge.kind === 'ObjectFlow') return ACTIVITY_OBJECT_FLOW_EDGE_TYPE;
    throw new Error(
      `activity viewpoint cannot render edge kind: ${edge.kind}`,
    );
  },
  edgeTypeForElement(element: ModelElement): string {
    throw new Error(
      `activity viewpoint cannot render element-as-edge kind: ${element.kind}`,
    );
  },
};
