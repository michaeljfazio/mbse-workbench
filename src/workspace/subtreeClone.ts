import {
  type ElementId,
  type ElementRegistry,
  type ModelEdge,
  type ModelElement,
  createEdgeId,
  createElementId,
} from '@/model';

export interface CloneSubtreeOptions {
  readonly registry: ElementRegistry;
  readonly edges: readonly ModelEdge[];
}

export interface CloneSubtreeResult {
  /** Id of the cloned root. */
  readonly rootCloneId: ElementId;
  /**
   * Cloned elements in topological order — root first, then BFS-ordered
   * descendants. Suitable for dispatching as a sequence of `create-element`
   * commands without ever referencing an id that isn't already created.
   */
  readonly elements: readonly ModelElement[];
  /**
   * Cloned edges (only those whose both endpoints landed in the cloned
   * subtree). Endpoints are remapped to the clones; ids are fresh.
   */
  readonly edges: readonly ModelEdge[];
}

/**
 * Element kinds whose `sourceId` / `targetId` are model-fields rather than
 * real `ModelEdge`s (ConnectionUsage, ItemFlow, Transition). These element-
 * edges are dropped when either embedded endpoint leaves the cloned subtree.
 */
const ELEMENT_EDGE_KINDS: ReadonlySet<ModelElement['kind']> = new Set([
  'ConnectionUsage',
  'ItemFlow',
  'Transition',
]);

/**
 * Clone the subtree rooted at `rootId`, allocating fresh ids for every
 * cloned element/edge.
 *
 * Containment (`ownerId`) is remapped for every descendant. The root clone
 * inherits the original's `ownerId` and `ownerRole` — the caller is
 * responsible for assigning `ownerIndex` (typically `nextOwnerIndex`).
 *
 * Field-based id references on the cloned elements (`definitionId`,
 * `interfaceId`, and the embedded `sourceId`/`targetId` on element-edges)
 * are remapped only when the target lands in the subtree; refs that point
 * outside are preserved unchanged. Element-edges with endpoints that leave
 * the subtree are dropped from the clone set entirely.
 *
 * Real `ModelEdge`s are cloned only when BOTH endpoints are in the subtree,
 * with fresh `EdgeId`s and remapped endpoints. Cross-subtree edges are
 * dropped.
 */
export function cloneSubtree(
  rootId: ElementId,
  options: CloneSubtreeOptions,
): CloneSubtreeResult | null {
  const { registry, edges } = options;
  const root = registry.get(rootId);
  if (!root) return null;

  // 1. BFS the descendants by ownerId to enumerate the subtree.
  const subtreeOrder: ModelElement[] = [];
  const idMap = new Map<ElementId, ElementId>();
  const subtreeIds = new Set<ElementId>();
  const queue: ModelElement[] = [root];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (subtreeIds.has(current.id)) continue;
    subtreeIds.add(current.id);
    idMap.set(current.id, createElementId());
    subtreeOrder.push(current);
    for (const child of registry.childrenOf(current.id)) {
      queue.push(child);
    }
  }

  const remap = (id: ElementId): ElementId => idMap.get(id) ?? id;
  const inSubtree = (id: ElementId): boolean => subtreeIds.has(id);

  // 2. Clone elements. Drop element-edges whose endpoint(s) leave the subtree.
  const clones: ModelElement[] = [];
  for (const original of subtreeOrder) {
    if (
      ELEMENT_EDGE_KINDS.has(original.kind) &&
      'sourceId' in original &&
      'targetId' in original
    ) {
      const src = (original as { sourceId: ElementId }).sourceId;
      const tgt = (original as { targetId: ElementId }).targetId;
      if (!inSubtree(src) || !inSubtree(tgt)) {
        // Drop this element-edge clone; its descendants (if any) survive
        // via the BFS order — but element-edges in this metamodel don't
        // own children, so nothing else to do.
        continue;
      }
    }

    const clone = cloneElement(original, remap, inSubtree);
    clones.push(clone);
  }

  // 3. Clone real ModelEdges where both endpoints are in the subtree.
  const clonedEdges: ModelEdge[] = [];
  for (const edge of edges) {
    if (!inSubtree(edge.sourceId) || !inSubtree(edge.targetId)) continue;
    const cloned: ModelEdge = {
      ...edge,
      id: createEdgeId(),
      sourceId: remap(edge.sourceId),
      targetId: remap(edge.targetId),
    };
    clonedEdges.push(cloned);
  }

  return {
    rootCloneId: remap(root.id),
    elements: clones,
    edges: clonedEdges,
  };
}

/**
 * Produce a clone of `original` with a fresh id, remapped `ownerId` (when
 * the owner is in the subtree), and any field-based ElementId refs remapped
 * for in-subtree targets. Out-of-subtree refs are preserved.
 *
 * The clone's `ownerIndex` is preserved verbatim — children of a freshly
 * cloned parent will populate a brand-new bucket, so original indices stay
 * unique within the new bucket. The root clone's index is the caller's job.
 */
function cloneElement(
  original: ModelElement,
  remap: (id: ElementId) => ElementId,
  inSubtree: (id: ElementId) => boolean,
): ModelElement {
  const next: ModelElement = { ...original, id: remap(original.id) };
  if (next.ownerId !== null && inSubtree(next.ownerId)) {
    next.ownerId = remap(next.ownerId);
  }

  // Field-based ElementId refs. Only remap when the target lives in the
  // subtree; external refs survive unchanged.
  switch (next.kind) {
    case 'PartUsage':
    case 'PortUsage':
    case 'ConstraintUsage': {
      if (inSubtree(next.definitionId)) {
        next.definitionId = remap(next.definitionId);
      }
      break;
    }
    case 'ActionUsage':
    case 'StateUsage': {
      if (next.definitionId !== undefined && inSubtree(next.definitionId)) {
        next.definitionId = remap(next.definitionId);
      }
      break;
    }
    case 'PortDefinition': {
      if (next.interfaceId !== undefined && inSubtree(next.interfaceId)) {
        next.interfaceId = remap(next.interfaceId);
      }
      break;
    }
    case 'ConnectionUsage':
    case 'ItemFlow':
    case 'Transition': {
      // Endpoints are guaranteed in-subtree at the call site; remap both.
      next.sourceId = remap(next.sourceId);
      next.targetId = remap(next.targetId);
      break;
    }
    default:
      break;
  }

  return next;
}
