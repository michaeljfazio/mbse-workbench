import type { EdgeKind, EdgeOfKind, ModelEdge } from './edges';
import type {
  ElementKind,
  ElementOfKind,
  ModelElement,
  OwnerRole,
} from './elements';
import type { EdgeId, ElementId } from './id';

export type EndpointRole = 'source' | 'target';

export interface DanglingEdgeFinding {
  readonly edgeId: EdgeId;
  readonly missingId: ElementId;
  readonly role: EndpointRole;
}

export interface DanglingElementRefFinding {
  readonly elementId: ElementId;
  readonly missingId: ElementId;
  readonly role: EndpointRole;
}

export interface IntegrityResult {
  readonly duplicateElementIds: readonly ElementId[];
  readonly duplicateEdgeIds: readonly EdgeId[];
  readonly danglingEdges: readonly DanglingEdgeFinding[];
  readonly danglingElementRefs: readonly DanglingElementRefFinding[];
}

export type ElementPatch<K extends ElementKind> = Partial<
  Omit<ElementOfKind<K>, 'id' | 'kind'>
>;

// Edge patches forbid changing endpoints because rewriting a graph edge's
// source/target is structurally a different operation (unlink + re-link).
// Label and per-kind optional fields are fair game.
export type EdgePatch<K extends EdgeKind> = Partial<
  Omit<EdgeOfKind<K>, 'id' | 'kind' | 'sourceId' | 'targetId'>
>;

export interface ElementRegistry {
  add(element: ModelElement): void;
  addEdge(edge: ModelEdge): void;
  get(id: ElementId): ModelElement | undefined;
  getEdge(id: EdgeId): ModelEdge | undefined;
  remove(id: ElementId): void;
  removeEdge(id: EdgeId): void;
  update<K extends ElementKind>(id: ElementId, patch: ElementPatch<K>): void;
  updateEdge<K extends EdgeKind>(id: EdgeId, patch: EdgePatch<K>): void;
  elements(): readonly ModelElement[];
  edges(): readonly ModelEdge[];
  checkIntegrity(): IntegrityResult;
  /**
   * Containment parent of `id`, or `undefined` if `id` has no owner (i.e. the
   * project's root Package) or is not in the registry. O(1). See ADR 0011.
   */
  parentOf(id: ElementId): ModelElement | undefined;
  /**
   * Children of `id` under containment, sorted by `ownerIndex` ascending.
   * Pass `role` to filter to a single OwnerRole slot. O(k) where k is the
   * number of children. See ADR 0011.
   */
  childrenOf(id: ElementId, role?: OwnerRole): readonly ModelElement[];
}

type ElementWithEndpoints = Extract<
  ModelElement,
  { sourceId: ElementId; targetId: ElementId }
>;

const ELEMENT_EDGE_KINDS = new Set<ElementKind>([
  'ConnectionUsage',
  'ItemFlow',
  'Transition',
]);

// Optional fields defined on ElementBase. They are valid on every element
// kind, but the instance may not carry the property if it was never set.
// The update guard whitelists them so a first-time assignment is not
// mistaken for a kind mismatch.
const ELEMENT_BASE_OPTIONAL_FIELDS = new Set<string>(['ownerId', 'documentation']);

// Per-kind optional fields: ElementBase optionals already cover documentation
// and ownerId; this table covers kind-specific optional fields so a first-time
// patch on a freshly-created element (that omitted the field) is accepted.
// Keeping this explicit avoids a runtime introspection of the discriminated
// union types and stays in sync with the TypeScript definitions.
// Edge-kind optional fields: forbid sourceId/targetId/id/kind changes, allow
// per-kind optionals plus the shared `label`. Same intent as
// KIND_OPTIONAL_FIELDS for elements.
const EDGE_KIND_OPTIONAL_FIELDS: Partial<
  Record<EdgeKind, ReadonlySet<string>>
