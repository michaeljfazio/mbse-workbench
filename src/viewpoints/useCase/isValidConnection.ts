import type { ElementId, ElementRegistry, ModelElement } from '@/model';
import type { Connection } from '@xyflow/react';

export type UseCaseEdgeKind = 'Include' | 'Extend' | 'Generalization';

interface RegistryLookup {
  get(id: ElementId): ModelElement | undefined;
}

export function isValidUseCaseConnection(
  connection: Connection,
  registry: RegistryLookup | ElementRegistry,
): boolean {
  const { source, target } = connection;
  if (!source || !target || source === target) return false;
  const s = registry.get(source as ElementId);
  const t = registry.get(target as ElementId);
  if (!s || !t) return false;
  if (s.kind === 'UseCase' && t.kind === 'UseCase') return true;
  if (s.kind === 'Actor' && t.kind === 'Actor') return true;
  // Per ADR 0007 § 4: Actor↔UseCase association is deferred (system-boundary
  // polish). Reject silently so the drag completes without creating an edge.
  return false;
}

export function defaultUseCaseEdgeKindFor(
  source: ModelElement,
  target: ModelElement,
): UseCaseEdgeKind | null {
  if (source.kind === 'UseCase' && target.kind === 'UseCase') return 'Include';
  if (source.kind === 'Actor' && target.kind === 'Actor') return 'Generalization';
  return null;
}

export function allowedUseCaseEdgeKindsFor(
  source: ModelElement,
  target: ModelElement,
): readonly UseCaseEdgeKind[] {
  if (source.kind === 'UseCase' && target.kind === 'UseCase') {
    return ['Include', 'Extend', 'Generalization'];
  }
  if (source.kind === 'Actor' && target.kind === 'Actor') {
    return ['Generalization'];
  }
  return [];
}
