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

/**
 * Element kinds that are valid endpoints (target side) for `satisfy`/`verify`
 * RequirementTrace edges per ADR 0004 § 3. Also defines which kinds surface
 * the inspector's `TraceLinksExtras` section and the context-menu
 * "Show requirement traces" entry.
 */
export const TRACE_TARGET_KINDS: ReadonlySet<ElementKind> = new Set<ElementKind>([
  'Requirement',
  'PartDefinition',
  'PartUsage',
  'ActionDefinition',
  'ActionUsage',
  'StateDefinition',
  'StateUsage',
  'UseCase',
]);

export function isTraceTargetKind(kind: ElementKind): boolean {
  return TRACE_TARGET_KINDS.has(kind);
}

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
  return TRACE_TARGET_KINDS.has(targetEl.kind);
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
