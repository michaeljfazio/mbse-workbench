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

export interface UseCaseIncludeEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  readonly label?: string;
  readonly routingStyle?: string;
  readonly strokeStyle?: string;
  readonly strokeColor?: string;
}

export type UseCaseIncludeFlowEdge = Edge<
  UseCaseIncludeEdgeData,
  'use-case-include'
>;

export const USE_CASE_INCLUDE_EDGE_TYPE = 'use-case-include' as const;

export function IncludeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<UseCaseIncludeFlowEdge>): JSX.Element {
  const routingStyle =
    (data?.routingStyle as Parameters<typeof computeEdgePath>[1] | undefined) ??
    defaultRoutingStyleForType(USE_CASE_INCLUDE_EDGE_TYPE);
  const [edgePath, labelX, labelY] = computeEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    routingStyle,
  );

  const strokeStyleValue =
    (data?.strokeStyle as Parameters<typeof strokeDasharray>[0] | undefined) ??
    defaultStrokeStyleForType(USE_CASE_INCLUDE_EDGE_TYPE);
  const dashArray = strokeDasharray(strokeStyleValue);
  const strokeColor = data?.strokeColor ?? undefined;

  const markerId = `use-case-include-arrow-${id}`;
  const stroke = selected
    ? 'hsl(var(--primary))'
    : (strokeColor ?? 'currentColor');
  const strokeWidth = selected ? 2 : 1.5;
  const userLabel = data?.label;

  return (
    <g
      data-testid={`use-case-edge-${id}`}
      data-edge-id={id}
      data-include-edge="true"
      data-use-case-edge-kind="Include"
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="10"
          markerHeight="10"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M1,1 L11,6 L1,11 Z"
            fill={stroke}
            stroke={stroke}
            strokeWidth="1.5"
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
          strokeWidth,
          color: stroke,
          ...(dashArray !== undefined ? { strokeDasharray: dashArray } : {}),
        }}
      />
      <EdgeLabelRenderer>
        <div
          data-testid={`use-case-include-edge-label-${id}`}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
          }}
          className="flex flex-col items-center"
        >
          <span className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/80 shadow-sm">
            «include»
          </span>
          {userLabel ? (
            <span
              data-testid={`use-case-include-edge-user-label-${id}`}
              className="mt-0.5 rounded bg-card/90 px-1.5 py-0.5 text-[11px] font-medium text-foreground"
            >
              {userLabel}
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}
