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
  /**
   * Per ADR 0014. When set, picking this option from a row whose element
   * kind does not match `contextKind` first creates an element of
   * `implicitOwnerKind` under that row, then anchors the diagram to the
   * new element. The row-menu handler is responsible for chaining the
   * dispatches; `representationAcceptance` only declares the contract.
   */
  readonly implicitOwnerKind?: ElementKind;
  /**
   * Per ADR 0014, Parametric branch. When set, picking this option opens a
   * popover that prompts the architect for which of these owner kinds to
   * create. Mutually exclusive with `implicitOwnerKind` (which auto-picks).
   */
  readonly implicitOwnerPromptKinds?: readonly ElementKind[];
}

const PACKAGE_REPRESENTATIONS: readonly RepresentationOption[] = [
  // Package-native diagrams — no implicit owner needed.
  { viewpointId: BDD_VIEWPOINT_ID, contextKind: 'package', label: 'BDD' },
  { viewpointId: REQUIREMENTS_VIEWPOINT_ID, contextKind: 'package', label: 'Requirements' },
  { viewpointId: USE_CASE_VIEWPOINT_ID, contextKind: 'package', label: 'Use Case' },
  { viewpointId: PACKAGE_VIEWPOINT_ID, contextKind: 'package', label: 'Package' },
  // Implicit-owner entries (ADR 0014). Each label discloses the implicit
  // creation so the architect is never surprised by an extra tree node.
  {
    viewpointId: IBD_VIEWPOINT_ID,
    contextKind: 'partDefinition',
    label: 'IBD (creates Part Definition)',
    implicitOwnerKind: 'PartDefinition',
  },
  {
    viewpointId: ACTIVITY_VIEWPOINT_ID,
    contextKind: 'actionDefinition',
    label: 'Activity (creates Action Definition)',
    implicitOwnerKind: 'ActionDefinition',
  },
  {
    viewpointId: STATE_MACHINE_VIEWPOINT_ID,
    contextKind: 'stateDefinition',
    label: 'State Machine (creates State Definition)',
    implicitOwnerKind: 'StateDefinition',
  },
  // Parametric prompts for owner kind (today only `PartDefinition` is
  // accepted by `parametricViewpoint.acceptedContextKinds`; widening to
  // `ConstraintDefinition` is the deferred follow-up flagged in ADR 0014).
  {
    viewpointId: PARAMETRIC_VIEWPOINT_ID,
    contextKind: 'partDefinition',
    label: 'Parametric…',
    implicitOwnerPromptKinds: ['PartDefinition'],
  },
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
