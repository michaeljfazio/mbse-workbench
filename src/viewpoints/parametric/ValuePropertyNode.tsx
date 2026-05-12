import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import type { ElementId, ValueLiteral, ValueType } from '@/model';

import {
  PARAMETRIC_VALUE_PROPERTY_HEIGHT,
  PARAMETRIC_VALUE_PROPERTY_WIDTH,
} from './sizes';

export type ValuePropertyRenameCallback = (
  id: ElementId,
  name: string,
) => void;

export interface ValuePropertyNodeData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly valueType: ValueType;
  readonly defaultValue: ValueLiteral | undefined;
  readonly onRename: ValuePropertyRenameCallback;
}

export type ValuePropertyFlowNode = Node<
  ValuePropertyNodeData,
  'parametric-value-property'
>;

export const PARAMETRIC_VALUE_PROPERTY_NODE_TYPE =
  'parametric-value-property' as const;

const HANDLE_BASE_CLASS =
  '!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary';

export function formatValueDefault(
  defaultValue: ValueLiteral | undefined,
): string {
  if (defaultValue === undefined) return '—';
  if (typeof defaultValue === 'string') return `"${defaultValue}"`;
  return String(defaultValue);
}

export function ValuePropertyNode({
  data,
  selected,
}: NodeProps<ValuePropertyFlowNode>): JSX.Element {
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
      data-testid={`parametric-value-${data.elementId}`}
      data-element-id={data.elementId}
      className={`flex h-full w-full flex-col rounded-md border-2 bg-card text-card-foreground shadow-sm transition ${
        selected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border'
      }`}
      style={{
        width: PARAMETRIC_VALUE_PROPERTY_WIDTH,
        height: PARAMETRIC_VALUE_PROPERTY_HEIGHT,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        data-testid={`parametric-handle-top-${data.elementId}`}
        className={HANDLE_BASE_CLASS}
      />
      <div className="flex flex-1 flex-col gap-0.5 px-2 py-1">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            data-testid={`parametric-value-input-${data.elementId}`}
            aria-label="Value property name"
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
            data-testid={`parametric-value-name-${data.elementId}`}
            onDoubleClick={() => setEditing(true)}
            className="w-full truncate rounded-sm bg-transparent text-sm font-semibold text-foreground"
            title="Double-click to rename"
          >
            {data.name}
          </div>
        )}
        <div
          data-testid={`parametric-value-meta-${data.elementId}`}
          className="truncate font-mono text-[11px] leading-snug text-foreground/80"
        >
          <span>: {data.valueType}</span>
          <span className="ml-1">= {formatValueDefault(data.defaultValue)}</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        data-testid={`parametric-handle-bottom-${data.elementId}`}
        className={HANDLE_BASE_CLASS}
      />
    </div>
  );
}
