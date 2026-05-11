import type { ModelEdge, ModelElement } from '@/model';

import type {
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';

export const REQUIREMENTS_VIEWPOINT_ID: ViewpointId = 'requirements';

// Module-scoped (frozen) so React Flow gets stable references. #71 will add
// the Requirement custom node here; #72 will add the RequirementTrace edges.
const REQUIREMENTS_NODE_TYPES = Object.freeze({}) as unknown as ViewpointNodeTypes;
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
  paletteItems: [],
  nodeTypes: REQUIREMENTS_NODE_TYPES,
  edgeTypes: REQUIREMENTS_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
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
