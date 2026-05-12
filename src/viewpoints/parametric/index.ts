import type { ModelEdge, ModelElement } from '@/model';

import type {
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';

export const PARAMETRIC_VIEWPOINT_ID: ViewpointId = 'parametric';

// Placeholder layout box used by `nodeSizeFor` until #136 ships the real
// ConstraintUsage / ValueProperty custom nodes with their own dimensions.
export const PARAMETRIC_DEFAULT_NODE_WIDTH = 200;
export const PARAMETRIC_DEFAULT_NODE_HEIGHT = 80;

// Module-scoped (frozen) so React Flow gets stable references. #136 will
// add the ConstraintUsage / ValueProperty custom nodes here; #137 will add
// the ParameterBinding edge.
const PARAMETRIC_NODE_TYPES = Object.freeze({}) as unknown as ViewpointNodeTypes;
const PARAMETRIC_EDGE_TYPES = Object.freeze({}) as unknown as ViewpointEdgeTypes;

export const parametricViewpoint: Viewpoint = {
  id: PARAMETRIC_VIEWPOINT_ID,
  label: 'Parametric Diagram',
  acceptedElementKinds: ['ConstraintUsage', 'ValueProperty'],
  acceptedEdgeKinds: ['ParameterBinding'],
  // Per ADR 0008 § 2: ParameterBinding stays in ModelEdge — not an
  // element-as-edge — because it carries no identity beyond endpoints.
  acceptedEdgeElementKinds: [],
  defaultLayout: 'dagre',
  paletteItems: [],
  nodeTypes: PARAMETRIC_NODE_TYPES,
  edgeTypes: PARAMETRIC_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
    throw new Error(
      `parametric viewpoint cannot render element kind: ${element.kind}`,
    );
  },
  edgeTypeFor(edge: ModelEdge): string {
    throw new Error(
      `parametric viewpoint cannot render edge kind: ${edge.kind}`,
    );
  },
  edgeTypeForElement(element: ModelElement): string {
    throw new Error(
      `parametric viewpoint cannot render element-as-edge kind: ${element.kind}`,
    );
  },
  nodeSizeFor(): { readonly width: number; readonly height: number } {
    return {
      width: PARAMETRIC_DEFAULT_NODE_WIDTH,
      height: PARAMETRIC_DEFAULT_NODE_HEIGHT,
    };
  },
};
