/**
 * Shared element fixture factories for the ownerId/ownerRole/ownerIndex
 * containment schema (ADR 0011). Use these in tests/unit/** in place of
 * inline object literals so a future schema tweak is a one-file change.
 *
 * Defaults: every factory creates the element as a root-level orphan
 * (ownerId: null, ownerRole: 'member', ownerIndex: 0). Pass an overrides
 * object to set a different owner / role / index, or to override any
 * other field.
 */
import {
  createElementId,
  type ActionDefinitionElement,
  type ActionNodeType,
  type ActionUsageElement,
  type ActorElement,
  type ConnectionUsageElement,
  type ConstraintDefinitionElement,
  type ConstraintUsageElement,
  type ElementId,
  type InterfaceDefinitionElement,
  type ItemFlowElement,
  type OwnerRole,
  type PackageElement,
  type PartDefinitionElement,
  type PartUsageElement,
  type PortDefinitionElement,
  type PortDirection,
  type PortUsageElement,
  type RequirementElement,
  type RequirementPriority,
  type RequirementStatus,
  type StateDefinitionElement,
  type StateNodeType,
  type StateUsageElement,
  type TransitionElement,
  type UseCaseElement,
  type ValueLiteral,
  type ValuePropertyElement,
  type ValueType,
} from '@/model';

interface OwnerOverrides {
  id?: ElementId;
  ownerId?: ElementId | null;
  ownerRole?: OwnerRole;
  ownerIndex?: number;
  documentation?: string;
}

function base<T>(name: string, overrides: OwnerOverrides | undefined, rest: T) {
  return {
    id: overrides?.id ?? createElementId(),
    name,
    ownerId: overrides?.ownerId ?? null,
    ownerRole: overrides?.ownerRole ?? ('member' as OwnerRole),
    ownerIndex: overrides?.ownerIndex ?? 0,
    ...(overrides?.documentation !== undefined
      ? { documentation: overrides.documentation }
      : {}),
    ...rest,
  };
}

export function pkg(
  name: string,
  overrides?: OwnerOverrides,
): PackageElement {
  return base(name, overrides, { kind: 'Package' as const });
}

export function partDef(
  name: string,
  overrides?: OwnerOverrides & { isAbstract?: boolean },
): PartDefinitionElement {
  return base(name, overrides, {
    kind: 'PartDefinition' as const,
    isAbstract: overrides?.isAbstract ?? false,
  });
}

export function partUsage(
  name: string,
  definitionId: ElementId,
  overrides?: OwnerOverrides & { multiplicity?: string },
): PartUsageElement {
  return base(name, overrides, {
    kind: 'PartUsage' as const,
    definitionId,
    ...(overrides?.multiplicity !== undefined
      ? { multiplicity: overrides.multiplicity }
      : {}),
  });
}

export function portDef(
  name: string,
  overrides?: OwnerOverrides & { direction?: PortDirection; interfaceId?: ElementId },
): PortDefinitionElement {
  return base(name, overrides, {
    kind: 'PortDefinition' as const,
    direction: overrides?.direction ?? 'inout',
    ...(overrides?.interfaceId !== undefined
      ? { interfaceId: overrides.interfaceId }
      : {}),
  });
}

export function portUsage(
  name: string,
  definitionId: ElementId,
  overrides?: OwnerOverrides,
): PortUsageElement {
  return base(name, overrides, {
    kind: 'PortUsage' as const,
    definitionId,
  });
}

export function interfaceDef(
  name: string,
  overrides?: OwnerOverrides,
): InterfaceDefinitionElement {
  return base(name, overrides, { kind: 'InterfaceDefinition' as const });
}

export function connectionUsage(
  name: string,
  sourceId: ElementId,
  targetId: ElementId,
  overrides?: OwnerOverrides,
): ConnectionUsageElement {
  return base(name, overrides, {
    kind: 'ConnectionUsage' as const,
    sourceId,
    targetId,
  });
}

export function itemFlow(
  name: string,
  sourceId: ElementId,
  targetId: ElementId,
  overrides?: OwnerOverrides & { itemType?: string },
): ItemFlowElement {
  return base(name, overrides, {
    kind: 'ItemFlow' as const,
    sourceId,
    targetId,
    ...(overrides?.itemType !== undefined
      ? { itemType: overrides.itemType }
      : {}),
  });
}

