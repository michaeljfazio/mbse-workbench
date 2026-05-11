import type { ModelEdge, ModelElement } from '@/model';

import type {
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';

import {
  REQUIREMENT_NODE_HEIGHT,
  REQUIREMENT_NODE_WIDTH,
  REQUIREMENTS_REQUIREMENT_NODE_TYPE,
  RequirementNode,
} from './RequirementNode';

export {
  REQUIREMENT_NODE_HEIGHT,
  REQUIREMENT_NODE_WIDTH,
  REQUIREMENTS_REQUIREMENT_NODE_TYPE,
  RequirementNode,
};
export type {
  RequirementNodeData,
  RequirementNodeType,
  RequirementRenameCallback,
} from './RequirementNode';

export const REQUIREMENTS_VIEWPOINT_ID: ViewpointId = 'requirements';

// Module-scoped (frozen) so React Flow gets stable references. #72 will add
// the RequirementTrace edges to this map.
const REQUIREMENTS_NODE_TYPES = Object.freeze({
  [REQUIREMENTS_REQUIREMENT_NODE_TYPE]: RequirementNode,
}) as unknown as ViewpointNodeTypes;
const REQUIREMENTS_EDGE_TYPES = Object.freeze({}) as unknown as ViewpointEdgeTypes;

export const requirementsViewpoint: Viewpoint = {
  id: REQUIREMENTS_VIEWPOINT_ID,
  label: 'Requirements Diagram',
  acceptedElementKinds: ['Requirement'],
  acceptedEdgeKinds: ['RequirementTrace'],
  // Per ADR 0004 § 2: RequirementTrace stays in ModelEdge — not an
  // element-as-edge — because it carries no identity beyond its endpoints
  // and traceKind. BDD's pattern, not IBD's.
  acceptedEdgeElementKinds: [],
  defaultLayout: 'dagre',
  paletteItems: [
    {
      elementKind: 'Requirement',
      label: 'Requirement',
      description: 'A SysMLv2 requirement with id, priority, status and text.',
    },
  ],
  nodeTypes: REQUIREMENTS_NODE_TYPES,
  edgeTypes: REQUIREMENTS_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
    if (element.kind === 'Requirement') return REQUIREMENTS_REQUIREMENT_NODE_TYPE;
    throw new Error(
      `requirements viewpoint cannot render element kind: ${element.kind}`,
    );
  },
  edgeTypeFor(edge: ModelEdge): string {
    throw new Error(
      `requirements viewpoint cannot render edge kind: ${edge.kind}`,
    );
  },
  edgeTypeForElement(element: ModelElement): string {
    throw new Error(
      `requirements viewpoint cannot render element-as-edge kind: ${element.kind}`,
    );
  },
};
