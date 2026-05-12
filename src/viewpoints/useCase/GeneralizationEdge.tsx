import {
  BaseEdge,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';

import type { EdgeId } from '@/model';

export interface UseCaseGeneralizationEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
}

export type UseCaseGeneralizationFlowEdge = Edge<
  UseCaseGeneralizationEdgeData,
  'use-case-generalization'
>;

export const USE_CASE_GENERALIZATION_EDGE_TYPE =
  'use-case-generalization' as const;

export function GeneralizationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps<UseCaseGeneralizationFlowEdge>): JSX.Element {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 4,
  });

  const markerId = `use-case-gen-triangle-${id}`;
  const stroke = selected ? 'hsl(var(--primary))' : 'currentColor';
  const strokeWidth = selected ? 2.5 : 1.75;

  return (
    <g
      data-testid={`use-case-edge-${id}`}
      data-edge-id={id}
      data-generalization-edge="true"
      data-use-case-edge-kind="Generalization"
    >
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
        }}
      />
    </g>
  );
}
