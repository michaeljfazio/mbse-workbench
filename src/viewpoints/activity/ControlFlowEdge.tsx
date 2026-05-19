import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';

import type { EdgeId } from '@/model';
import {
  computeEdgePath,
  defaultRoutingStyleForType,
  defaultStrokeStyleForType,
  strokeDasharray,
} from '../shared/edgePath';

export interface ActivityControlFlowEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  readonly guard?: string;
  readonly label?: string;
  readonly routingStyle?: string;
  readonly strokeStyle?: string;
  readonly strokeColor?: string;
}

export type ActivityControlFlowFlowEdge = Edge<
  ActivityControlFlowEdgeData,
  'activity-control-flow'
>;

export const ACTIVITY_CONTROL_FLOW_EDGE_TYPE = 'activity-control-flow' as const;

export function ActivityControlFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<ActivityControlFlowFlowEdge>): JSX.Element {
  const routingStyle =
    (data?.routingStyle as Parameters<typeof computeEdgePath>[1] | undefined) ??
    defaultRoutingStyleForType(ACTIVITY_CONTROL_FLOW_EDGE_TYPE);
  const [edgePath, labelX, labelY] = computeEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    routingStyle,
  );

  const strokeStyleValue =
    (data?.strokeStyle as Parameters<typeof strokeDasharray>[0] | undefined) ??
    defaultStrokeStyleForType(ACTIVITY_CONTROL_FLOW_EDGE_TYPE);
  const dashArray = strokeDasharray(strokeStyleValue);
  const strokeColor = data?.strokeColor ?? undefined;

  const markerId = `activity-controlflow-${id}`;
  const stroke = selected
    ? 'hsl(var(--primary))'
    : (strokeColor ?? 'hsl(var(--foreground))');
  const guard = data?.guard;
  const userLabel = data?.label;

  return (
    <g
      data-testid={`activity-edge-${id}`}
      data-edge-id={id}
      data-edge-kind="ControlFlow"
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
      {guard || userLabel ? (
        <EdgeLabelRenderer>
          <div
            data-testid={`activity-edge-label-${id}`}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="flex flex-col items-center gap-0.5"
          >
            {guard ? (
              <span
                data-testid={`activity-edge-guard-${id}`}
                className="rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-sm"
              >
                {`[${guard}]`}
              </span>
            ) : null}
            {userLabel ? (
              <span
                data-testid={`activity-edge-user-label-${id}`}
                className="rounded-sm bg-card/90 px-1.5 py-0.5 text-[11px] font-medium text-foreground"
              >
                {userLabel}
              </span>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}
