import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import type { ElementId } from '@/model';

import { USE_CASE_USE_CASE_HEIGHT, USE_CASE_USE_CASE_WIDTH } from './sizes';

export type UseCaseRenameCallback = (id: ElementId, name: string) => void;

export interface UseCaseNodeData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly onRename: UseCaseRenameCallback;
}

export type UseCaseFlowNode = Node<UseCaseNodeData, string>;

const HANDLE_BASE_CLASS =
  '!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary';

export function UseCaseNode({
  data,
  selected,
}: NodeProps<UseCaseFlowNode>): JSX.Element {
  const { editing, draft, setDraft, beginEdit, commit, cancel, inputRef } =
    useInlineRename(data);

  return (
    <div
      data-testid={`use-case-usecase-${data.elementId}`}
      data-element-id={data.elementId}
      data-use-case-node-kind="usecase"
      className={`relative flex h-full w-full items-center justify-center bg-card text-card-foreground shadow-sm transition ${
        selected
          ? 'border-2 border-primary ring-2 ring-primary/30'
          : 'border-2 border-border'
      }`}
      style={{
        width: USE_CASE_USE_CASE_WIDTH,
        height: USE_CASE_USE_CASE_HEIGHT,
        borderRadius: '50%',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={HANDLE_BASE_CLASS}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={HANDLE_BASE_CLASS}
      />
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          data-testid={`use-case-usecase-input-${data.elementId}`}
          aria-label="Use case name"
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
          className="nodrag mx-6 w-[70%] rounded-sm border border-border bg-background px-2 py-1 text-center text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
        />
      ) : (
        <div
          data-testid={`use-case-usecase-label-${data.elementId}`}
          onDoubleClick={beginEdit}
          className="mx-6 max-w-[80%] truncate rounded-sm bg-transparent px-1 text-center text-sm font-semibold text-foreground"
          title="Double-click to rename"
        >
          {data.name}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={HANDLE_BASE_CLASS}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={HANDLE_BASE_CLASS}
      />
    </div>
  );
}

interface InlineRenameApi {
  readonly editing: boolean;
  readonly draft: string;
  readonly setDraft: (value: string) => void;
  readonly beginEdit: () => void;
  readonly commit: () => void;
  readonly cancel: () => void;
  readonly inputRef: React.RefObject<HTMLInputElement>;
}

function useInlineRename(data: UseCaseNodeData): InlineRenameApi {
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

  const beginEdit = useCallback(() => setEditing(true), []);
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

  return { editing, draft, setDraft, beginEdit, commit, cancel, inputRef };
}
