import type {
  EdgeId,
  ElementId,
  ElementKind,
  ElementPatch,
  ModelEdge,
  ModelElement,
} from '@/model';

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
  | CompoundCommand;

export type CommandKind = Command['kind'];
