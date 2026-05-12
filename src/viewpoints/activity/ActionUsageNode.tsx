import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import type { ActionNodeType, ElementId } from '@/model';

export type ActionRenameCallback = (id: ElementId, name: string) => void;

export interface ActionUsageNodeData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly nodeType: ActionNodeType;
  readonly onRename: ActionRenameCallback;
}

export type ActionUsageFlowNode = Node<ActionUsageNodeData, string>;

// Per-pseudostate dimensions chosen so that the bounding box matches the
// visible shape (handles sit on the shape, not on a phantom box around it).
export const ACTIVITY_ACTION_WIDTH = 180;
export const ACTIVITY_ACTION_HEIGHT = 80;
export const ACTIVITY_PSEUDOSTATE_CIRCLE_SIZE = 28;
export const ACTIVITY_BAR_WIDTH = 80;
export const ACTIVITY_BAR_HEIGHT = 8;
export const ACTIVITY_DIAMOND_SIZE = 70;

export interface ActionNodeSize {
  readonly width: number;
  readonly height: number;
}

export function actionNodeSize(nodeType: ActionNodeType): ActionNodeSize {
  switch (nodeType) {
    case 'action':
      return { width: ACTIVITY_ACTION_WIDTH, height: ACTIVITY_ACTION_HEIGHT };
    case 'initial':
    case 'final':
      return {
        width: ACTIVITY_PSEUDOSTATE_CIRCLE_SIZE,
        height: ACTIVITY_PSEUDOSTATE_CIRCLE_SIZE,
      };
    case 'fork':
    case 'join':
      return { width: ACTIVITY_BAR_WIDTH, height: ACTIVITY_BAR_HEIGHT };
    case 'decision':
    case 'merge':
      return { width: ACTIVITY_DIAMOND_SIZE, height: ACTIVITY_DIAMOND_SIZE };
  }
}

export function isRenamablePseudostate(nodeType: ActionNodeType): boolean {
  return nodeType !== 'initial' && nodeType !== 'final';
}

const HANDLE_BASE_CLASS =
  '!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary';

interface ShapeProps {
  readonly data: ActionUsageNodeData;
  readonly selected: boolean | undefined;
}

export function ActionUsageNode({
  data,
  selected,
}: NodeProps<ActionUsageFlowNode>): JSX.Element {
  switch (data.nodeType) {
    case 'action':
      return <ActionShape data={data} selected={selected} />;
    case 'initial':
      return <InitialShape data={data} selected={selected} />;
    case 'final':
      return <FinalShape data={data} selected={selected} />;
    case 'fork':
    case 'join':
      return <BarShape data={data} selected={selected} />;
    case 'decision':
    case 'merge':
      return <DiamondShape data={data} selected={selected} />;
  }
}

function ActionShape({ data, selected }: ShapeProps): JSX.Element {
  const { editing, draft, setDraft, beginEdit, commit, cancel, inputRef } =
    useInlineRename(data);
  return (
    <div
      data-testid={`activity-action-${data.elementId}`}
      data-element-id={data.elementId}
      data-action-node-type={data.nodeType}
      className={`flex h-full w-full items-center justify-center rounded-2xl border-2 bg-card text-card-foreground shadow-sm transition ${
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      }`}
      style={{ width: ACTIVITY_ACTION_WIDTH, height: ACTIVITY_ACTION_HEIGHT }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={HANDLE_BASE_CLASS}
      />
      <div className="flex flex-1 items-center justify-center px-3">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            data-testid={`activity-action-input-${data.elementId}`}
            aria-label="Action name"
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
            data-testid={`activity-action-label-${data.elementId}`}
            onDoubleClick={beginEdit}
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
        className={HANDLE_BASE_CLASS}
      />
    </div>
  );
}

function InitialShape({ data, selected }: ShapeProps): JSX.Element {
  return (
    <div
      data-testid={`activity-initial-${data.elementId}`}
      data-element-id={data.elementId}
      data-action-node-type="initial"
      role="img"
      aria-label="Initial node"
      className={`flex h-full w-full items-center justify-center rounded-full bg-foreground transition ${
        selected ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-muted' : ''
      }`}
      style={{
        width: ACTIVITY_PSEUDOSTATE_CIRCLE_SIZE,
        height: ACTIVITY_PSEUDOSTATE_CIRCLE_SIZE,
      }}
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
      data-testid={`activity-final-${data.elementId}`}
      data-element-id={data.elementId}
      data-action-node-type="final"
      role="img"
      aria-label="Final node"
      className={`relative flex h-full w-full items-center justify-center rounded-full border-2 border-foreground bg-card transition ${
        selected ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-muted' : ''
      }`}
      style={{
        width: ACTIVITY_PSEUDOSTATE_CIRCLE_SIZE,
        height: ACTIVITY_PSEUDOSTATE_CIRCLE_SIZE,
      }}
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

function BarShape({ data, selected }: ShapeProps): JSX.Element {
  const isFork = data.nodeType === 'fork';
  return (
    <div
      data-testid={`activity-${data.nodeType}-${data.elementId}`}
      data-element-id={data.elementId}
      data-action-node-type={data.nodeType}
      role="img"
      aria-label={isFork ? 'Fork node' : 'Join node'}
      className={`flex h-full w-full items-center justify-center bg-foreground transition ${
        selected ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-muted' : ''
      }`}
      style={{ width: ACTIVITY_BAR_WIDTH, height: ACTIVITY_BAR_HEIGHT }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
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

function DiamondShape({ data, selected }: ShapeProps): JSX.Element {
  const { editing, draft, setDraft, beginEdit, commit, cancel, inputRef } =
    useInlineRename(data);
  const isDecision = data.nodeType === 'decision';
  return (
    <div
      data-testid={`activity-${data.nodeType}-${data.elementId}`}
      data-element-id={data.elementId}
      data-action-node-type={data.nodeType}
      className={`relative flex h-full w-full items-center justify-center transition ${
        selected ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-muted' : ''
      }`}
      style={{ width: ACTIVITY_DIAMOND_SIZE, height: ACTIVITY_DIAMOND_SIZE }}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 m-auto block border-2 bg-card ${
          selected ? 'border-primary' : 'border-border'
        }`}
        style={{
          width: ACTIVITY_DIAMOND_SIZE * 0.78,
          height: ACTIVITY_DIAMOND_SIZE * 0.78,
          transform: 'rotate(45deg)',
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={HANDLE_BASE_CLASS}
      />
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          data-testid={`activity-${data.nodeType}-input-${data.elementId}`}
          aria-label={isDecision ? 'Decision label' : 'Merge label'}
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
          className="nodrag relative z-[1] w-[80%] rounded-sm border border-border bg-background px-1 py-0.5 text-center text-[11px] font-semibold text-foreground focus:border-primary focus:outline-none"
        />
      ) : (
        <div
          data-testid={`activity-${data.nodeType}-label-${data.elementId}`}
          onDoubleClick={beginEdit}
          className="relative z-[1] max-w-[80%] truncate rounded-sm bg-transparent px-1 text-center text-[11px] font-semibold text-foreground"
          title="Double-click to rename"
        >
          {data.name}
        </div>
      )}
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

function useInlineRename(data: ActionUsageNodeData): InlineRenameApi {
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
