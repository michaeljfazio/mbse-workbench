import { BaseEdge, getSmoothStepPath, type EdgeProps, type Edge } from '@xyflow/react';

import type { EdgeId } from '@/model';

export interface BddCompositionEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
}

export type BddCompositionEdge = Edge<BddCompositionEdgeData, 'bdd-composition'>;

export const BDD_COMPOSITION_EDGE_TYPE = 'bdd-composition' as const;

export function CompositionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps<BddCompositionEdge>): JSX.Element {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 4,
  });

  const markerId = `bdd-composition-diamond-${id}`;

  return (
    <g data-testid={`bdd-edge-${id}`} data-edge-kind="Composition">
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
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
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
