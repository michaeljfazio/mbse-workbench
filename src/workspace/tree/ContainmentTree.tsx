import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react';

import type { ElementId, ElementKind, ModelElement } from '@/model';

import type { Diagram, DiagramId } from '../diagram';
import { useWorkspaceStore } from '../store';

import {
  buildContainmentTree,
  type ContainmentElementNode,
  type ContainmentTreeNode,
} from './buildContainmentTree';
import { acceptedChildKinds, type ChildKindOption } from './childAcceptance';
import { kindIcon } from './kindIcons';
import {
  computePackageTargets,
  type PackageTargetOption,
} from './packageTargets';
import { PROJECT_TREE_DRAG_ELEMENT_ID } from './ProjectTree';
import {
  acceptedRepresentations,
  type RepresentationOption,
} from './representationAcceptance';
import { ContainmentTreeRowMenu } from './ContainmentTreeRowMenu';
import { ContainmentTreeDiagramRowMenu } from './ContainmentTreeDiagramRowMenu';
import { CreateParametricOwnerPopover } from './CreateParametricOwnerPopover';
import {
  computeFilteredKeys,
  tokenizeFilter,
  type TreeFilterKey,
} from './treeFilter';

type FocusKey = `el:${ElementId}` | `dg:${DiagramId}`;

function elKey(id: ElementId): FocusKey {
  return `el:${id}`;
}

function dgKey(id: DiagramId): FocusKey {
  return `dg:${id}`;
}

interface FlatRow {
  readonly key: FocusKey;
  readonly node: ContainmentTreeNode;
  readonly depth: number;
  readonly parentKey: FocusKey | null;
  readonly hasChildren: boolean;
}

function flatten(
  root: ContainmentElementNode,
  expanded: ReadonlySet<FocusKey>,
): FlatRow[] {
  const rows: FlatRow[] = [];
  function walk(
    node: ContainmentTreeNode,
    depth: number,
    parentKey: FocusKey | null,
  ): void {
    const key: FocusKey =
      node.kind === 'element' ? elKey(node.element.id) : dgKey(node.diagram.id);
    const hasChildren = node.kind === 'element' && node.children.length > 0;
    rows.push({ key, node, depth, parentKey, hasChildren });
    if (node.kind === 'element' && hasChildren && expanded.has(key)) {
      for (const child of node.children) walk(child, depth + 1, key);
    }
  }
  walk(root, 0, null);
  return rows;
}

function elementDisplayName(element: ModelElement): string {
  if (element.name.length > 0) return element.name;
  if (element.kind === 'ActionUsage') return `«${element.nodeType}»`;
  if (element.kind === 'StateUsage') return `«${element.stateType}»`;
  return `(untitled ${element.kind})`;
}

