import type { EdgeId, ElementId } from './id';

/**
 * Per-edge routing style. When absent, each edge component falls back to its
 * kind-default (see `edgePath.ts` `defaultRoutingStyleForKind`). Setting an
 * explicit value overrides the kind default and persists across JSON round-trips.
 *
 * Refs #564
 */
export type EdgeRoutingStyle = 'straight' | 'step' | 'smooth-step' | 'bezier';

/**
 * Per-edge stroke style. When absent, each edge component falls back to its
 * kind-default (dashed for Dependency / RequirementTrace / Include / Extend /
 * PackageImport; solid for all others). Setting an explicit value overrides the
 * kind default and persists across JSON round-trips.
 *
 * SysML 1.5 Table 8.4 / v2 §7.13: line style is load-bearing semantics for
 * several edge kinds. The default per kind already encodes the SysML convention;
 * this optional field lets a user deviate (e.g. highlight a dependency with a
 * solid line for an impact-analysis diagram).
 *
 * Refs #566
 */
export type EdgeStrokeStyle = 'solid' | 'dashed' | 'dotted';

interface EdgeBase {
  readonly id: EdgeId;
  readonly sourceId: ElementId;
  readonly targetId: ElementId;
  label?: string;
  /** Optional per-edge routing style. Absent = kind default. Refs #564. */
  routingStyle?: EdgeRoutingStyle;
  /** Optional per-edge stroke style. Absent = kind default. Refs #566. */
  strokeStyle?: EdgeStrokeStyle;
  /** Optional per-edge stroke color as a CSS color string. Absent = currentColor. Refs #566. */
  strokeColor?: string;
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
