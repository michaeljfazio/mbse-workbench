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
  HANDLE_TYPE_BY_DIRECTION,
  IBD_PART_USAGE_HEIGHT,
  IBD_PART_USAGE_NODE_TYPE,
  IBD_PART_USAGE_WIDTH,
  IBD_VIEWPOINT_ID,
  ibdViewpoint,
  isPartDefinition,
  isPortDefinition,
  placeHandle,
  resolvePartHandles,
} from './ibd';

export type {
  IbdPartHandleSpec,
  IbdPartUsageData,
  IbdPartUsageNode,
} from './ibd';
