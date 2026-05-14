import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import type { ElementId, ModelElement } from '@/model';

import type { Diagram, DiagramId } from '../diagram';
import { useWorkspaceStore } from '../store';

import {
  buildContainmentTree,
  type ContainmentElementNode,
  type ContainmentTreeNode,
} from './buildContainmentTree';

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

  const root = useMemo(
    () => buildContainmentTree({ elements, diagrams, rootId }),
    [elements, diagrams, rootId],
  );

  // Default: every element node starts expanded. Collapse-state lives in the
  // user-toggled overrides set; absence of an override means "use default".
  const [collapsed, setCollapsed] = useState<ReadonlySet<FocusKey>>(() => new Set());

  const expanded = useMemo<ReadonlySet<FocusKey>>(() => {
    if (!root) return new Set();
    const all = new Set<FocusKey>();
    function visit(node: ContainmentTreeNode): void {
      if (node.kind !== 'element') return;
      all.add(elKey(node.element.id));
      for (const child of node.children) visit(child);
    }
    visit(root);
    for (const k of collapsed) all.delete(k);
    return all;
  }, [root, collapsed]);

  const rows = useMemo(() => (root ? flatten(root, expanded) : []), [root, expanded]);

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

  if (!root) {
    return (
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
    );
  }

  return (
    <div
      role="tree"
      aria-label="Containment tree"
      data-testid="containment-tree"
      onKeyDown={onKeyDown}
      className="flex flex-col gap-0.5 p-2 text-sm"
    >
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
            })
          : renderDiagramRow(row, row.node.diagram, {
              focusKey,
              activeDiagramId,
              setRef,
              focusItem,
              syncFocus,
              handleActivate,
            }),
      )}
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
  const displayName = elementDisplayName(element);
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
      tabIndex={isFocused ? 0 : -1}
      ref={(el) => ctx.setRef(row.key, el)}
      onFocus={() => ctx.syncFocus(row.key)}
      onClick={(e) => {
        e.stopPropagation();
        ctx.focusItem(row.key);
        ctx.handleActivate(row);
      }}
      style={{ paddingLeft: `${row.depth * 12 + 4}px` }}
      className={`flex cursor-pointer select-none items-center gap-1 rounded px-1 py-1 text-sm text-foreground hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary ${
        isSelected ? 'bg-primary/10' : ''
      }`}
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
      <span className="truncate">{displayName}</span>
      <span
        aria-hidden="true"
        className="ml-auto shrink-0 truncate text-[10px] uppercase tracking-wide text-muted-foreground/70"
      >
        {element.kind}
      </span>
    </div>
  );
}

interface DiagramRowContext {
  readonly focusKey: FocusKey | null;
  readonly activeDiagramId: DiagramId | null;
  readonly setRef: (key: FocusKey, el: HTMLDivElement | null) => void;
  readonly focusItem: (key: FocusKey | null) => void;
  readonly syncFocus: (key: FocusKey) => void;
  readonly handleActivate: (row: FlatRow) => void;
}

function renderDiagramRow(
  row: FlatRow,
  diagram: Diagram,
  ctx: DiagramRowContext,
): JSX.Element {
  const isFocused = ctx.focusKey === row.key;
  const isActive = ctx.activeDiagramId === diagram.id;
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
        e.stopPropagation();
        ctx.focusItem(row.key);
        ctx.handleActivate(row);
      }}
      style={{ paddingLeft: `${row.depth * 12 + 4}px` }}
      className={`flex cursor-pointer select-none items-center gap-1 rounded px-1 py-1 text-sm text-foreground/90 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary ${
        isActive ? 'bg-primary/10 font-medium' : ''
      }`}
    >
      <span
        aria-hidden="true"
        className="inline-block w-3 shrink-0 text-center text-[10px] text-muted-foreground"
      >
        ⌬
      </span>
      <span className="truncate">{diagram.name}</span>
    </div>
  );
}
