import { useWorkspaceStore } from './store';

export interface ProjectTreePaneProps {
  readonly width: number;
}

export function ProjectTreePane({ width }: ProjectTreePaneProps): JSX.Element {
  const projectName = useWorkspaceStore((s) => s.project?.name);

  return (
    <aside
      id="project-tree-pane"
      role="tree"
      aria-label="Project tree"
      data-testid="project-tree-pane"
      style={{ width }}
      className="flex shrink-0 flex-col border-r border-border bg-card"
    >
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Project
      </div>
      <div className="flex-1 overflow-auto p-2">
        <div
          role="treeitem"
          aria-level={1}
          aria-expanded={false}
          aria-selected={false}
          tabIndex={0}
          data-testid="project-tree-root"
          className="cursor-default rounded px-2 py-1 text-sm text-foreground hover:bg-accent focus:bg-accent focus:outline-none"
        >
          {projectName ?? 'Loading…'}
        </div>
      </div>
    </aside>
  );
}
