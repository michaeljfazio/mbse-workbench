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

export const USE_CASE_VIEWPOINT_ID: ViewpointId = 'use-case';

export const USE_CASE_ACTOR_NODE_TYPE = 'use-case-actor';
export const USE_CASE_USE_CASE_NODE_TYPE = 'use-case-usecase';

// Module-scoped (frozen) so React Flow can rely on referential stability.
const USE_CASE_NODE_TYPES = Object.freeze({
  [USE_CASE_ACTOR_NODE_TYPE]: ActorNode,
  [USE_CASE_USE_CASE_NODE_TYPE]: UseCaseNode,
}) as unknown as ViewpointNodeTypes;
const USE_CASE_EDGE_TYPES = Object.freeze({}) as ViewpointEdgeTypes;

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
  acceptedEdgeKinds: ['Include', 'Extend', 'Generalization'],
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
    // #119 populates this with the Include / Extend / Generalization edge
    // renderers. Until then, any edge query throws.
    throw new Error(
      `use case viewpoint edge renderer not registered yet: ${edge.kind}`,
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
