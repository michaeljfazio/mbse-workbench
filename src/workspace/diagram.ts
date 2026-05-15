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

// A diagram's context anchors it to the owning element whose internal
// structure it depicts. ADR 0011 widens this to a four-kind discriminated
// union so diagrams can hang off any container in the containment tree.
// Per JOURNAL iter-531 / T-13.30 every Diagram now has a context; the field
// is non-optional. Legacy diagrams that pre-date this rule are migrated to
// `{ kind: 'package', id: rootId }` by `migrateLegacyProject`.
export interface PackageDiagramContext {
  readonly kind: 'package';
  readonly id: ElementId;
}

export interface PartDefinitionDiagramContext {
  readonly kind: 'partDefinition';
  readonly id: ElementId;
}

export interface ActionDefinitionDiagramContext {
  readonly kind: 'actionDefinition';
  readonly id: ElementId;
}

export interface StateDefinitionDiagramContext {
  readonly kind: 'stateDefinition';
  readonly id: ElementId;
}

export type DiagramContext =
  | PackageDiagramContext
  | PartDefinitionDiagramContext
  | ActionDefinitionDiagramContext
  | StateDefinitionDiagramContext;

export type DiagramContextKind = DiagramContext['kind'];

export interface Diagram {
  readonly id: DiagramId;
  readonly viewpointId: ViewpointId;
  name: string;
  positions: Record<ElementId, NodePosition>;
  context: DiagramContext;
}
