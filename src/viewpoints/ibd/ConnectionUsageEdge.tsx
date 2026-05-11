import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';

import type { ElementId } from '@/model';

export interface IbdConnectionUsageEdgeData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const name = data?.name ?? '';
  const hasLabel = name.length > 0;

  return (
    <g data-testid={`ibd-edge-${id}`} data-edge-kind="ConnectionUsage">
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
          strokeWidth: selected ? 2.5 : 1.5,
          fill: 'none',
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
