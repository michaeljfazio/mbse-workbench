import type { ElementKind, ModelEdge, ModelElement } from '@/model';

import type {
  PaletteItem,
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';

import { PackageNode } from './PackageNode';
import {
  PACKAGE_IMPORT_EDGE_TYPE,
  PackageImportEdge,
} from './PackageImportEdge';
import {
  PACKAGE_NODE_HEIGHT,
  PACKAGE_NODE_WIDTH,
} from './sizes';

export { isValidPackageConnection } from './isValidConnection';
export { PACKAGE_IMPORT_EDGE_TYPE, PackageImportEdge };
export type { PackageImportFlowEdge, PackageImportEdgeData } from './PackageImportEdge';
export { PackageNode } from './PackageNode';
export type {
  PackageFlowNode,
  PackageNodeData,
  PackageRenameCallback,
} from './PackageNode';
export {
  PACKAGE_NODE_HEIGHT,
  PACKAGE_NODE_WIDTH,
  PACKAGE_TAB_HEIGHT,
  PACKAGE_TAB_WIDTH,
} from './sizes';

export const PACKAGE_VIEWPOINT_ID: ViewpointId = 'package';

export const PACKAGE_NODE_TYPE = 'package-node';

// Retained as aliases — the placeholder constants are still referenced from
// existing tests; their values now equal the real Package node dimensions.
export const PACKAGE_DEFAULT_NODE_WIDTH = PACKAGE_NODE_WIDTH;
export const PACKAGE_DEFAULT_NODE_HEIGHT = PACKAGE_NODE_HEIGHT;

// Per ADR 0009 § 1: a Package diagram accepts the Package element plus every
// kind that can be a Package member, so the project-tree palette can drop
// any of them into a Package diagram (the drop semantics — set the dropped
// element's `ownerId` to the active Package per ADR 0011 § 2 — land in
// `moveElement` T-13.36). Keep this list in sync with the Package container
// admissible kinds and ADR 0009.
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

// Module-scoped (frozen) so React Flow gets stable references.
const PACKAGE_NODE_TYPES = Object.freeze({
  [PACKAGE_NODE_TYPE]: PackageNode,
}) as unknown as ViewpointNodeTypes;
const PACKAGE_EDGE_TYPES = Object.freeze({
  [PACKAGE_IMPORT_EDGE_TYPE]: PackageImportEdge,
}) as unknown as ViewpointEdgeTypes;

const PACKAGE_PALETTE_ITEMS: readonly PaletteItem[] = [
  {
    elementKind: 'Package',
    label: 'Package',
    description:
      'A namespace that groups related model elements. Drop onto the canvas to create one.',
  },
];

export const packageViewpoint: Viewpoint = {
  id: PACKAGE_VIEWPOINT_ID,
  label: 'Package Diagram',
  // Only Package nodes render in this viewpoint right now. The 18 member
  // kinds in PACKAGE_MEMBER_ELEMENT_KINDS are admissible package members
  // (used by #156's cross-package drop) but they don't render *as nodes*
  // here — listing them in acceptedElementKinds caused CanvasPane to map
  // them through nodeTypeFor and throw "package viewpoint cannot render
  // element kind: PartDefinition". #156 will introduce a separate drop
  // affordance for member kinds without expanding the render set.
  acceptedElementKinds: ['Package'],
  acceptedContextKinds: ['package'],
  acceptedEdgeKinds: ['PackageImport'],
  // Per ADR 0009 § 2: Package containment is a `memberIds` list, NOT an
  // element-as-edge. PackageImport stays in ModelEdge — it carries no
  // identity beyond endpoints.
  acceptedEdgeElementKinds: [],
  defaultLayout: 'dagre',
  paletteItems: PACKAGE_PALETTE_ITEMS,
  nodeTypes: PACKAGE_NODE_TYPES,
  edgeTypes: PACKAGE_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
    if (element.kind === 'Package') return PACKAGE_NODE_TYPE;
    throw new Error(
      `package viewpoint cannot render element kind: ${element.kind}`,
    );
  },
  edgeTypeFor(edge: ModelEdge): string {
    if (edge.kind === 'PackageImport') return PACKAGE_IMPORT_EDGE_TYPE;
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
      width: PACKAGE_NODE_WIDTH,
      height: PACKAGE_NODE_HEIGHT,
    };
  },
};
