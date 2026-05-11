import { BaseEdge, getSmoothStepPath, type EdgeProps, type Edge } from '@xyflow/react';

import type { EdgeId } from '@/model';

export interface BddGeneralizationEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
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
}: EdgeProps<BddGeneralizationEdge>): JSX.Element {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 4,
  });

  const markerId = `bdd-generalization-triangle-${id}`;

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
          stroke: selected ? 'hsl(var(--primary))' : 'currentColor',
          strokeWidth: selected ? 2.5 : 1.75,
          color: selected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
        }}
      />
    </g>
  );
}
