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

export interface AggregationEdge extends EdgeBase {
  readonly kind: 'Aggregation';
}

export interface GeneralizationEdge extends EdgeBase {
  readonly kind: 'Generalization';
}

export interface AssociationEdge extends EdgeBase {
  readonly kind: 'Association';
  // SysML 1.x §9.4: each association end may carry a multiplicity
  // (e.g. `1`, `0..1`, `0..*`, `1..*`). Stored verbatim with no validation
  // — future spec (#434 follow-up) may constrain to a multiplicity grammar.
  // Empty/undefined renders blank, matching the pre-#434 plain-line edge.
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
}

export interface DependencyEdge extends EdgeBase {
  readonly kind: 'Dependency';
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
  | AggregationEdge
  | GeneralizationEdge
  | AssociationEdge
  | DependencyEdge
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
  'Aggregation',
  'Generalization',
  'Association',
  'Dependency',
  'RequirementTrace',
  'ControlFlow',
  'ObjectFlow',
  'Include',
  'Extend',
  'ParameterBinding',
  'PackageImport',
] as const;

export type EdgeOfKind<K extends EdgeKind> = Extract<ModelEdge, { kind: K }>;
