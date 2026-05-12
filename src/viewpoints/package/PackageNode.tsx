import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import type { ElementId } from '@/model';

import { PACKAGE_NODE_HEIGHT, PACKAGE_NODE_WIDTH, PACKAGE_TAB_HEIGHT, PACKAGE_TAB_WIDTH } from './sizes';

export type PackageRenameCallback = (id: ElementId, name: string) => void;

export interface PackageNodeData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly memberCount: number;
  readonly onRename: PackageRenameCallback;
}

export type PackageFlowNode = Node<PackageNodeData, string>;

const HANDLE_BASE_CLASS =
  '!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary';

export function PackageNode({
  data,
  selected,
}: NodeProps<PackageFlowNode>): JSX.Element {
  const { editing, draft, setDraft, beginEdit, commit, cancel, inputRef } =
    useInlineRename(data);

  const memberLabel = `${data.memberCount} ${data.memberCount === 1 ? 'member' : 'members'}`;

  return (
    <div
      data-testid={`package-node-${data.elementId}`}
      data-element-id={data.elementId}
      data-package-node="true"
      style={{ width: PACKAGE_NODE_WIDTH, height: PACKAGE_NODE_HEIGHT }}
      className={`relative ${selected ? '' : ''}`}
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
      <div
        aria-hidden="true"
        style={{
          width: PACKAGE_TAB_WIDTH,
          height: PACKAGE_TAB_HEIGHT,
        }}
        className={`flex items-center rounded-t-md border border-b-0 border-border bg-muted px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${
          selected ? 'border-primary' : ''
        }`}
      >
        package
      </div>
      <div
        style={{
          width: PACKAGE_NODE_WIDTH,
          height: PACKAGE_NODE_HEIGHT - PACKAGE_TAB_HEIGHT,
        }}
        className={`flex flex-col items-center justify-center gap-1 rounded-b-md rounded-tr-md border bg-card px-3 text-center shadow-sm transition ${
          selected
            ? 'border-primary ring-2 ring-primary/30'
            : 'border-border'
        }`}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            data-testid={`package-node-input-${data.elementId}`}
            aria-label="Package name"
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
            className="nodrag w-full rounded-sm border border-border bg-background px-1 py-0.5 text-center text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
          />
        ) : (
          <div
            data-testid={`package-node-label-${data.elementId}`}
            onDoubleClick={beginEdit}
            title="Double-click to rename"
            className="w-full truncate text-sm font-semibold text-foreground"
          >
            {data.name}
          </div>
        )}
        <div
          data-testid={`package-node-members-${data.elementId}`}
          className="text-[11px] text-muted-foreground"
        >
          {memberLabel}
        </div>
      </div>
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

function useInlineRename(data: PackageNodeData): InlineRenameApi {
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
