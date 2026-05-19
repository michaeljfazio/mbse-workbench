import { BaseEdge, type EdgeProps, type Edge } from '@xyflow/react';

import type { EdgeId } from '@/model';
import {
  computeEdgePath,
  defaultRoutingStyleForType,
  defaultStrokeStyleForType,
  strokeDasharray,
} from '../shared/edgePath';

export interface BddAggregationEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  readonly routingStyle?: string;
  readonly strokeStyle?: string;
  readonly strokeColor?: string;
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
  data,
}: EdgeProps<BddAggregationEdge>): JSX.Element {
  const routingStyle =
    (data?.routingStyle as Parameters<typeof computeEdgePath>[1] | undefined) ??
    defaultRoutingStyleForType(BDD_AGGREGATION_EDGE_TYPE);
  const [edgePath] = computeEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    routingStyle,
  );

  const strokeStyleValue =
    (data?.strokeStyle as Parameters<typeof strokeDasharray>[0] | undefined) ??
    defaultStrokeStyleForType(BDD_AGGREGATION_EDGE_TYPE);
  const dashArray = strokeDasharray(strokeStyleValue);
  const strokeColor = data?.strokeColor ?? undefined;

  // SysML 1.x BDD convention: aggregation differs from composition only in the
  // diamond fill — hollow (background-filled) rather than solid foreground.
  const markerId = `bdd-aggregation-diamond-${id}`;
  const baseStroke = selected
    ? 'hsl(var(--primary))'
    : (strokeColor ?? 'currentColor');

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
          stroke: baseStroke,
          strokeWidth: selected ? 2.5 : 1.75,
          color: selected ? 'hsl(var(--primary))' : (strokeColor ?? 'hsl(var(--foreground))'),
          ...(dashArray !== undefined ? { strokeDasharray: dashArray } : {}),
        }}
      />
    </g>
  );
}
