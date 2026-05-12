import type {
  ElementId,
  ElementRegistry,
  RequirementTraceKind,
} from '@/model';
import { validTraceKindsFor } from '@/viewpoints/requirements/isValidConnection';

export interface ResolvedTreeDragTrace {
  readonly source: ElementId;
  readonly target: ElementId;
  readonly allowedKinds: readonly RequirementTraceKind[];
}

/**
 * Resolves a "drag a Requirement from the project tree onto a canvas element"
 * gesture into a pending RequirementTrace request, or `null` if the pair
 * cannot form any valid trace per ADR 0004 § 3. The CanvasPane drop handler
 * uses this to decide whether to open the `TraceKindPopover`. Pure so the
 * branch is unit-testable without ReactFlow.
 */
export function resolveTreeDragTrace(
  sourceId: string | null | undefined,
  targetId: string | null | undefined,
  registry: Pick<ElementRegistry, 'get'>,
): ResolvedTreeDragTrace | null {
  if (!sourceId || !targetId) return null;
  if (sourceId === targetId) return null;
  const source = registry.get(sourceId as ElementId);
  if (!source || source.kind !== 'Requirement') return null;
  const target = registry.get(targetId as ElementId);
  if (!target) return null;
  const allowedKinds = validTraceKindsFor(
    {
      source: sourceId,
      target: targetId,
      sourceHandle: null,
      targetHandle: null,
    },
    registry,
  );
  if (allowedKinds.length === 0) return null;
  return {
    source: sourceId as ElementId,
    target: targetId as ElementId,
    allowedKinds,
  };
}
