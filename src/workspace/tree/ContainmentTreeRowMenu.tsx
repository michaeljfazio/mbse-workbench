import { useCallback, useEffect, useRef, useState } from 'react';

import type { ElementId } from '@/model';

import type { ChildKindOption } from './childAcceptance';
import type { RepresentationOption } from './representationAcceptance';

export interface ContainmentTreeRowMenuProps {
  readonly elementId: ElementId;
  readonly canDelete: boolean;
  readonly childKinds: readonly ChildKindOption[];
  readonly representations: readonly RepresentationOption[];
  readonly onRename: () => void;
  readonly onDelete: () => void;
  readonly onCreateChild: (option: ChildKindOption) => void;
  readonly onCreateRepresentation: (option: RepresentationOption) => void;
}

export function ContainmentTreeRowMenu({
  elementId,
  canDelete,
  childKinds,
  representations,
  onRename,
  onDelete,
  onCreateChild,
  onCreateRepresentation,
}: ContainmentTreeRowMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [repOpen, setRepOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  const closeAll = useCallback(() => {
    setOpen(false);
    setCreateOpen(false);
    setRepOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent): void {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
        setCreateOpen(false);
        setRepOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false);
        setCreateOpen(false);
        setRepOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const canCreateChild = childKinds.length > 0;
  const canCreateRepresentation = representations.length > 0;

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
          setOpen((v) => {
            if (v) setCreateOpen(false);
            return !v;
          });
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
          className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-border bg-card text-xs shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            data-testid={`containment-tree-element-menu-rename-${elementId}`}
            onClick={(e) => {
              e.stopPropagation();
              closeAll();
              onRename();
            }}
            className="block w-full px-3 py-2 text-left text-foreground transition hover:bg-accent"
          >
            Rename
          </button>
          {canCreateChild ? (
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={createOpen}
              data-testid={`containment-tree-element-menu-create-child-${elementId}`}
              onClick={(e) => {
                e.stopPropagation();
                setCreateOpen((v) => !v);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-foreground transition hover:bg-accent"
            >
              <span>Create child…</span>
              <span aria-hidden="true" className="text-foreground/60">
                ▸
              </span>
            </button>
          ) : null}
          {createOpen && canCreateChild ? (
            <div
              role="menu"
              aria-label="Create child"
              data-testid={`containment-tree-element-menu-create-child-list-${elementId}`}
              className="border-t border-border bg-card"
            >
              {childKinds.map((option) => (
                <button
                  key={option.kind + ':' + option.ownerRole}
                  type="button"
                  role="menuitem"
                  data-testid={`containment-tree-element-menu-create-${option.kind}-${option.ownerRole}-${elementId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeAll();
                    onCreateChild(option);
                  }}
                  className="block w-full px-3 py-2 text-left text-foreground transition hover:bg-accent"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          {canCreateRepresentation ? (
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={repOpen}
              data-testid={`containment-tree-element-menu-create-representation-${elementId}`}
              onClick={(e) => {
                e.stopPropagation();
                setRepOpen((v) => !v);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-foreground transition hover:bg-accent"
            >
              <span>Create representation…</span>
              <span aria-hidden="true" className="text-foreground/60">
                ▸
              </span>
            </button>
          ) : null}
          {repOpen && canCreateRepresentation ? (
            <div
              role="menu"
              aria-label="Create representation"
              data-testid={`containment-tree-element-menu-create-representation-list-${elementId}`}
              className="border-t border-border bg-card"
            >
              {representations.map((option) => (
                <button
                  key={option.viewpointId + ':' + option.contextKind}
                  type="button"
                  role="menuitem"
                  data-testid={`containment-tree-element-menu-representation-${option.viewpointId}-${elementId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeAll();
                    onCreateRepresentation(option);
                  }}
                  className="block w-full px-3 py-2 text-left text-foreground transition hover:bg-accent"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              role="menuitem"
              data-testid={`containment-tree-element-menu-delete-${elementId}`}
              onClick={(e) => {
                e.stopPropagation();
                closeAll();
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
