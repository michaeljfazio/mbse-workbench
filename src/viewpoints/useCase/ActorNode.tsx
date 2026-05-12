import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import type { ElementId } from '@/model';

import { USE_CASE_ACTOR_HEIGHT, USE_CASE_ACTOR_WIDTH } from './sizes';

export type ActorRenameCallback = (id: ElementId, name: string) => void;

export interface ActorNodeData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly onRename: ActorRenameCallback;
}

export type ActorFlowNode = Node<ActorNodeData, string>;

const HANDLE_BASE_CLASS =
  '!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary';

// Stick-figure proportions are chosen so the visible glyph fits comfortably
// inside the 80×100 bounding box with room beneath for the name caption.
const FIGURE_TOP = 8;
const FIGURE_HEIGHT = 68;
const HEAD_RADIUS = 10;
const BODY_TOP = FIGURE_TOP + HEAD_RADIUS * 2;
const BODY_BOTTOM = FIGURE_TOP + FIGURE_HEIGHT;
const SHOULDER_Y = BODY_TOP + 6;
const HIP_Y = BODY_BOTTOM - 18;
const ARM_REACH = 18;
const LEG_REACH = 14;
const CENTER_X = USE_CASE_ACTOR_WIDTH / 2;

export function ActorNode({
  data,
  selected,
}: NodeProps<ActorFlowNode>): JSX.Element {
  const { editing, draft, setDraft, beginEdit, commit, cancel, inputRef } =
    useInlineRename(data);

  return (
    <div
      data-testid={`use-case-actor-${data.elementId}`}
      data-element-id={data.elementId}
      data-use-case-node-kind="actor"
      className={`relative flex h-full w-full flex-col items-center transition ${
        selected ? 'rounded-md ring-2 ring-primary/40 ring-offset-2 ring-offset-muted' : ''
      }`}
      style={{ width: USE_CASE_ACTOR_WIDTH, height: USE_CASE_ACTOR_HEIGHT }}
    >
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={HANDLE_BASE_CLASS}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={HANDLE_BASE_CLASS}
      />
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${USE_CASE_ACTOR_WIDTH} ${FIGURE_HEIGHT + FIGURE_TOP}`}
        width={USE_CASE_ACTOR_WIDTH}
        height={FIGURE_HEIGHT + FIGURE_TOP}
        className="block text-foreground"
      >
        <circle
          cx={CENTER_X}
          cy={FIGURE_TOP + HEAD_RADIUS}
          r={HEAD_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        />
        <line
          x1={CENTER_X}
          y1={BODY_TOP}
          x2={CENTER_X}
          y2={HIP_Y}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={CENTER_X - ARM_REACH}
          y1={SHOULDER_Y + 8}
          x2={CENTER_X + ARM_REACH}
          y2={SHOULDER_Y + 8}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={CENTER_X}
          y1={HIP_Y}
          x2={CENTER_X - LEG_REACH}
          y2={BODY_BOTTOM}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={CENTER_X}
          y1={HIP_Y}
          x2={CENTER_X + LEG_REACH}
          y2={BODY_BOTTOM}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-1 flex w-full items-center justify-center px-1">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            data-testid={`use-case-actor-input-${data.elementId}`}
            aria-label="Actor name"
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
            className="nodrag w-full rounded-sm border border-border bg-background px-1 py-0.5 text-center text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
          />
        ) : (
          <div
            data-testid={`use-case-actor-label-${data.elementId}`}
            onDoubleClick={beginEdit}
            className="w-full truncate rounded-sm bg-transparent px-1 text-center text-xs font-semibold text-foreground"
            title="Double-click to rename"
          >
            {data.name}
          </div>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className={HANDLE_BASE_CLASS}
      />
      <Handle
        type="target"
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

function useInlineRename(data: ActorNodeData): InlineRenameApi {
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
