import { useCallback } from 'react';

import { useWorkspaceStore } from './store';

interface CardProps {
  readonly testId: string;
  readonly title: string;
  readonly description: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}

function Card({
  testId,
  title,
  description,
  disabled,
  onClick,
}: CardProps): JSX.Element {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start gap-1 rounded-md border border-border bg-card p-3 text-left shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

const SHORTCUTS: ReadonlyArray<{ readonly keys: string; readonly action: string }> = [
  { keys: 'Cmd-Z', action: 'Undo' },
  { keys: 'Cmd-Shift-Z', action: 'Redo' },
  { keys: 'Cmd-K', action: 'Search elements' },
  { keys: 'Cmd-S', action: 'Save' },
  { keys: 'Delete', action: 'Remove selection' },
];

/**
 * Shown over the canvas when a project has zero authored elements. Acts as
 * a guided entry point that teaches the explorer affordances: New Block
 * and New Requirement run the same Containment-Tree create-child flow as
 * the explorer kebab menu (create as a child of the root Package, select
 * it, enter inline rename). Import JSON and Open Chat are kept as
 * non-create flows. Also surfaces the keyboard-shortcut crib.
 */
export function EmptyState({
  onImportJson,
}: {
  readonly onImportJson: () => void;
}): JSX.Element {
  const rootId = useWorkspaceStore((s) => s.project?.rootId ?? null);
  const createChildElement = useWorkspaceStore((s) => s.createChildElement);
  const setSelection = useWorkspaceStore((s) => s.setSelection);
  const setPendingRename = useWorkspaceStore((s) => s.setPendingRename);
  const setActiveSurface = useWorkspaceStore((s) => s.setActiveSurface);
  const setInspectorTab = useWorkspaceStore((s) => s.setInspectorTab);

  const handleNewBlock = useCallback(() => {
    if (!rootId) return;
    const id = createChildElement(
      rootId,
      'PartDefinition',
      'member',
      'New Part Definition',
    );
    if (!id) return;
    setSelection([id]);
    setPendingRename(id);
  }, [rootId, createChildElement, setSelection, setPendingRename]);

  const handleNewRequirement = useCallback(() => {
    if (!rootId) return;
    const id = createChildElement(
      rootId,
      'Requirement',
      'member',
      'New Requirement',
    );
    if (!id) return;
    setActiveSurface('requirements');
    setSelection([id]);
    setPendingRename(id);
  }, [
    rootId,
    createChildElement,
    setActiveSurface,
    setSelection,
    setPendingRename,
  ]);

  const noProject = rootId === null;
  return (
    <div
      data-testid="workspace-empty-state"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-muted/20 p-8 text-center"
    >
      <div className="max-w-md space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Start your model</h2>
        <p className="text-sm text-muted-foreground">
          This project is empty. Pick somewhere to begin — you can always change
          your mind, and every command is undoable.
        </p>
      </div>
      <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        <Card
          testId="empty-state-new-block"
          title="New Block"
          description="Adds a Part Definition under the project root."
          disabled={noProject}
          onClick={handleNewBlock}
        />
        <Card
          testId="empty-state-new-requirement"
          title="New Requirement"
          description="Adds a Requirement under the project root."
          disabled={noProject}
          onClick={handleNewRequirement}
        />
        <Card
          testId="empty-state-import-json"
          title="Import JSON"
          description="Restore a project exported from MBSE Workbench."
          onClick={onImportJson}
        />
        <Card
          testId="empty-state-open-chat"
          title="Open Chat"
          description="Ask the LLM to scaffold elements for you."
          onClick={() => setInspectorTab('chat')}
        />
      </div>
      <div
        data-testid="empty-state-shortcuts"
        className="rounded-md border border-border bg-card p-3 text-left text-xs text-muted-foreground"
      >
        <div className="mb-1 font-semibold text-foreground">Keyboard shortcuts</div>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-0.5">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-3">
              <kbd className="font-mono text-[11px] text-foreground">{s.keys}</kbd>
              <span>{s.action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
