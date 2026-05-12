import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';

import type { EdgeId } from '@/model';

export interface ParameterBindingEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  readonly label?: string;
}

export type ParameterBindingFlowEdge = Edge<
  ParameterBindingEdgeData,
  'parametric-parameter-binding'
>;

export const PARAMETRIC_PARAMETER_BINDING_EDGE_TYPE =
  'parametric-parameter-binding' as const;

// SysMLv2 parametric convention: a binding is a thin solid line terminated
// with a small filled circle ("binding dot") on both ends. No arrowhead;
// bindings are symmetric per ADR 0008 § 3.
export function ParameterBindingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<ParameterBindingFlowEdge>): JSX.Element {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 4,
  });

  const userLabel = data?.label;
  const markerStartId = `parametric-binding-start-${id}`;
  const markerEndId = `parametric-binding-end-${id}`;
  const stroke = selected ? 'hsl(var(--primary))' : 'currentColor';
  const strokeWidth = selected ? 2 : 1.5;

  return (
    <g data-testid={`parametric-binding-edge-${id}`} data-edge-id={id}>
      <defs>
        <marker
          id={markerStartId}
          viewBox="0 0 8 8"
          refX="4"
          refY="4"
          markerWidth="6"
          markerHeight="6"
          markerUnits="userSpaceOnUse"
        >
          <circle cx="4" cy="4" r="3" fill={stroke} />
        </marker>
        <marker
          id={markerEndId}
          viewBox="0 0 8 8"
          refX="4"
          refY="4"
          markerWidth="6"
          markerHeight="6"
          markerUnits="userSpaceOnUse"
        >
          <circle cx="4" cy="4" r="3" fill={stroke} />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={`url(#${markerStartId})`}
        markerEnd={`url(#${markerEndId})`}
        style={{
          stroke,
          strokeWidth,
          color: stroke,
        }}
      />
      {userLabel ? (
        <EdgeLabelRenderer>
          <div
            data-testid={`parametric-binding-edge-label-${id}`}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="rounded bg-card/90 px-1.5 py-0.5 text-[11px] font-medium text-foreground"
          >
            {userLabel}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}
