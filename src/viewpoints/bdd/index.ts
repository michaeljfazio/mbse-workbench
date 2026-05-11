import type { ModelEdge, ModelElement } from '@/model';
import type { Viewpoint, ViewpointEdgeTypes, ViewpointId, ViewpointNodeTypes } from '../types';

import { BDD_BLOCK_NODE_TYPE, BlockNode } from './BlockNode';
import {
  BDD_COMPOSITION_EDGE_TYPE,
  CompositionEdge,
  type BddCompositionEdge,
} from './CompositionEdge';
import {
  BDD_GENERALIZATION_EDGE_TYPE,
  GeneralizationEdge,
  type BddGeneralizationEdge,
} from './GeneralizationEdge';

export { BDD_BLOCK_NODE_TYPE, BDD_COMPOSITION_EDGE_TYPE, BDD_GENERALIZATION_EDGE_TYPE };
export type { BddBlockData, BddBlockNode, BlockRenameCallback } from './BlockNode';
export type { BddCompositionEdge };
export type { BddGeneralizationEdge };
export type BddEdge = BddCompositionEdge | BddGeneralizationEdge;
export type BddEdgeKind = 'Composition' | 'Generalization';

export { isValidBddConnection } from './isValidConnection';
export {
  dagreLayout,
  DEFAULT_DAGRE_OPTIONS,
  type DagreLayoutOptions,
} from './layout';

export const BDD_VIEWPOINT_ID: ViewpointId = 'bdd';

// Module-scoped so React Flow can rely on referential stability.
// (See docs/CONTEXT.md — re-creating these per render breaks the canvas.)
const BDD_NODE_TYPES = Object.freeze({
  [BDD_BLOCK_NODE_TYPE]: BlockNode,
}) as unknown as ViewpointNodeTypes;

const BDD_EDGE_TYPES = Object.freeze({
  [BDD_COMPOSITION_EDGE_TYPE]: CompositionEdge,
  [BDD_GENERALIZATION_EDGE_TYPE]: GeneralizationEdge,
}) as unknown as ViewpointEdgeTypes;

export const bddViewpoint: Viewpoint = {
  id: BDD_VIEWPOINT_ID,
  label: 'Block Definition Diagram',
  acceptedElementKinds: ['PartDefinition'],
  acceptedEdgeKinds: ['Composition', 'Generalization'],
  defaultLayout: 'dagre',
  paletteItems: [
    {
      elementKind: 'PartDefinition',
      label: 'Block',
      description: 'A SysMLv2 part definition rendered as a BDD block.',
    },
  ],
  nodeTypes: BDD_NODE_TYPES,
  edgeTypes: BDD_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
    if (element.kind === 'PartDefinition') return BDD_BLOCK_NODE_TYPE;
    throw new Error(`bdd viewpoint cannot render element kind: ${element.kind}`);
  },
  edgeTypeFor(edge: ModelEdge): string {
    switch (edge.kind) {
      case 'Composition':
        return BDD_COMPOSITION_EDGE_TYPE;
      case 'Generalization':
        return BDD_GENERALIZATION_EDGE_TYPE;
      default:
        throw new Error(`bdd viewpoint cannot render edge kind: ${edge.kind}`);
    }
  },
};
