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

export interface BddAssociationEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  // SysML 1.x §9.4 multiplicities at each association end. Empty / undefined
  // renders blank — same look as the pre-#434 plain-line edge.
  readonly sourceMultiplicity?: string;
  readonly targetMultiplicity?: string;
  readonly routingStyle?: string;
  readonly strokeStyle?: string;
  readonly strokeColor?: string;
}

export type BddAssociationEdge = Edge<BddAssociationEdgeData, 'bdd-association'>;

export const BDD_ASSOCIATION_EDGE_TYPE = 'bdd-association' as const;

// Offset (px) along the edge path away from the endpoint towards the edge
// midpoint. Keeps the label clear of the connecting block but close enough
// that the reader unambiguously associates the multiplicity with the
// corresponding end.
const ENDPOINT_LABEL_INSET_PX = 18;
// Perpendicular offset (px) of the label off the path itself, so the text
// does not sit on top of the line. Sign is chosen so source/target labels
// land on opposite sides of the path — standard SysML diagramming style.
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
}: EdgeProps<BddAssociationEdge>): JSX.Element {
  const routingStyle =
    (data?.routingStyle as Parameters<typeof computeEdgePath>[1] | undefined) ??
    defaultRoutingStyleForType(BDD_ASSOCIATION_EDGE_TYPE);
  const [edgePath] = computeEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    routingStyle,
  );

  const strokeStyleValue =
    (data?.strokeStyle as Parameters<typeof strokeDasharray>[0] | undefined) ??
    defaultStrokeStyleForType(BDD_ASSOCIATION_EDGE_TYPE);
  const dashArray = strokeDasharray(strokeStyleValue);
  const strokeColor = data?.strokeColor ?? undefined;

  // Position the labels along the straight chord between the endpoints.
  // getSmoothStepPath bends the rendered path orthogonally, but the chord
  // is the canonical SysML eye-line for an association: the label sits
  // adjacent to the block face the edge connects to, offset perpendicular
  // to the line of sight so it does not overlap the path.
  const { tx, ty } = unitTangent(sourceX, sourceY, targetX, targetY);
  // Perpendicular unit vector — rotate 90° CCW: (-ty, tx).
  const sourceLabelX = sourceX + tx * ENDPOINT_LABEL_INSET_PX - ty * ENDPOINT_LABEL_OFFSET_PX;
  const sourceLabelY = sourceY + ty * ENDPOINT_LABEL_INSET_PX + tx * ENDPOINT_LABEL_OFFSET_PX;
  const targetLabelX = targetX - tx * ENDPOINT_LABEL_INSET_PX - ty * ENDPOINT_LABEL_OFFSET_PX;
  const targetLabelY = targetY - ty * ENDPOINT_LABEL_INSET_PX + tx * ENDPOINT_LABEL_OFFSET_PX;

  const sourceMult = data?.sourceMultiplicity;
  const targetMult = data?.targetMultiplicity;

  const baseStroke = selected
    ? 'hsl(var(--primary))'
    : (strokeColor ?? 'currentColor');

  // SysML 1.x BDD convention: association is a plain line with no end
  // adornments. Optional multiplicity labels at each end carry the
  // cardinality (`1`, `0..*`, ...).
  return (
    <g data-testid={`bdd-edge-${id}`} data-edge-kind="Association">
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: baseStroke,
          strokeWidth: selected ? 2.5 : 1.75,
          color: selected ? 'hsl(var(--primary))' : (strokeColor ?? 'hsl(var(--foreground))'),
          ...(dashArray !== undefined ? { strokeDasharray: dashArray } : {}),
        }}
      />
      {sourceMult ? (
        <EdgeLabelRenderer>
          <div
            data-testid={`bdd-edge-${id}-source-multiplicity`}
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
            data-testid={`bdd-edge-${id}-target-multiplicity`}
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