export function ContainmentTree(): JSX.Element {
  const elements = useWorkspaceStore((s) => s.elements);
  const diagrams = useWorkspaceStore((s) => s.diagrams);
  const rootId = useWorkspaceStore((s) => s.project?.rootId ?? null);
  const selectedElementIds = useWorkspaceStore((s) => s.selectedElementIds);
  const activeDiagramId = useWorkspaceStore((s) => s.activeDiagramId);
  const setSelection = useWorkspaceStore((s) => s.setSelection);
  const setActiveDiagram = useWorkspaceStore((s) => s.setActiveDiagram);
  const renameElementAction = useWorkspaceStore((s) => s.renameElement);
  const deleteElementAction = useWorkspaceStore((s) => s.deleteElement);
  const createChildElementAction = useWorkspaceStore((s) => s.createChildElement);
  const createDiagramAction = useWorkspaceStore((s) => s.createDiagram);
  const createRepresentationWithImplicitOwnerAction = useWorkspaceStore(
    (s) => s.createRepresentationWithImplicitOwner,
  );
  const setActiveDiagramAction = useWorkspaceStore((s) => s.setActiveDiagram);
  const renameDiagramAction = useWorkspaceStore((s) => s.renameDiagram);
  const deleteDiagramAction = useWorkspaceStore((s) => s.deleteDiagram);
  const moveElementAction = useWorkspaceStore((s) => s.moveElement);
  const duplicateElementAction = useWorkspaceStore((s) => s.duplicateElement);
  const pendingRenameElementId = useWorkspaceStore(
    (s) => s.pendingRenameElementId,
  );
  const setPendingRename = useWorkspaceStore((s) => s.setPendingRename);

  const [renamingId, setRenamingId] = useState<ElementId | null>(null);
  const [renamingDiagramId, setRenamingDiagramId] = useState<DiagramId | null>(
    null,
  );
  const [contextMenuOpenKey, setContextMenuOpenKey] = useState<FocusKey | null>(
    null,
  );
  // Per ADR 0014, the Parametric branch of the Package-row "Create
  // representation…" submenu opens a small popover prompting the architect
  // for the owner kind to create. Stored here so the popover renders in the
  // tree pane's stacking context.
  const [parametricOwnerPrompt, setParametricOwnerPrompt] = useState<{
    readonly ownerRowId: ElementId;
    readonly option: RepresentationOption;
    readonly kinds: readonly ElementKind[];
    readonly anchor: { readonly x: number; readonly y: number };
  } | null>(null);

  const beginRename = useCallback((id: ElementId) => {
    setRenamingId(id);
  }, []);

  const commitRename = useCallback(
    (id: ElementId, name: string) => {
      const trimmed = name.trim();
      if (trimmed.length > 0) renameElementAction(id, trimmed);
      setRenamingId(null);
    },
    [renameElementAction],
  );

  const cancelRename = useCallback(() => setRenamingId(null), []);

  const requestDelete = useCallback(
    (id: ElementId) => {
      deleteElementAction(id);
    },
    [deleteElementAction],
  );

  const requestCreateChild = useCallback(
    (ownerId: ElementId, option: ChildKindOption) => {
      const defaultName = `New ${option.label}`;
      const newId = createChildElementAction(
        ownerId,
        option.kind,
        option.ownerRole,
        defaultName,
      );
      if (!newId) return;
      // Auto-expand parent so the new child is visible.
      setCollapsed((prev) => {
        const key = elKey(ownerId);
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setSelection([newId]);
      setRenamingId(newId);
    },
    [createChildElementAction, setSelection],
  );

  const root = useMemo(
    () => buildContainmentTree({ elements, diagrams, rootId }),
    [elements, diagrams, rootId],
  );

  const elementsById = useMemo(() => {
    const m = new Map<ElementId, ModelElement>();
    for (const e of elements) m.set(e.id, e);
    return m;
  }, [elements]);

  const diagramsById = useMemo(() => {
    const m = new Map<DiagramId, Diagram>();
    for (const d of diagrams) m.set(d.id, d);
    return m;
  }, [diagrams]);

  const beginDiagramRename = useCallback((id: DiagramId) => {
    setRenamingDiagramId(id);
  }, []);

  const commitDiagramRename = useCallback(
    (id: DiagramId, name: string) => {
      const trimmed = name.trim();
      if (trimmed.length > 0) renameDiagramAction(id, trimmed);
      setRenamingDiagramId(null);
    },
    [renameDiagramAction],
  );

  const cancelDiagramRename = useCallback(
    () => setRenamingDiagramId(null),
    [],
  );

  const requestDiagramDelete = useCallback(
    (id: DiagramId) => {
      deleteDiagramAction(id);
    },
    [deleteDiagramAction],
  );

  const requestDuplicate = useCallback(
    (id: ElementId) => {
      const newId = duplicateElementAction(id);
      if (!newId) return;
      setPendingRename(newId);
    },
    [duplicateElementAction, setPendingRename],
  );

  const requestMoveToPackage = useCallback(
    (id: ElementId, packageId: ElementId) => {
      moveElementAction(id, packageId);
    },
    [moveElementAction],
  );

  // Per ADR 0014 / #413: when a `RepresentationOption` carries an
  // `implicitOwnerKind`, dispatch ONE `compound` bus command containing the
  // implicit owner's `create-element` and the new diagram's `create-diagram`
  // so a single Cmd-Z reverses both atomically. When the option carries
  // `implicitOwnerPromptKinds`, a popover prompts the architect to pick the
  // owner kind; the same compound dispatch fires once they confirm.
  const performCreateRepresentation = useCallback(
    (
      ownerRowId: ElementId,
      option: RepresentationOption,
      resolvedOwnerKind: ElementKind | null,
    ) => {
      if (resolvedOwnerKind !== null) {
        // Compound path: create owner + diagram in one bus dispatch.
        const ownerChildOption = acceptedChildKinds('Package').find(
          (opt) => opt.kind === resolvedOwnerKind,
        );
        if (!ownerChildOption) return;
        const ownerName = `New ${ownerChildOption.label}`;
        const diagramName = `${ownerName} ${option.label.split(' (')[0]}`;
        const result = createRepresentationWithImplicitOwnerAction(
          ownerRowId,
          ownerChildOption.kind,
          ownerChildOption.ownerRole,
          ownerName,
          option.viewpointId,
          diagramName,
          option.contextKind,
        );
        if (!result) return;
        setActiveDiagramAction(result.diagramId);
        setCollapsed((prev) => {
          const key = elKey(ownerRowId);
          if (!prev.has(key)) return prev;
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        setSelection([result.ownerId]);
        return;
      }
      // Single-step path: no implicit owner. The diagram anchors directly to
      // the clicked tree row. Goes through the existing `createDiagram`
      // entry point (which now is itself bus-dispatched per #413, but as a
      // single command — no compound needed because there's only one effect).
      const owner = elementsById.get(ownerRowId);
      const ownerName =
        owner && owner.name.length > 0 ? owner.name : owner?.kind ?? 'Package';
      const name = `${ownerName} ${option.label.split(' (')[0]}`;
      const newDiagramId = createDiagramAction(option.viewpointId, {
        name,
        context: { kind: option.contextKind, id: ownerRowId },
      });
      if (!newDiagramId) return;
      setActiveDiagramAction(newDiagramId);
      setCollapsed((prev) => {
        const key = elKey(ownerRowId);
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    },
    [
      createDiagramAction,
      createRepresentationWithImplicitOwnerAction,
      elementsById,
      setActiveDiagramAction,
      setSelection,
    ],
  );

  const requestCreateRepresentation = useCallback(
    (
      ownerId: ElementId,
      option: RepresentationOption,
      anchor: { readonly x: number; readonly y: number },
    ) => {
      const owner = elementsById.get(ownerId);
      if (!owner) return;
      if (option.implicitOwnerPromptKinds && option.implicitOwnerPromptKinds.length > 0) {
        setParametricOwnerPrompt({
          ownerRowId: ownerId,
          option,
          kinds: option.implicitOwnerPromptKinds,
          anchor,
        });
        return;
      }
      performCreateRepresentation(
        ownerId,
        option,
        option.implicitOwnerKind ?? null,
      );
    },
    [elementsById, performCreateRepresentation],
  );

  const ancestorsOfElement = useCallback(
    (id: ElementId): ElementId[] => {
      const out: ElementId[] = [];
      let cur = elementsById.get(id);
      const seen = new Set<ElementId>();
      while (cur && cur.ownerId && !seen.has(cur.ownerId)) {
        seen.add(cur.ownerId);
        out.push(cur.ownerId);
        cur = elementsById.get(cur.ownerId);
      }
      return out;
    },
    [elementsById],
  );

  const dragStateRef = useRef<{
    id: ElementId;
    kind: ElementKind;
  } | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<FocusKey | null>(null);

  const isAcceptedDrop = useCallback(
    (target: ModelElement): boolean => {
      const drag = dragStateRef.current;
      if (!drag) return false;
      if (drag.id === target.id) return false;
      // Cycle pre-check: target must not be a descendant of the dragged element.
      let cur: ModelElement | undefined = target;
      const seen = new Set<ElementId>();
      while (cur && cur.ownerId && !seen.has(cur.ownerId)) {
        if (cur.ownerId === drag.id) return false;
        seen.add(cur.ownerId);
        cur = elementsById.get(cur.ownerId);
      }
      return acceptedChildKinds(target.kind).some((o) => o.kind === drag.kind);
    },
    [elementsById],
  );

  const handleElementDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, element: ModelElement) => {
      event.dataTransfer.setData(PROJECT_TREE_DRAG_ELEMENT_ID, element.id);
      event.dataTransfer.effectAllowed = 'move';
      dragStateRef.current = { id: element.id, kind: element.kind };
    },
    [],
  );

  const handleElementDragEnd = useCallback(() => {
    dragStateRef.current = null;
    setDropTargetKey(null);
  }, []);

  const handleElementDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>, target: ModelElement) => {
      if (!isAcceptedDrop(target)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const k = elKey(target.id);
      setDropTargetKey((prev) => (prev === k ? prev : k));
    },
    [isAcceptedDrop],
  );

  const handleElementDragLeave = useCallback(
    (_event: DragEvent<HTMLDivElement>, target: ModelElement) => {
      const k = elKey(target.id);
      setDropTargetKey((prev) => (prev === k ? null : prev));
    },
    [],
  );

  const handleElementDrop = useCallback(
    (event: DragEvent<HTMLDivElement>, target: ModelElement) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      event.preventDefault();
      if (drag.id !== target.id) {
        moveElementAction(drag.id, target.id);
      }
      dragStateRef.current = null;
      setDropTargetKey(null);
    },
    [moveElementAction],
  );

  // Default: every element node starts expanded. Collapse-state lives in the
  // user-toggled overrides set; absence of an override means "use default".
  const [collapsed, setCollapsed] = useState<ReadonlySet<FocusKey>>(() => new Set());

  const [filter, setFilter] = useState('');
  const filterTokens = useMemo(() => tokenizeFilter(filter), [filter]);
  const filteredKeys = useMemo<ReadonlySet<TreeFilterKey> | null>(
    () => computeFilteredKeys(root, filterTokens),
    [root, filterTokens],
  );

  const expanded = useMemo<ReadonlySet<FocusKey>>(() => {
    if (!root) return new Set();
    const all = new Set<FocusKey>();
    function visit(node: ContainmentTreeNode): void {
      if (node.kind !== 'element') return;
      all.add(elKey(node.element.id));
      for (const child of node.children) visit(child);
    }
    visit(root);
    // When a filter is active, force-expand every element so ancestors of
    // matches are traversed by flatten(); user-toggled collapse state is
    // overridden for the duration of the filter.
    if (filteredKeys === null) {
      for (const k of collapsed) all.delete(k);
    }
    return all;
  }, [root, collapsed, filteredKeys]);

  const rows = useMemo(() => {
    if (!root) return [];
    const all = flatten(root, expanded);
    if (filteredKeys === null) return all;
    return all.filter((r) => filteredKeys.has(r.key as TreeFilterKey));
  }, [root, expanded, filteredKeys]);

  const [explicitFocusKey, setExplicitFocusKey] = useState<FocusKey | null>(null);
  const focusKey: FocusKey | null =
    explicitFocusKey && rows.some((r) => r.key === explicitFocusKey)
      ? explicitFocusKey
      : rows[0]?.key ?? null;

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

  const syncFocus = useCallback((key: FocusKey) => {
    setExplicitFocusKey(key);
  }, []);

  const toggleExpanded = useCallback((key: FocusKey) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandKey = useCallback((key: FocusKey) => {
    setCollapsed((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const collapseKey = useCallback((key: FocusKey) => {
    setCollapsed((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const handleActivate = useCallback(
    (row: FlatRow) => {
      if (row.node.kind === 'element') {
        setSelection([row.node.element.id]);
      } else {
        setActiveDiagram(row.node.diagram.id);
      }
    },
    [setSelection, setActiveDiagram],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!focusKey) return;
      const idx = rows.findIndex((r) => r.key === focusKey);
      if (idx < 0) return;
      const row = rows[idx]!;
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          const next = rows[idx + 1];
          if (next) focusItem(next.key);
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prev = rows[idx - 1];
          if (prev) focusItem(prev.key);
          break;
        }
        case 'ArrowRight': {
          event.preventDefault();
          if (row.hasChildren) {
            if (!expanded.has(row.key)) {
              expandKey(row.key);
            } else {
              const firstChild = rows[idx + 1];
              if (firstChild && firstChild.parentKey === row.key) {
                focusItem(firstChild.key);
              }
            }
          }
          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          if (row.hasChildren && expanded.has(row.key)) {
            collapseKey(row.key);
          } else if (row.parentKey) {
            focusItem(row.parentKey);
          }
          break;
        }
        case 'Home': {
          event.preventDefault();
          const first = rows[0];
          if (first) focusItem(first.key);
          break;
        }
        case 'End': {
          event.preventDefault();
          const last = rows[rows.length - 1];
          if (last) focusItem(last.key);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          handleActivate(row);
          break;
        }
        default:
          break;
      }
    },
    [focusKey, rows, expanded, expandKey, collapseKey, focusItem, handleActivate],
  );

  const selectedSet = useMemo(
    () => new Set(selectedElementIds),
    [selectedElementIds],
  );

  const selectedElementId: ElementId | null = selectedElementIds[0] ?? null;

  const expandAncestors = useCallback(
    (ancestors: readonly ElementId[]) => {
      if (ancestors.length === 0) return;
      setCollapsed((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (const a of ancestors) {
          const k = elKey(a);
          if (next.has(k)) {
            next.delete(k);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    [],
  );

  const scrollKeyIntoView = useCallback((key: FocusKey) => {
    queueMicrotask(() => {
      const el = refs.current.get(key);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }, []);

  useEffect(() => {
    if (!root || !selectedElementId) return;
    expandAncestors(ancestorsOfElement(selectedElementId));
    scrollKeyIntoView(elKey(selectedElementId));
  }, [
    root,
    selectedElementId,
    ancestorsOfElement,
    expandAncestors,
    scrollKeyIntoView,
  ]);

  useEffect(() => {
    if (!root || !activeDiagramId) return;
    const dg = diagramsById.get(activeDiagramId);
    const ctxId = dg?.context?.id;
    const ancestors = ctxId
      ? [ctxId, ...ancestorsOfElement(ctxId)]
      : [];
    expandAncestors(ancestors);
    scrollKeyIntoView(dgKey(activeDiagramId));
  }, [
    root,
    activeDiagramId,
    diagramsById,
    ancestorsOfElement,
    expandAncestors,
    scrollKeyIntoView,
  ]);

  useEffect(() => {
    if (!pendingRenameElementId) return;
    if (!elementsById.has(pendingRenameElementId)) {
      // Pending rename references an element that no longer exists (e.g.
      // creation failed or was undone). Drop it so we don't loop.
      setPendingRename(null);
      return;
    }
    expandAncestors(ancestorsOfElement(pendingRenameElementId));
    setRenamingId(pendingRenameElementId);
    scrollKeyIntoView(elKey(pendingRenameElementId));
    setPendingRename(null);
  }, [
    pendingRenameElementId,
    elementsById,
    ancestorsOfElement,
    expandAncestors,
    scrollKeyIntoView,
    setPendingRename,
  ]);

  const filterInput = (
    <div className="px-2 pt-2">
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter…"
        aria-label="Filter containment tree"
        data-testid="containment-tree-filter"
        className="w-full rounded border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );

  if (!root) {
    return (
      <div className="flex flex-col">
        {filterInput}
        <div
          role="tree"
          aria-label="Containment tree"
          data-testid="containment-tree"
          className="flex flex-col gap-0.5 p-2 text-sm"
        >
          <p
            data-testid="containment-tree-empty"
            className="px-2 py-1 text-xs text-muted-foreground"
          >
            No project loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {filterInput}
      <div
        role="tree"
        aria-label="Containment tree"
        data-testid="containment-tree"
        onKeyDown={onKeyDown}
        className="flex flex-col gap-0.5 p-2 text-sm"
      >
        {filterTokens.length > 0 && rows.length === 0 ? (
          <p
            data-testid="containment-tree-no-matches"
            className="px-2 py-1 text-xs text-muted-foreground"
          >
            No matches.
          </p>
        ) : null}
        {rows.map((row) =>
        row.node.kind === 'element'
          ? renderElementRow(row, row.node, {
              focusKey,
              expanded,
              selectedSet,
              setRef,
              focusItem,
              syncFocus,
              toggleExpanded,
              handleActivate,
              renamingId,
              beginRename,
              commitRename,
              cancelRename,
              requestDelete,
              requestCreateChild,
              requestCreateRepresentation,
              requestDuplicate,
              requestMoveToPackage,
              elements,
              dropTargetKey,
              onDragStart: handleElementDragStart,
              onDragEnd: handleElementDragEnd,
              onDragOver: handleElementDragOver,
              onDragLeave: handleElementDragLeave,
              onDrop: handleElementDrop,
              contextMenuOpenKey,
              setContextMenuOpenKey,
            })
          : renderDiagramRow(row, row.node.diagram, {
              focusKey,
              activeDiagramId,
              setRef,
              focusItem,
              syncFocus,
              handleActivate,
              renamingDiagramId,
              beginDiagramRename,
              commitDiagramRename,
              cancelDiagramRename,
              requestDiagramDelete,
              contextMenuOpenKey,
              setContextMenuOpenKey,
            }),
      )}
      </div>
      {parametricOwnerPrompt ? (
        <CreateParametricOwnerPopover
          x={parametricOwnerPrompt.anchor.x}
          y={parametricOwnerPrompt.anchor.y}
          kinds={parametricOwnerPrompt.kinds}
          onPick={(kind) => {
            const prompt = parametricOwnerPrompt;
            setParametricOwnerPrompt(null);
            performCreateRepresentation(prompt.ownerRowId, prompt.option, kind);
          }}
          onCancel={() => setParametricOwnerPrompt(null)}
        />
      ) : null}
    </div>
  );
}

interface ElementRowContext {
  readonly focusKey: FocusKey | null;
  readonly expanded: ReadonlySet<FocusKey>;
  readonly selectedSet: ReadonlySet<ElementId>;
  readonly setRef: (key: FocusKey, el: HTMLDivElement | null) => void;
  readonly focusItem: (key: FocusKey | null) => void;
  readonly syncFocus: (key: FocusKey) => void;
  readonly toggleExpanded: (key: FocusKey) => void;
  readonly handleActivate: (row: FlatRow) => void;
  readonly renamingId: ElementId | null;
  readonly beginRename: (id: ElementId) => void;
  readonly commitRename: (id: ElementId, name: string) => void;
  readonly cancelRename: () => void;
  readonly requestDelete: (id: ElementId) => void;
  readonly requestCreateChild: (ownerId: ElementId, option: ChildKindOption) => void;
  readonly requestCreateRepresentation: (
    ownerId: ElementId,
    option: RepresentationOption,
    anchor: { readonly x: number; readonly y: number },
  ) => void;
  readonly requestDuplicate: (id: ElementId) => void;
  readonly requestMoveToPackage: (id: ElementId, packageId: ElementId) => void;
  readonly elements: readonly ModelElement[];
  readonly dropTargetKey: FocusKey | null;
  readonly onDragStart: (
    event: DragEvent<HTMLDivElement>,
    element: ModelElement,
  ) => void;
  readonly onDragEnd: () => void;
  readonly onDragOver: (
    event: DragEvent<HTMLDivElement>,
    target: ModelElement,
  ) => void;
  readonly onDragLeave: (
    event: DragEvent<HTMLDivElement>,
    target: ModelElement,
  ) => void;
  readonly onDrop: (
    event: DragEvent<HTMLDivElement>,
    target: ModelElement,
  ) => void;
  readonly contextMenuOpenKey: FocusKey | null;
  readonly setContextMenuOpenKey: (key: FocusKey | null) => void;
}

function renderElementRow(
  row: FlatRow,
  node: ContainmentElementNode,
  ctx: ElementRowContext,
): JSX.Element {
  const element = node.element;
  const isFocused = ctx.focusKey === row.key;
  const isSelected = ctx.selectedSet.has(element.id);
  const isExpanded = ctx.expanded.has(row.key);
  const hasChildren = row.hasChildren;
  const isRenaming = ctx.renamingId === element.id;
  const displayName = elementDisplayName(element);
  const canDelete = element.ownerId !== null;
  const isDraggable = element.ownerId !== null && !isRenaming;
  const isDropTarget = ctx.dropTargetKey === row.key;
  return (
    <div
      key={row.key}
      role="treeitem"
      aria-level={row.depth + 1}
      aria-selected={isSelected}
      aria-expanded={hasChildren ? isExpanded : undefined}
      data-testid={`containment-tree-element-${element.id}`}
      data-element-id={element.id}
      data-kind={element.kind}
      data-depth={row.depth}
      data-droptarget={isDropTarget ? 'true' : undefined}
      tabIndex={isFocused ? 0 : -1}
      ref={(el) => ctx.setRef(row.key, el)}
      onFocus={() => ctx.syncFocus(row.key)}
      onClick={(e) => {
        if (isRenaming) return;
        e.stopPropagation();
        ctx.focusItem(row.key);
        ctx.handleActivate(row);
      }}
      draggable={isDraggable}
      onDragStart={
        isDraggable ? (e) => ctx.onDragStart(e, element) : undefined
      }
      onDragEnd={isDraggable ? ctx.onDragEnd : undefined}
      onDragOver={(e) => ctx.onDragOver(e, element)}
      onDragLeave={(e) => ctx.onDragLeave(e, element)}
      onDrop={(e) => ctx.onDrop(e, element)}
      onContextMenu={(e) => {
        if (isRenaming) return;
        e.preventDefault();
        e.stopPropagation();
        ctx.setContextMenuOpenKey(row.key);
      }}
      style={{ paddingLeft: `${row.depth * 12 + 4}px` }}
      className={`group flex cursor-pointer select-none items-center gap-1 rounded px-1 py-1 text-sm text-foreground hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary ${
        isSelected ? 'bg-primary/10' : ''
      } ${isDropTarget ? 'bg-primary/20 ring-1 ring-primary' : ''}`}
    >
      <span
        aria-hidden="true"
        data-testid={`containment-tree-element-disclosure-${element.id}`}
        onClick={(e) => {
          if (!hasChildren) return;
          e.stopPropagation();
          ctx.toggleExpanded(row.key);
        }}
        className="inline-block w-3 shrink-0 text-center text-[10px] text-muted-foreground"
      >
        {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
      </span>
      <KindIcon kind={element.kind} />
      {isRenaming ? (
        <ContainmentTreeRenameInput
          elementId={element.id}
          initialValue={displayName}
          onCommit={(name) => ctx.commitRename(element.id, name)}
          onCancel={ctx.cancelRename}
        />
      ) : (
        <span className="truncate">{displayName}</span>
      )}
      <span
        aria-hidden="true"
        className="ml-auto shrink-0 truncate text-[10px] uppercase tracking-wide text-foreground/75"
      >
        {element.kind}
      </span>
      {!isRenaming ? (
        <ContainmentTreeRowMenu
          elementId={element.id}
          canDelete={canDelete}
          childKinds={acceptedChildKinds(element.kind)}
          representations={acceptedRepresentations(element.kind)}
          packageTargets={
            canDelete
              ? computePackageTargets({ element, elements: ctx.elements })
              : ([] as readonly PackageTargetOption[])
          }
          onRename={() => ctx.beginRename(element.id)}
          onDelete={() => ctx.requestDelete(element.id)}
          onCreateChild={(option) => ctx.requestCreateChild(element.id, option)}
          onCreateRepresentation={(option, anchor) =>
            ctx.requestCreateRepresentation(element.id, option, anchor)
          }
          onDuplicate={() => ctx.requestDuplicate(element.id)}
          onMoveToPackage={(packageId) =>
            ctx.requestMoveToPackage(element.id, packageId)
          }
          open={ctx.contextMenuOpenKey === row.key ? true : undefined}
          onOpenChange={(o) => {
            if (!o && ctx.contextMenuOpenKey === row.key) {
              ctx.setContextMenuOpenKey(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function KindIcon({ kind }: { readonly kind: ElementKind }): JSX.Element {
  const Icon = kindIcon(kind);
  return (
    <Icon
      aria-hidden="true"
      data-kind-icon={kind}
      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
    />
  );
}

interface RenameInputProps {
  readonly elementId: ElementId;
  readonly initialValue: string;
  readonly onCommit: (name: string) => void;
  readonly onCancel: () => void;
}

function ContainmentTreeRenameInput({
  elementId,
  initialValue,
  onCommit,
  onCancel,
}: RenameInputProps): JSX.Element {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      data-testid={`containment-tree-element-rename-${elementId}`}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          onCommit(value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        } else if (
          (e.metaKey || e.ctrlKey) &&
          e.key.toLowerCase() === 'z' &&
          value === initialValue
        ) {
          // Cmd-Z (or Ctrl-Z) on the untouched inline-rename input — the user
          // just created an element via the palette/Create-child and wants to
          // undo the create. The default `e.stopPropagation()` below would
          // prevent the global Workspace-level keyboard handler from seeing
          // this event; but even if it bubbled, the handler skips text-input
          // targets to preserve in-place text undo. So we route the model
          // undo (or redo, with Shift) explicitly from here AFTER cancelling
          // the rename, restoring the user's intuition that Cmd-Z reverts
          // their last action regardless of focus context (#386).
          e.preventDefault();
          e.stopPropagation();
          onCancel();
          if (e.shiftKey) {
            useWorkspaceStore.getState().redo();
          } else {
            useWorkspaceStore.getState().undo();
          }
        } else {
          e.stopPropagation();
        }
      }}
      onBlur={() => onCommit(value)}
      className="min-w-0 flex-1 rounded border border-border bg-card px-1 py-0 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

interface DiagramRowContext {
  readonly focusKey: FocusKey | null;
  readonly activeDiagramId: DiagramId | null;
  readonly setRef: (key: FocusKey, el: HTMLDivElement | null) => void;
  readonly focusItem: (key: FocusKey | null) => void;
  readonly syncFocus: (key: FocusKey) => void;
  readonly handleActivate: (row: FlatRow) => void;
  readonly renamingDiagramId: DiagramId | null;
  readonly beginDiagramRename: (id: DiagramId) => void;
  readonly commitDiagramRename: (id: DiagramId, name: string) => void;
  readonly cancelDiagramRename: () => void;
  readonly requestDiagramDelete: (id: DiagramId) => void;
  readonly contextMenuOpenKey: FocusKey | null;
  readonly setContextMenuOpenKey: (key: FocusKey | null) => void;
}

function renderDiagramRow(
  row: FlatRow,
  diagram: Diagram,
  ctx: DiagramRowContext,
): JSX.Element {
  const isFocused = ctx.focusKey === row.key;
  const isActive = ctx.activeDiagramId === diagram.id;
  const isRenaming = ctx.renamingDiagramId === diagram.id;
  return (
    <div
      key={row.key}
      role="treeitem"
      aria-level={row.depth + 1}
      aria-current={isActive ? 'page' : undefined}
      data-testid={`containment-tree-diagram-${diagram.id}`}
      data-diagram-id={diagram.id}
      data-depth={row.depth}
      tabIndex={isFocused ? 0 : -1}
      ref={(el) => ctx.setRef(row.key, el)}
      onFocus={() => ctx.syncFocus(row.key)}
      onClick={(e) => {
        if (isRenaming) return;
        e.stopPropagation();
        ctx.focusItem(row.key);
        ctx.handleActivate(row);
      }}
      onContextMenu={(e) => {
        if (isRenaming) return;
        e.preventDefault();
        e.stopPropagation();
        ctx.setContextMenuOpenKey(row.key);
      }}
      style={{ paddingLeft: `${row.depth * 12 + 4}px` }}
      className={`group flex cursor-pointer select-none items-center gap-1 rounded px-1 py-1 text-sm text-foreground/90 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary ${
        isActive ? 'bg-primary/10 font-medium' : ''
      }`}
    >
      <span
        aria-hidden="true"
        className="inline-block w-3 shrink-0 text-center text-[10px] text-muted-foreground"
      >
        ⌬
      </span>
      {isRenaming ? (
        <ContainmentTreeDiagramRenameInput
          diagramId={diagram.id}
          initialValue={diagram.name}
          onCommit={(name) => ctx.commitDiagramRename(diagram.id, name)}
          onCancel={ctx.cancelDiagramRename}
        />
      ) : (
        <span className="truncate">{diagram.name}</span>
      )}
      {!isRenaming ? (
        <ContainmentTreeDiagramRowMenu
          diagramId={diagram.id}
          onRename={() => ctx.beginDiagramRename(diagram.id)}
          onDelete={() => ctx.requestDiagramDelete(diagram.id)}
          open={ctx.contextMenuOpenKey === row.key ? true : undefined}
          onOpenChange={(o) => {
            if (!o && ctx.contextMenuOpenKey === row.key) {
              ctx.setContextMenuOpenKey(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

interface DiagramRenameInputProps {
  readonly diagramId: DiagramId;
  readonly initialValue: string;
  readonly onCommit: (name: string) => void;
  readonly onCancel: () => void;
}

function ContainmentTreeDiagramRenameInput({
  diagramId,
  initialValue,
  onCommit,
  onCancel,
}: DiagramRenameInputProps): JSX.Element {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      data-testid={`containment-tree-diagram-rename-${diagramId}`}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          onCommit(value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        } else {
          e.stopPropagation();
        }
      }}
      onBlur={() => onCommit(value)}
      className="min-w-0 flex-1 rounded border border-border bg-card px-1 py-0 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}
