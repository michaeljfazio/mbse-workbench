import { useRef } from 'react';

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

export function Workspace(): JSX.Element {
  const leftPaneWidth = useWorkspaceStore((s) => s.leftPaneWidth);
  const rightPaneWidth = useWorkspaceStore((s) => s.rightPaneWidth);
  const setLeftPaneWidth = useWorkspaceStore((s) => s.setLeftPaneWidth);
  const setRightPaneWidth = useWorkspaceStore((s) => s.setRightPaneWidth);
  const containerRef = useRef<HTMLDivElement>(null);

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
