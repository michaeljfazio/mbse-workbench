import { readApiKey, requestApiKeyModal, useApiKey } from '@/llm/api-key';

import { ChatPane } from './chat/ChatPane';
import { Inspector } from './inspector/Inspector';
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
  const apiKey = useApiKey();

  const onTabClick = (id: InspectorTab) => {
    setInspectorTab(id);
    if (id === 'chat' && readApiKey() === null) {
      requestApiKeyModal();
    }
  };

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
              onClick={() => onTabClick(tab.id)}
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
        className={`flex-1 overflow-hidden text-sm ${inspectorTab === 'inspector' || (inspectorTab === 'chat' && apiKey === null) ? 'overflow-auto p-4' : ''}`}
      >
        {inspectorTab === 'inspector' ? (
          <Inspector />
        ) : apiKey === null ? (
          <div
            data-testid="chat-needs-key"
            className="flex flex-col items-start gap-2 text-muted-foreground"
          >
            <p>Anthropic API key required to use chat.</p>
            <button
              type="button"
              data-testid="chat-open-api-key-modal"
              onClick={() => requestApiKeyModal()}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent"
            >
              Enter API key
            </button>
          </div>
        ) : (
          <ChatPane />
        )}
      </div>
    </aside>
  );
}
