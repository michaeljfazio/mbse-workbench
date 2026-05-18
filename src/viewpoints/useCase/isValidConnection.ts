import type { ElementId, ElementRegistry, ModelElement } from '@/model';
import type { Connection } from '@xyflow/react';

export type UseCaseEdgeKind =
  | 'Include'
  | 'Extend'
  | 'Generalization'
  | 'Association';

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
  // ADR 0007 § 5 deferral closed by phase-15 #517: Actor↔UseCase pairs are
  // accepted as Association edges (UML use-case convention — plain solid
  // line, undirected). Both directions accepted; the stereotype picker
  // offers only Association for cross-kind drops.
  if (s.kind === 'Actor' && t.kind === 'UseCase') return true;
  if (s.kind === 'UseCase' && t.kind === 'Actor') return true;
  return false;
}

export function defaultUseCaseEdgeKindFor(
  source: ModelElement,
  target: ModelElement,
): UseCaseEdgeKind | null {
  if (source.kind === 'UseCase' && target.kind === 'UseCase') return 'Include';
  if (source.kind === 'Actor' && target.kind === 'Actor') return 'Generalization';
  if (source.kind === 'Actor' && target.kind === 'UseCase') return 'Association';
  if (source.kind === 'UseCase' && target.kind === 'Actor') return 'Association';
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
  if (
    (source.kind === 'Actor' && target.kind === 'UseCase') ||
    (source.kind === 'UseCase' && target.kind === 'Actor')
  ) {
    return ['Association'];
  }
  return [];
}
