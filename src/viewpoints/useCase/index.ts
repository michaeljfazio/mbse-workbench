import type { ModelEdge, ModelElement } from '@/model';

import type {
  PaletteItem,
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';

import { ActorNode } from './ActorNode';
import {
  AssociationEdge,
  USE_CASE_ASSOCIATION_EDGE_TYPE,
} from './AssociationEdge';
import {
  ExtendEdge,
  USE_CASE_EXTEND_EDGE_TYPE,
} from './ExtendEdge';
import {
  GeneralizationEdge,
  USE_CASE_GENERALIZATION_EDGE_TYPE,
} from './GeneralizationEdge';
import {
  IncludeEdge,
  USE_CASE_INCLUDE_EDGE_TYPE,
} from './IncludeEdge';
import {
  USE_CASE_ACTOR_HEIGHT,
  USE_CASE_ACTOR_WIDTH,
  USE_CASE_USE_CASE_HEIGHT,
  USE_CASE_USE_CASE_WIDTH,
} from './sizes';
import { UseCaseNode } from './UseCaseNode';

export {
  USE_CASE_ACTOR_HEIGHT,
  USE_CASE_ACTOR_WIDTH,
  USE_CASE_USE_CASE_HEIGHT,
  USE_CASE_USE_CASE_WIDTH,
} from './sizes';
export { ActorNode } from './ActorNode';
export type { ActorFlowNode, ActorNodeData, ActorRenameCallback } from './ActorNode';
export { UseCaseNode } from './UseCaseNode';
export type {
  UseCaseFlowNode,
  UseCaseNodeData,
  UseCaseRenameCallback,
} from './UseCaseNode';
export {
  AssociationEdge as UseCaseAssociationEdge,
  USE_CASE_ASSOCIATION_EDGE_TYPE,
} from './AssociationEdge';
export type {
  UseCaseAssociationEdgeData,
  UseCaseAssociationFlowEdge,
} from './AssociationEdge';
export {
  ExtendEdge,
  USE_CASE_EXTEND_EDGE_TYPE,
} from './ExtendEdge';
export type {
  UseCaseExtendEdgeData,
  UseCaseExtendFlowEdge,
} from './ExtendEdge';
export {
  GeneralizationEdge as UseCaseGeneralizationEdge,
  USE_CASE_GENERALIZATION_EDGE_TYPE,
} from './GeneralizationEdge';
export type {
  UseCaseGeneralizationEdgeData,
  UseCaseGeneralizationFlowEdge,
} from './GeneralizationEdge';
export {
  IncludeEdge,
  USE_CASE_INCLUDE_EDGE_TYPE,
} from './IncludeEdge';
export type {
  UseCaseIncludeEdgeData,
  UseCaseIncludeFlowEdge,
} from './IncludeEdge';
export {
  allowedUseCaseEdgeKindsFor,
  defaultUseCaseEdgeKindFor,
  isValidUseCaseConnection,
} from './isValidConnection';
export type { UseCaseEdgeKind } from './isValidConnection';

export const USE_CASE_VIEWPOINT_ID: ViewpointId = 'use-case';

export const USE_CASE_ACTOR_NODE_TYPE = 'use-case-actor';
export const USE_CASE_USE_CASE_NODE_TYPE = 'use-case-usecase';

// Module-scoped (frozen) so React Flow can rely on referential stability.
const USE_CASE_NODE_TYPES = Object.freeze({
  [USE_CASE_ACTOR_NODE_TYPE]: ActorNode,
  [USE_CASE_USE_CASE_NODE_TYPE]: UseCaseNode,
}) as unknown as ViewpointNodeTypes;
const USE_CASE_EDGE_TYPES = Object.freeze({
  [USE_CASE_INCLUDE_EDGE_TYPE]: IncludeEdge,
  [USE_CASE_EXTEND_EDGE_TYPE]: ExtendEdge,
  [USE_CASE_GENERALIZATION_EDGE_TYPE]: GeneralizationEdge,
  [USE_CASE_ASSOCIATION_EDGE_TYPE]: AssociationEdge,
}) as unknown as ViewpointEdgeTypes;

const USE_CASE_PALETTE_ITEMS: readonly PaletteItem[] = [
  {
    elementKind: 'Actor',
    label: 'Actor',
    description:
      'An external participant that interacts with the system in a use case.',
  },
  {
    elementKind: 'UseCase',
    label: 'Use case',
    description:
      'A coherent piece of functionality the system provides to its actors.',
  },
];

export const useCaseViewpoint: Viewpoint = {
  id: USE_CASE_VIEWPOINT_ID,
  label: 'Use Case Diagram',
  acceptedElementKinds: ['Actor', 'UseCase'],
  acceptedContextKinds: ['package'],
  acceptedEdgeKinds: ['Include', 'Extend', 'Generalization', 'Association'],
  acceptedEdgeElementKinds: [],
  defaultLayout: 'dagre',
  paletteItems: USE_CASE_PALETTE_ITEMS,
  nodeTypes: USE_CASE_NODE_TYPES,
  edgeTypes: USE_CASE_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
    if (element.kind === 'Actor') return USE_CASE_ACTOR_NODE_TYPE;
    if (element.kind === 'UseCase') return USE_CASE_USE_CASE_NODE_TYPE;
    throw new Error(
      `use case viewpoint cannot render element kind: ${element.kind}`,
    );
  },
  edgeTypeFor(edge: ModelEdge): string {
    if (edge.kind === 'Include') return USE_CASE_INCLUDE_EDGE_TYPE;
    if (edge.kind === 'Extend') return USE_CASE_EXTEND_EDGE_TYPE;
    if (edge.kind === 'Generalization') return USE_CASE_GENERALIZATION_EDGE_TYPE;
    if (edge.kind === 'Association') return USE_CASE_ASSOCIATION_EDGE_TYPE;
    throw new Error(
      `use case viewpoint cannot render edge kind: ${edge.kind}`,
    );
  },
  edgeTypeForElement(element: ModelElement): string {
    throw new Error(
      `use case viewpoint cannot render element-as-edge kind: ${element.kind}`,
    );
  },
  nodeSizeFor(element: ModelElement): { readonly width: number; readonly height: number } {
    if (element.kind === 'Actor') {
      return { width: USE_CASE_ACTOR_WIDTH, height: USE_CASE_ACTOR_HEIGHT };
    }
    if (element.kind === 'UseCase') {
      return { width: USE_CASE_USE_CASE_WIDTH, height: USE_CASE_USE_CASE_HEIGHT };
    }
    return { width: USE_CASE_USE_CASE_WIDTH, height: USE_CASE_USE_CASE_HEIGHT };
  },
};
