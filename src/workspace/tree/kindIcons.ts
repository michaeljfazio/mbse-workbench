import {
  Box,
  Cable,
  Circle,
  ClipboardCheck,
  Component,
  Hash,
  Link,
  MoveRight,
  Package,
  Play,
  Plug,
  Sigma,
  Target,
  User,
  type LucideIcon,
} from 'lucide-react';

import type { ElementKind } from '@/model';

export const KIND_ICONS: Record<ElementKind, LucideIcon> = {
  Package: Package,
  PartDefinition: Box,
  PartUsage: Component,
  PortDefinition: Plug,
  PortUsage: Plug,
  InterfaceDefinition: Cable,
  ConnectionUsage: Link,
  ItemFlow: MoveRight,
  Requirement: ClipboardCheck,
  ActionDefinition: Play,
  ActionUsage: Play,
  StateDefinition: Circle,
  StateUsage: Circle,
  Transition: MoveRight,
  UseCase: Target,
  Actor: User,
  ConstraintDefinition: Sigma,
  ConstraintUsage: Sigma,
  ValueProperty: Hash,
};

export function kindIcon(kind: ElementKind): LucideIcon {
  return KIND_ICONS[kind];
}
