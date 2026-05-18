import { BaseEdge, getSmoothStepPath, type EdgeProps, type Edge } from '@xyflow/react';

import type { EdgeId } from '@/model';

export interface BddAssociationEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
}

export type BddAssociationEdge = Edge<BddAssociationEdgeData, 'bdd-association'>;

export const BDD_ASSOCIATION_EDGE_TYPE = 'bdd-association' as const;

export function AssociationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps<BddAssociationEdge>): JSX.Element {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 4,
  });

  // SysML 1.x BDD convention: association is a plain line with no end
  // adornments. Cardinality labels are a deferred enhancement (issue #430,
  // v1 keeps the edge data minimal).
  return (
    <g data-testid={`bdd-edge-${id}`} data-edge-kind="Association">
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? 'hsl(var(--primary))' : 'currentColor',
          strokeWidth: selected ? 2.5 : 1.75,
          color: selected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
        }}
      />
    </g>
  );
}
