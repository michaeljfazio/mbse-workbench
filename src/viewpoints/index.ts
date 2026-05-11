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

export { IBD_VIEWPOINT_ID, ibdViewpoint } from './ibd';
