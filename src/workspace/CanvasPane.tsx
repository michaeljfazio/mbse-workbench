import { useWorkspaceStore, getActiveViewpoint } from './store';

export function CanvasPane(): JSX.Element {
  const diagrams = useWorkspaceStore((s) => s.diagrams);
  const activeDiagramId = useWorkspaceStore((s) => s.activeDiagramId);
  const setActiveDiagram = useWorkspaceStore((s) => s.setActiveDiagram);
  const initialized = useWorkspaceStore((s) => s.initialized);
  const viewpoint = useWorkspaceStore(getActiveViewpoint);
  const active = diagrams.find((d) => d.id === activeDiagramId) ?? null;

  return (
    <section
      role="region"
      aria-label="Canvas"
      data-testid="canvas-pane"
      className="flex min-w-0 flex-1 flex-col bg-muted/30"
    >
      {diagrams.length === 0 ? (
        <div
          data-testid="diagram-tablist-empty"
          className="flex h-9 shrink-0 items-center border-b border-border bg-card px-3 text-xs text-muted-foreground"
        >
          No diagrams
        </div>
      ) : (
        <div
          role="tablist"
          aria-label="Diagram tabs"
          data-testid="diagram-tablist"
          className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-card px-2"
        >
          {diagrams.map((d) => {
            const isActive = d.id === activeDiagramId;
            return (
              <button
                key={d.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`diagram-panel-${d.id}`}
                id={`diagram-tab-${d.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveDiagram(d.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {d.name}
              </button>
            );
          })}
        </div>
      )}
      {active ? (
        <div
          id={`diagram-panel-${active.id}`}
          role="tabpanel"
          aria-labelledby={`diagram-tab-${active.id}`}
          data-testid="diagram-panel"
          className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground"
        >
          {viewpoint ? (
            <div className="space-y-2">
              <p className="text-base font-medium text-foreground">{viewpoint.label}</p>
              <p>Canvas arrives in #31 — drag-create blocks and edges.</p>
            </div>
          ) : (
            <p>Unknown viewpoint.</p>
          )}
        </div>
      ) : (
        <div
          data-testid="diagram-panel-empty"
          className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground"
        >
          {!initialized ? <p>Loading project…</p> : <p>No active diagram.</p>}
        </div>
      )}
    </section>
  );
}
