/**
 * Shared edge-path helper for all viewpoint edge components.
 *
 * Centralises the routing-style dispatch (getBezierPath / getSmoothStepPath /
 * getStraightPath / getSmoothStepPath-with-borderRadius-0) and the stroke-style
 * derivation (solid / dashed / dotted) so the 17 edge components do not each
 * maintain a switch statement.
 *
 * Kind defaults deliberately preserve the pre-#564/#566 per-component behaviour:
 *   - IBD ConnectionUsage / ItemFlow          → bezier, solid
 *   - State Machine Transition                → bezier, solid
 *   - Activity ControlFlow / ObjectFlow       → bezier, solid (ObjectFlow → dashed)
 *   - BDD / Use Case / Parametric / Package   → smooth-step, varies by kind
 *
 * Refs #564 #566
 */
import {
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type Position,
} from '@xyflow/react';
import type { EdgeRoutingStyle, EdgeStrokeStyle } from '@/model';

// ─── Routing-style kind defaults ────────────────────────────────────────────
// Keyed by the React Flow edge `type` string each component registers under.
// If a type is absent, the fallback is 'smooth-step'.

export type EdgeKindGroup =
  | 'bezier'     // IBD ConnectionUsage/ItemFlow, Activity Control/ObjectFlow, StateMachine Transition
  | 'smoothstep' // BDD, UseCase, Requirements, Parametric, Package

const BEZIER_TYPES = new Set<string>([
  'ibd-connection-usage',
  'ibd-item-flow',
  'activity-control-flow',
  'activity-object-flow',
  'state-machine-transition',
]);

/**
 * Returns the default routing style for an edge component identified by its
 * React Flow edge `type` string. Used to resolve `routingStyle ?? defaultFor`.
 */
export function defaultRoutingStyleForType(edgeType: string): EdgeRoutingStyle {
  return BEZIER_TYPES.has(edgeType) ? 'bezier' : 'smooth-step';
}

// ─── Stroke-style kind defaults ─────────────────────────────────────────────
// SysML 1.5 Table 8.4 / v2 §7.13: dashed for Dependency, RequirementTrace,
// Include, Extend, PackageImport, ObjectFlow; solid for everything else.

const DASHED_TYPES = new Set<string>([
  'bdd-dependency',
  'requirements-trace',
  'use-case-include',
  'use-case-extend',
  'package-import',
  'activity-object-flow',
]);

/**
 * Returns the default stroke style for an edge component identified by its
 * React Flow edge `type` string. Used to resolve `strokeStyle ?? defaultFor`.
 */
export function defaultStrokeStyleForType(edgeType: string): EdgeStrokeStyle {
  return DASHED_TYPES.has(edgeType) ? 'dashed' : 'solid';
}

// ─── Stroke-dasharray helper ─────────────────────────────────────────────────

/**
 * Returns a CSS `stroke-dasharray` value for the given stroke style, or
 * `undefined` for solid (no dash). Matches the dash patterns already used by
 * the edge components before #566 (6 4 for dashed, 2 4 for dotted).
 */
export function strokeDasharray(style: EdgeStrokeStyle): string | undefined {
  switch (style) {
    case 'solid': return undefined;
    case 'dashed': return '6 4';
    case 'dotted': return '2 4';
  }
}

// ─── Path computation ────────────────────────────────────────────────────────

export interface EdgePathParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
}

/**
 * Computes the SVG path string and label anchor (labelX, labelY) for the
 * resolved routing style.
 *
 * Returns the same 5-element tuple as the React Flow path helpers
 * `[edgePath, labelX, labelY, offsetX, offsetY]`. Callers may destructure
 * only the first three elements.
 */
export function computeEdgePath(
  params: EdgePathParams,
  routingStyle: EdgeRoutingStyle,
): [string, number, number, number, number] {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } =
    params;

  switch (routingStyle) {
    case 'straight':
      return getStraightPath({ sourceX, sourceY, targetX, targetY });

    case 'step':
      return getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 0,
      });

    case 'smooth-step':
      return getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 4,
      });

    case 'bezier':
      return getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
      });
  }
}
