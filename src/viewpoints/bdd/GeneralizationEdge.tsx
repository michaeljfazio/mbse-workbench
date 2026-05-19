import { BaseEdge, type EdgeProps, type Edge } from '@xyflow/react';

import type { EdgeId } from '@/model';
import {
  computeEdgePath,
  defaultRoutingStyleForType,
  defaultStrokeStyleForType,
  strokeDasharray,
} from '../shared/edgePath';

export interface BddGeneralizationEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  readonly routingStyle?: string;
  readonly strokeStyle?: string;
  readonly strokeColor?: string;
}

export type BddGeneralizationEdge = Edge<BddGeneralizationEdgeData, 'bdd-generalization'>;

export const BDD_GENERALIZATION_EDGE_TYPE = 'bdd-generalization' as const;

export function GeneralizationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<BddGeneralizationEdge>): JSX.Element {
  const routingStyle =
    (data?.routingStyle as Parameters<typeof computeEdgePath>[1] | undefined) ??
    defaultRoutingStyleForType(BDD_GENERALIZATION_EDGE_TYPE);
  const [edgePath] = computeEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    routingStyle,
  );

  const strokeStyleValue =
    (data?.strokeStyle as Parameters<typeof strokeDasharray>[0] | undefined) ??
    defaultStrokeStyleForType(BDD_GENERALIZATION_EDGE_TYPE);
  const dashArray = strokeDasharray(strokeStyleValue);
  const strokeColor = data?.strokeColor ?? undefined;

  const markerId = `bdd-generalization-triangle-${id}`;
  const baseStroke = selected
    ? 'hsl(var(--primary))'
    : (strokeColor ?? 'currentColor');

  return (
    <g data-testid={`bdd-edge-${id}`} data-edge-kind="Generalization">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="12"
          markerHeight="12"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M1,1 L11,6 L1,11 Z"
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
        markerEnd={`url(#${markerId})`}
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
