import { BaseEdge, type EdgeProps, type Edge } from '@xyflow/react';

import type { EdgeId } from '@/model';
import {
  computeEdgePath,
  defaultRoutingStyleForType,
  defaultStrokeStyleForType,
  strokeDasharray,
} from '../shared/edgePath';

export interface BddDependencyEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  readonly routingStyle?: string;
  readonly strokeStyle?: string;
  readonly strokeColor?: string;
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
  data,
}: EdgeProps<BddDependencyEdge>): JSX.Element {
  const routingStyle =
    (data?.routingStyle as Parameters<typeof computeEdgePath>[1] | undefined) ??
    defaultRoutingStyleForType(BDD_DEPENDENCY_EDGE_TYPE);
  const [edgePath] = computeEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    routingStyle,
  );

  const strokeStyleValue =
    (data?.strokeStyle as Parameters<typeof strokeDasharray>[0] | undefined) ??
    defaultStrokeStyleForType(BDD_DEPENDENCY_EDGE_TYPE);
  const dashArray = strokeDasharray(strokeStyleValue);
  const strokeColor = data?.strokeColor ?? undefined;

  // UML 2.x / SysML 1.x convention: dependency is a dashed line ending in an
  // open arrowhead (`>` shape, no fill).
  const markerId = `bdd-dependency-arrow-${id}`;
  const baseStroke = selected
    ? 'hsl(var(--primary))'
    : (strokeColor ?? 'currentColor');

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
          stroke: baseStroke,
          strokeWidth: selected ? 2.5 : 1.75,
          color: selected ? 'hsl(var(--primary))' : (strokeColor ?? 'hsl(var(--foreground))'),
          ...(dashArray !== undefined ? { strokeDasharray: dashArray } : {}),
        }}
      />
    </g>
  );
}
