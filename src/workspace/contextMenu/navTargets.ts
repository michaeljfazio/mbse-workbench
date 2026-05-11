import type { ElementId, ModelElement } from '@/model';
import {
  BDD_VIEWPOINT_ID,
  IBD_VIEWPOINT_ID,
  type ViewpointRegistry,
} from '@/viewpoints';

import type { Diagram, DiagramId } from '../diagram';

export interface NavTargetActions {
  openInternalDiagram(partDefinitionId: ElementId): DiagramId | null;
  showDefinitionOnBdd(partUsageId: ElementId): DiagramId | null;
  navigateToElementOnDiagram(elementId: ElementId, diagramId: DiagramId): void;
}

export interface NavTarget {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  perform(): void;
}

export interface DeriveNavTargetsInput {
  readonly element: ModelElement;
  readonly diagrams: readonly Diagram[];
  readonly activeDiagramId: DiagramId | null;
  readonly elements: readonly ModelElement[];
  readonly viewpoints: ViewpointRegistry;
  readonly actions: NavTargetActions;
}

// Returns the ordered list of navigation targets that should appear in the
// right-click menu for `element`. Cross-kind hops (BDD PartDefinition → IBD
// for its parts, IBD PartUsage → BDD definition) come first, followed by
// same-element nav for every other diagram where the element is placed.
export function deriveNavTargets({
  element,
  diagrams,
  activeDiagramId,
  elements,
  viewpoints,
  actions,
}: DeriveNavTargetsInput): readonly NavTarget[] {
  const targets: NavTarget[] = [];

  if (element.kind === 'PartDefinition') {
    if (viewpoints.has(IBD_VIEWPOINT_ID)) {
      const existing = diagrams.find(
        (d) =>
          d.viewpointId === IBD_VIEWPOINT_ID &&
          d.context?.kind === 'partDefinition' &&
          d.context.id === element.id,
      );
      targets.push({
        id: 'show-in-ibd',
        label: 'Show in IBD',
        description: existing
          ? `Open ${existing.name}`
          : 'Open or create internal diagram',
        perform: () => {
          actions.openInternalDiagram(element.id);
        },
      });
    }
  }

  if (element.kind === 'PartUsage') {
    const definition = elements.find((e) => e.id === element.definitionId);
    if (viewpoints.has(BDD_VIEWPOINT_ID) && definition?.kind === 'PartDefinition') {
      targets.push({
        id: 'show-definition-in-bdd',
        label: 'Show definition in BDD',
        description: definition.name,
        perform: () => {
          actions.showDefinitionOnBdd(element.id);
        },
      });
    }
  }

  for (const diagram of diagrams) {
    if (diagram.id === activeDiagramId) continue;
    if (!Object.prototype.hasOwnProperty.call(diagram.positions, element.id)) {
      continue;
    }
    const vp = viewpoints.get(diagram.viewpointId);
    if (!vp) continue;
    if (!vp.acceptedElementKinds.includes(element.kind)) continue;
    targets.push({
      id: `show-in-${diagram.id}`,
      label: `Show in ${diagram.name}`,
      description: vp.label,
      perform: () => {
        actions.navigateToElementOnDiagram(element.id, diagram.id);
      },
    });
  }

  return targets;
}
