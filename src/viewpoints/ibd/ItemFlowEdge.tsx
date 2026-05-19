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

export interface IbdItemFlowEdgeData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly itemType: string | undefined;
  readonly routingStyle?: string;
  readonly strokeStyle?: string;
  readonly strokeColor?: string;
}

export type IbdItemFlowEdge = Edge<IbdItemFlowEdgeData, 'ibd-item-flow'>;

export const IBD_ITEM_FLOW_EDGE_TYPE = 'ibd-item-flow' as const;

export function ItemFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<IbdItemFlowEdge>): JSX.Element {
  const routingStyle =
    (data?.routingStyle as Parameters<typeof computeEdgePath>[1] | undefined) ??
    defaultRoutingStyleForType(IBD_ITEM_FLOW_EDGE_TYPE);
  const [edgePath, labelX, labelY] = computeEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    routingStyle,
  );

  const strokeStyleValue =
    (data?.strokeStyle as Parameters<typeof strokeDasharray>[0] | undefined) ??
    defaultStrokeStyleForType(IBD_ITEM_FLOW_EDGE_TYPE);
  const dashArray = strokeDasharray(strokeStyleValue);
  const strokeColor = data?.strokeColor ?? undefined;

  const markerId = `ibd-itemflow-arrow-${id}`;
  const stroke = selected
    ? 'hsl(var(--primary))'
    : (strokeColor ?? 'hsl(var(--foreground))');
  const itemType = data?.itemType ?? '';
  const name = data?.name ?? '';
  const labelText = itemType.length > 0 ? itemType : name;
  const hasLabel = labelText.length > 0;

  return (
    <g data-testid={`ibd-edge-${id}`} data-edge-kind="ItemFlow">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          markerWidth={10}
          markerHeight={10}
          refX={11}
          refY={6}
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0 0 L12 6 L0 12 Z" fill={stroke} />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{
          stroke,
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
            {labelText}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}
