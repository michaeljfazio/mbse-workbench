import type { Node, NodeProps } from '@xyflow/react';

import type { ElementId } from '@/model';

import { IBD_ENCLOSING_FRAME_HEADER_HEIGHT } from './enclosingFrame';

export const IBD_ENCLOSING_FRAME_NODE_TYPE = 'ibd-enclosing-frame' as const;

export interface IbdEnclosingFrameData extends Record<string, unknown> {
  readonly partDefinitionId: ElementId;
  readonly name: string;
}

export type IbdEnclosingFrameNodeType = Node<
  IbdEnclosingFrameData,
  'ibd-enclosing-frame'
>;

export function IbdEnclosingFrameNode({
  data,
}: NodeProps<IbdEnclosingFrameNodeType>): JSX.Element {
  return (
    <div
      data-testid={`ibd-enclosing-frame-${data.partDefinitionId}`}
      data-element-id={data.partDefinitionId}
      className="pointer-events-none flex h-full w-full flex-col rounded-md border-2 border-border bg-card/40 text-card-foreground"
    >
      <div
        className="flex items-center gap-2 border-b border-border bg-card/80 px-3"
        style={{ height: IBD_ENCLOSING_FRAME_HEADER_HEIGHT }}
      >
        <span
          aria-hidden="true"
          className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          &laquo;block&raquo;
        </span>
        <span
          data-testid={`ibd-enclosing-frame-name-${data.partDefinitionId}`}
          className="truncate text-sm font-semibold text-foreground"
          title={data.name}
        >
          {data.name}
        </span>
      </div>
    </div>
  );
}