export function requirement(
  name: string,
  overrides?: OwnerOverrides & {
    text?: string;
    reqId?: string;
    priority?: RequirementPriority;
    status?: RequirementStatus;
    rationale?: string;
  },
): RequirementElement {
  return base(name, overrides, {
    kind: 'Requirement' as const,
    text: overrides?.text ?? '',
    priority: overrides?.priority ?? ('medium' as RequirementPriority),
    status: overrides?.status ?? ('draft' as RequirementStatus),
    ...(overrides?.reqId !== undefined ? { reqId: overrides.reqId } : {}),
    ...(overrides?.rationale !== undefined
      ? { rationale: overrides.rationale }
      : {}),
  });
}

export function actionDef(
  name: string,
  overrides?: OwnerOverrides,
): ActionDefinitionElement {
  return base(name, overrides, { kind: 'ActionDefinition' as const });
}

export function actionUsage(
  name: string,
  overrides?: OwnerOverrides & {
    definitionId?: ElementId;
    nodeType?: ActionNodeType;
  },
): ActionUsageElement {
  return base(name, overrides, {
    kind: 'ActionUsage' as const,
    nodeType: overrides?.nodeType ?? 'action',
    ...(overrides?.definitionId !== undefined
      ? { definitionId: overrides.definitionId }
      : {}),
  });
}

export function stateDef(
  name: string,
  overrides?: OwnerOverrides & { isComposite?: boolean },
): StateDefinitionElement {
  return base(name, overrides, {
    kind: 'StateDefinition' as const,
    isComposite: overrides?.isComposite ?? false,
  });
}

export function stateUsage(
  name: string,
  overrides?: OwnerOverrides & {
    definitionId?: ElementId;
    stateType?: StateNodeType;
    entryAction?: string;
    exitAction?: string;
    doAction?: string;
  },
): StateUsageElement {
  return base(name, overrides, {
    kind: 'StateUsage' as const,
    stateType: overrides?.stateType ?? 'state',
    ...(overrides?.definitionId !== undefined
      ? { definitionId: overrides.definitionId }
      : {}),
    ...(overrides?.entryAction !== undefined
      ? { entryAction: overrides.entryAction }
      : {}),
    ...(overrides?.exitAction !== undefined
      ? { exitAction: overrides.exitAction }
      : {}),
    ...(overrides?.doAction !== undefined
      ? { doAction: overrides.doAction }
      : {}),
  });
}

export function transition(
  name: string,
  sourceId: ElementId,
  targetId: ElementId,
  overrides?: OwnerOverrides & {
    trigger?: string;
    guard?: string;
    effect?: string;
  },
): TransitionElement {
  return base(name, overrides, {
    kind: 'Transition' as const,
    sourceId,
    targetId,
    ...(overrides?.trigger !== undefined ? { trigger: overrides.trigger } : {}),
    ...(overrides?.guard !== undefined ? { guard: overrides.guard } : {}),
    ...(overrides?.effect !== undefined ? { effect: overrides.effect } : {}),
  });
}

export function useCase(
  name: string,
  overrides?: OwnerOverrides & { text?: string },
): UseCaseElement {
  return base(name, overrides, {
    kind: 'UseCase' as const,
    ...(overrides?.text !== undefined ? { text: overrides.text } : {}),
  });
}

export function actor(name: string, overrides?: OwnerOverrides): ActorElement {
  return base(name, overrides, { kind: 'Actor' as const });
}

export function constraintDef(
  name: string,
  overrides?: OwnerOverrides & { expression?: string },
): ConstraintDefinitionElement {
  return base(name, overrides, {
    kind: 'ConstraintDefinition' as const,
    expression: overrides?.expression ?? '',
  });
}

export function constraintUsage(
  name: string,
  definitionId: ElementId,
  overrides?: OwnerOverrides,
): ConstraintUsageElement {
  return base(name, overrides, {
    kind: 'ConstraintUsage' as const,
    definitionId,
  });
}

export function valueProperty(
  name: string,
  overrides?: OwnerOverrides & {
    valueType?: ValueType;
    defaultValue?: ValueLiteral;
  },
): ValuePropertyElement {
  return base(name, overrides, {
    kind: 'ValueProperty' as const,
    valueType: overrides?.valueType ?? 'string',
    ...(overrides?.defaultValue !== undefined
      ? { defaultValue: overrides.defaultValue }
      : {}),
  });
}
