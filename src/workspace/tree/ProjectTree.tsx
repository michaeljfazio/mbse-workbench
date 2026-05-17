import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { isLibraryElement } from '@/library';
import {
  ELEMENT_KINDS,
  type ElementId,
  type ElementKind,
  type ModelElement,
} from '@/model';
import type { Viewpoint } from '@/viewpoints';
import { getActiveViewpoint, useWorkspaceStore } from '../store';

import { acceptedChildKinds, type ChildKindOption } from './childAcceptance';
import { kindLabel } from './kindLabels';

// Kinds creatable as direct members of the project root Package, indexed by
// kind for O(1) lookup when deciding whether a group header should render a
// "+" create affordance. Derived from the same childAcceptance table the
// Containment-Tree Create-child submenu uses, so the two affordances stay
// in sync.
const ROOT_CREATE_BY_KIND: ReadonlyMap<ElementKind, ChildKindOption> = new Map(
  acceptedChildKinds('Package').map((opt) => [opt.kind, opt] as const),
);

export const PROJECT_TREE_DRAG_TYPE = 'application/x-mbse-element-kind';
// Optional second MIME slot carried by viewpoint-specific palettes (Activity
// pseudostates) that need to discriminate which sub-variant of an
// `ElementKind` to create. Read by CanvasPane after PROJECT_TREE_DRAG_TYPE.
export const PROJECT_TREE_DRAG_NODE_TYPE = 'application/x-mbse-action-node-type';
export const PROJECT_TREE_DRAG_STATE_TYPE = 'application/x-mbse-state-node-type';
// Drag MIME carried by tree LEAVES (existing element instances). Used by the
// Package viewpoint to drop an existing element onto a Package node and
// trigger a move-between-packages compound command (#156).
export const PROJECT_TREE_DRAG_ELEMENT_ID = 'application/x-mbse-element-id';

interface TreeGroup {
  readonly kind: ElementKind;
  readonly label: string;
  readonly elements: readonly ModelElement[];
  readonly draggable: boolean;
}

type FocusKey = `group:${ElementKind}` | `leaf:${ElementId}`;

function groupKey(kind: ElementKind): FocusKey {
  return `group:${kind}`;
}

function leafKey(id: ElementId): FocusKey {
  return `leaf:${id}`;
}

// Kinds that are always shown in the palette even when their count is zero.
// This union of (a) all viewpoint palette kinds and (b) all kinds creatable
// directly under the project-root Package ensures every element kind a
// first-time architect can create is discoverable from app load. See #372.
function computeAlwaysVisibleKinds(viewpoints: readonly Viewpoint[]): ReadonlySet<ElementKind> {
  const kinds = new Set<ElementKind>();
  for (const vp of viewpoints) {
    for (const item of vp.paletteItems) kinds.add(item.elementKind);
  }
  for (const kind of ROOT_CREATE_BY_KIND.keys()) kinds.add(kind);
  return kinds;
}

