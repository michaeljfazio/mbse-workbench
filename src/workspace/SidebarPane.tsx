import { useWorkspaceStore, type InspectorTab } from './store';

interface TabDef {
  readonly id: InspectorTab;
  readonly label: string;
}

const TABS: readonly TabDef[] = [
  { id: 'inspector', label: 'Inspector' },
  { id: 'chat', label: 'Chat' },
];

export interface SidebarPaneProps {
  readonly width: number;
}

export function SidebarPane({ width }: SidebarPaneProps): JSX.Element {
  const inspectorTab = useWorkspaceStore((s) => s.inspectorTab);
  const setInspectorTab = useWorkspaceStore((s) => s.setInspectorTab);

  return (
    <aside
      id="sidebar-pane"
      role="complementary"
      aria-label="Inspector and chat"
      data-testid="sidebar-pane"
      style={{ width }}
      className="flex shrink-0 flex-col border-l border-border bg-card"
    >
      <div
        role="tablist"
        aria-label="Sidebar tabs"
        data-testid="sidebar-tablist"
        className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-2"
      >
        {TABS.map((tab) => {
          const active = tab.id === inspectorTab;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`sidebar-panel-${tab.id}`}
              id={`sidebar-tab-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setInspectorTab(tab.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id={`sidebar-panel-${inspectorTab}`}
        role="tabpanel"
        aria-labelledby={`sidebar-tab-${inspectorTab}`}
        data-testid="sidebar-panel"
        className="flex-1 overflow-auto p-4 text-sm"
      >
        {inspectorTab === 'inspector' ? (
          <p className="text-muted-foreground">
            Select an element to edit its properties.
          </p>
        ) : (
          <p className="text-muted-foreground">Chat lands in Phase 11.</p>
        )}
      </div>
    </aside>
  );
}
