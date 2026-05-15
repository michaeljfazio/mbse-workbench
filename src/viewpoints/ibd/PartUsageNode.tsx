import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import type { ElementId, PortDirection } from '@/model';

import {
  HANDLE_TYPE_BY_DIRECTION,
  directionGlyph,
  placeHandle,
} from './partUsageHelpers';

export interface IbdPartHandleSpec {
  readonly portUsageId: ElementId;
  readonly portDefinitionId: ElementId;
  readonly label: string;
  readonly direction: PortDirection;
}

export interface IbdPartUsageData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly definitionName: string;
  readonly ports: readonly IbdPartHandleSpec[];
}

export type IbdPartUsageNode = Node<IbdPartUsageData, 'ibd-part-usage'>;

export const IBD_PART_USAGE_NODE_TYPE = 'ibd-part-usage' as const;

export const IBD_PART_USAGE_WIDTH = 200;
export const IBD_PART_USAGE_HEIGHT = 100;

export function PartUsageNode({
  data,
  selected,
}: NodeProps<IbdPartUsageNode>): JSX.Element {
  const ports = data.ports;
  const total = ports.length;
  return (
    <div
      data-testid={`ibd-part-${data.elementId}`}
      data-element-id={data.elementId}
      className={`relative flex h-full w-full flex-col rounded-md border-2 bg-card text-card-foreground shadow-sm transition ${
        selected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border'
      }`}
      style={{ width: IBD_PART_USAGE_WIDTH, height: IBD_PART_USAGE_HEIGHT }}
    >
      <div className="px-3 pt-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        &laquo;part&raquo;
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-3 pb-2">
        <div
          data-testid={`ibd-part-name-${data.elementId}`}
          className="w-full truncate text-center text-sm font-semibold text-foreground"
          title={data.name}
        >
          {data.name}
        </div>
        <div
          data-testid={`ibd-part-def-${data.elementId}`}
          className="w-full truncate text-center text-xs italic text-muted-foreground"
          title={data.definitionName}
        >
          : {data.definitionName}
        </div>
      </div>
      {ports.map((port, index) => {
        const placement = placeHandle(index, total);
        const isLeft = placement.position === Position.Left;
        const glyph = directionGlyph(port.direction, placement.position);
        const glyphSpan = (
          <span
            key="glyph"
            aria-hidden="true"
            data-testid={`ibd-port-direction-${port.portUsageId}`}
            className="text-foreground/80"
          >
            {glyph}
          </span>
        );
        const labelSpan = (
          <span
            key="label"
            data-testid={`ibd-port-label-${port.portUsageId}`}
          >
            {port.label}
          </span>
        );
        return (
          <div
            key={`label-${port.portUsageId}`}
            data-testid={`ibd-port-${port.portUsageId}`}
            data-direction={port.direction}
            style={{ top: `${placement.top}%` }}
            className={`pointer-events-none absolute flex -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground ${
              isLeft ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'
            }`}
          >
            {isLeft ? [labelSpan, glyphSpan] : [glyphSpan, labelSpan]}
          </div>
        );
      })}
      {ports.map((port, index) => {
        const placement = placeHandle(index, total);
        const handleType = HANDLE_TYPE_BY_DIRECTION[port.direction];
        return (
          <Handle
            key={`handle-${port.portUsageId}`}
            id={port.portUsageId}
            type={handleType}
            position={placement.position}
            style={{ top: `${placement.top}%` }}
            data-testid={`ibd-handle-${port.portUsageId}`}
            className="!z-10 !h-3 !w-3 !rounded-none !border-2 !border-card !bg-primary"
          />
        );
      })}
    </div>
  );
}
