import { BaseEdge, getSmoothStepPath, type EdgeProps, type Edge } from '@xyflow/react';

import type { EdgeId } from '@/model';

export interface BddDependencyEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
}

export type BddDependencyEdge = Edge<BddDependencyEdgeData, 'bdd-dependency'>;

export const BDD_DEPENDENCY_EDGE_TYPE = 'bdd-dependency' as const;

export function DependencyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps<BddDependencyEdge>): JSX.Element {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 4,
  });

  // UML 2.x / SysML 1.x convention: dependency is a dashed line ending in an
  // open arrowhead (`>` shape, no fill).
  const markerId = `bdd-dependency-arrow-${id}`;

  return (
    <g data-testid={`bdd-edge-${id}`} data-edge-kind="Dependency">
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
            d="M1,1 L11,6 L1,11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="miter"
            strokeLinecap="round"
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
          strokeDasharray: '6 4',
          color: selected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
        }}
      />
    </g>
  );
}
