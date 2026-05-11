import type { ElementId } from '@/model';
import type { ViewpointId } from '@/viewpoints';

export type DiagramId = string & { readonly __brand: 'DiagramId' };

export function createDiagramId(): DiagramId {
  return crypto.randomUUID() as DiagramId;
}

export interface NodePosition {
  readonly x: number;
  readonly y: number;
}

export interface Diagram {
  readonly id: DiagramId;
  readonly viewpointId: ViewpointId;
  name: string;
  positions: Record<ElementId, NodePosition>;
}
