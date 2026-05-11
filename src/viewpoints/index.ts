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
  REQUIREMENT_NODE_HEIGHT,
  REQUIREMENT_NODE_WIDTH,
  REQUIREMENTS_REQUIREMENT_NODE_TYPE,
  REQUIREMENTS_VIEWPOINT_ID,
  RequirementNode,
  requirementsViewpoint,
} from './requirements';

export type {
  RequirementNodeData,
  RequirementNodeType,
  RequirementRenameCallback,
} from './requirements';
