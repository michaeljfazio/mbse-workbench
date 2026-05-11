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

// Per ADR 0003: an IBD diagram is associated with exactly one PartDefinition.
// BDD diagrams leave `context` `undefined`.
export interface PartDefinitionDiagramContext {
  readonly kind: 'partDefinition';
  readonly id: ElementId;
}

export type DiagramContext = PartDefinitionDiagramContext;

export interface Diagram {
  readonly id: DiagramId;
  readonly viewpointId: ViewpointId;
  name: string;
  positions: Record<ElementId, NodePosition>;
  context?: DiagramContext;
}
