import { useCallback, useEffect, useRef, useState } from 'react';

import { subscribeApiKeyModal } from '@/llm/api-key';

import { ApiKeyModal } from './ApiKeyModal';
import { CanvasPane } from './CanvasPane';
import { CommandPalette } from './CommandPalette';
import { Divider } from './Divider';
import { downloadProjectJson } from './export';
import { Header } from './Header';
import { ProjectTreePane } from './ProjectTreePane';
import { SidebarPane } from './SidebarPane';
import {
  MAX_PANE_WIDTH,
  MIN_PANE_WIDTH,
  useWorkspaceStore,
} from './store';

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function Workspace(): JSX.Element {
  const leftPaneWidth = useWorkspaceStore((s) => s.leftPaneWidth);
  const rightPaneWidth = useWorkspaceStore((s) => s.rightPaneWidth);
  const setLeftPaneWidth = useWorkspaceStore((s) => s.setLeftPaneWidth);
  const setRightPaneWidth = useWorkspaceStore((s) => s.setRightPaneWidth);
  const undo = useWorkspaceStore((s) => s.undo);
  const redo = useWorkspaceStore((s) => s.redo);
  const deleteSelection = useWorkspaceStore((s) => s.deleteSelection);
  const containerRef = useRef<HTMLDivElement>(null);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const commandPaletteOpenRef = useRef(false);
  commandPaletteOpenRef.current = commandPaletteOpen;

  const closeCommandPalette = useCallback(
    () => setCommandPaletteOpen(false),
    [],
  );

  useEffect(() => {
    return subscribeApiKeyModal(() => setApiKeyModalOpen(true));
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target;
      const inTextInput = isTextInputTarget(target);
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod) {
        // Skip text-field edits — let the input's own undo handle in-place
        // edits. The user can Tab out to undo the model.
        if (key === 'z' && !inTextInput) {
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
          return;
        }
        if (key === 'y' && !inTextInput) {
          event.preventDefault();
          redo();
          return;
        }
        if (key === 'k') {
          event.preventDefault();
          setCommandPaletteOpen((open) => !open);
          return;
        }
        if (key === 's') {
          event.preventDefault();
          if (commandPaletteOpenRef.current) return;
          const state = useWorkspaceStore.getState();
          if (state.project) {
            downloadProjectJson({ project: state.project });
          }
          return;
        }
      } else if (
        (key === 'delete' || key === 'backspace') &&
        !inTextInput
      ) {
        // ReactFlow has its own Delete handler scoped to its viewport that
        // emits node-remove changes through onNodesChange. Defer to it when
        // focus is inside the canvas — otherwise (selection set by API,
        // tree-driven focus, etc.) fall back to the workspace-global path.
        const insideReactFlow =
          target instanceof HTMLElement &&
          target.closest('.react-flow') !== null;
        if (insideReactFlow) return;
        const state = useWorkspaceStore.getState();
        if (
          state.activeSurfaceKind === 'diagram' &&
          state.selectedElementIds.length > 0
        ) {
          event.preventDefault();
          deleteSelection();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, deleteSelection]);

  // Close the palette on Escape.
  useEffect(() => {
    if (!commandPaletteOpen) return;
    function onEsc(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        setCommandPaletteOpen(false);
      }
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [commandPaletteOpen]);

  return (
    <div
      data-testid="workspace"
      className="flex h-screen flex-col overflow-hidden bg-background text-foreground"
    >
      <Header />
      <div
        ref={containerRef}
        data-testid="workspace-body"
        className="flex min-h-0 flex-1"
      >
        <ProjectTreePane width={leftPaneWidth} />
        <Divider
          side="left"
          containerRef={containerRef}
          controlsId="project-tree-pane"
          value={leftPaneWidth}
          min={MIN_PANE_WIDTH}
          max={MAX_PANE_WIDTH}
          onChange={setLeftPaneWidth}
          label="Resize project tree pane"
        />
        <CanvasPane />
        <Divider
          side="right"
          containerRef={containerRef}
          controlsId="sidebar-pane"
          value={rightPaneWidth}
          min={MIN_PANE_WIDTH}
          max={MAX_PANE_WIDTH}
          onChange={setRightPaneWidth}
          label="Resize inspector pane"
        />
        <SidebarPane width={rightPaneWidth} />
      </div>
      {apiKeyModalOpen ? (
        <ApiKeyModal onClose={() => setApiKeyModalOpen(false)} />
      ) : null}
      {commandPaletteOpen ? (
        <CommandPalette onClose={closeCommandPalette} />
      ) : null}
    </div>
  );
}
