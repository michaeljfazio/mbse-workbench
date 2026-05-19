import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';

import type { ElementId } from '@/model';
import {
  computeEdgePath,
  defaultRoutingStyleForType,
  defaultStrokeStyleForType,
  strokeDasharray,
} from '../shared/edgePath';

export interface IbdConnectionUsageEdgeData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly routingStyle?: string;
  readonly strokeStyle?: string;
  readonly strokeColor?: string;
}

export type IbdConnectionUsageEdge = Edge<
  IbdConnectionUsageEdgeData,
  'ibd-connection-usage'
>;

export const IBD_CONNECTION_USAGE_EDGE_TYPE = 'ibd-connection-usage' as const;

export function ConnectionUsageEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<IbdConnectionUsageEdge>): JSX.Element {
  const routingStyle =
    (data?.routingStyle as Parameters<typeof computeEdgePath>[1] | undefined) ??
    defaultRoutingStyleForType(IBD_CONNECTION_USAGE_EDGE_TYPE);
  const [edgePath, labelX, labelY] = computeEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    routingStyle,
  );

  const strokeStyleValue =
    (data?.strokeStyle as Parameters<typeof strokeDasharray>[0] | undefined) ??
    defaultStrokeStyleForType(IBD_CONNECTION_USAGE_EDGE_TYPE);
  const dashArray = strokeDasharray(strokeStyleValue);
  const strokeColor = data?.strokeColor ?? undefined;

  const name = data?.name ?? '';
  const hasLabel = name.length > 0;

  const baseStroke = selected
    ? 'hsl(var(--primary))'
    : (strokeColor ?? 'hsl(var(--foreground))');

  return (
    <g data-testid={`ibd-edge-${id}`} data-edge-kind="ConnectionUsage">
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: baseStroke,
          strokeWidth: selected ? 2.5 : 1.5,
          fill: 'none',
          ...(dashArray !== undefined ? { strokeDasharray: dashArray } : {}),
        }}
      />
      {hasLabel ? (
        <EdgeLabelRenderer>
          <div
            data-testid={`ibd-edge-label-${id}`}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm"
          >
            {name}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}