> = {
  // Association multiplicities are SysML 1.x §9.4 optionals — first-time
  // patch on an Association edge created before #434 must be accepted.
  Association: new Set(['sourceMultiplicity', 'targetMultiplicity']),
  ControlFlow: new Set(['guard']),
  ObjectFlow: new Set(['itemType']),
  Extend: new Set(['extensionPoint']),
};

// `label` is on EdgeBase and is valid for every edge kind, but the instance
// may not carry the property if it was never set — same shape as
// ELEMENT_BASE_OPTIONAL_FIELDS for elements.
const EDGE_BASE_OPTIONAL_FIELDS = new Set<string>(['label']);

const KIND_OPTIONAL_FIELDS: Partial<
  Record<ElementKind, ReadonlySet<string>>
> = {
  PartUsage: new Set(['multiplicity']),
  PortDefinition: new Set(['interfaceId']),
  ActionUsage: new Set(['definitionId']),
  StateUsage: new Set(['definitionId', 'entryAction', 'exitAction', 'doAction']),
  Transition: new Set(['trigger', 'guard', 'effect']),
  UseCase: new Set(['text']),
  Requirement: new Set(['reqId', 'rationale']),
  ItemFlow: new Set(['itemType']),
  ValueProperty: new Set(['defaultValue']),
};

function hasEndpoints(element: ModelElement): element is ElementWithEndpoints {
  return ELEMENT_EDGE_KINDS.has(element.kind);
}

