import type { ElementKind } from '@/model';

export interface KindLabel {
  readonly group: string;
  readonly singular: string;
}

const LABELS: Record<ElementKind, KindLabel> = {
  Package: { group: 'Packages', singular: 'Package' },
  PartDefinition: { group: 'Blocks', singular: 'Block' },
  PartUsage: { group: 'Parts', singular: 'Part' },
  PortDefinition: { group: 'Port definitions', singular: 'Port definition' },
  PortUsage: { group: 'Ports', singular: 'Port' },
  InterfaceDefinition: { group: 'Interfaces', singular: 'Interface' },
  ConnectionUsage: { group: 'Connections', singular: 'Connection' },
  ItemFlow: { group: 'Item flows', singular: 'Item flow' },
  Requirement: { group: 'Requirements', singular: 'Requirement' },
  ActionDefinition: { group: 'Action definitions', singular: 'Action definition' },
  ActionUsage: { group: 'Actions', singular: 'Action' },
  StateDefinition: { group: 'State definitions', singular: 'State definition' },
  StateUsage: { group: 'States', singular: 'State' },
  Transition: { group: 'Transitions', singular: 'Transition' },
  UseCase: { group: 'Use cases', singular: 'Use case' },
  Actor: { group: 'Actors', singular: 'Actor' },
  ConstraintDefinition: { group: 'Constraint definitions', singular: 'Constraint definition' },
  ConstraintUsage: { group: 'Constraints', singular: 'Constraint' },
  ValueProperty: { group: 'Value properties', singular: 'Value property' },
};

export function kindLabel(kind: ElementKind): KindLabel {
  return LABELS[kind];
}
