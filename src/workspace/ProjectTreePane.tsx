import { ContainmentTree } from './tree/ContainmentTree';
import { LibrariesSection } from './tree/LibrariesSection';
import { ProjectTree } from './tree/ProjectTree';
import { useWorkspaceStore } from './store';

export interface ProjectTreePaneProps {
  readonly width: number;
}

export function ProjectTreePane({ width }: ProjectTreePaneProps): JSX.Element {
  const projectName = useWorkspaceStore((s) => s.project?.name);

  return (
    <aside
      id="project-tree-pane"
      aria-label="Project tree pane"
      data-testid="project-tree-pane"
      style={{ width }}
      className="flex shrink-0 flex-col border-r border-border bg-card"
    >
      <header
        data-testid="project-tree-header"
        className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {projectName ?? 'Loading…'}
      </header>
      <div className="flex-1 overflow-auto">
        <section
          aria-label="Explorer"
          data-testid="project-tree-explorer-section"
          className="border-b border-border"
        >
          <h2 className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Explorer
          </h2>
          <ContainmentTree />
        </section>
        <LibrariesSection />
        <section aria-label="Palette" data-testid="project-tree-palette-section">
          <h2 className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Palette
          </h2>
          <ProjectTree />
        </section>
      </div>
    </aside>
  );
}
