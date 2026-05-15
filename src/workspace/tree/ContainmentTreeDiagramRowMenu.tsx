import { useCallback, useEffect, useRef, useState } from 'react';

import type { DiagramId } from '../diagram';

export interface ContainmentTreeDiagramRowMenuProps {
  readonly diagramId: DiagramId;
  readonly onRename: () => void;
  readonly onDelete: () => void;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function ContainmentTreeDiagramRowMenu({
  diagramId,
  onRename,
  onDelete,
  open: controlledOpen,
  onOpenChange,
}: ContainmentTreeDiagramRowMenuProps): JSX.Element {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean | ((v: boolean) => boolean)) => {
      const resolved =
        typeof next === 'function' ? (next as (v: boolean) => boolean)(open) : next;
      setInternalOpen(resolved);
      onOpenChange?.(resolved);
    },
    [onOpenChange, open],
  );
  const rootRef = useRef<HTMLSpanElement>(null);

  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent): void {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, setOpen]);

  return (
    <span ref={rootRef} className="relative ml-1 inline-flex shrink-0">
      <button
        type="button"
        tabIndex={-1}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open diagram row menu"
        data-testid={`containment-tree-diagram-menu-trigger-${diagramId}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded text-foreground/70 opacity-0 transition hover:bg-accent group-hover:opacity-100 group-focus-within:opacity-100 data-[open=true]:opacity-100"
        data-open={open}
      >
        <span aria-hidden="true" className="text-xs leading-none">
          ⋯
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Diagram row actions"
          data-testid={`containment-tree-diagram-menu-${diagramId}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-border bg-card text-xs shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            data-testid={`containment-tree-diagram-menu-rename-${diagramId}`}
            onClick={(e) => {
              e.stopPropagation();
              close();
              onRename();
            }}
            className="block w-full px-3 py-2 text-left text-foreground transition hover:bg-accent"
          >
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid={`containment-tree-diagram-menu-delete-${diagramId}`}
            onClick={(e) => {
              e.stopPropagation();
              close();
              onDelete();
            }}
            className="block w-full px-3 py-2 text-left text-destructive transition hover:bg-accent"
          >
            Delete
          </button>
        </div>
      ) : null}
    </span>
  );
}
