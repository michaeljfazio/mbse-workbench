import type { EdgeTypes, NodeTypes } from '@xyflow/react';

import type { EdgeKind, ElementKind, ModelEdge, ModelElement } from '@/model';

export type LayoutEngine = 'dagre' | 'elk' | 'manual';

export type ViewpointId = string;

export interface PaletteItem {
  readonly elementKind: ElementKind;
  readonly label: string;
  readonly description?: string;
  // Optional defaults the palette item carries through to element creation
  // (e.g. ActionUsage's `nodeType` discriminates the seven Activity
  // pseudostates). Consumer-side code narrows the shape by element kind;
  // this stays open so each viewpoint can encode its own per-kind extras
  // without churning the shared interface.
  readonly defaultData?: Readonly<Record<string, unknown>>;
}

export type ViewpointNodeTypes = NodeTypes;

export type ViewpointEdgeTypes = EdgeTypes;

export interface Viewpoint {
  readonly id: ViewpointId;
  readonly label: string;
  readonly acceptedElementKinds: readonly ElementKind[];
  readonly acceptedEdgeKinds: readonly EdgeKind[];
  // SysMLv2 element kinds that render as ReactFlow edges (not nodes) in this
  // viewpoint. Examples: ConnectionUsage / ItemFlow in IBD, Transition in a
  // future state-machine viewpoint. BDD has none.
  readonly acceptedEdgeElementKinds: readonly ElementKind[];
  readonly defaultLayout: LayoutEngine;
  readonly paletteItems: readonly PaletteItem[];
  readonly nodeTypes: ViewpointNodeTypes;
  readonly edgeTypes: ViewpointEdgeTypes;
  nodeTypeFor(element: ModelElement): string;
  edgeTypeFor(edge: ModelEdge): string;
  // Maps an `acceptedEdgeElementKinds` element to its ReactFlow edge type.
  // Throws for unsupported kinds — same contract as `edgeTypeFor`.
  edgeTypeForElement(element: ModelElement): string;
}

export class DuplicateViewpointError extends Error {
  readonly viewpointId: ViewpointId;
  constructor(viewpointId: ViewpointId) {
    super(`viewpoint already registered: ${viewpointId}`);
    this.name = 'DuplicateViewpointError';
    this.viewpointId = viewpointId;
  }
}

export interface ViewpointRegistry {
  register(viewpoint: Viewpoint): void;
  get(id: ViewpointId): Viewpoint | undefined;
  has(id: ViewpointId): boolean;
  list(): readonly Viewpoint[];
}

export function createViewpointRegistry(): ViewpointRegistry {
  const viewpoints = new Map<ViewpointId, Viewpoint>();

  return {
    register(viewpoint) {
      if (viewpoints.has(viewpoint.id)) {
        throw new DuplicateViewpointError(viewpoint.id);
      }
      viewpoints.set(viewpoint.id, viewpoint);
    },
    get(id) {
      return viewpoints.get(id);
    },
    has(id) {
      return viewpoints.has(id);
    },
    list() {
      return Array.from(viewpoints.values());
    },
  };
}
