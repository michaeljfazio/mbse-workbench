import { useCallback, useEffect, useRef, useState } from 'react';

import type { ElementId } from '@/model';

export interface ContainmentTreeRowMenuProps {
  readonly elementId: ElementId;
  readonly canDelete: boolean;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}

export function ContainmentTreeRowMenu({
  elementId,
  canDelete,
  onRename,
  onDelete,
}: ContainmentTreeRowMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  const close = useCallback(() => setOpen(false), []);

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
  }, [open]);

  return (
    <span ref={rootRef} className="relative ml-1 inline-flex shrink-0">
      <button
        type="button"
        tabIndex={-1}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open row menu"
        data-testid={`containment-tree-element-menu-trigger-${elementId}`}
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
          aria-label="Row actions"
          data-testid={`containment-tree-element-menu-${elementId}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-md border border-border bg-card text-xs shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            data-testid={`containment-tree-element-menu-rename-${elementId}`}
            onClick={(e) => {
              e.stopPropagation();
              close();
              onRename();
            }}
            className="block w-full px-3 py-2 text-left text-foreground transition hover:bg-accent"
          >
            Rename
          </button>
          {canDelete ? (
            <button
              type="button"
              role="menuitem"
              data-testid={`containment-tree-element-menu-delete-${elementId}`}
              onClick={(e) => {
                e.stopPropagation();
                close();
                onDelete();
              }}
              className="block w-full px-3 py-2 text-left text-destructive transition hover:bg-accent"
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}
