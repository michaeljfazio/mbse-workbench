import type { EdgeId, ElementId } from './id';

interface EdgeBase {
  readonly id: EdgeId;
  readonly sourceId: ElementId;
  readonly targetId: ElementId;
  label?: string;
}

export type RequirementTraceKind = 'satisfy' | 'verify' | 'derive' | 'refine';

export interface CompositionEdge extends EdgeBase {
  readonly kind: 'Composition';
}

export interface GeneralizationEdge extends EdgeBase {
  readonly kind: 'Generalization';
}

export interface RequirementTraceEdge extends EdgeBase {
  readonly kind: 'RequirementTrace';
  traceKind: RequirementTraceKind;
}

export interface ControlFlowEdge extends EdgeBase {
  readonly kind: 'ControlFlow';
  guard?: string;
}

export interface ObjectFlowEdge extends EdgeBase {
  readonly kind: 'ObjectFlow';
  itemType?: string;
}

export interface IncludeEdge extends EdgeBase {
  readonly kind: 'Include';
}

export interface ExtendEdge extends EdgeBase {
  readonly kind: 'Extend';
  extensionPoint?: string;
}

export interface ParameterBindingEdge extends EdgeBase {
  readonly kind: 'ParameterBinding';
}

export interface PackageImportEdge extends EdgeBase {
  readonly kind: 'PackageImport';
}

export type ModelEdge =
  | CompositionEdge
  | GeneralizationEdge
  | RequirementTraceEdge
  | ControlFlowEdge
  | ObjectFlowEdge
  | IncludeEdge
  | ExtendEdge
  | ParameterBindingEdge
  | PackageImportEdge;

export type EdgeKind = ModelEdge['kind'];

export const EDGE_KINDS: readonly EdgeKind[] = [
  'Composition',
  'Generalization',
  'RequirementTrace',
  'ControlFlow',
  'ObjectFlow',
  'Include',
  'Extend',
  'ParameterBinding',
  'PackageImport',
] as const;

export type EdgeOfKind<K extends EdgeKind> = Extract<ModelEdge, { kind: K }>;
