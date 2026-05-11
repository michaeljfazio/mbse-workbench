import type { ViewpointId } from '@/viewpoints';

export type DiagramId = string & { readonly __brand: 'DiagramId' };

export function createDiagramId(): DiagramId {
  return crypto.randomUUID() as DiagramId;
}

export interface Diagram {
  readonly id: DiagramId;
  readonly viewpointId: ViewpointId;
  name: string;
}
