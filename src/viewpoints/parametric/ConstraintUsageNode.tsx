import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import type { ElementId } from '@/model';

import {
  PARAMETRIC_CONSTRAINT_USAGE_HEIGHT,
  PARAMETRIC_CONSTRAINT_USAGE_WIDTH,
} from './sizes';

export type ConstraintUsageRenameCallback = (
  id: ElementId,
  name: string,
) => void;

export interface ConstraintUsageNodeData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly expression: string;
  readonly onRename: ConstraintUsageRenameCallback;
}

export type ConstraintUsageFlowNode = Node<
  ConstraintUsageNodeData,
  'parametric-constraint-usage'
>;

export const PARAMETRIC_CONSTRAINT_USAGE_NODE_TYPE =
  'parametric-constraint-usage' as const;

const HANDLE_BASE_CLASS =
  '!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary';

export function ConstraintUsageNode({
  data,
  selected,
}: NodeProps<ConstraintUsageFlowNode>): JSX.Element {
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
      data-testid={`parametric-constraint-${data.elementId}`}
      data-element-id={data.elementId}
      className={`flex h-full w-full flex-col rounded-md border-2 bg-card text-card-foreground shadow-sm transition ${
        selected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border'
      }`}
      style={{
        width: PARAMETRIC_CONSTRAINT_USAGE_WIDTH,
        height: PARAMETRIC_CONSTRAINT_USAGE_HEIGHT,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={HANDLE_BASE_CLASS}
      />
      <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          constraint
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-1 px-2 py-1">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            data-testid={`parametric-constraint-input-${data.elementId}`}
            aria-label="Constraint name"
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
            className="nodrag w-full rounded-sm border border-border bg-background px-1 py-0.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
          />
        ) : (
          <div
            data-testid={`parametric-constraint-name-${data.elementId}`}
            onDoubleClick={() => setEditing(true)}
            className="w-full truncate rounded-sm bg-transparent text-sm font-semibold text-foreground"
            title="Double-click to rename"
          >
            {data.name}
          </div>
        )}
        <div
          data-testid={`parametric-constraint-expression-${data.elementId}`}
          className="line-clamp-2 break-words font-mono text-[11px] leading-snug text-foreground/80"
          title={
            data.expression.length > 0 ? data.expression : 'No equation yet'
          }
        >
          {data.expression.length > 0 ? data.expression : '— no equation —'}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={HANDLE_BASE_CLASS}
      />
    </div>
  );
}
