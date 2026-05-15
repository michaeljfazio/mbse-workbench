import { useCallback, useEffect, useRef, useState } from 'react';

import type { ElementId } from '@/model';

import type { ChildKindOption } from './childAcceptance';
import {
  packageTargetDisabledTitle,
  type PackageTargetOption,
} from './packageTargets';
import type { RepresentationOption } from './representationAcceptance';

export interface ContainmentTreeRowMenuProps {
  readonly elementId: ElementId;
  readonly canDelete: boolean;
  readonly childKinds: readonly ChildKindOption[];
  readonly representations: readonly RepresentationOption[];
  readonly packageTargets: readonly PackageTargetOption[];
  readonly onRename: () => void;
  readonly onDelete: () => void;
  readonly onCreateChild: (option: ChildKindOption) => void;
  readonly onCreateRepresentation: (option: RepresentationOption) => void;
  readonly onDuplicate: () => void;
  readonly onMoveToPackage: (packageId: ElementId) => void;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function ContainmentTreeRowMenu({
  elementId,
  canDelete,
  childKinds,
  representations,
  packageTargets,
  onRename,
  onDelete,
  onCreateChild,
  onCreateRepresentation,
  onDuplicate,
  onMoveToPackage,
  open: controlledOpen,
  onOpenChange,
}: ContainmentTreeRowMenuProps): JSX.Element {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean | ((v: boolean) => boolean)) => {
      const resolved =
        typeof next === 'function' ? (next as (v: boolean) => boolean)(open) : next;
      // Always mirror to internal state so closes from a controlled-open menu
      // (e.g. Escape after the parent forced it open) cleanly fall back to
      // closed when the parent releases control.
      setInternalOpen(resolved);
      onOpenChange?.(resolved);
    },
    [onOpenChange, open],
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [repOpen, setRepOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  const closeAll = useCallback(() => {
    setOpen(false);
    setCreateOpen(false);
    setRepOpen(false);
    setMoveOpen(false);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent): void {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
        setCreateOpen(false);
        setRepOpen(false);
        setMoveOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false);
        setCreateOpen(false);
        setRepOpen(false);
        setMoveOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, setOpen]);

  const canCreateChild = childKinds.length > 0;
  const canCreateRepresentation = representations.length > 0;
  const moveEnabled = packageTargets.some((t) => !t.disabled);
  const canMove = canDelete && packageTargets.length > 0;

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
            if (v) {
              setCreateOpen(false);
              setRepOpen(false);
              setMoveOpen(false);
            }
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
          className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-md border border-border bg-card text-xs shadow-lg"
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
                setRepOpen(false);
                setMoveOpen(false);
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
                setCreateOpen(false);
                setMoveOpen(false);
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
              data-testid={`containment-tree-element-menu-duplicate-${elementId}`}
              onClick={(e) => {
                e.stopPropagation();
                closeAll();
                onDuplicate();
              }}
              className="block w-full px-3 py-2 text-left text-foreground transition hover:bg-accent"
            >
              Duplicate
            </button>
          ) : null}
          {canMove ? (
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={moveOpen}
              aria-disabled={!moveEnabled}
              disabled={!moveEnabled}
              data-testid={`containment-tree-element-menu-move-to-package-${elementId}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!moveEnabled) return;
                setMoveOpen((v) => !v);
                setCreateOpen(false);
                setRepOpen(false);
              }}
              title={
                moveEnabled
                  ? undefined
                  : 'No accepting Package is available as a target'
              }
              className="flex w-full items-center justify-between px-3 py-2 text-left text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:text-foreground/40 disabled:hover:bg-transparent"
            >
              <span>Move to package…</span>
              <span aria-hidden="true" className="text-foreground/60">
                ▸
              </span>
            </button>
          ) : null}
          {moveOpen && canMove ? (
            <div
              role="menu"
              aria-label="Move to package"
              data-testid={`containment-tree-element-menu-move-to-package-list-${elementId}`}
              className="max-h-56 overflow-auto border-t border-border bg-card"
            >
              {packageTargets.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  aria-disabled={option.disabled}
                  disabled={option.disabled}
                  data-testid={`containment-tree-element-menu-move-to-${option.id}-${elementId}`}
                  data-disabled-reason={option.disabledReason}
                  title={
                    option.disabledReason
                      ? packageTargetDisabledTitle(option.disabledReason)
                      : undefined
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    if (option.disabled) return;
                    closeAll();
                    onMoveToPackage(option.id);
                  }}
                  className="block w-full truncate px-3 py-2 text-left text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:text-foreground/40 disabled:hover:bg-transparent"
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
