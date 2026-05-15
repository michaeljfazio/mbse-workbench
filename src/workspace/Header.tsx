import { useEffect, useRef, useState } from 'react';

import { ApiKeyChip } from './ApiKeyChip';
import { useWorkspaceStore } from './store';
import {
  projectNameTitle,
  saveDisabledReason,
} from './toolbarDisabledReasons';

export function Header(): JSX.Element {
  const projectName = useWorkspaceStore((s) => s.project?.name);
  const initialized = useWorkspaceStore((s) => s.initialized);
  const saveProject = useWorkspaceStore((s) => s.saveProject);
  const renameProject = useWorkspaceStore((s) => s.renameProject);
  const saveReason = saveDisabledReason(initialized);
  const nameTitle = projectNameTitle(initialized);
  const [isRenaming, setIsRenaming] = useState(false);

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
      {isRenaming && initialized && projectName !== undefined ? (
        <ProjectNameInput
          initialValue={projectName}
          onCommit={(name) => {
            renameProject(name);
            setIsRenaming(false);
          }}
          onCancel={() => setIsRenaming(false)}
        />
      ) : (
        <button
          type="button"
          aria-label="Active project"
          data-testid="workspace-project-name"
          disabled={!initialized}
          title={nameTitle}
          onClick={() => {
            if (!initialized) return;
            setIsRenaming(true);
          }}
          className="rounded px-1 py-0.5 text-sm text-muted-foreground hover:bg-accent disabled:cursor-not-allowed"
        >
          {projectName ?? 'Loading…'}
        </button>
      )}
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

interface ProjectNameInputProps {
  readonly initialValue: string;
  readonly onCommit: (name: string) => void;
  readonly onCancel: () => void;
}

function ProjectNameInput({
  initialValue,
  onCommit,
  onCancel,
}: ProjectNameInputProps): JSX.Element {
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
      aria-label="Rename project"
      data-testid="workspace-project-name-input"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit(value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onCommit(value)}
      className="min-w-0 rounded border border-border bg-card px-1 py-0.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}