function computeGroups(
  elements: readonly ModelElement[],
  viewpoints: readonly Viewpoint[],
  activeViewpoint: Viewpoint | undefined,
): TreeGroup[] {
  const elementsByKind = new Map<ElementKind, ModelElement[]>();
  for (const el of elements) {
    const bucket = elementsByKind.get(el.kind) ?? [];
    bucket.push(el);
    elementsByKind.set(el.kind, bucket);
  }

  const alwaysVisibleKinds = computeAlwaysVisibleKinds(viewpoints);

  const activePaletteKinds = new Set<ElementKind>();
  if (activeViewpoint) {
    for (const item of activeViewpoint.paletteItems) {
      activePaletteKinds.add(item.elementKind);
    }
  }

  const groups: TreeGroup[] = [];
  for (const kind of ELEMENT_KINDS) {
    const bucket = elementsByKind.get(kind);
    const hasElements = bucket !== undefined && bucket.length > 0;
    if (!hasElements && !alwaysVisibleKinds.has(kind)) continue;
    const sorted = (bucket ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    groups.push({
      kind,
      label: kindLabel(kind).group,
      elements: sorted,
      draggable: activePaletteKinds.has(kind),
    });
  }
  return groups;
}

function flattenVisible(
  groups: readonly TreeGroup[],
  collapsed: ReadonlySet<ElementKind>,
): FocusKey[] {
  const visible: FocusKey[] = [];
  for (const g of groups) {
    visible.push(groupKey(g.kind));
    if (!collapsed.has(g.kind)) {
      for (const el of g.elements) visible.push(leafKey(el.id));
    }
  }
  return visible;
}

export function ProjectTree(): JSX.Element {
  const allElements = useWorkspaceStore((s) => s.elements);
  const projectRootId = useWorkspaceStore((s) => s.project?.rootId ?? null);
  const libraryRootIds = useWorkspaceStore((s) => s.project?.libraryRootIds);
  const viewpoints = useWorkspaceStore((s) => s.viewpoints);
  const activeViewpoint = useWorkspaceStore(getActiveViewpoint);
  const selectedElementIds = useWorkspaceStore((s) => s.selectedElementIds);
  const setSelection = useWorkspaceStore((s) => s.setSelection);
  const createChildElement = useWorkspaceStore((s) => s.createChildElement);
  const setPendingRename = useWorkspaceStore((s) => s.setPendingRename);

  // The implicit project-root Package is hidden from the flat-by-kind tree:
  // it represents the project itself, not a user-modelled package. T-13.31
  // replaces this view with a containment tree where the root is the root.
  // Library elements (T-14.04) are also hidden — the LibrariesSection renders
  // them under its own header, and they would otherwise pollute kind-group
  // counts (e.g. "Blocks (5)" on a fresh project because of KerML).
  const elements = useMemo(
    () =>
      allElements.filter((e) => {
        if (projectRootId !== null && e.id === projectRootId) return false;
        if (isLibraryElement(e, libraryRootIds, allElements)) return false;
        return true;
      }),
    [allElements, projectRootId, libraryRootIds],
  );

  const [collapsed, setCollapsed] = useState<ReadonlySet<ElementKind>>(
    () => new Set(),
  );
  const [explicitFocusKey, setExplicitFocusKey] = useState<FocusKey | null>(null);

  const groups = useMemo(
    () => computeGroups(elements, viewpoints.list(), activeViewpoint),
    [elements, viewpoints, activeViewpoint],
  );

  const visibleKeys = useMemo(() => flattenVisible(groups, collapsed), [groups, collapsed]);

  // Roving-tabindex focus: prefer the user's last explicit pick when it's still
  // visible, otherwise default to the first visible item. No state-update in an
  // effect avoids re-render thrash.
  const focusKey: FocusKey | null =
    explicitFocusKey && visibleKeys.includes(explicitFocusKey)
      ? explicitFocusKey
      : visibleKeys[0] ?? null;

  const refs = useRef(new Map<FocusKey, HTMLDivElement>());

  const setRef = useCallback((key: FocusKey, el: HTMLDivElement | null) => {
    if (el === null) refs.current.delete(key);
    else refs.current.set(key, el);
  }, []);

  const focusItem = useCallback((key: FocusKey | null) => {
    if (!key) return;
    setExplicitFocusKey(key);
    queueMicrotask(() => refs.current.get(key)?.focus());
  }, []);

  // Sync roving-tabindex state when DOM focus enters a treeitem externally
  // (Tab key, test-driven el.focus()). Without this, focusKey stays anchored
  // at visibleKeys[0] (currently the empty Packages group) and ArrowDown
  // navigates from there instead of the visibly focused item.
  const syncFocus = useCallback((key: FocusKey) => {
    setExplicitFocusKey(key);
  }, []);

  const toggleGroup = useCallback((kind: ElementKind) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }, []);

  const expandGroup = useCallback((kind: ElementKind) => {
    setCollapsed((prev) => {
      if (!prev.has(kind)) return prev;
      const next = new Set(prev);
      next.delete(kind);
      return next;
    });
  }, []);

  const collapseGroup = useCallback((kind: ElementKind) => {
    setCollapsed((prev) => {
      if (prev.has(kind)) return prev;
      const next = new Set(prev);
      next.add(kind);
      return next;
    });
  }, []);

  const handleSelectLeaf = useCallback(
    (id: ElementId) => {
      setSelection([id]);
    },
    [setSelection],
  );

  const handleGroupDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, kind: ElementKind) => {
      event.dataTransfer.setData(PROJECT_TREE_DRAG_TYPE, kind);
      event.dataTransfer.effectAllowed = 'copy';
    },
    [],
  );

  const handleCreateUnderRoot = useCallback(
    (option: ChildKindOption) => {
      if (!projectRootId) return;
      const id = createChildElement(
        projectRootId,
        option.kind,
        option.ownerRole,
        `New ${option.label}`,
      );
      if (!id) return;
      setSelection([id]);
      setPendingRename(id);
    },
    [projectRootId, createChildElement, setSelection, setPendingRename],
  );

  const handleLeafDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, id: ElementId) => {
      event.dataTransfer.setData(PROJECT_TREE_DRAG_ELEMENT_ID, id);
      event.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!focusKey) return;
      const idx = visibleKeys.indexOf(focusKey);
      if (idx < 0) return;
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          const next = visibleKeys[idx + 1];
          if (next) focusItem(next);
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prev = visibleKeys[idx - 1];
          if (prev) focusItem(prev);
          break;
        }
        case 'ArrowRight': {
          event.preventDefault();
          if (focusKey.startsWith('group:')) {
            const kind = focusKey.slice('group:'.length) as ElementKind;
            if (collapsed.has(kind)) {
              expandGroup(kind);
            } else {
              const group = groups.find((g) => g.kind === kind);
              const first = group?.elements[0];
              if (first) focusItem(leafKey(first.id));
            }
          }
          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          if (focusKey.startsWith('group:')) {
            const kind = focusKey.slice('group:'.length) as ElementKind;
            if (!collapsed.has(kind)) collapseGroup(kind);
          } else if (focusKey.startsWith('leaf:')) {
            const elementId = focusKey.slice('leaf:'.length) as ElementId;
            const parent = groups.find((g) => g.elements.some((e) => e.id === elementId));
            if (parent) focusItem(groupKey(parent.kind));
          }
          break;
        }
        case 'Home': {
          event.preventDefault();
          const first = visibleKeys[0];
          if (first) focusItem(first);
          break;
        }
        case 'End': {
          event.preventDefault();
          const last = visibleKeys[visibleKeys.length - 1];
          if (last) focusItem(last);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          if (focusKey.startsWith('group:')) {
            const kind = focusKey.slice('group:'.length) as ElementKind;
            toggleGroup(kind);
          } else if (focusKey.startsWith('leaf:')) {
            const elementId = focusKey.slice('leaf:'.length) as ElementId;
            handleSelectLeaf(elementId);
          }
          break;
        }
        default:
          break;
      }
    },
    [
      focusKey,
      visibleKeys,
      collapsed,
      groups,
      focusItem,
      expandGroup,
      collapseGroup,
      toggleGroup,
      handleSelectLeaf,
    ],
  );

  const selectedSet = useMemo(() => new Set(selectedElementIds), [selectedElementIds]);

  return (
    <div
      role="tree"
      aria-label="Project tree"
      data-testid="project-tree"
      onKeyDown={onKeyDown}
      className="flex flex-col gap-0.5 p-2 text-sm"
    >
      {groups.length === 0 ? (
        <p
          data-testid="project-tree-empty"
          className="px-2 py-1 text-xs text-muted-foreground"
        >
          No elements yet. Use the canvas toolbar or drag a kind onto the canvas.
        </p>
      ) : null}
      {groups.map((group) => {
        const gKey = groupKey(group.kind);
        const isCollapsed = collapsed.has(group.kind);
        const isFocused = focusKey === gKey;
        const createOption =
          projectRootId !== null ? ROOT_CREATE_BY_KIND.get(group.kind) : undefined;
        return (
          <div key={group.kind} className="flex flex-col gap-0.5">
            <div
              role="treeitem"
              aria-level={1}
              aria-expanded={!isCollapsed}
              aria-label={`${group.label} (${group.elements.length})`}
              data-testid={`project-tree-group-${group.kind}`}
              data-kind={group.kind}
              data-collapsed={isCollapsed ? 'true' : 'false'}
              tabIndex={isFocused ? 0 : -1}
              onFocus={() => syncFocus(gKey)}
              draggable={group.draggable}
              onDragStart={
                group.draggable
                  ? (e) => handleGroupDragStart(e, group.kind)
                  : undefined
              }
              onClick={(e) => {
                e.stopPropagation();
                focusItem(gKey);
                toggleGroup(group.kind);
              }}
              ref={(el) => setRef(gKey, el)}
              className="flex cursor-pointer select-none items-center gap-1 rounded px-1 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent focus:bg-accent focus:outline-none"
            >
              <span aria-hidden="true" className="inline-block w-3 text-center text-[10px]">
                {isCollapsed ? '▸' : '▾'}
              </span>
              <span>{group.label}</span>
              <div className="ml-auto flex items-center gap-1">
                {createOption ? (
                  <button
                    type="button"
                    data-testid={`project-tree-group-create-${group.kind}`}
                    aria-label={`New ${createOption.label}`}
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateUnderRoot(createOption);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="rounded px-1 text-[11px] font-normal leading-none text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    +
                  </button>
                ) : null}
                <span className="text-[10px] font-normal text-muted-foreground/80">
                  {group.elements.length}
                </span>
              </div>
            </div>
            {isCollapsed ? null : (
              <div
                role="group"
                aria-label={`${group.label} elements`}
                className="ml-4 flex flex-col gap-0.5"
              >
                {group.elements.map((element) => {
                  const lKey = leafKey(element.id);
                  const isSelected = selectedSet.has(element.id);
                  const isLeafFocused = focusKey === lKey;
                  const subtitle =
                    element.kind === 'Requirement' && element.reqId
                      ? element.reqId
                      : undefined;
                  // Pseudostates (Activity initial/final/fork/join,
                  // State Machine initial/final) commonly have empty names —
                  // show the discriminator in guillemets so the leaf is
                  // identifiable in the tree.
                  const displayName =
                    element.name.length === 0 && element.kind === 'ActionUsage'
                      ? `«${element.nodeType}»`
                      : element.name.length === 0 && element.kind === 'StateUsage'
                        ? `«${element.stateType}»`
                        : element.name;
                  return (
                    <div
                      key={element.id}
                      role="treeitem"
                      aria-level={2}
                      aria-selected={isSelected}
                      data-testid={`project-tree-leaf-${element.id}`}
                      data-element-id={element.id}
                      tabIndex={isLeafFocused ? 0 : -1}
                      draggable
                      onDragStart={(e) => handleLeafDragStart(e, element.id)}
                      onFocus={() => syncFocus(lKey)}
                      onClick={(e) => {
                        e.stopPropagation();
                        focusItem(lKey);
                        handleSelectLeaf(element.id);
                      }}
                      ref={(el) => setRef(lKey, el)}
                      className={`flex cursor-pointer select-none items-center gap-1 rounded px-2 py-1 text-sm text-foreground hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary ${
                        isSelected ? 'bg-primary/10 text-foreground' : ''
                      }`}
                    >
                      <span className="truncate">{displayName}</span>
                      {subtitle ? (
                        <span
                          data-testid={`project-tree-leaf-subtitle-${element.id}`}
                          className="ml-auto truncate font-mono text-[10px] text-foreground/75"
                        >
                          {subtitle}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
