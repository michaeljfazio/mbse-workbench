import type { ModelElement } from '@/model';
import type { ElementId } from '@/model';

import type { Diagram, DiagramId } from './diagram';

// Phase 12 slice D (issue #234) — search-across-all-elements model.
//
// A "containing" diagram, per the issue, is any diagram whose `positions`
// record carries an entry for the element id. That captures node-rendered
// elements across every viewpoint. Pure edge model elements (e.g. Transition,
// ConnectionUsage) don't appear as nodes and aren't directly navigable, so
// they're excluded from results — selection requires a target diagram.

export interface CommandPaletteMatch {
  readonly id: ElementId;
  readonly name: string;
  readonly kind: ModelElement['kind'];
  readonly diagramId: DiagramId;
  readonly diagramName: string;
}

export const COMMAND_PALETTE_RESULT_CAP = 50;

export function searchElements(
  query: string,
  elements: readonly ModelElement[],
  diagrams: readonly Diagram[],
  limit: number = COMMAND_PALETTE_RESULT_CAP,
): readonly CommandPaletteMatch[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return [];
  const matches: CommandPaletteMatch[] = [];
  for (const element of elements) {
    if (matches.length >= limit) break;
    const nameLc = element.name.toLowerCase();
    const idLc = element.id.toLowerCase();
    if (!nameLc.includes(trimmed) && !idLc.includes(trimmed)) continue;
    const diagram = diagrams.find(
      (d) => d.positions[element.id] !== undefined,
    );
    if (!diagram) continue;
    matches.push({
      id: element.id,
      name: element.name,
      kind: element.kind,
      diagramId: diagram.id,
      diagramName: diagram.name,
    });
  }
  return matches;
}
