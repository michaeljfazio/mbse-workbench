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

export interface ActivityObjectFlowEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  readonly itemType?: string;
  readonly label?: string;
  readonly routingStyle?: string;
  readonly strokeStyle?: string;
  readonly strokeColor?: string;
}

export type ActivityObjectFlowFlowEdge = Edge<
  ActivityObjectFlowEdgeData,
  'activity-object-flow'
>;

export const ACTIVITY_OBJECT_FLOW_EDGE_TYPE = 'activity-object-flow' as const;

export function ActivityObjectFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<ActivityObjectFlowFlowEdge>): JSX.Element {
  const routingStyle =
    (data?.routingStyle as Parameters<typeof computeEdgePath>[1] | undefined) ??
    defaultRoutingStyleForType(ACTIVITY_OBJECT_FLOW_EDGE_TYPE);
  const [edgePath, labelX, labelY] = computeEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    routingStyle,
  );

  const strokeStyleValue =
    (data?.strokeStyle as Parameters<typeof strokeDasharray>[0] | undefined) ??
    defaultStrokeStyleForType(ACTIVITY_OBJECT_FLOW_EDGE_TYPE);
  const dashArray = strokeDasharray(strokeStyleValue);
  const strokeColor = data?.strokeColor ?? undefined;

  const markerId = `activity-objectflow-${id}`;
  const stroke = selected
    ? 'hsl(var(--primary))'
    : (strokeColor ?? 'hsl(var(--foreground))');
  const itemType = data?.itemType;
  const userLabel = data?.label;
  const labelText = itemType ?? userLabel;

  return (
    <g
      data-testid={`activity-edge-${id}`}
      data-edge-id={id}
      data-edge-kind="ObjectFlow"
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
          <path
            d="M1 1 L11 6 L1 11 Z"
            fill="hsl(var(--background))"
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinejoin="miter"
          />
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
      {labelText ? (
        <EdgeLabelRenderer>
          <div
            data-testid={`activity-edge-label-${id}`}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm"
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}
