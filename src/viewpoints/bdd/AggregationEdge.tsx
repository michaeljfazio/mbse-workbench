import { BaseEdge, getSmoothStepPath, type EdgeProps, type Edge } from '@xyflow/react';

import type { EdgeId } from '@/model';

export interface BddAggregationEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
}

export type BddAggregationEdge = Edge<BddAggregationEdgeData, 'bdd-aggregation'>;

export const BDD_AGGREGATION_EDGE_TYPE = 'bdd-aggregation' as const;

export function AggregationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps<BddAggregationEdge>): JSX.Element {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 4,
  });

  // SysML 1.x BDD convention: aggregation differs from composition only in the
  // diamond fill — hollow (background-filled) rather than solid foreground.
  const markerId = `bdd-aggregation-diamond-${id}`;

  return (
    <g data-testid={`bdd-edge-${id}`} data-edge-kind="Aggregation">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 10"
          refX="6"
          refY="5"
          markerWidth="12"
          markerHeight="10"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M0,5 L6,0 L12,5 L6,10 Z"
            fill="hsl(var(--background))"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="miter"
          />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={`url(#${markerId})`}
        style={{
          stroke: selected ? 'hsl(var(--primary))' : 'currentColor',
          strokeWidth: selected ? 2.5 : 1.75,
          color: selected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
        }}
      />
    </g>
  );
}
