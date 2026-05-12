export type {
  LayoutEngine,
  PaletteItem,
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
  ViewpointRegistry,
} from './types';

export { createViewpointRegistry, DuplicateViewpointError } from './types';

export {
  BDD_BLOCK_NODE_TYPE,
  BDD_COMPOSITION_EDGE_TYPE,
  BDD_GENERALIZATION_EDGE_TYPE,
  BDD_VIEWPOINT_ID,
  bddViewpoint,
} from './bdd';

export type {
  BddBlockData,
  BddBlockNode,
  BddCompositionEdge,
  BddEdge,
  BddEdgeKind,
  BddGeneralizationEdge,
} from './bdd';

export { isValidBddConnection } from './bdd';

export {
  dagreLayout,
  DEFAULT_DAGRE_OPTIONS,
  type DagreLayoutOptions,
} from './bdd';

export {
  BDD_BLOCK_HEIGHT,
  BDD_BLOCK_WIDTH,
} from './bdd/BlockNode';

export {
  buildPortUsageOwnership,
  canonicalizeIbdConnection,
  ConnectionUsageEdge,
  HANDLE_TYPE_BY_DIRECTION,
  IBD_CONNECTION_USAGE_EDGE_TYPE,
  IBD_ITEM_FLOW_EDGE_TYPE,
  IBD_PART_USAGE_HEIGHT,
  IBD_PART_USAGE_NODE_TYPE,
  IBD_PART_USAGE_WIDTH,
  IBD_VIEWPOINT_ID,
  ibdViewpoint,
  isPartDefinition,
  isPortDefinition,
  isValidIbdConnection,
  ItemFlowEdge,
  placeHandle,
  resolveIbdEdgeEndpoints,
  resolvePartHandles,
} from './ibd';

export type {
  IbdConnectionEndpoints,
  IbdConnectionUsageEdge,
  IbdConnectionUsageEdgeData,
  IbdEdgeEndpoints,
  IbdItemFlowEdge,
  IbdItemFlowEdgeData,
  IbdPartHandleSpec,
  IbdPartUsageData,
  IbdPartUsageNode,
} from './ibd';

export {
  isTraceTargetKind,
  isValidRequirementTraceConnection,
  REQUIREMENT_NODE_HEIGHT,
  REQUIREMENT_NODE_WIDTH,
  REQUIREMENTS_REQUIREMENT_NODE_TYPE,
  REQUIREMENTS_TRACE_EDGE_TYPE,
  REQUIREMENTS_VIEWPOINT_ID,
  RequirementNode,
  RequirementTraceEdge,
  requirementsViewpoint,
  TRACE_TARGET_KINDS,
  validTraceKindsFor,
} from './requirements';

export {
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
  ActionUsageNode,
  ActivityControlFlowEdge,
  ActivityObjectFlowEdge,
  actionNodeSize,
  activityViewpoint,
  isRenamablePseudostate,
  isValidActivityConnection,
} from './activity';

export type {
  ActionNodeSize,
  ActionRenameCallback,
  ActionUsageFlowNode,
  ActionUsageNodeData,
  ActivityControlFlowEdgeData,
  ActivityControlFlowFlowEdge,
  ActivityObjectFlowEdgeData,
  ActivityObjectFlowFlowEdge,
} from './activity';

export type {
  RequirementNodeData,
  RequirementNodeType,
  RequirementRenameCallback,
  RequirementTraceEdgeData,
  RequirementTraceFlowEdge,
} from './requirements';

export {
  composeTransitionLabel,
  isValidStateMachineConnection,
  STATE_MACHINE_FINAL_NODE_TYPE,
  STATE_MACHINE_INITIAL_NODE_TYPE,
  STATE_MACHINE_PSEUDOSTATE_SIZE,
  STATE_MACHINE_STATE_HEIGHT,
  STATE_MACHINE_STATE_NODE_TYPE,
  STATE_MACHINE_STATE_WIDTH,
  STATE_MACHINE_TRANSITION_EDGE_TYPE,
  STATE_MACHINE_VIEWPOINT_ID,
  StateUsageNode,
  stateMachineViewpoint,
  stateNodeSize,
  TransitionEdge,
} from './stateMachine';

export type {
  StateMachineTransitionEdgeData,
  StateMachineTransitionFlowEdge,
  StateRenameCallback,
  StateUsageFlowNode,
  StateUsageNodeData,
} from './stateMachine';


