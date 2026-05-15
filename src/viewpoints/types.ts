import type { EdgeTypes, NodeTypes } from '@xyflow/react';

import type { EdgeKind, ElementKind, ModelEdge, ModelElement } from '@/model';

// Mirrors `DiagramContextKind` in `src/workspace/diagram.ts`. Duplicated to
// avoid a circular module dependency (diagram.ts already imports ViewpointId
// from this file). The two literal unions are kept in sync by the
// "DiagramContext discriminator" unit test in
// `tests/unit/workspace/diagramContext.test.ts`.
export type ViewpointContextKind =
  | 'package'
  | 'partDefinition'
  | 'actionDefinition'
  | 'stateDefinition';

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
  // Container kinds (elements that can OWN this viewpoint's diagrams) per
  // ADR 0011 / JOURNAL iter-531. Drives the "Create representation…" menu in
  // the containment tree and the createDiagram default/validate logic.
  readonly acceptedContextKinds: readonly ViewpointContextKind[];
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
  // Layout box size for the given element. BDD/IBD/Requirements return a
  // viewpoint-wide constant; Activity returns per-`nodeType` sizes because
  // pseudostates render as small circles/diamonds/bars and a uniform box
  // would leave handles floating in empty space around the visible shape.
  nodeSizeFor(element: ModelElement): { readonly width: number; readonly height: number };
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
