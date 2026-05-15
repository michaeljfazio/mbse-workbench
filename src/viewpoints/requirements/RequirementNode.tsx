import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

import type {
  ElementId,
  RequirementPriority,
  RequirementStatus,
} from '@/model';

export type RequirementRenameCallback = (id: ElementId, name: string) => void;

export interface RequirementNodeData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly reqId: string | undefined;
  readonly text: string;
  readonly priority: RequirementPriority;
  readonly status: RequirementStatus;
  readonly onRename: RequirementRenameCallback;
}

export type RequirementNodeType = Node<RequirementNodeData, 'requirements-requirement'>;

export const REQUIREMENTS_REQUIREMENT_NODE_TYPE = 'requirements-requirement' as const;

export const REQUIREMENT_NODE_WIDTH = 240;
export const REQUIREMENT_NODE_HEIGHT = 180;

// Background + text shades chosen so that bold uppercase tracking-wide labels
// clear WCAG AA contrast on the card background. Tailwind palette values:
// *-100 backgrounds (≈ #F1F5F9) against *-900 text (≈ #1E293B) all sit well
// above the 4.5:1 ratio for normal text.
const PRIORITY_BADGES: Record<RequirementPriority, string> = {
  low: 'bg-slate-100 text-slate-900 border-slate-300',
  medium: 'bg-sky-100 text-sky-900 border-sky-300',
  high: 'bg-amber-100 text-amber-900 border-amber-300',
  critical: 'bg-rose-100 text-rose-900 border-rose-300',
};

const STATUS_BADGES: Record<RequirementStatus, string> = {
  draft: 'bg-slate-100 text-slate-900 border-slate-300',
  approved: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  implemented: 'bg-sky-100 text-sky-900 border-sky-300',
  verified: 'bg-violet-100 text-violet-900 border-violet-300',
  rejected: 'bg-rose-100 text-rose-900 border-rose-300',
};

export function RequirementNode({
  data,
  selected,
}: NodeProps<RequirementNodeType>): JSX.Element {
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
      data-testid={`requirements-req-${data.elementId}`}
      data-element-id={data.elementId}
      className={`flex h-full w-full flex-col rounded-md border-2 bg-card text-card-foreground shadow-sm transition ${
        selected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border'
      }`}
      style={{ width: REQUIREMENT_NODE_WIDTH, height: REQUIREMENT_NODE_HEIGHT }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        data-testid={`requirements-handle-top-${data.elementId}`}
        className="!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary"
      />
      <header className="flex flex-col gap-0.5 px-3 pt-2 pb-1.5">
        <span
          data-testid={`requirements-req-stereotype-${data.elementId}`}
          className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          &laquo;requirement&raquo;
        </span>
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            data-testid={`requirements-req-input-${data.elementId}`}
            aria-label="Requirement name"
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
            data-testid={`requirements-req-name-${data.elementId}`}
            onDoubleClick={() => setEditing(true)}
            className="w-full truncate rounded-sm bg-transparent text-sm font-semibold text-foreground"
            title="Double-click to rename"
          >
            {data.name}
          </div>
        )}
      </header>
      <div className="flex items-baseline justify-between gap-2 border-t border-border px-3 py-1">
        <span
          data-testid={`requirements-compartment-label-id-${data.elementId}`}
          className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          id
        </span>
        <span
          data-testid={`requirements-req-id-${data.elementId}`}
          className="truncate font-mono text-[11px] font-semibold tracking-tight text-foreground/85"
          title={data.reqId ? `Requirement ID: ${data.reqId}` : 'Requirement ID not set'}
        >
          {data.reqId ?? '—'}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 border-t border-border px-3 py-1">
        <span
          data-testid={`requirements-compartment-label-text-${data.elementId}`}
          className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          text
        </span>
        <p
          data-testid={`requirements-req-text-${data.elementId}`}
          className="line-clamp-2 text-[11px] leading-snug text-foreground/85"
          title={data.text.length > 0 ? data.text : 'No requirement text yet'}
        >
          {data.text.length > 0 ? data.text : 'No requirement text yet.'}
        </p>
      </div>
      <footer className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-3 py-1">
        <div className="flex items-baseline gap-1">
          <span
            data-testid={`requirements-compartment-label-priority-${data.elementId}`}
            className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            priority
          </span>
          <span
            data-testid={`requirements-priority-${data.elementId}`}
            className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              PRIORITY_BADGES[data.priority]
            }`}
          >
            {data.priority}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span
            data-testid={`requirements-compartment-label-status-${data.elementId}`}
            className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            status
          </span>
          <span
            data-testid={`requirements-status-${data.elementId}`}
            className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              STATUS_BADGES[data.status]
            }`}
          >
            {data.status}
          </span>
        </div>
      </footer>
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        data-testid={`requirements-handle-bottom-${data.elementId}`}
        className="!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary"
      />
    </div>
  );
}
