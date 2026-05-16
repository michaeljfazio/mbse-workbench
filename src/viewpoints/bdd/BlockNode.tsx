import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Handle,
  NodeResizer,
  Position,
  type Node,
  type NodeProps,
  type OnResizeEnd,
} from '@xyflow/react';

import type { ElementId } from '@/model';

import {
  bddBlockEmptyCompartments,
  type BddBlockCompartment,
  type BddBlockCompartments,
} from './blockCompartments';

export type BlockRenameCallback = (id: ElementId, name: string) => void;
export type BlockResizeCallback = (
  id: ElementId,
  width: number,
  height: number,
) => void;

export interface BddBlockData extends Record<string, unknown> {
  readonly elementId: ElementId;
  readonly name: string;
  readonly compartments: BddBlockCompartments;
  readonly onRename: BlockRenameCallback;
  readonly onResize: BlockResizeCallback;
}

export type BddBlockNode = Node<BddBlockData, 'bdd-block'>;

export const BDD_BLOCK_NODE_TYPE = 'bdd-block' as const;

export const BDD_BLOCK_WIDTH = 220;
export const BDD_BLOCK_HEIGHT = 240;

type CompartmentKind = 'parts' | 'ports' | 'values' | 'constraints';

const COMPARTMENT_LABELS: Record<CompartmentKind, string> = {
  parts: 'parts',
  ports: 'ports',
  values: 'values',
  constraints: 'constraints',
};

const COMPARTMENT_ORDER: readonly CompartmentKind[] = [
  'parts',
  'ports',
  'values',
  'constraints',
];

interface CompartmentRowProps {
  readonly kind: CompartmentKind;
  readonly elementId: ElementId;
  readonly compartment: BddBlockCompartment;
}

function CompartmentRow({
  kind,
  elementId,
  compartment,
}: CompartmentRowProps): JSX.Element {
  const empty = compartment.items.length === 0;
  return (
    <div
      data-testid={`bdd-block-compartment-${kind}-${elementId}`}
      className="flex min-h-0 flex-1 flex-col gap-0.5 border-t border-border px-3 py-1"
    >
      <span
        data-testid={`bdd-block-compartment-label-${kind}-${elementId}`}
        className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        {COMPARTMENT_LABELS[kind]}
      </span>
      {empty ? (
        <span
          data-testid={`bdd-block-compartment-empty-${kind}-${elementId}`}
          className="truncate text-[11px] leading-snug text-foreground/60"
        >
          —
        </span>
      ) : (
        <ul className="flex flex-col gap-0">
          {compartment.items.map((item) => (
            <li
              key={item.id}
              data-testid={`bdd-block-compartment-item-${item.id}`}
              className="truncate text-[11px] leading-snug text-foreground/85"
              title={item.label}
            >
              {item.label}
            </li>
          ))}
          {compartment.overflow > 0 ? (
            <li
              data-testid={`bdd-block-compartment-overflow-${kind}-${elementId}`}
              className="truncate text-[10px] leading-snug text-muted-foreground"
            >
              +{compartment.overflow} more
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

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

  const { onResize, elementId } = data;
  const handleResizeEnd = useCallback<OnResizeEnd>(
    (_event, params) => {
      onResize(elementId, params.width, params.height);
    },
    [onResize, elementId],
  );

  const compartments = data.compartments ?? bddBlockEmptyCompartments();

  return (
    <div
      data-testid={`bdd-block-${data.elementId}`}
      data-element-id={data.elementId}
      className={`flex h-full w-full flex-col rounded-md border-2 bg-card text-card-foreground shadow-sm transition ${
        selected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border'
      }`}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={BDD_BLOCK_WIDTH}
        minHeight={BDD_BLOCK_HEIGHT}
        onResizeEnd={handleResizeEnd}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary"
      />
      <header className="flex flex-col items-center gap-0.5 px-3 pt-2 pb-1.5">
        <span
          data-testid={`bdd-block-stereotype-${data.elementId}`}
          className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          &laquo;block&raquo;
        </span>
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
      </header>
      {COMPARTMENT_ORDER.map((kind) => (
        <CompartmentRow
          key={kind}
          kind={kind}
          elementId={data.elementId}
          compartment={compartments[kind]}
        />
      ))}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!z-10 !h-3 !w-3 !rounded-full !border-2 !border-card !bg-primary"
      />
    </div>
  );
}
