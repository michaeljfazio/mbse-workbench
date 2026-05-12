import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';

import type { EdgeId } from '@/model';

export interface ActivityObjectFlowEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  readonly itemType?: string;
  readonly label?: string;
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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const markerId = `activity-objectflow-${id}`;
  const stroke = selected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))';
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
          strokeDasharray: '6 4',
          fill: 'none',
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
