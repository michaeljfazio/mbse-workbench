import type { ModelEdge, ModelElement, StateNodeType } from '@/model';

import type {
  PaletteItem,
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';
import { StateUsageNode } from './StateUsageNode';

export {
  StateUsageNode,
  type StateRenameCallback,
  type StateUsageFlowNode,
  type StateUsageNodeData,
} from './StateUsageNode';

export const STATE_MACHINE_VIEWPOINT_ID: ViewpointId = 'state-machine';

// One ReactFlow node-type string per StateUsage `stateType` discriminator.
// Per ADR 0006 § 2, pseudostates are tags on StateUsage rather than separate
// metamodel kinds — the viewpoint's `nodeTypeFor` translates `stateType` into
// one of these strings, and #105 populates the matching `nodeTypes` record.
export const STATE_MACHINE_STATE_NODE_TYPE = 'state-machine-state';
export const STATE_MACHINE_INITIAL_NODE_TYPE = 'state-machine-initial';
export const STATE_MACHINE_FINAL_NODE_TYPE = 'state-machine-final';

// Future edge-type string for the Transition element-as-edge. Populated by
// #106 alongside the `<TransitionEdge>` component.
export const STATE_MACHINE_TRANSITION_EDGE_TYPE = 'state-machine-transition';

// Default node sizes per StateUsage `stateType`. Match the iteration-36
// Activity lesson recorded in docs/CONTEXT.md — pseudostates are small
// shapes (circles), so a uniform box leaves layout handles floating in
// empty space. Final values may be refined in #105 once the visual style
// is dialed in.
export const STATE_MACHINE_STATE_WIDTH = 160;
export const STATE_MACHINE_STATE_HEIGHT = 72;
export const STATE_MACHINE_PSEUDOSTATE_SIZE = 28;

const STATE_WIDTH = STATE_MACHINE_STATE_WIDTH;
const STATE_HEIGHT = STATE_MACHINE_STATE_HEIGHT;
const PSEUDO = STATE_MACHINE_PSEUDOSTATE_SIZE;

export function stateNodeSize(
  stateType: StateNodeType,
): { readonly width: number; readonly height: number } {
  if (stateType === 'state') return { width: STATE_WIDTH, height: STATE_HEIGHT };
  return { width: PSEUDO, height: PSEUDO };
}

const NODE_TYPE_BY_STATE_NODE_TYPE: Readonly<Record<StateNodeType, string>> = {
  state: STATE_MACHINE_STATE_NODE_TYPE,
  initial: STATE_MACHINE_INITIAL_NODE_TYPE,
  final: STATE_MACHINE_FINAL_NODE_TYPE,
};

// Module-scoped (frozen) so React Flow can rely on referential stability.
// All three StateUsage stateType discriminators route to the same component;
// the component branches on `data.stateType` to render the right shape.
const STATE_MACHINE_NODE_TYPES = Object.freeze({
  [STATE_MACHINE_STATE_NODE_TYPE]: StateUsageNode,
  [STATE_MACHINE_INITIAL_NODE_TYPE]: StateUsageNode,
  [STATE_MACHINE_FINAL_NODE_TYPE]: StateUsageNode,
}) as ViewpointNodeTypes;

// #106 swaps the empty record for the transition edge-type mapping.
const STATE_MACHINE_EDGE_TYPES = Object.freeze(
  {} as Record<string, never>,
) as unknown as ViewpointEdgeTypes;

const STATE_MACHINE_PALETTE_ITEMS: readonly PaletteItem[] = [
  {
    elementKind: 'StateUsage',
    label: 'State',
    description: 'A SysMLv2 state — the default behavioral mode on a state machine.',
    defaultData: { stateType: 'state' satisfies StateNodeType },
  },
  {
    elementKind: 'StateUsage',
    label: 'Initial pseudostate',
    description: 'State machine entry. Cannot be a transition target.',
    defaultData: { stateType: 'initial' satisfies StateNodeType },
  },
  {
    elementKind: 'StateUsage',
    label: 'Final pseudostate',
    description: 'State machine exit. Cannot be a transition source.',
    defaultData: { stateType: 'final' satisfies StateNodeType },
  },
];

export const stateMachineViewpoint: Viewpoint = {
  id: STATE_MACHINE_VIEWPOINT_ID,
  label: 'State Machine Diagram',
  // Per ADR 0006 § 2: pseudostates ride on StateUsage's `stateType` tag;
  // `StateDefinition` is reserved for a future "called state machine" frame
  // and accepted here so it does not need an ADR revision later (parallels
  // Activity reserving `ActionDefinition` per ADR 0005).
  acceptedElementKinds: ['StateUsage', 'StateDefinition'],
  // Per ADR 0006 § 3: Transition stays in `ModelElement` with `sourceId` /
  // `targetId` baked in and renders as an element-as-edge — same pattern as
  // IBD's `ConnectionUsage` / `ItemFlow` per ADR 0003 § 3.
  acceptedEdgeKinds: [],
  acceptedEdgeElementKinds: ['Transition'],
  defaultLayout: 'dagre',
  paletteItems: STATE_MACHINE_PALETTE_ITEMS,
  nodeTypes: STATE_MACHINE_NODE_TYPES,
  edgeTypes: STATE_MACHINE_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
    if (element.kind === 'StateUsage') {
      return NODE_TYPE_BY_STATE_NODE_TYPE[element.stateType];
    }
    throw new Error(
      `state machine viewpoint cannot render element kind: ${element.kind}`,
    );
  },
  edgeTypeFor(edge: ModelEdge): string {
    throw new Error(
      `state machine viewpoint cannot render edge kind: ${edge.kind}`,
    );
  },
  edgeTypeForElement(element: ModelElement): string {
    if (element.kind === 'Transition') return STATE_MACHINE_TRANSITION_EDGE_TYPE;
    throw new Error(
      `state machine viewpoint cannot render element-as-edge kind: ${element.kind}`,
    );
  },
  nodeSizeFor(element: ModelElement): { readonly width: number; readonly height: number } {
    if (element.kind === 'StateUsage') return stateNodeSize(element.stateType);
    // StateDefinition is reserved for a future "called state machine" frame;
    // until that ships, treat it as a default-sized state box so canvas
    // layout doesn't blow up if one slips through (`acceptedElementKinds`
    // lists it).
    return { width: STATE_WIDTH, height: STATE_HEIGHT };
  },
};
