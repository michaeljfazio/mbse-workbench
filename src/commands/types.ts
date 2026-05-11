import type {
  EdgeId,
  EdgeKind,
  EdgePatch,
  ElementId,
  ElementKind,
  ElementPatch,
  ModelEdge,
  ModelElement,
} from '@/model';

import type { DiagramId, NodePosition } from '@/workspace/diagram';

export interface CreateElementCommand {
  readonly kind: 'create-element';
  readonly element: ModelElement;
}

export interface UpdateElementCommand<K extends ElementKind = ElementKind> {
  readonly kind: 'update-element';
  readonly id: ElementId;
  readonly patch: ElementPatch<K>;
}

export interface DeleteElementCommand {
  readonly kind: 'delete-element';
  readonly id: ElementId;
}

export interface LinkCommand {
  readonly kind: 'link';
  readonly edge: ModelEdge;
}

export interface UnlinkCommand {
  readonly kind: 'unlink';
  readonly id: EdgeId;
}

export interface UpdateEdgeCommand<K extends EdgeKind = EdgeKind> {
  readonly kind: 'update-edge';
  readonly id: EdgeId;
  readonly patch: EdgePatch<K>;
}

export interface UpdateDiagramPositionCommand {
  readonly kind: 'update-diagram-position';
  readonly diagramId: DiagramId;
  readonly elementId: ElementId;
  // `undefined` removes the position entry from the diagram. This is required
  // so the inverse of "set a position where there was none" can clear cleanly.
  readonly position: NodePosition | undefined;
}

export interface CompoundCommand {
  readonly kind: 'compound';
  readonly commands: readonly Command[];
}

export type Command =
  | CreateElementCommand
  | UpdateElementCommand
  | DeleteElementCommand
  | LinkCommand
  | UnlinkCommand
  | UpdateEdgeCommand
  | UpdateDiagramPositionCommand
  | CompoundCommand;

export type CommandKind = Command['kind'];
