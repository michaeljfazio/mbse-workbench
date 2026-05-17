import type { Diagram, DiagramId } from '@/workspace/diagram';

// Port the command bus uses to read and mutate the project's diagrams list.
// The workspace store implements this on top of its `diagrams` slice; tests
// (and the destructive-coverage assertions) can substitute an in-memory map.
//
// `clearActiveDiagramIfMatches` exists so `delete-diagram` can reconcile the
// active-tab pointer without the bus having to import workspace UI state.
// See #413 / ADR 0014.
export interface DiagramStore {
  getDiagram(id: DiagramId): Diagram | undefined;
  addDiagram(diagram: Diagram): void;
  removeDiagram(id: DiagramId): void;
  clearActiveDiagramIfMatches(id: DiagramId): void;
}

export function createInMemoryDiagramStore(): DiagramStore & {
  list(): readonly Diagram[];
  activeDiagramId: DiagramId | null;
} {
  const map = new Map<DiagramId, Diagram>();
  // Insertion order is preserved by Map; .values() iterates in that order so
  // list() matches the workspace's array ordering.
  let activeDiagramId: DiagramId | null = null;
  return {
    getDiagram(id) {
      return map.get(id);
    },
    addDiagram(diagram) {
      map.set(diagram.id, diagram);
    },
    removeDiagram(id) {
      map.delete(id);
    },
    clearActiveDiagramIfMatches(id) {
      if (activeDiagramId === id) activeDiagramId = null;
    },
    list() {
      return Array.from(map.values());
    },
    get activeDiagramId() {
      return activeDiagramId;
    },
    set activeDiagramId(next: DiagramId | null) {
      activeDiagramId = next;
    },
  };
}
