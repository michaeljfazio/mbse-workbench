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

export interface PackageImportEdgeData extends Record<string, unknown> {
  readonly edgeId: EdgeId;
  readonly routingStyle?: string;
  readonly strokeStyle?: string;
  readonly strokeColor?: string;
}

export type PackageImportFlowEdge = Edge<
  PackageImportEdgeData,
  'package-import'
>;

export const PACKAGE_IMPORT_EDGE_TYPE = 'package-import' as const;

// SysMLv2 package import convention: a dashed arrow from the importing
// package (source) to the imported package (target), labelled «import».
export function PackageImportEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<PackageImportFlowEdge>): JSX.Element {
  const routingStyle =
    (data?.routingStyle as Parameters<typeof computeEdgePath>[1] | undefined) ??
    defaultRoutingStyleForType(PACKAGE_IMPORT_EDGE_TYPE);
  const [edgePath, labelX, labelY] = computeEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    routingStyle,
  );

  const strokeStyleValue =
    (data?.strokeStyle as Parameters<typeof strokeDasharray>[0] | undefined) ??
    defaultStrokeStyleForType(PACKAGE_IMPORT_EDGE_TYPE);
  const dashArray = strokeDasharray(strokeStyleValue);
  const strokeColor = data?.strokeColor ?? undefined;

  const markerId = `package-import-arrow-${id}`;
  const stroke = selected
    ? 'hsl(var(--primary))'
    : (strokeColor ?? 'currentColor');
  const strokeWidth = selected ? 2 : 1.5;

  return (
    <g data-testid={`package-import-edge-${id}`} data-edge-id={id} data-edge-kind="PackageImport">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 10"
          refX="11"
          refY="5"
          markerWidth="12"
          markerHeight="10"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M0,0 L12,5 L0,10"
            fill="none"
            stroke={stroke}
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
          stroke,
          strokeWidth,
          color: stroke,
          ...(dashArray !== undefined ? { strokeDasharray: dashArray } : {}),
        }}
      />
      <EdgeLabelRenderer>
        <div
          data-testid={`package-import-label-${id}`}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
          }}
          className="rounded bg-card/90 px-1.5 py-0.5 text-[11px] font-medium italic text-foreground"
        >
          «import»
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}
