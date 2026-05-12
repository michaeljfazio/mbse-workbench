import type { ElementKind, ModelEdge, ModelElement } from '@/model';

import type {
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';

export const PACKAGE_VIEWPOINT_ID: ViewpointId = 'package';

// Placeholder layout box used by `nodeSizeFor` until #155 ships the real
// Package custom node (containment renderer) with its own dimensions.
export const PACKAGE_DEFAULT_NODE_WIDTH = 220;
export const PACKAGE_DEFAULT_NODE_HEIGHT = 120;

// Per ADR 0009 § 1: a Package diagram accepts the Package element plus every
// kind that can be a Package member, so the project-tree palette can drop
// any of them into a Package diagram (the drop semantics — assign to a
// Package's memberIds — land in #156). Keep this list in sync with
// `PackageElement.memberIds` admissible kinds and ADR 0009.
export const PACKAGE_MEMBER_ELEMENT_KINDS: readonly ElementKind[] = [
  'PartDefinition',
  'PartUsage',
  'PortDefinition',
  'PortUsage',
  'InterfaceDefinition',
  'ConnectionUsage',
  'ItemFlow',
  'Requirement',
  'ActionDefinition',
  'ActionUsage',
  'StateDefinition',
  'StateUsage',
  'Transition',
  'UseCase',
  'Actor',
  'ConstraintDefinition',
  'ConstraintUsage',
  'ValueProperty',
];

// Module-scoped (frozen) so React Flow gets stable references. #155 will
// add the Package custom node here; #156 will add the PackageImport edge.
const PACKAGE_NODE_TYPES = Object.freeze({}) as unknown as ViewpointNodeTypes;
const PACKAGE_EDGE_TYPES = Object.freeze({}) as unknown as ViewpointEdgeTypes;

export const packageViewpoint: Viewpoint = {
  id: PACKAGE_VIEWPOINT_ID,
  label: 'Package Diagram',
  acceptedElementKinds: ['Package', ...PACKAGE_MEMBER_ELEMENT_KINDS],
  acceptedEdgeKinds: ['PackageImport'],
  // Per ADR 0009 § 2: Package containment is a `memberIds` list, NOT an
  // element-as-edge. PackageImport stays in ModelEdge — it carries no
  // identity beyond endpoints.
  acceptedEdgeElementKinds: [],
  defaultLayout: 'dagre',
  paletteItems: [],
  nodeTypes: PACKAGE_NODE_TYPES,
  edgeTypes: PACKAGE_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
    throw new Error(
      `package viewpoint cannot render element kind: ${element.kind}`,
    );
  },
  edgeTypeFor(edge: ModelEdge): string {
    throw new Error(
      `package viewpoint cannot render edge kind: ${edge.kind}`,
    );
  },
  edgeTypeForElement(element: ModelElement): string {
    throw new Error(
      `package viewpoint cannot render element-as-edge kind: ${element.kind}`,
    );
  },
  nodeSizeFor(): { readonly width: number; readonly height: number } {
    return {
      width: PACKAGE_DEFAULT_NODE_WIDTH,
      height: PACKAGE_DEFAULT_NODE_HEIGHT,
    };
  },
};
