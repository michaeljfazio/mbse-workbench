import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import type { ElementId } from '@/model';

export type BlockRenameCallback = (id: ElementId, name: string) => void;

export interface BddBlockData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly onRename: BlockRenameCallback;
}

export type BddBlockNode = Node<BddBlockData, 'bdd-block'>;

export const BDD_BLOCK_NODE_TYPE = 'bdd-block' as const;

export const BDD_BLOCK_WIDTH = 200;
export const BDD_BLOCK_HEIGHT = 80;

export function BlockNode({ data, selected }: NodeProps<BddBlockNode>): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(data.name);
  }, [data.name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const next = draft.trim();
    if (next.length > 0 && next !== data.name) {
      data.onRename(data.elementId, next);
    } else {
      setDraft(data.name);
    }
    setEditing(false);
  }, [draft, data]);

  const cancel = useCallback(() => {
    setDraft(data.name);
    setEditing(false);
  }, [data.name]);

  return (
    <div
      data-testid={`bdd-block-${data.elementId}`}
      data-element-id={data.elementId}
      className={`flex h-full w-full flex-col rounded-md border-2 bg-card text-card-foreground shadow-sm transition ${
        selected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border'
      }`}
      style={{ width: BDD_BLOCK_WIDTH, height: BDD_BLOCK_HEIGHT }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary"
      />
      <div className="px-3 pt-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        &laquo;block&raquo;
      </div>
      <div className="flex flex-1 items-center justify-center px-3 pb-2">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            data-testid={`bdd-block-input-${data.elementId}`}
            aria-label="Block name"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
              }
            }}
            className="nodrag w-full rounded-sm border border-border bg-background px-2 py-1 text-center text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
          />
        ) : (
          <div
            data-testid={`bdd-block-label-${data.elementId}`}
            onDoubleClick={() => setEditing(true)}
            className="w-full truncate rounded-sm bg-transparent px-1 text-center text-sm font-semibold text-foreground"
            title="Double-click to rename"
          >
            {data.name}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary"
      />
    </div>
  );
}
