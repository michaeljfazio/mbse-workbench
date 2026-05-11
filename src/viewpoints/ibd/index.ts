import type { ModelEdge, ModelElement } from '@/model';

import type {
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';

export const IBD_VIEWPOINT_ID: ViewpointId = 'ibd';

// Module-scoped (frozen) so React Flow can rely on referential stability.
// Both records are empty for #49 — #50 adds the PartUsage node type, #51
// adds the ConnectionUsage edge type, #52 adds the ItemFlow edge variant.
const IBD_NODE_TYPES = Object.freeze({}) as unknown as ViewpointNodeTypes;
const IBD_EDGE_TYPES = Object.freeze({}) as unknown as ViewpointEdgeTypes;

export const ibdViewpoint: Viewpoint = {
  id: IBD_VIEWPOINT_ID,
  label: 'Internal Block Diagram',
  // Per ADR 0003: PartUsage renders as a node; PortUsage is rendered as a
  // labelled Handle on its parent PartUsage, so it does not appear here.
  acceptedElementKinds: ['PartUsage'],
  acceptedEdgeKinds: [],
  defaultLayout: 'dagre',
  // Empty for #49 — #50 introduces the "Part" palette item once the
  // PartUsage node component lands.
  paletteItems: [],
  nodeTypes: IBD_NODE_TYPES,
  edgeTypes: IBD_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
    throw new Error(`ibd viewpoint cannot yet render element kind: ${element.kind}`);
  },
  edgeTypeFor(edge: ModelEdge): string {
    throw new Error(`ibd viewpoint cannot yet render edge kind: ${edge.kind}`);
  },
};
