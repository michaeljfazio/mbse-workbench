import type { Connection } from '@xyflow/react';

import type {
  ElementId,
  ElementKind,
  ElementRegistry,
  RequirementTraceKind,
} from '@/model';

/**
 * Requirements viewpoint connection rules per ADR 0004:
 *  - source and target must both resolve in the registry
 *  - source must always be a Requirement
 *  - no self-loops
 *  - `derive` and `refine` require both endpoints to be Requirements
 *  - `satisfy` and `verify` allow any target kind from the allowed list
 */

const SATISFY_VERIFY_TARGET_KINDS: ReadonlySet<ElementKind> = new Set<ElementKind>([
  'Requirement',
  'PartDefinition',
  'PartUsage',
  'ActionDefinition',
  'ActionUsage',
  'StateDefinition',
  'StateUsage',
  'UseCase',
]);

export function isValidRequirementTraceConnection(
  connection: Connection,
  registry: Pick<ElementRegistry, 'get'>,
  traceKind: RequirementTraceKind,
): boolean {
  const { source, target } = connection;
  if (!source || !target) return false;
  if (source === target) return false;

  const sourceEl = registry.get(source as ElementId);
  const targetEl = registry.get(target as ElementId);
  if (!sourceEl || !targetEl) return false;

  if (sourceEl.kind !== 'Requirement') return false;

  if (traceKind === 'derive' || traceKind === 'refine') {
    return targetEl.kind === 'Requirement';
  }
  return SATISFY_VERIFY_TARGET_KINDS.has(targetEl.kind);
}

/**
 * Returns the trace kinds that are valid for the given source/target pair.
 * Used by `TraceKindPopover` to grey out impossible choices once the user
 * has dropped the connection.
 */
export function validTraceKindsFor(
  connection: Connection,
  registry: Pick<ElementRegistry, 'get'>,
): readonly RequirementTraceKind[] {
  const result: RequirementTraceKind[] = [];
  for (const kind of ['derive', 'satisfy', 'verify', 'refine'] as const) {
    if (isValidRequirementTraceConnection(connection, registry, kind)) {
      result.push(kind);
    }
  }
  return result;
}
