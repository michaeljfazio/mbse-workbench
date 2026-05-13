import { useCallback, useMemo } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';

import type { ElementId } from '@/model';
import { toFlowEdges, toFlowNodes } from './flowGraph';
import type { DiagramId } from './diagram';
import { useWorkspaceStore } from './store';

interface Props {
  readonly diagramId: DiagramId;
}

function SecondaryCanvasInner({ diagramId }: Props): JSX.Element {
  const diagrams = useWorkspaceStore((s) => s.diagrams);
  const diagram = useMemo(
    () => diagrams.find((d) => d.id === diagramId) ?? null,
    [diagrams, diagramId],
  );
  const viewpointRegistry = useWorkspaceStore((s) => s.viewpoints);
  const viewpoint = useMemo(
    () => (diagram ? viewpointRegistry.get(diagram.viewpointId) ?? null : null),
    [diagram, viewpointRegistry],
  );
  const elements = useWorkspaceStore((s) => s.elements);
  const edges = useWorkspaceStore((s) => s.edges);
  const registry = useWorkspaceStore((s) => s.registry);
  const selectedIds = useWorkspaceStore((s) => s.secondarySelectedElementIds);
  const setSecondarySelection = useWorkspaceStore(
    (s) => s.setSecondarySelection,
  );
  const setNodePosition = useWorkspaceStore((s) => s.setNodePosition);
  const renameElement = useWorkspaceStore((s) => s.renameElement);
  const impactHighlightedIds = useWorkspaceStore((s) => s.impactHighlightedIds);
  const impactHighlightedEdgeIds = useWorkspaceStore(
    (s) => s.impactHighlightedEdgeIds,
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const flowNodes = useMemo(() => {
    if (!viewpoint || !diagram) return [];
    return toFlowNodes(
      elements,
      viewpoint,
      diagram,
      selectedSet,
      renameElement,
      registry,
      impactHighlightedIds,
    );
  }, [
    elements,
    viewpoint,
    diagram,
    selectedSet,
    renameElement,
    registry,
    impactHighlightedIds,
  ]);

  const flowEdges = useMemo(() => {
    if (!viewpoint) return [];
    return toFlowEdges(
      edges,
      elements,
      viewpoint,
      selectedSet,
      impactHighlightedEdgeIds,
    );
  }, [edges, elements, viewpoint, selectedSet, impactHighlightedEdgeIds]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const hasSelectChange = changes.some((c) => c.type === 'select');
      if (hasSelectChange) {
        const next = applyNodeChanges(changes, flowNodes);
        const nextSelected: ElementId[] = next
          .filter((n) => n.selected)
          .map((n) => n.id as ElementId);
        const same =
          nextSelected.length === selectedIds.length &&
          nextSelected.every((id, i) => id === selectedIds[i]);
        if (!same) setSecondarySelection(nextSelected);
      }
      if (!diagram) return;
      for (const change of changes) {
        if (change.type === 'position' && !change.dragging && change.position) {
          setNodePosition(
            diagram.id,
            change.id as ElementId,
            change.position,
          );
        }
      }
    },
    [flowNodes, diagram, selectedIds, setSecondarySelection, setNodePosition],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const hasSelectChange = changes.some((c) => c.type === 'select');
      if (!hasSelectChange) return;
      const next = applyEdgeChanges(changes, flowEdges);
      const nextSelected: ElementId[] = next
        .filter((e) => e.selected)
        .map((e) => e.id as unknown as ElementId);
      const same =
        nextSelected.length === selectedIds.length &&
        nextSelected.every((id, i) => id === selectedIds[i]);
      if (!same) setSecondarySelection(nextSelected);
    },
    [flowEdges, selectedIds, setSecondarySelection],
  );

  if (!viewpoint || !diagram) {
    return (
      <div
        data-testid="secondary-canvas-empty"
        className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground"
      >
        <p>No diagram selected for split view.</p>
      </div>
    );
  }

  return (
    <div
      data-testid="secondary-diagram-panel"
      data-diagram-id={diagram.id}
      data-viewpoint-id={viewpoint.id}
      className="relative flex flex-1 flex-col"
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={viewpoint.nodeTypes}
        edgeTypes={viewpoint.edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesConnectable={false}
        edgesReconnectable={false}
        deleteKeyCode={null}
        fitView={false}
        proOptions={{ hideAttribution: true }}
        minZoom={0.25}
        maxZoom={2}
        className="bg-muted/20"
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}

export function SecondaryCanvasPane(): JSX.Element | null {
  const secondaryDiagramId = useWorkspaceStore((s) => s.secondaryDiagramId);
  const diagrams = useWorkspaceStore((s) => s.diagrams);
  const closeSplit = useWorkspaceStore((s) => s.closeSplit);

  const secondaryDiagram = useMemo(
    () =>
      secondaryDiagramId
        ? diagrams.find((d) => d.id === secondaryDiagramId) ?? null
        : null,
    [secondaryDiagramId, diagrams],
  );

  if (!secondaryDiagramId || !secondaryDiagram) return null;

  return (
    <section
      role="region"
      aria-label="Split canvas"
      data-testid="secondary-canvas-pane"
      className="flex min-w-0 flex-1 flex-col border-l border-border bg-muted/30"
    >
      <div
        data-testid="secondary-canvas-header"
        className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-card px-3"
      >
        <span className="text-xs font-semibold text-foreground">
          {secondaryDiagram.name}
        </span>
        <span className="text-xs text-muted-foreground">(split view)</span>
        <button
          type="button"
          data-testid="close-split"
          aria-label="Close split view"
          onClick={closeSplit}
          className="ml-auto inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
        >
          Close split
        </button>
      </div>
      <ReactFlowProvider>
        <SecondaryCanvasInner diagramId={secondaryDiagramId} />
      </ReactFlowProvider>
    </section>
  );
}
