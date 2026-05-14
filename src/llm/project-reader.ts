import type { ElementId, ModelEdge, ModelElement } from '@/model';
import type { Diagram } from '@/workspace/diagram';

/** Read-only snapshot of the active project state passed to tool handlers. */
export interface ProjectReader {
  readonly projectName: string;
  /** ElementId of the project's root Package. */
  readonly rootId: ElementId;
  /** All elements across the active project. */
  elements(): readonly ModelElement[];
  /** All edges across the active project. */
  edges(): readonly ModelEdge[];
  /** All diagrams (including their viewpointId and positions). */
  diagrams(): readonly Diagram[];
  /**
   * The active diagram (the one currently visible in the canvas), or null
   * if no diagram is open.
   */
  activeDiagram(): Diagram | null;
}

/**
 * Build a ProjectReader from a store snapshot. Call this at dispatch time
 * (not at module load) so the snapshot is always current.
 */
export function createProjectReader(snapshot: {
  readonly projectName: string;
  readonly rootId: ElementId;
  readonly elements: readonly ModelElement[];
  readonly edges: readonly ModelEdge[];
  readonly diagrams: readonly Diagram[];
  readonly activeDiagramId: string | null;
}): ProjectReader {
  return {
    projectName: snapshot.projectName,
    rootId: snapshot.rootId,
    elements: () => snapshot.elements,
    edges: () => snapshot.edges,
    diagrams: () => snapshot.diagrams,
    activeDiagram: () =>
      snapshot.activeDiagramId === null
        ? null
        : (snapshot.diagrams.find((d) => d.id === snapshot.activeDiagramId) ?? null),
  };
}