export function createElementRegistry(): ElementRegistry {
  const elements = new Map<ElementId, ModelElement>();
  const edges = new Map<EdgeId, ModelEdge>();
  // ownerId -> children. Maintained alongside `elements`. Insertion order is
  // not significant; consumers sort by `ownerIndex` on read. Null owner
  // (root) lives under a sentinel key.
  const childrenByOwner = new Map<ElementId | null, Set<ElementId>>();

  function indexAdd(element: ModelElement): void {
    const owner = element.ownerId;
    let bucket = childrenByOwner.get(owner);
    if (!bucket) {
      bucket = new Set<ElementId>();
      childrenByOwner.set(owner, bucket);
    }
    bucket.add(element.id);
  }

  function indexRemove(element: ModelElement): void {
    const bucket = childrenByOwner.get(element.ownerId);
    if (!bucket) return;
    bucket.delete(element.id);
    if (bucket.size === 0) childrenByOwner.delete(element.ownerId);
  }

  return {
    add(element) {
      if (elements.has(element.id)) {
        throw new Error(`duplicate element id: ${element.id}`);
      }
      elements.set(element.id, element);
      indexAdd(element);
    },

    addEdge(edge) {
      if (edges.has(edge.id)) {
        throw new Error(`duplicate edge id: ${edge.id}`);
      }
      if (!elements.has(edge.sourceId)) {
        throw new Error(
          `edge ${edge.id} has unknown source endpoint: ${edge.sourceId}`,
        );
      }
      if (!elements.has(edge.targetId)) {
        throw new Error(
          `edge ${edge.id} has unknown target endpoint: ${edge.targetId}`,
        );
      }
      edges.set(edge.id, edge);
    },

    get(id) {
      return elements.get(id);
    },

    getEdge(id) {
      return edges.get(id);
    },

    remove(id) {
      const existing = elements.get(id);
      if (existing) indexRemove(existing);
      elements.delete(id);
      for (const [edgeId, edge] of edges) {
        if (edge.sourceId === id || edge.targetId === id) {
          edges.delete(edgeId);
        }
      }
    },

    removeEdge(id) {
      edges.delete(id);
    },

    update(id, patch) {
      const existing = elements.get(id);
      if (!existing) {
        throw new Error(`update target not found: ${id}`);
      }
      // Detect a kind mismatch by checking that every patch field
      // exists on the stored element. Caller-chosen K could be wrong
      // (TS cannot infer it from a runtime id), so we verify here.
      const kindOptional = KIND_OPTIONAL_FIELDS[existing.kind];
      for (const key of Object.keys(patch)) {
        if (key === 'id' || key === 'kind') {
          throw new Error(`update patch must not contain ${key}`);
        }
        if (
          !(key in existing) &&
          !ELEMENT_BASE_OPTIONAL_FIELDS.has(key) &&
          !(kindOptional?.has(key) ?? false)
        ) {
          throw new Error(
            `update kind mismatch: element ${id} is ${existing.kind}, ` +
              `but patch field "${key}" is not part of that kind`,
          );
        }
      }
      // Replace with a new object so prior snapshots stay frozen in time.
      const updated = { ...existing, ...patch } as ModelElement;
      // Owner relocation: keep the containment index consistent if the
      // patch reparented this element.
      if (existing.ownerId !== updated.ownerId) {
        indexRemove(existing);
        indexAdd(updated);
      }
      elements.set(id, updated);
    },

    updateEdge(id, patch) {
      const existing = edges.get(id);
      if (!existing) {
        throw new Error(`update edge target not found: ${id}`);
      }
      const kindOptional = EDGE_KIND_OPTIONAL_FIELDS[existing.kind];
      for (const key of Object.keys(patch)) {
        if (
          key === 'id' ||
          key === 'kind' ||
          key === 'sourceId' ||
          key === 'targetId'
        ) {
          throw new Error(`update edge patch must not contain ${key}`);
        }
        if (
          !(key in existing) &&
          !EDGE_BASE_OPTIONAL_FIELDS.has(key) &&
          !(kindOptional?.has(key) ?? false)
        ) {
          throw new Error(
            `update edge kind mismatch: edge ${id} is ${existing.kind}, ` +
              `but patch field "${key}" is not part of that kind`,
          );
        }
      }
      const updated = { ...existing, ...patch } as ModelEdge;
      edges.set(id, updated);
    },

    elements() {
      return Array.from(elements.values());
    },

    edges() {
      return Array.from(edges.values());
    },

    checkIntegrity() {
      const elementIds = new Set<ElementId>();
      const duplicateElementIds: ElementId[] = [];
      for (const element of elements.values()) {
        if (elementIds.has(element.id)) {
          duplicateElementIds.push(element.id);
        } else {
          elementIds.add(element.id);
        }
      }

      const edgeIds = new Set<EdgeId>();
      const duplicateEdgeIds: EdgeId[] = [];
      for (const edge of edges.values()) {
        if (edgeIds.has(edge.id)) {
          duplicateEdgeIds.push(edge.id);
        } else {
          edgeIds.add(edge.id);
        }
      }

      const danglingEdges: DanglingEdgeFinding[] = [];
      for (const edge of edges.values()) {
        if (!elements.has(edge.sourceId)) {
          danglingEdges.push({
            edgeId: edge.id,
            missingId: edge.sourceId,
            role: 'source',
          });
        }
        if (!elements.has(edge.targetId)) {
          danglingEdges.push({
            edgeId: edge.id,
            missingId: edge.targetId,
            role: 'target',
          });
        }
      }

      const danglingElementRefs: DanglingElementRefFinding[] = [];
      for (const element of elements.values()) {
        if (!hasEndpoints(element)) continue;
        if (!elements.has(element.sourceId)) {
          danglingElementRefs.push({
            elementId: element.id,
            missingId: element.sourceId,
            role: 'source',
          });
        }
        if (!elements.has(element.targetId)) {
          danglingElementRefs.push({
            elementId: element.id,
            missingId: element.targetId,
            role: 'target',
          });
        }
      }

      return {
        duplicateElementIds,
        duplicateEdgeIds,
        danglingEdges,
        danglingElementRefs,
      };
    },

    parentOf(id) {
      const element = elements.get(id);
      if (!element || element.ownerId === null) return undefined;
      return elements.get(element.ownerId);
    },

    childrenOf(id, role) {
      const bucket = childrenByOwner.get(id);
      if (!bucket) return [];
      const out: ModelElement[] = [];
      for (const childId of bucket) {
        const child = elements.get(childId);
        if (!child) continue;
        if (role !== undefined && child.ownerRole !== role) continue;
        out.push(child);
      }
      out.sort((a, b) => a.ownerIndex - b.ownerIndex);
      return out;
    },
  };
}
