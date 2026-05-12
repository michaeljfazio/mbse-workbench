import type { EdgeId, ElementId, ModelEdge, ModelElement } from '@/model';

export interface ImpactSet {
  readonly rootId: ElementId;
  readonly elementIds: ReadonlySet<ElementId>;
  readonly edgeIds: ReadonlySet<EdgeId>;
}

export interface ComputeImpactSetInput {
  readonly rootElementId: ElementId;
  readonly elements: ReadonlyMap<ElementId, ModelElement> | readonly ModelElement[];
  readonly edges: ReadonlyMap<EdgeId, ModelEdge> | readonly ModelEdge[];
}

function toElementMap(
  source: ReadonlyMap<ElementId, ModelElement> | readonly ModelElement[],
): ReadonlyMap<ElementId, ModelElement> {
  if (Array.isArray(source)) {
    const map = new Map<ElementId, ModelElement>();
    for (const el of source) map.set(el.id, el);
    return map;
  }
  return source as ReadonlyMap<ElementId, ModelElement>;
}

function toEdgeList(
  source: ReadonlyMap<EdgeId, ModelEdge> | readonly ModelEdge[],
): readonly ModelEdge[] {
  if (Array.isArray(source)) return source;
  return Array.from((source as ReadonlyMap<EdgeId, ModelEdge>).values());
}

/**
 * Build the impact set for an element: every element reachable by walking
 * outgoing structural edges plus every Requirement reachable by walking
 * incoming RequirementTrace edges (transitively). The returned `edgeIds`
 * are the edges that were actually traversed, so UI layers can highlight
 * both nodes and the connecting lines.
 *
 * Returns an empty set (containing only the root, if it exists) when the
 * root is unknown.
 */
export function computeImpactSet(input: ComputeImpactSetInput): ImpactSet {
  const elements = toElementMap(input.elements);
  const edges = toEdgeList(input.edges);
  const root = input.rootElementId;

  const elementIds = new Set<ElementId>();
  const edgeIds = new Set<EdgeId>();

  if (!elements.has(root)) {
    return { rootId: root, elementIds, edgeIds };
  }

  const outgoingStructural = new Map<ElementId, ModelEdge[]>();
  const incomingTrace = new Map<ElementId, ModelEdge[]>();
  for (const edge of edges) {
    if (edge.kind === 'RequirementTrace') {
      const bucket = incomingTrace.get(edge.targetId);
      if (bucket) bucket.push(edge);
      else incomingTrace.set(edge.targetId, [edge]);
    } else {
      const bucket = outgoingStructural.get(edge.sourceId);
      if (bucket) bucket.push(edge);
      else outgoingStructural.set(edge.sourceId, [edge]);
    }
  }

  const queue: ElementId[] = [root];
  elementIds.add(root);
  while (queue.length > 0) {
    const current = queue.shift()!;
    const outgoing = outgoingStructural.get(current);
    if (outgoing) {
      for (const edge of outgoing) {
        if (!elements.has(edge.targetId)) continue;
        edgeIds.add(edge.id);
        if (!elementIds.has(edge.targetId)) {
          elementIds.add(edge.targetId);
          queue.push(edge.targetId);
        }
      }
    }
    const incoming = incomingTrace.get(current);
    if (incoming) {
      for (const edge of incoming) {
        if (!elements.has(edge.sourceId)) continue;
        edgeIds.add(edge.id);
        if (!elementIds.has(edge.sourceId)) {
          elementIds.add(edge.sourceId);
          queue.push(edge.sourceId);
        }
      }
    }
  }

  return { rootId: root, elementIds, edgeIds };
}

export function isInImpactSet(set: ImpactSet, id: ElementId | EdgeId): boolean {
  return (
    set.elementIds.has(id as ElementId) || set.edgeIds.has(id as EdgeId)
  );
}
