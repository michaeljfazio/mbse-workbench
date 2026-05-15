import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';

import type { EdgeId, RequirementTraceKind } from '@/model';

export interface RequirementTraceEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  readonly traceKind: RequirementTraceKind;
  readonly label?: string;
}

export type RequirementTraceFlowEdge = Edge<
  RequirementTraceEdgeData,
  'requirements-trace'
>;

export const REQUIREMENTS_TRACE_EDGE_TYPE = 'requirements-trace' as const;

// SysML 1.6 §9.1.4.5: every trace dependency (derive, satisfy, verify,
// refine) is a UML dependency — dashed line with an open arrowhead at the
// target end. The stereotype keyword carries the discriminator.
const TRACE_DASH_PATTERN = '6 4';

export function RequirementTraceEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<RequirementTraceFlowEdge>): JSX.Element {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 4,
  });

  const traceKind = data?.traceKind ?? 'satisfy';
  const userLabel = data?.label;
  const markerId = `req-trace-${id}`;
  const dashArray = TRACE_DASH_PATTERN;
  const stroke = selected ? 'hsl(var(--primary))' : 'currentColor';
  const strokeWidth = selected ? 2 : 1.5;

  return (
    <g
      data-testid={`req-trace-edge-${id}`}
      data-edge-id={id}
      data-trace-kind={traceKind}
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
            fill="hsl(var(--background))"
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
          strokeDasharray: dashArray,
          color: stroke,
        }}
      />
      <EdgeLabelRenderer>
        <div
          data-testid={`req-trace-edge-label-${id}`}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
          }}
          className="flex flex-col items-center"
        >
          <span className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/80 shadow-sm">
            {`«${traceKind}»`}
          </span>
          {userLabel ? (
            <span
              data-testid={`req-trace-edge-user-label-${id}`}
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
