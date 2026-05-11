import { useEffect, useRef } from 'react';

import { CanvasPane } from './CanvasPane';
import { Divider } from './Divider';
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      // Skip when the user is typing into a text field — let the input's own
      // undo behaviour handle in-place edits. The user can Tab out to undo
      // the model.
      if (key === 'z' && !isTextInputTarget(event.target)) {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === 'y' && !isTextInputTarget(event.target)) {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

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
    </div>
  );
}
