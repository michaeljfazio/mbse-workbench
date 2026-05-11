import type { ElementId } from '@/model';
import type { DiagramId, NodePosition } from '@/workspace/diagram';

// Port the command bus uses to read and write per-diagram element positions.
// The workspace store implements this on top of its diagrams array; tests can
// substitute an in-memory map.
export interface DiagramPositionStore {
  getPosition(diagramId: DiagramId, elementId: ElementId): NodePosition | undefined;
  setPosition(
    diagramId: DiagramId,
    elementId: ElementId,
    position: NodePosition | undefined,
  ): void;
}

export function createInMemoryDiagramPositionStore(): DiagramPositionStore {
  const map = new Map<DiagramId, Map<ElementId, NodePosition>>();
  return {
    getPosition(diagramId, elementId) {
      return map.get(diagramId)?.get(elementId);
    },
    setPosition(diagramId, elementId, position) {
      let inner = map.get(diagramId);
      if (!inner) {
        inner = new Map();
        map.set(diagramId, inner);
      }
      if (position === undefined) {
        inner.delete(elementId);
      } else {
        inner.set(elementId, position);
      }
    },
  };
}
