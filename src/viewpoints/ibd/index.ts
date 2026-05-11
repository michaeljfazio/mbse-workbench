import type { ModelEdge, ModelElement } from '@/model';

import type {
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';

import { IBD_PART_USAGE_NODE_TYPE, PartUsageNode } from './PartUsageNode';

export {
  IBD_PART_USAGE_NODE_TYPE,
  IBD_PART_USAGE_WIDTH,
  IBD_PART_USAGE_HEIGHT,
  PartUsageNode,
} from './PartUsageNode';
export type {
  IbdPartHandleSpec,
  IbdPartUsageData,
  IbdPartUsageNode,
} from './PartUsageNode';
export {
  HANDLE_TYPE_BY_DIRECTION,
  isPartDefinition,
  isPortDefinition,
  placeHandle,
  resolvePartHandles,
} from './partUsageHelpers';
export type { SidePlacement, BuildPartHandleSpecsInput } from './partUsageHelpers';

export const IBD_VIEWPOINT_ID: ViewpointId = 'ibd';

// Module-scoped (frozen) so React Flow can rely on referential stability.
// #51 will add ConnectionUsage and #52 will add ItemFlow to `edgeTypes`.
const IBD_NODE_TYPES = Object.freeze({
  [IBD_PART_USAGE_NODE_TYPE]: PartUsageNode,
}) as unknown as ViewpointNodeTypes;
const IBD_EDGE_TYPES = Object.freeze({}) as unknown as ViewpointEdgeTypes;

export const ibdViewpoint: Viewpoint = {
  id: IBD_VIEWPOINT_ID,
  label: 'Internal Block Diagram',
  // Per ADR 0003: PartUsage renders as a node; PortUsage is rendered as a
  // labelled Handle on its parent PartUsage, so it does not appear here.
  acceptedElementKinds: ['PartUsage'],
  acceptedEdgeKinds: [],
  defaultLayout: 'dagre',
  paletteItems: [
    {
      elementKind: 'PartUsage',
      label: 'Part',
      description:
        'A SysMLv2 part usage typed by a PartDefinition. Drop onto an IBD to instantiate.',
    },
  ],
  nodeTypes: IBD_NODE_TYPES,
  edgeTypes: IBD_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
    if (element.kind === 'PartUsage') return IBD_PART_USAGE_NODE_TYPE;
    throw new Error(`ibd viewpoint cannot render element kind: ${element.kind}`);
  },
  edgeTypeFor(edge: ModelEdge): string {
    throw new Error(`ibd viewpoint cannot render edge kind: ${edge.kind}`);
  },
};
