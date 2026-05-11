import dagre from 'dagre';

import type { ElementId, ModelEdge, ModelElement } from '@/model';

import type { NodePosition } from '@/workspace/diagram';

export interface DagreLayoutOptions {
  readonly rankdir?: 'TB' | 'LR' | 'BT' | 'RL';
  readonly nodesep?: number;
  readonly ranksep?: number;
  readonly marginx?: number;
  readonly marginy?: number;
  readonly nodeWidth: number;
  readonly nodeHeight: number;
}

export const DEFAULT_DAGRE_OPTIONS: Omit<DagreLayoutOptions, 'nodeWidth' | 'nodeHeight'> = {
  rankdir: 'TB',
  nodesep: 60,
  ranksep: 80,
  marginx: 40,
  marginy: 40,
};

export function dagreLayout(
  elements: readonly ModelElement[],
  edges: readonly ModelEdge[],
  options: DagreLayoutOptions,
): Map<ElementId, NodePosition> {
  // Fresh graph per call — strict-mode double-invocation would corrupt a
  // shared graph instance (recorded in docs/CONTEXT.md).
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: options.rankdir ?? DEFAULT_DAGRE_OPTIONS.rankdir,
    nodesep: options.nodesep ?? DEFAULT_DAGRE_OPTIONS.nodesep,
    ranksep: options.ranksep ?? DEFAULT_DAGRE_OPTIONS.ranksep,
    marginx: options.marginx ?? DEFAULT_DAGRE_OPTIONS.marginx,
    marginy: options.marginy ?? DEFAULT_DAGRE_OPTIONS.marginy,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  const known = new Set<ElementId>();
  for (const element of elements) {
    known.add(element.id);
    graph.setNode(element.id, {
      width: options.nodeWidth,
      height: options.nodeHeight,
    });
  }
  for (const edge of edges) {
    if (!known.has(edge.sourceId) || !known.has(edge.targetId)) continue;
    graph.setEdge(edge.sourceId, edge.targetId);
  }

  dagre.layout(graph);

  const positions = new Map<ElementId, NodePosition>();
  for (const element of elements) {
    const node = graph.node(element.id);
    if (!node) continue;
    // dagre returns the node center; React Flow positions are top-left.
    positions.set(element.id, {
      x: Math.round(node.x - options.nodeWidth / 2),
      y: Math.round(node.y - options.nodeHeight / 2),
    });
  }
  return positions;
}
