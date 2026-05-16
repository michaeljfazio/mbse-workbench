import { useCallback, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';

import type { ElementId, ModelElement } from '@/model';

import { useWorkspaceStore } from '../store';

import {
  buildContainmentTree,
  type ContainmentElementNode,
} from './buildContainmentTree';
import { kindIcon } from './kindIcons';

function elementDisplayName(element: ModelElement): string {
  if (element.name.length > 0) return element.name;
  return `(untitled ${element.kind})`;
}

interface FlatRow {
  readonly element: ModelElement;
  readonly depth: number;
  readonly hasChildren: boolean;
}

function flattenLibrary(
  root: ContainmentElementNode,
  expanded: ReadonlySet<ElementId>,
): FlatRow[] {
  const rows: FlatRow[] = [];
  function walk(node: ContainmentElementNode, depth: number): void {
    const elementChildren = node.children.filter(
      (c): c is ContainmentElementNode => c.kind === 'element',
    );
    rows.push({
      element: node.element,
      depth,
      hasChildren: elementChildren.length > 0,
    });
    if (elementChildren.length > 0 && expanded.has(node.element.id)) {
      for (const child of elementChildren) walk(child, depth + 1);
    }
  }
  walk(root, 0);
  return rows;
}

export function LibrariesSection(): JSX.Element | null {
  const elements = useWorkspaceStore((s) => s.elements);
  const diagrams = useWorkspaceStore((s) => s.diagrams);
  const libraryRootIds = useWorkspaceStore(
    (s) => s.project?.libraryRootIds ?? null,
  );
  const selectedElementIds = useWorkspaceStore((s) => s.selectedElementIds);
  const setSelection = useWorkspaceStore((s) => s.setSelection);

  const libraries = useMemo<readonly ContainmentElementNode[]>(() => {
    if (!libraryRootIds || libraryRootIds.length === 0) return [];
    const out: ContainmentElementNode[] = [];
    for (const id of libraryRootIds) {
      const tree = buildContainmentTree({ elements, diagrams, rootId: id });
      if (tree) out.push(tree);
    }
    return out;
  }, [elements, diagrams, libraryRootIds]);

  // Default-expanded: every library root starts expanded so descendants are
  // immediately visible. User-toggled collapses are tracked here.
  const [collapsed, setCollapsed] = useState<ReadonlySet<ElementId>>(
    () => new Set(),
  );

  const expanded = useMemo<ReadonlySet<ElementId>>(() => {
    const all = new Set<ElementId>();
    const visit = (n: ContainmentElementNode): void => {
      all.add(n.element.id);
      for (const c of n.children) {
        if (c.kind === 'element') visit(c);
      }
    };
    for (const lib of libraries) visit(lib);
    for (const k of collapsed) all.delete(k);
    return all;
  }, [libraries, collapsed]);

  const toggleExpanded = useCallback((id: ElementId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (id: ElementId) => {
      setSelection([id]);
    },
    [setSelection],
  );

  if (libraries.length === 0) return null;

  const selectedSet = new Set(selectedElementIds);

  return (
    <section
      aria-label="Libraries"
      data-testid="libraries-section"
      className="border-b border-border"
    >
      <h2
        data-testid="libraries-section-header"
        className="flex items-center gap-1 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        <Lock aria-hidden="true" className="h-3 w-3" />
        <span>Libraries</span>
      </h2>
      <div
        role="tree"
        aria-label="Libraries tree"
        data-testid="libraries-tree"
        className="flex flex-col gap-0.5 p-2 text-sm"
      >
        {libraries.map((library) => {
          const rows = flattenLibrary(library, expanded);
          return rows.map((row) => (
            <LibraryRow
              key={row.element.id}
              element={row.element}
              depth={row.depth}
              hasChildren={row.hasChildren}
              isExpanded={expanded.has(row.element.id)}
              isSelected={selectedSet.has(row.element.id)}
              onToggle={() => toggleExpanded(row.element.id)}
              onSelect={() => handleSelect(row.element.id)}
            />
          ));
        })}
      </div>
    </section>
  );
}

interface LibraryRowProps {
  readonly element: ModelElement;
  readonly depth: number;
  readonly hasChildren: boolean;
  readonly isExpanded: boolean;
  readonly isSelected: boolean;
  readonly onToggle: () => void;
  readonly onSelect: () => void;
}

function LibraryRow({
  element,
  depth,
  hasChildren,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
}: LibraryRowProps): JSX.Element {
  const Icon = kindIcon(element.kind);
  const displayName = elementDisplayName(element);
  return (
    <div
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={isSelected}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-readonly="true"
      data-testid={`libraries-tree-element-${element.id}`}
      data-element-id={element.id}
      data-kind={element.kind}
      data-depth={depth}
      data-readonly="true"
      tabIndex={-1}
      draggable={false}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
      className={`flex select-none items-center gap-1 rounded px-1 py-1 text-sm text-foreground/90 hover:bg-accent ${
        isSelected ? 'bg-primary/10' : ''
      }`}
    >
      <span
        aria-hidden="true"
        data-testid={`libraries-tree-disclosure-${element.id}`}
        onClick={(e) => {
          if (!hasChildren) return;
          e.stopPropagation();
          onToggle();
        }}
        className="inline-block w-3 shrink-0 cursor-pointer text-center text-[10px] text-muted-foreground"
      >
        {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
      </span>
      <Icon
        aria-hidden="true"
        data-kind-icon={element.kind}
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
      />
      <span className="truncate">{displayName}</span>
      <Lock
        aria-label="read-only"
        data-testid="libraries-lock-badge"
        className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/80"
      />
    </div>
  );
}
