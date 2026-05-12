import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';

import type { EdgeId } from '@/model';

export interface UseCaseExtendEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  readonly label?: string;
  readonly extensionPoint?: string;
}

export type UseCaseExtendFlowEdge = Edge<
  UseCaseExtendEdgeData,
  'use-case-extend'
>;

export const USE_CASE_EXTEND_EDGE_TYPE = 'use-case-extend' as const;

export function ExtendEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<UseCaseExtendFlowEdge>): JSX.Element {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 4,
  });

  const markerId = `use-case-extend-arrow-${id}`;
  const stroke = selected ? 'hsl(var(--primary))' : 'currentColor';
  const strokeWidth = selected ? 2 : 1.5;
  const userLabel = data?.label;
  const extensionPoint = data?.extensionPoint;

  return (
    <g
      data-testid={`use-case-edge-${id}`}
      data-edge-id={id}
      data-extend-edge="true"
      data-use-case-edge-kind="Extend"
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
          strokeDasharray: '4 3',
          color: stroke,
        }}
      />
      <EdgeLabelRenderer>
        <div
          data-testid={`use-case-extend-edge-label-${id}`}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
          }}
          className="flex flex-col items-center"
        >
          <span className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/80 shadow-sm">
            «extend»
          </span>
          {extensionPoint ? (
            <span
              data-testid={`use-case-extend-edge-extension-point-${id}`}
              className="mt-0.5 rounded bg-card/90 px-1.5 py-0.5 text-[10px] font-mono text-foreground/80"
            >
              {`(${extensionPoint})`}
            </span>
          ) : null}
          {userLabel ? (
            <span
              data-testid={`use-case-extend-edge-user-label-${id}`}
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
