import type { ModelEdge, ModelElement } from '@/model';
import type { Viewpoint, ViewpointEdgeTypes, ViewpointId, ViewpointNodeTypes } from '../types';

import {
  BDD_BLOCK_HEIGHT,
  BDD_BLOCK_NODE_TYPE,
  BDD_BLOCK_WIDTH,
  BlockNode,
} from './BlockNode';
import {
  BDD_AGGREGATION_EDGE_TYPE,
  AggregationEdge,
  type BddAggregationEdge,
} from './AggregationEdge';
import {
  BDD_ASSOCIATION_EDGE_TYPE,
  AssociationEdge,
  type BddAssociationEdge,
} from './AssociationEdge';
import {
  BDD_COMPOSITION_EDGE_TYPE,
  CompositionEdge,
  type BddCompositionEdge,
} from './CompositionEdge';
import {
  BDD_DEPENDENCY_EDGE_TYPE,
  DependencyEdge,
  type BddDependencyEdge,
} from './DependencyEdge';
import {
  BDD_GENERALIZATION_EDGE_TYPE,
  GeneralizationEdge,
  type BddGeneralizationEdge,
} from './GeneralizationEdge';

export {
  BDD_AGGREGATION_EDGE_TYPE,
  BDD_ASSOCIATION_EDGE_TYPE,
  BDD_BLOCK_NODE_TYPE,
  BDD_COMPOSITION_EDGE_TYPE,
  BDD_DEPENDENCY_EDGE_TYPE,
  BDD_GENERALIZATION_EDGE_TYPE,
};
export type { BddBlockData, BddBlockNode, BlockRenameCallback, BlockResizeCallback } from './BlockNode';
export type { BddAggregationEdge };
export type { BddAssociationEdge };
export type { BddCompositionEdge };
export type { BddDependencyEdge };
export type { BddGeneralizationEdge };
export type BddEdge =
  | BddCompositionEdge
  | BddAggregationEdge
  | BddGeneralizationEdge
  | BddAssociationEdge
  | BddDependencyEdge;
export type BddEdgeKind =
  | 'Composition'
  | 'Aggregation'
  | 'Generalization'
  | 'Association'
  | 'Dependency';

export {
  BDD_BLOCK_COMPARTMENT_DEFAULT_MAX_VISIBLE,
  bddBlockEmptyCompartments,
  computeBddBlockCompartments,
  formatConstraintUsageLabel,
  formatPartUsageLabel,
  formatPortDefinitionLabel,
  formatValuePropertyLabel,
} from './blockCompartments';
export type {
  BddBlockCompartment,
  BddBlockCompartmentItem,
  BddBlockCompartmentRegistry,
  BddBlockCompartments,
  ComputeBddBlockCompartmentsOptions,
} from './blockCompartments';

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
  [BDD_AGGREGATION_EDGE_TYPE]: AggregationEdge,
  [BDD_GENERALIZATION_EDGE_TYPE]: GeneralizationEdge,
  [BDD_ASSOCIATION_EDGE_TYPE]: AssociationEdge,
  [BDD_DEPENDENCY_EDGE_TYPE]: DependencyEdge,
}) as unknown as ViewpointEdgeTypes;

export const bddViewpoint: Viewpoint = {
  id: BDD_VIEWPOINT_ID,
  label: 'Block Definition Diagram',
  acceptedElementKinds: ['PartDefinition'],
  acceptedContextKinds: ['package', 'partDefinition'],
  acceptedEdgeKinds: [
    'Composition',
    'Aggregation',
    'Generalization',
    'Association',
    'Dependency',
  ],
  acceptedEdgeElementKinds: [],
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
      case 'Aggregation':
        return BDD_AGGREGATION_EDGE_TYPE;
      case 'Generalization':
        return BDD_GENERALIZATION_EDGE_TYPE;
      case 'Association':
        return BDD_ASSOCIATION_EDGE_TYPE;
      case 'Dependency':
        return BDD_DEPENDENCY_EDGE_TYPE;
      default:
        throw new Error(`bdd viewpoint cannot render edge kind: ${edge.kind}`);
    }
  },
  edgeTypeForElement(element: ModelElement): string {
    throw new Error(
      `bdd viewpoint cannot render element-as-edge kind: ${element.kind}`,
    );
  },
  nodeSizeFor(): { readonly width: number; readonly height: number } {
    return { width: BDD_BLOCK_WIDTH, height: BDD_BLOCK_HEIGHT };
  },
};
