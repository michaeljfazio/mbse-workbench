import type { ElementKind } from '@/model';
import type { DiagramContextKind } from '../diagram';
import {
  ACTIVITY_VIEWPOINT_ID,
  BDD_VIEWPOINT_ID,
  IBD_VIEWPOINT_ID,
  PACKAGE_VIEWPOINT_ID,
  PARAMETRIC_VIEWPOINT_ID,
  REQUIREMENTS_VIEWPOINT_ID,
  STATE_MACHINE_VIEWPOINT_ID,
  USE_CASE_VIEWPOINT_ID,
} from '@/viewpoints';
import type { ViewpointId } from '@/viewpoints';

export interface RepresentationOption {
  readonly viewpointId: ViewpointId;
  readonly contextKind: DiagramContextKind;
  readonly label: string;
}

const PACKAGE_REPRESENTATIONS: readonly RepresentationOption[] = [
  { viewpointId: BDD_VIEWPOINT_ID, contextKind: 'package', label: 'BDD' },
  { viewpointId: REQUIREMENTS_VIEWPOINT_ID, contextKind: 'package', label: 'Requirements' },
  { viewpointId: USE_CASE_VIEWPOINT_ID, contextKind: 'package', label: 'Use Case' },
  { viewpointId: PACKAGE_VIEWPOINT_ID, contextKind: 'package', label: 'Package' },
];

const PART_DEFINITION_REPRESENTATIONS: readonly RepresentationOption[] = [
  { viewpointId: BDD_VIEWPOINT_ID, contextKind: 'partDefinition', label: 'BDD' },
  { viewpointId: IBD_VIEWPOINT_ID, contextKind: 'partDefinition', label: 'IBD' },
  { viewpointId: PARAMETRIC_VIEWPOINT_ID, contextKind: 'partDefinition', label: 'Parametric' },
];

const ACTION_DEFINITION_REPRESENTATIONS: readonly RepresentationOption[] = [
  { viewpointId: ACTIVITY_VIEWPOINT_ID, contextKind: 'actionDefinition', label: 'Activity' },
];

const STATE_DEFINITION_REPRESENTATIONS: readonly RepresentationOption[] = [
  { viewpointId: STATE_MACHINE_VIEWPOINT_ID, contextKind: 'stateDefinition', label: 'State Machine' },
];

/**
 * Viewpoints that can be authored as a diagram (representation) hanging
 * off the given element kind. Drives the Containment-Tree row "Create
 * representation…" submenu (T-13.33c). Context kind matches the
 * DiagramContext discriminator so the new Diagram's context anchors to
 * the row element directly.
 */
export function acceptedRepresentations(
  parentKind: ElementKind,
): readonly RepresentationOption[] {
  switch (parentKind) {
    case 'Package':
      return PACKAGE_REPRESENTATIONS;
    case 'PartDefinition':
      return PART_DEFINITION_REPRESENTATIONS;
    case 'ActionDefinition':
      return ACTION_DEFINITION_REPRESENTATIONS;
    case 'StateDefinition':
      return STATE_DEFINITION_REPRESENTATIONS;
    default:
      return [];
  }
}
