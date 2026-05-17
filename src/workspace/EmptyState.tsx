import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

import {
  REQUIREMENT_NODE_HEIGHT,
  REQUIREMENT_NODE_WIDTH,
  REQUIREMENTS_VIEWPOINT_ID,
} from '@/viewpoints';
import { BDD_BLOCK_HEIGHT, BDD_BLOCK_WIDTH } from '@/viewpoints/bdd/BlockNode';
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
 * a guided entry point that teaches the explorer affordances.
 *
 * ADR 0015 step 2 (#376): the "New Part Definition" and "New Requirement"
 * cards are click-shortcuts that dispatch the same `create-element`
 * compound command the palette drag uses (`createBlock` for BDD,
 * `createRequirement` for the Requirements surface), placed at canvas
 * centre in flow coordinates. The auto-name comes from the shared
 * `nextBlockName` / `nextRequirementName` helpers — "Block 1", "Req1",
 * etc. — so empty-state click and palette drag emit indistinguishable
 * elements. Post-create behaviour (auto-select + inline rename) stays.
 *
 * The vocabulary on the cards follows ADR 0015 §"Vocabulary": the
 * metamodel name "Part Definition" replaces the SysML-1.x "Block" alias.
 * Import JSON and Open Chat stay as non-create flows.
 */
export function EmptyState({
  onImportJson,
}: {
  readonly onImportJson: () => void;
}): JSX.Element {
  const rootId = useWorkspaceStore((s) => s.project?.rootId ?? null);
  const createBlock = useWorkspaceStore((s) => s.createBlock);
  const createRequirement = useWorkspaceStore((s) => s.createRequirement);
  const createDiagram = useWorkspaceStore((s) => s.createDiagram);
  const diagrams = useWorkspaceStore((s) => s.diagrams);
  const setSelection = useWorkspaceStore((s) => s.setSelection);
  const setPendingRename = useWorkspaceStore((s) => s.setPendingRename);
  const setActiveSurface = useWorkspaceStore((s) => s.setActiveSurface);
  const setInspectorTab = useWorkspaceStore((s) => s.setInspectorTab);

  // EmptyState is mounted inside <ReactFlowProvider> (see CanvasPane), so
  // `useReactFlow()` is available. We use it to compute canvas centre in
  // flow coordinates — the same coordinate space CanvasPane.handleDrop
  // resolves the drop cursor into — so empty-state click and palette
  // drag agree on what "create at canvas centre" means.
  const reactFlow = useReactFlow();

  const canvasCenterFlow = useCallback((): { x: number; y: number } => {
    // The canvas-drop-target element wraps both EmptyState and ReactFlow;
    // its centre in screen coords is the canvas centre. Fall back to the
    // flow origin if the element isn't measurable yet (e.g. during the
    // first render before layout).
    const root = document.querySelector<HTMLElement>(
      '[data-testid="canvas-drop-target"]',
    );
    if (!root) return { x: 0, y: 0 };
    const rect = root.getBoundingClientRect();
    return reactFlow.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }, [reactFlow]);

  const handleNewPartDefinition = useCallback(() => {
    if (!rootId) return;
    const center = canvasCenterFlow();
    const id = createBlock({
      x: center.x - BDD_BLOCK_WIDTH / 2,
      y: center.y - BDD_BLOCK_HEIGHT / 2,
    });
    if (!id) return;
    setSelection([id]);
    setPendingRename(id);
  }, [
    rootId,
    canvasCenterFlow,
    createBlock,
    setSelection,
    setPendingRename,
  ]);

  const handleNewRequirement = useCallback(() => {
    if (!rootId) return;
    // The Requirements diagram isn't seeded by `bootstrap` — it's
    // lazy-created the first time the surface is opened. Cold-start
    // empty-state click hits that case, so we have to create the diagram
    // before dispatching `createRequirement` (which requires a diagramId
    // to attach the initial position to). Subsequent clicks reuse the
    // existing diagram.
    const existingDiagramId =
      diagrams.find((d) => d.viewpointId === REQUIREMENTS_VIEWPOINT_ID)?.id ??
      null;
    const requirementsDiagramId =
      existingDiagramId ?? createDiagram(REQUIREMENTS_VIEWPOINT_ID, {});
    if (!requirementsDiagramId) return;
    const center = canvasCenterFlow();
    const id = createRequirement(requirementsDiagramId, {
      x: center.x - REQUIREMENT_NODE_WIDTH / 2,
      y: center.y - REQUIREMENT_NODE_HEIGHT / 2,
    });
    if (!id) return;
    setActiveSurface('requirements');
    setSelection([id]);
    setPendingRename(id);
  }, [
    rootId,
    diagrams,
    canvasCenterFlow,
    createRequirement,
    createDiagram,
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
          testId="empty-state-new-part-definition"
          title="New Part Definition"
          description="Adds a Part Definition at the centre of the canvas."
          disabled={noProject}
          onClick={handleNewPartDefinition}
        />
        <Card
          testId="empty-state-new-requirement"
          title="New Requirement"
          description="Adds a Requirement on the Requirements surface."
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
