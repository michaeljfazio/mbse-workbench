import type { ElementKind } from '@/model';
import type { OwnerRole } from '@/model/elements';

export interface ChildKindOption {
  readonly kind: ElementKind;
  readonly ownerRole: OwnerRole;
  readonly label: string;
}

const PACKAGE_CHILDREN: readonly ChildKindOption[] = [
  { kind: 'Package', ownerRole: 'member', label: 'Package' },
  { kind: 'PartDefinition', ownerRole: 'member', label: 'Part Definition' },
  { kind: 'InterfaceDefinition', ownerRole: 'member', label: 'Interface Definition' },
  { kind: 'PortDefinition', ownerRole: 'member', label: 'Port Definition' },
  { kind: 'ActionDefinition', ownerRole: 'member', label: 'Action Definition' },
  { kind: 'StateDefinition', ownerRole: 'member', label: 'State Definition' },
  { kind: 'ConstraintDefinition', ownerRole: 'member', label: 'Constraint Definition' },
  { kind: 'Requirement', ownerRole: 'member', label: 'Requirement' },
  { kind: 'Actor', ownerRole: 'member', label: 'Actor' },
  { kind: 'UseCase', ownerRole: 'member', label: 'Use Case' },
];

const PART_DEFINITION_CHILDREN: readonly ChildKindOption[] = [
  { kind: 'PortDefinition', ownerRole: 'port', label: 'Port' },
  { kind: 'ValueProperty', ownerRole: 'property', label: 'Value Property' },
];

const INTERFACE_DEFINITION_CHILDREN: readonly ChildKindOption[] = [
  { kind: 'PortDefinition', ownerRole: 'portDefinition', label: 'Port' },
];

const ACTION_DEFINITION_CHILDREN: readonly ChildKindOption[] = [
  { kind: 'ValueProperty', ownerRole: 'parameter', label: 'Parameter' },
];

const CONSTRAINT_DEFINITION_CHILDREN: readonly ChildKindOption[] = [
  { kind: 'ValueProperty', ownerRole: 'parameter', label: 'Parameter' },
];

/**
 * Element kinds that can be authored as direct children of a given parent
 * kind, paired with the OwnerRole the new child should take. Drives the
 * Containment-Tree row "Create child…" submenu. Kinds requiring a
 * src/tgt or definitionId (PartUsage, PortUsage, ConnectionUsage,
 * ItemFlow, ConstraintUsage, Transition, ActionUsage, StateUsage) are
 * intentionally excluded — those originate from diagram-level palette
 * actions, not free-standing tree creation.
 */
export function acceptedChildKinds(
  parentKind: ElementKind,
): readonly ChildKindOption[] {
  switch (parentKind) {
    case 'Package':
      return PACKAGE_CHILDREN;
    case 'PartDefinition':
      return PART_DEFINITION_CHILDREN;
    case 'InterfaceDefinition':
      return INTERFACE_DEFINITION_CHILDREN;
    case 'ActionDefinition':
      return ACTION_DEFINITION_CHILDREN;
    case 'ConstraintDefinition':
      return CONSTRAINT_DEFINITION_CHILDREN;
    default:
      return [];
  }
}
