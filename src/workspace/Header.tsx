import { ApiKeyChip } from './ApiKeyChip';
import { useWorkspaceStore } from './store';
import { saveDisabledReason } from './toolbarDisabledReasons';

export function Header(): JSX.Element {
  const projectName = useWorkspaceStore((s) => s.project?.name);
  const initialized = useWorkspaceStore((s) => s.initialized);
  const saveProject = useWorkspaceStore((s) => s.saveProject);
  const saveReason = saveDisabledReason(initialized);

  return (
    <header
      role="banner"
      data-testid="workspace-header"
      className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4"
    >
      <h1 className="text-base font-semibold tracking-tight text-foreground">
        MBSE Workbench
      </h1>
      <span aria-hidden="true" className="h-5 w-px bg-border" />
      <span
        aria-label="Active project"
        data-testid="workspace-project-name"
        className="text-sm text-muted-foreground"
      >
        {projectName ?? 'Loading…'}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <ApiKeyChip />
        <button
          type="button"
          onClick={() => {
            void saveProject();
          }}
          disabled={!initialized}
          title={saveReason}
          className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </header>
  );
}
