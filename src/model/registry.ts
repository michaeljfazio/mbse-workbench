import type { ModelEdge } from './edges';
import type { ElementKind, ElementOfKind, ModelElement } from './elements';
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

export interface ElementRegistry {
  add(element: ModelElement): void;
  addEdge(edge: ModelEdge): void;
  get(id: ElementId): ModelElement | undefined;
  getEdge(id: EdgeId): ModelEdge | undefined;
  remove(id: ElementId): void;
  removeEdge(id: EdgeId): void;
  update<K extends ElementKind>(id: ElementId, patch: ElementPatch<K>): void;
  elements(): readonly ModelElement[];
  edges(): readonly ModelEdge[];
  checkIntegrity(): IntegrityResult;
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

function hasEndpoints(element: ModelElement): element is ElementWithEndpoints {
  return ELEMENT_EDGE_KINDS.has(element.kind);
}

export function createElementRegistry(): ElementRegistry {
  const elements = new Map<ElementId, ModelElement>();
  const edges = new Map<EdgeId, ModelEdge>();

  return {
    add(element) {
      if (elements.has(element.id)) {
        throw new Error(`duplicate element id: ${element.id}`);
      }
      elements.set(element.id, element);
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
      for (const key of Object.keys(patch)) {
        if (key === 'id' || key === 'kind') {
          throw new Error(`update patch must not contain ${key}`);
        }
        if (!(key in existing)) {
          throw new Error(
            `update kind mismatch: element ${id} is ${existing.kind}, ` +
              `but patch field "${key}" is not part of that kind`,
          );
        }
      }
      // Replace with a new object so prior snapshots stay frozen in time.
      const updated = { ...existing, ...patch } as ModelElement;
      elements.set(id, updated);
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
  };
}
