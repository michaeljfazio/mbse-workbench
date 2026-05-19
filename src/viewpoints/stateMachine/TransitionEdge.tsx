import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';

import type { ElementId } from '@/model';
import {
  computeEdgePath,
  defaultRoutingStyleForType,
  defaultStrokeStyleForType,
  strokeDasharray,
} from '../shared/edgePath';

export interface StateMachineTransitionEdgeData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly trigger: string | undefined;
  readonly guard: string | undefined;
  readonly effect: string | undefined;
  readonly routingStyle?: string;
  readonly strokeStyle?: string;
  readonly strokeColor?: string;
}

export type StateMachineTransitionFlowEdge = Edge<
  StateMachineTransitionEdgeData,
  'state-machine-transition'
>;

/**
 * Compose the SysMLv2 textual-notation transition label:
 *   trigger [guard] / effect
 * Each piece is optional; punctuation is only emitted between non-empty
 * pieces, so partial labels read naturally. Returns an empty string when
 * all three fields are blank — in that case the edge renders without a
 * label per ADR 0006 § 3.
 */
export function composeTransitionLabel(data: {
  readonly trigger: string | undefined;
  readonly guard: string | undefined;
  readonly effect: string | undefined;
}): string {
  const trigger = data.trigger?.trim() ?? '';
  const guard = data.guard?.trim() ?? '';
  const effect = data.effect?.trim() ?? '';

  const parts: string[] = [];
  if (trigger.length > 0) parts.push(trigger);
  if (guard.length > 0) parts.push(`[${guard}]`);
  const head = parts.join(' ');
  if (effect.length === 0) return head;
  if (head.length === 0) return `/ ${effect}`;
  return `${head} / ${effect}`;
}

export const STATE_MACHINE_TRANSITION_EDGE_TYPE = 'state-machine-transition' as const;

export function TransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<StateMachineTransitionFlowEdge>): JSX.Element {
  const routingStyle =
    (data?.routingStyle as Parameters<typeof computeEdgePath>[1] | undefined) ??
    defaultRoutingStyleForType(STATE_MACHINE_TRANSITION_EDGE_TYPE);
  const [edgePath, labelX, labelY] = computeEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    routingStyle,
  );

  const strokeStyleValue =
    (data?.strokeStyle as Parameters<typeof strokeDasharray>[0] | undefined) ??
    defaultStrokeStyleForType(STATE_MACHINE_TRANSITION_EDGE_TYPE);
  const dashArray = strokeDasharray(strokeStyleValue);
  const strokeColor = data?.strokeColor ?? undefined;

  const markerId = `state-transition-${id}`;
  const stroke = selected
    ? 'hsl(var(--primary))'
    : (strokeColor ?? 'hsl(var(--foreground))');
  const label = composeTransitionLabel({
    trigger: data?.trigger,
    guard: data?.guard,
    effect: data?.effect,
  });

  return (
    <g
      data-testid={`state-machine-edge-${id}`}
      data-edge-id={id}
      data-edge-kind="Transition"
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          markerWidth={10}
          markerHeight={10}
          refX={11}
          refY={6}
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0 0 L12 6 L0 12 Z" fill={stroke} />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{
          stroke,
          strokeWidth: selected ? 2.5 : 1.5,
          fill: 'none',
          ...(dashArray !== undefined ? { strokeDasharray: dashArray } : {}),
        }}
      />
      {label.length > 0 ? (
        <EdgeLabelRenderer>
          <div
            data-testid={`state-machine-edge-label-${id}`}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-sm"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}
