import type { ElementId, UserId } from './id';

interface ElementBase {
  readonly id: ElementId;
  readonly ownerId?: UserId;
  name: string;
  documentation?: string;
}

export type RequirementPriority = 'low' | 'medium' | 'high' | 'critical';

export type RequirementStatus =
  | 'draft'
  | 'approved'
  | 'implemented'
  | 'verified'
  | 'rejected';

export type PortDirection = 'in' | 'out' | 'inout';

export type ActionNodeType =
  | 'action'
  | 'initial'
  | 'final'
  | 'fork'
  | 'join'
  | 'decision'
  | 'merge';

export const ACTION_NODE_TYPE_VALUES: readonly ActionNodeType[] = [
  'action',
  'initial',
  'final',
  'fork',
  'join',
  'decision',
  'merge',
] as const;

export function isActionNodeType(value: unknown): value is ActionNodeType {
  return (
    typeof value === 'string' &&
    (ACTION_NODE_TYPE_VALUES as readonly string[]).includes(value)
  );
}

export type StateNodeType = 'state' | 'initial' | 'final';

export type ValueType = 'string' | 'number' | 'boolean';

export type ValueLiteral = string | number | boolean;

export interface PackageElement extends ElementBase {
  readonly kind: 'Package';
  memberIds: ElementId[];
}

export interface PartDefinitionElement extends ElementBase {
  readonly kind: 'PartDefinition';
  isAbstract: boolean;
  propertyIds: ElementId[];
  portIds: ElementId[];
}

export interface PartUsageElement extends ElementBase {
  readonly kind: 'PartUsage';
  definitionId: ElementId;
  // PortUsages exposed by this PartUsage. One per PortDefinition on the
  // underlying PartDefinition. Mirrors the PartDefinition.portIds shape so
  // IBD rendering can deterministically resolve handles to their PortUsages.
  portUsageIds: ElementId[];
  multiplicity?: string;
}

export interface PortDefinitionElement extends ElementBase {
  readonly kind: 'PortDefinition';
  direction: PortDirection;
  interfaceId?: ElementId;
}

export interface PortUsageElement extends ElementBase {
  readonly kind: 'PortUsage';
  definitionId: ElementId;
}

export interface InterfaceDefinitionElement extends ElementBase {
  readonly kind: 'InterfaceDefinition';
  portDefinitionIds: ElementId[];
}

export interface ConnectionUsageElement extends ElementBase {
  readonly kind: 'ConnectionUsage';
  sourceId: ElementId;
  targetId: ElementId;
}

export interface ItemFlowElement extends ElementBase {
  readonly kind: 'ItemFlow';
  sourceId: ElementId;
  targetId: ElementId;
  itemType?: string;
}

export interface RequirementElement extends ElementBase {
  readonly kind: 'Requirement';
  text: string;
  reqId?: string;
  priority: RequirementPriority;
  status: RequirementStatus;
  rationale?: string;
}

export interface ActionDefinitionElement extends ElementBase {
  readonly kind: 'ActionDefinition';
  parameterIds: ElementId[];
}

export interface ActionUsageElement extends ElementBase {
  readonly kind: 'ActionUsage';
  definitionId?: ElementId;
  nodeType: ActionNodeType;
}

export interface StateDefinitionElement extends ElementBase {
  readonly kind: 'StateDefinition';
  isComposite: boolean;
}

export interface StateUsageElement extends ElementBase {
  readonly kind: 'StateUsage';
  definitionId?: ElementId;
  stateType: StateNodeType;
  entryAction?: string;
  exitAction?: string;
  doAction?: string;
}

export interface TransitionElement extends ElementBase {
  readonly kind: 'Transition';
  sourceId: ElementId;
  targetId: ElementId;
  trigger?: string;
  guard?: string;
  effect?: string;
}

export interface UseCaseElement extends ElementBase {
  readonly kind: 'UseCase';
  text?: string;
}

export interface ActorElement extends ElementBase {
  readonly kind: 'Actor';
}

export interface ConstraintDefinitionElement extends ElementBase {
  readonly kind: 'ConstraintDefinition';
  expression: string;
  parameterIds: ElementId[];
}

export interface ConstraintUsageElement extends ElementBase {
  readonly kind: 'ConstraintUsage';
  definitionId: ElementId;
}

export interface ValuePropertyElement extends ElementBase {
  readonly kind: 'ValueProperty';
  valueType: ValueType;
  defaultValue?: ValueLiteral;
}

export type ModelElement =
  | PackageElement
  | PartDefinitionElement
  | PartUsageElement
  | PortDefinitionElement
  | PortUsageElement
  | InterfaceDefinitionElement
  | ConnectionUsageElement
  | ItemFlowElement
  | RequirementElement
  | ActionDefinitionElement
  | ActionUsageElement
  | StateDefinitionElement
  | StateUsageElement
  | TransitionElement
  | UseCaseElement
  | ActorElement
  | ConstraintDefinitionElement
  | ConstraintUsageElement
  | ValuePropertyElement;

export type ElementKind = ModelElement['kind'];

export const ELEMENT_KINDS: readonly ElementKind[] = [
  'Package',
  'PartDefinition',
  'PartUsage',
  'PortDefinition',
  'PortUsage',
  'InterfaceDefinition',
  'ConnectionUsage',
  'ItemFlow',
  'Requirement',
  'ActionDefinition',
  'ActionUsage',
  'StateDefinition',
  'StateUsage',
  'Transition',
  'UseCase',
  'Actor',
  'ConstraintDefinition',
  'ConstraintUsage',
  'ValueProperty',
] as const;

export type ElementOfKind<K extends ElementKind> = Extract<ModelElement, { kind: K }>;
