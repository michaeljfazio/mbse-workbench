import type { ElementId, ModelEdge, ModelElement } from '@/model';
import {
  BDD_VIEWPOINT_ID,
  IBD_VIEWPOINT_ID,
  isTraceTargetKind,
  REQUIREMENTS_VIEWPOINT_ID,
  type ViewpointRegistry,
} from '@/viewpoints';

import type { Diagram, DiagramId } from '../diagram';

export interface NavTargetActions {
  openInternalDiagram(partDefinitionId: ElementId): DiagramId | null;
  showDefinitionOnBdd(partUsageId: ElementId): DiagramId | null;
  navigateToElementOnDiagram(elementId: ElementId, diagramId: DiagramId): void;
  showRequirementTracesFor(elementId: ElementId): DiagramId | null;
  runImpactAnalysis(elementId: ElementId): boolean;
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
  readonly edges: readonly ModelEdge[];
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
  edges,
  viewpoints,
  actions,
}: DeriveNavTargetsInput): readonly NavTarget[] {
  const targets: NavTarget[] = [];

  if (
    isTraceTargetKind(element.kind) &&
    viewpoints.has(REQUIREMENTS_VIEWPOINT_ID)
  ) {
    const reqDiagram = diagrams.find(
      (d) => d.viewpointId === REQUIREMENTS_VIEWPOINT_ID,
    );
    if (reqDiagram) {
      const incoming = edges.filter(
        (e) => e.kind === 'RequirementTrace' && e.targetId === element.id,
      );
      if (incoming.length > 0) {
        const count = incoming.length;
        targets.push({
          id: 'show-requirement-traces',
          label: 'Show requirement traces',
          description:
            count === 1
              ? `1 trace on ${reqDiagram.name}`
              : `${count} traces on ${reqDiagram.name}`,
          perform: () => {
            actions.showRequirementTracesFor(element.id);
          },
        });
      }
    }
  }

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

  targets.push({
    id: 'show-impact',
    label: 'Show impact',
    description: 'Highlight downstream elements & traces',
    perform: () => {
      actions.runImpactAnalysis(element.id);
    },
  });

  return targets;
}
