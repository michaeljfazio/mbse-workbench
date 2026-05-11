import type { ModelEdge, ModelElement } from '@/model';

import type {
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';

import {
  ConnectionUsageEdge,
  IBD_CONNECTION_USAGE_EDGE_TYPE,
} from './ConnectionUsageEdge';
import { IBD_ITEM_FLOW_EDGE_TYPE, ItemFlowEdge } from './ItemFlowEdge';
import {
  IBD_PART_USAGE_HEIGHT,
  IBD_PART_USAGE_NODE_TYPE,
  IBD_PART_USAGE_WIDTH,
  PartUsageNode,
} from './PartUsageNode';

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
  ConnectionUsageEdge,
  IBD_CONNECTION_USAGE_EDGE_TYPE,
} from './ConnectionUsageEdge';
export type {
  IbdConnectionUsageEdge,
  IbdConnectionUsageEdgeData,
} from './ConnectionUsageEdge';
export { IBD_ITEM_FLOW_EDGE_TYPE, ItemFlowEdge } from './ItemFlowEdge';
export type { IbdItemFlowEdge, IbdItemFlowEdgeData } from './ItemFlowEdge';
export {
  HANDLE_TYPE_BY_DIRECTION,
  buildPortUsageOwnership,
  isPartDefinition,
  isPortDefinition,
  placeHandle,
  resolveIbdEdgeEndpoints,
  resolvePartHandles,
} from './partUsageHelpers';
export type {
  IbdEdgeEndpoints,
  SidePlacement,
  BuildPartHandleSpecsInput,
} from './partUsageHelpers';
export {
  canonicalizeIbdConnection,
  isValidIbdConnection,
} from './isValidConnection';
export type { IbdConnectionEndpoints } from './isValidConnection';

export const IBD_VIEWPOINT_ID: ViewpointId = 'ibd';

// Module-scoped (frozen) so React Flow can rely on referential stability.
const IBD_NODE_TYPES = Object.freeze({
  [IBD_PART_USAGE_NODE_TYPE]: PartUsageNode,
}) as unknown as ViewpointNodeTypes;
const IBD_EDGE_TYPES = Object.freeze({
  [IBD_CONNECTION_USAGE_EDGE_TYPE]: ConnectionUsageEdge,
  [IBD_ITEM_FLOW_EDGE_TYPE]: ItemFlowEdge,
}) as unknown as ViewpointEdgeTypes;

export const ibdViewpoint: Viewpoint = {
  id: IBD_VIEWPOINT_ID,
  label: 'Internal Block Diagram',
  // Per ADR 0003: PartUsage renders as a node; PortUsage is rendered as a
  // labelled Handle on its parent PartUsage, so it does not appear here.
  acceptedElementKinds: ['PartUsage'],
  acceptedEdgeKinds: [],
  acceptedEdgeElementKinds: ['ConnectionUsage', 'ItemFlow'],
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
  edgeTypeForElement(element: ModelElement): string {
    if (element.kind === 'ConnectionUsage') return IBD_CONNECTION_USAGE_EDGE_TYPE;
    if (element.kind === 'ItemFlow') return IBD_ITEM_FLOW_EDGE_TYPE;
    throw new Error(
      `ibd viewpoint cannot render element-as-edge kind: ${element.kind}`,
    );
  },
  nodeSizeFor(): { readonly width: number; readonly height: number } {
    return { width: IBD_PART_USAGE_WIDTH, height: IBD_PART_USAGE_HEIGHT };
  },
};
