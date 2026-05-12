import type { ModelEdge, ModelElement } from '@/model';

import type {
  PaletteItem,
  Viewpoint,
  ViewpointEdgeTypes,
  ViewpointId,
  ViewpointNodeTypes,
} from '../types';

export const USE_CASE_VIEWPOINT_ID: ViewpointId = 'use-case';

// Reserved ReactFlow node-type strings for #118 (Actor + UseCase custom nodes).
// Defined here so the viewpoint registers a stable contract today; the
// concrete components and `nodeTypes` record entries land in the next child
// issue.
export const USE_CASE_ACTOR_NODE_TYPE = 'use-case-actor';
export const USE_CASE_USE_CASE_NODE_TYPE = 'use-case-usecase';

// Reserved Actor + UseCase node sizes — #118 may tune the exact pixel
// dimensions, but these are the working defaults per the issue body.
export const USE_CASE_ACTOR_WIDTH = 80;
export const USE_CASE_ACTOR_HEIGHT = 100;
export const USE_CASE_USE_CASE_WIDTH = 180;
export const USE_CASE_USE_CASE_HEIGHT = 90;

// Per ADR 0007 § 1+§ 2, the viewpoint registers with empty nodeTypes /
// edgeTypes — #118 plugs in the Actor + UseCase node components, #119 the
// Include + Extend + Generalization edge renderers. Object.freeze keeps the
// record referentially stable so React Flow does not re-render the canvas on
// every state change (docs/CONTEXT.md 2026-05-11 "nodeTypes must be module-
// scoped or memoized").
const USE_CASE_NODE_TYPES = Object.freeze({}) as ViewpointNodeTypes;
const USE_CASE_EDGE_TYPES = Object.freeze({}) as ViewpointEdgeTypes;

const USE_CASE_PALETTE_ITEMS: readonly PaletteItem[] = [];

export const useCaseViewpoint: Viewpoint = {
  id: USE_CASE_VIEWPOINT_ID,
  label: 'Use Case Diagram',
  // Per ADR 0007 § 2: Actor and UseCase are both first-class nodes in the
  // Use Case viewpoint.
  acceptedElementKinds: ['Actor', 'UseCase'],
  // Per ADR 0007 § 3+§ 4: Include and Extend are pure ModelEdge relationships
  // (no instance identity); Generalization reuses the existing edge kind for
  // actor-actor and use-case-use-case inheritance. No new edge kind needed.
  acceptedEdgeKinds: ['Include', 'Extend', 'Generalization'],
  // Per ADR 0007 § 3 explicit consequence: Use Case has no element-as-edge
  // kinds — all three relationships are ModelEdge.
  acceptedEdgeElementKinds: [],
  defaultLayout: 'dagre',
  paletteItems: USE_CASE_PALETTE_ITEMS,
  nodeTypes: USE_CASE_NODE_TYPES,
  edgeTypes: USE_CASE_EDGE_TYPES,
  nodeTypeFor(element: ModelElement): string {
    if (element.kind === 'Actor') return USE_CASE_ACTOR_NODE_TYPE;
    if (element.kind === 'UseCase') return USE_CASE_USE_CASE_NODE_TYPE;
    throw new Error(
      `use case viewpoint cannot render element kind: ${element.kind}`,
    );
  },
  edgeTypeFor(edge: ModelEdge): string {
    // #119 populates this with the Include / Extend / Generalization edge
    // renderer mappings. For now any edge query throws — the viewpoint has
    // no canvas-rendered edges yet.
    throw new Error(
      `use case viewpoint edge renderer not registered yet: ${edge.kind}`,
    );
  },
  edgeTypeForElement(element: ModelElement): string {
    throw new Error(
      `use case viewpoint cannot render element-as-edge kind: ${element.kind}`,
    );
  },
  nodeSizeFor(element: ModelElement): { readonly width: number; readonly height: number } {
    if (element.kind === 'Actor') {
      return { width: USE_CASE_ACTOR_WIDTH, height: USE_CASE_ACTOR_HEIGHT };
    }
    if (element.kind === 'UseCase') {
      return { width: USE_CASE_USE_CASE_WIDTH, height: USE_CASE_USE_CASE_HEIGHT };
    }
    // Defensive fallback for any element that slips through
    // `acceptedElementKinds` (e.g. a stale diagram entry) — keep dagre layout
    // from blowing up on unexpected kinds.
    return { width: USE_CASE_USE_CASE_WIDTH, height: USE_CASE_USE_CASE_HEIGHT };
  },
};
