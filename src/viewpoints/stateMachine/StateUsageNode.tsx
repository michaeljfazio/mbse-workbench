import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import type { ElementId, StateNodeType } from '@/model';

export type StateRenameCallback = (id: ElementId, name: string) => void;

export interface StateUsageNodeData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly stateType: StateNodeType;
  readonly entryAction: string | undefined;
  readonly exitAction: string | undefined;
  readonly doAction: string | undefined;
  readonly onRename: StateRenameCallback;
}

export type StateUsageFlowNode = Node<StateUsageNodeData, string>;

const HANDLE_BASE_CLASS =
  '!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary';

interface ShapeProps {
  readonly data: StateUsageNodeData;
  readonly selected: boolean | undefined;
}

export function StateUsageNode({
  data,
  selected,
}: NodeProps<StateUsageFlowNode>): JSX.Element {
  switch (data.stateType) {
    case 'state':
      return <StateShape data={data} selected={selected} />;
    case 'initial':
      return <InitialShape data={data} selected={selected} />;
    case 'final':
      return <FinalShape data={data} selected={selected} />;
  }
}

function StateShape({ data, selected }: ShapeProps): JSX.Element {
  const { editing, draft, setDraft, beginEdit, commit, cancel, inputRef } =
    useInlineRename(data);
  const actionLines: ReadonlyArray<readonly [string, string]> = [
    ...(data.entryAction ? ([['entry', data.entryAction]] as const) : []),
    ...(data.doAction ? ([['do', data.doAction]] as const) : []),
    ...(data.exitAction ? ([['exit', data.exitAction]] as const) : []),
  ];
  return (
    <div
      data-testid={`state-machine-state-${data.elementId}`}
      data-element-id={data.elementId}
      data-state-node-type="state"
      className={`flex h-full w-full flex-col rounded-2xl border-2 bg-card text-card-foreground shadow-sm transition ${
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      }`}
      style={{ width: 160, height: 72 }}
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
        id="left-target"
        className={HANDLE_BASE_CLASS}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={HANDLE_BASE_CLASS}
      />
      <div className="flex flex-1 flex-col items-stretch justify-center px-3 py-1.5">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            data-testid={`state-machine-state-input-${data.elementId}`}
            aria-label="State name"
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
            data-testid={`state-machine-state-label-${data.elementId}`}
            onDoubleClick={beginEdit}
            className="w-full truncate rounded-sm bg-transparent px-1 text-center text-sm font-semibold text-foreground"
            title="Double-click to rename"
          >
            {data.name}
          </div>
        )}
        {actionLines.length > 0 ? (
          <ul
            data-testid={`state-machine-state-actions-${data.elementId}`}
            className="mt-1 flex flex-col gap-0.5 border-t border-border/60 pt-1 text-[10px] text-foreground/75"
          >
            {actionLines.map(([label, value]) => (
              <li
                key={label}
                data-state-action={label}
                className="flex items-baseline gap-1 truncate"
              >
                <span className="font-mono font-semibold uppercase tracking-wide text-foreground/60">
                  {label}
                </span>
                <span className="font-mono text-foreground/80">/</span>
                <span className="truncate font-mono text-foreground">{value}</span>
              </li>
            ))}
          </ul>
        ) : null}
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

function InitialShape({ data, selected }: ShapeProps): JSX.Element {
  return (
    <div
      data-testid={`state-machine-initial-${data.elementId}`}
      data-element-id={data.elementId}
      data-state-node-type="initial"
      data-pseudostate-shape="circle-filled"
      role="img"
      aria-label="Initial pseudostate"
      className={`flex h-full w-full items-center justify-center rounded-full bg-foreground transition ${
        selected ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-muted' : ''
      }`}
      style={{ width: 28, height: 28 }}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={HANDLE_BASE_CLASS}
      />
    </div>
  );
}

function FinalShape({ data, selected }: ShapeProps): JSX.Element {
  return (
    <div
      data-testid={`state-machine-final-${data.elementId}`}
      data-element-id={data.elementId}
      data-state-node-type="final"
      data-pseudostate-shape="bullseye"
      role="img"
      aria-label="Final pseudostate"
      className={`relative flex h-full w-full items-center justify-center rounded-full border-2 border-foreground bg-card transition ${
        selected ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-muted' : ''
      }`}
      style={{ width: 28, height: 28 }}
    >
      <span
        aria-hidden="true"
        className="block rounded-full bg-foreground"
        style={{ width: 14, height: 14 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
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

function useInlineRename(data: StateUsageNodeData): InlineRenameApi {
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
