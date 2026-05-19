import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';

import type { EdgeId } from '@/model';
import {
  computeEdgePath,
  defaultRoutingStyleForType,
  defaultStrokeStyleForType,
  strokeDasharray,
} from '../shared/edgePath';

export interface UseCaseAssociationEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  // UML use-case associations rarely carry multiplicities, but the
  // `AssociationEdge` metamodel element already stores them (BDD reuses the
  // same struct). Render them when present so a round-trip through a
  // multiplicity-annotated import remains visible.
  readonly sourceMultiplicity?: string;
  readonly targetMultiplicity?: string;
  readonly routingStyle?: string;
  readonly strokeStyle?: string;
  readonly strokeColor?: string;
}

export type UseCaseAssociationFlowEdge = Edge<
  UseCaseAssociationEdgeData,
  'use-case-association'
>;

export const USE_CASE_ASSOCIATION_EDGE_TYPE = 'use-case-association' as const;

// Offsets mirror the BDD AssociationEdge geometry so multiplicity labels sit
// at the same canonical distance from each endpoint regardless of viewpoint.
const ENDPOINT_LABEL_INSET_PX = 18;
const ENDPOINT_LABEL_OFFSET_PX = 10;

function unitTangent(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { tx: number; ty: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  return { tx: dx / len, ty: dy / len };
}

export function AssociationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<UseCaseAssociationFlowEdge>): JSX.Element {
  const routingStyle =
    (data?.routingStyle as Parameters<typeof computeEdgePath>[1] | undefined) ??
    defaultRoutingStyleForType(USE_CASE_ASSOCIATION_EDGE_TYPE);
  const [edgePath] = computeEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    routingStyle,
  );

  const strokeStyleValue =
    (data?.strokeStyle as Parameters<typeof strokeDasharray>[0] | undefined) ??
    defaultStrokeStyleForType(USE_CASE_ASSOCIATION_EDGE_TYPE);
  const dashArray = strokeDasharray(strokeStyleValue);
  const strokeColor = data?.strokeColor ?? undefined;

  const { tx, ty } = unitTangent(sourceX, sourceY, targetX, targetY);
  const sourceLabelX = sourceX + tx * ENDPOINT_LABEL_INSET_PX - ty * ENDPOINT_LABEL_OFFSET_PX;
  const sourceLabelY = sourceY + ty * ENDPOINT_LABEL_INSET_PX + tx * ENDPOINT_LABEL_OFFSET_PX;
  const targetLabelX = targetX - tx * ENDPOINT_LABEL_INSET_PX - ty * ENDPOINT_LABEL_OFFSET_PX;
  const targetLabelY = targetY - ty * ENDPOINT_LABEL_INSET_PX + tx * ENDPOINT_LABEL_OFFSET_PX;

  const stroke = selected
    ? 'hsl(var(--primary))'
    : (strokeColor ?? 'currentColor');
  const strokeWidth = selected ? 2.5 : 1.75;
  const sourceMult = data?.sourceMultiplicity;
  const targetMult = data?.targetMultiplicity;

  // UML use-case convention: actor↔use-case association is a plain undirected
  // solid line. No arrowheads, no stereotype label.
  return (
    <g
      data-testid={`use-case-edge-${id}`}
      data-edge-id={id}
      data-association-edge="true"
      data-use-case-edge-kind="Association"
    >
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth,
          color: stroke,
          ...(dashArray !== undefined ? { strokeDasharray: dashArray } : {}),
        }}
      />
      {sourceMult ? (
        <EdgeLabelRenderer>
          <div
            data-testid={`use-case-association-edge-${id}-source-multiplicity`}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceLabelX}px, ${sourceLabelY}px)`,
              pointerEvents: 'none',
            }}
            className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm"
          >
            {sourceMult}
          </div>
        </EdgeLabelRenderer>
      ) : null}
      {targetMult ? (
        <EdgeLabelRenderer>
          <div
            data-testid={`use-case-association-edge-${id}-target-multiplicity`}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetLabelX}px, ${targetLabelY}px)`,
              pointerEvents: 'none',
            }}
            className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm"
          >
            {targetMult}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}
