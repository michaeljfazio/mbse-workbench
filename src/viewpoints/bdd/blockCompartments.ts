import type {
  ElementId,
  ModelElement,
  OwnerRole,
  ValueLiteral,
  ValueType,
} from '@/model';

export interface BddBlockCompartmentRegistry {
  get(id: ElementId): ModelElement | undefined;
  childrenOf(id: ElementId, role?: OwnerRole): readonly ModelElement[];
}

export interface BddBlockCompartmentItem {
  readonly id: ElementId;
  readonly label: string;
}

export interface BddBlockCompartment {
  readonly items: readonly BddBlockCompartmentItem[];
  readonly overflow: number;
}

export interface BddBlockCompartments {
  readonly parts: BddBlockCompartment;
  readonly ports: BddBlockCompartment;
  readonly values: BddBlockCompartment;
  readonly constraints: BddBlockCompartment;
}

export interface ComputeBddBlockCompartmentsOptions {
  readonly maxVisible?: number;
}

export const BDD_BLOCK_COMPARTMENT_DEFAULT_MAX_VISIBLE = 3;

const EMPTY: BddBlockCompartment = { items: [], overflow: 0 };

export function bddBlockEmptyCompartments(): BddBlockCompartments {
  return { parts: EMPTY, ports: EMPTY, values: EMPTY, constraints: EMPTY };
}

export function formatPartUsageLabel(
  name: string,
  definitionName: string | null,
): string {
  return definitionName ? `${name} : ${definitionName}` : name;
}

export function formatPortDefinitionLabel(name: string, direction: string): string {
  return `${name} : ${direction}`;
}

export function formatValuePropertyLabel(
  name: string,
  valueType: ValueType,
  defaultValue: ValueLiteral | undefined,
): string {
  if (defaultValue === undefined) return `${name} : ${valueType}`;
  const rendered =
    typeof defaultValue === 'string' ? `"${defaultValue}"` : String(defaultValue);
  return `${name} : ${valueType} = ${rendered}`;
}

export function formatConstraintUsageLabel(
  name: string,
  expression: string,
): string {
  const trimmed = expression.trim();
  return trimmed.length > 0 ? `${name} : ${trimmed}` : name;
}

function capCompartment(
  items: readonly BddBlockCompartmentItem[],
  maxVisible: number,
): BddBlockCompartment {
  if (items.length <= maxVisible) {
    return { items, overflow: 0 };
  }
  return {
    items: items.slice(0, maxVisible),
    overflow: items.length - maxVisible,
  };
}

export function computeBddBlockCompartments(
  partDefinitionId: ElementId,
  registry: BddBlockCompartmentRegistry,
  options: ComputeBddBlockCompartmentsOptions = {},
): BddBlockCompartments {
  const maxVisible =
    options.maxVisible ?? BDD_BLOCK_COMPARTMENT_DEFAULT_MAX_VISIBLE;

  const memberChildren = registry.childrenOf(partDefinitionId, 'member');
  const portChildren = registry.childrenOf(partDefinitionId, 'port');
  const propertyChildren = registry.childrenOf(partDefinitionId, 'property');

  const parts: BddBlockCompartmentItem[] = [];
  const constraints: BddBlockCompartmentItem[] = [];
  for (const child of memberChildren) {
    if (child.kind === 'PartUsage') {
      const def = registry.get(child.definitionId);
      const defName =
        def && def.kind === 'PartDefinition' ? def.name : null;
      parts.push({
        id: child.id,
        label: formatPartUsageLabel(child.name, defName),
      });
    } else if (child.kind === 'ConstraintUsage') {
      const def = registry.get(child.definitionId);
      const expression =
        def && def.kind === 'ConstraintDefinition' ? def.expression : '';
      constraints.push({
        id: child.id,
        label: formatConstraintUsageLabel(child.name, expression),
      });
    }
  }

  const ports: BddBlockCompartmentItem[] = [];
  for (const child of portChildren) {
    if (child.kind !== 'PortDefinition') continue;
    ports.push({
      id: child.id,
      label: formatPortDefinitionLabel(child.name, child.direction),
    });
  }

  const values: BddBlockCompartmentItem[] = [];
  for (const child of propertyChildren) {
    if (child.kind !== 'ValueProperty') continue;
    values.push({
      id: child.id,
      label: formatValuePropertyLabel(
        child.name,
        child.valueType,
        child.defaultValue,
      ),
    });
  }

  return {
    parts: capCompartment(parts, maxVisible),
    ports: capCompartment(ports, maxVisible),
    values: capCompartment(values, maxVisible),
    constraints: capCompartment(constraints, maxVisible),
  };
}
