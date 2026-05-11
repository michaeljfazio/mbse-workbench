import type { EdgeTypes, NodeTypes } from '@xyflow/react';

import type { EdgeKind, ElementKind, ModelEdge, ModelElement } from '@/model';

export type LayoutEngine = 'dagre' | 'elk' | 'manual';

export type ViewpointId = string;

export interface PaletteItem {
  readonly elementKind: ElementKind;
  readonly label: string;
  readonly description?: string;
}

export type ViewpointNodeTypes = NodeTypes;

export type ViewpointEdgeTypes = EdgeTypes;

export interface Viewpoint {
  readonly id: ViewpointId;
  readonly label: string;
  readonly acceptedElementKinds: readonly ElementKind[];
  readonly acceptedEdgeKinds: readonly EdgeKind[];
  readonly defaultLayout: LayoutEngine;
  readonly paletteItems: readonly PaletteItem[];
  readonly nodeTypes: ViewpointNodeTypes;
  readonly edgeTypes: ViewpointEdgeTypes;
  nodeTypeFor(element: ModelElement): string;
  edgeTypeFor(edge: ModelEdge): string;
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
