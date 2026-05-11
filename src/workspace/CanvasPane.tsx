import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';

import type { EdgeId, ElementId, ModelEdge, ModelElement } from '@/model';
import {
  BDD_BLOCK_HEIGHT,
  BDD_BLOCK_WIDTH,
} from '@/viewpoints/bdd/BlockNode';
import type { BddEdgeKind, Viewpoint } from '@/viewpoints';

import { EdgeKindPopover } from './EdgeKindPopover';
import type { Diagram } from './diagram';
import {
  getActiveDiagram,
  getActiveViewpoint,
  useWorkspaceStore,
} from './store';

interface PendingConnection {
  readonly connection: Connection;
  readonly x: number;
  readonly y: number;
}

function toFlowNodes(
  elements: readonly ModelElement[],
  viewpoint: Viewpoint,
  diagram: Diagram,
  selectedIds: ReadonlySet<ElementId>,
  onRename: (id: ElementId, name: string) => void,
): Node[] {
  return elements
    .filter((el) => viewpoint.acceptedElementKinds.includes(el.kind))
    .map((el) => {
      const pos = diagram.positions[el.id] ?? { x: 0, y: 0 };
      const node: Node = {
        id: el.id,
        type: viewpoint.nodeTypeFor(el),
        position: pos,
        width: BDD_BLOCK_WIDTH,
        height: BDD_BLOCK_HEIGHT,
        selected: selectedIds.has(el.id),
        data: { elementId: el.id, name: el.name, onRename },
      };
      return node;
    });
}

function toFlowEdges(
  edges: readonly ModelEdge[],
  viewpoint: Viewpoint,
  selectedIds: ReadonlySet<ElementId>,
): Edge[] {
  return edges
    .filter((e) => viewpoint.acceptedEdgeKinds.includes(e.kind))
    .map((e) => ({
      id: e.id,
      type: viewpoint.edgeTypeFor(e),
      source: e.sourceId,
      target: e.targetId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      selected: selectedIds.has(e.id as unknown as ElementId),
      data: { edgeId: e.id },
    }));
}

function CanvasInner(): JSX.Element {
  const viewpoint = useWorkspaceStore(getActiveViewpoint);
  const diagram = useWorkspaceStore(getActiveDiagram);
  const elements = useWorkspaceStore((s) => s.elements);
  const edges = useWorkspaceStore((s) => s.edges);
  const selectedElementIds = useWorkspaceStore((s) => s.selectedElementIds);
  const registry = useWorkspaceStore((s) => s.registry);
  const initialized = useWorkspaceStore((s) => s.initialized);
  const setSelection = useWorkspaceStore((s) => s.setSelection);
  const setNodePosition = useWorkspaceStore((s) => s.setNodePosition);
  const createBlock = useWorkspaceStore((s) => s.createBlock);
  const deleteSelection = useWorkspaceStore((s) => s.deleteSelection);
  const deleteElement = useWorkspaceStore((s) => s.deleteElement);
  const unlinkEdge = useWorkspaceStore((s) => s.unlinkEdge);
  const linkBlocks = useWorkspaceStore((s) => s.linkBlocks);
  const renameElement = useWorkspaceStore((s) => s.renameElement);

  const [pending, setPending] = useState<PendingConnection | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow();

  const selectedSet = useMemo(() => new Set(selectedElementIds), [selectedElementIds]);

  const flowNodes = useMemo(() => {
    if (!viewpoint || !diagram) return [];
    return toFlowNodes(elements, viewpoint, diagram, selectedSet, renameElement);
  }, [elements, viewpoint, diagram, selectedSet, renameElement]);

  const flowEdges = useMemo(() => {
    if (!viewpoint) return [];
    return toFlowEdges(edges, viewpoint, selectedSet);
  }, [edges, viewpoint, selectedSet]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const next = applyNodeChanges(changes, flowNodes);
      const nextSelected: ElementId[] = next
        .filter((n) => n.selected)
        .map((n) => n.id as ElementId);
      const prevSelected = selectedElementIds;
      const same =
        nextSelected.length === prevSelected.length &&
        nextSelected.every((id, i) => id === prevSelected[i]);
      if (!same) setSelection(nextSelected);

      if (!diagram) return;
      for (const change of changes) {
        if (change.type === 'position' && !change.dragging && change.position) {
          setNodePosition(diagram.id, change.id as ElementId, change.position);
        }
        if (change.type === 'remove') {
          deleteElement(change.id as ElementId);
        }
      }
    },
    [
      flowNodes,
      diagram,
      selectedElementIds,
      setNodePosition,
      setSelection,
      deleteElement,
    ],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      applyEdgeChanges(changes, flowEdges);
      for (const change of changes) {
        if (change.type === 'remove') {
          unlinkEdge(change.id as EdgeId);
        }
      }
    },
    [flowEdges, unlinkEdge],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      // Show the edge-kind popover near the target node's top handle, projected
      // into screen coordinates via React Flow.
      const targetNode = flowNodes.find((n) => n.id === connection.target);
      const screenPos = targetNode
        ? reactFlow.flowToScreenPosition({
            x: targetNode.position.x + BDD_BLOCK_WIDTH / 2,
            y: targetNode.position.y,
          })
        : { x: 0, y: 0 };
      const rect = canvasRef.current?.getBoundingClientRect();
      const x = screenPos.x - (rect?.left ?? 0);
      const y = screenPos.y - (rect?.top ?? 0);
      setPending({ connection, x, y });
    },
    [flowNodes, reactFlow],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const { source, target } = connection;
      if (!source || !target || source === target) return false;
      if (!registry) return false;
      const s = registry.get(source as ElementId);
      const t = registry.get(target as ElementId);
      if (!s || !t) return false;
      return s.kind === 'PartDefinition' && t.kind === 'PartDefinition';
    },
    [registry],
  );

  const confirmPending = useCallback(
    (kind: BddEdgeKind) => {
      if (!pending) return;
      const { source, target } = pending.connection;
      if (source && target) {
        linkBlocks(source as ElementId, target as ElementId, kind);
      }
      setPending(null);
    },
    [pending, linkBlocks],
  );

  const cancelPending = useCallback(() => setPending(null), []);

  const handleAddBlock = useCallback(() => {
    if (!diagram) return;
    const cascadeIndex = Object.keys(diagram.positions).length;
    const columns = 2;
    const col = cascadeIndex % columns;
    const row = Math.floor(cascadeIndex / columns);
    const stepX = BDD_BLOCK_WIDTH + 40;
    const stepY = BDD_BLOCK_HEIGHT + 60;
    createBlock({
      x: 60 + col * stepX,
      y: 60 + row * stepY,
    });
  }, [createBlock, diagram]);

  useEffect(() => {
    if (!pending) return;
    return () => {
      // dialog effect-cleanup hook intentionally empty; popover owns its own listeners
    };
  }, [pending]);

  if (!initialized) {
    return (
      <div
        data-testid="diagram-panel-empty"
        className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground"
      >
        <p>Loading project…</p>
      </div>
    );
  }

  if (!viewpoint || !diagram) {
    return (
      <div
        data-testid="diagram-panel-empty"
        className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground"
      >
        <p>No active diagram.</p>
      </div>
    );
  }

  return (
    <div
      id={`diagram-panel-${diagram.id}`}
      role="tabpanel"
      aria-labelledby={`diagram-tab-${diagram.id}`}
      data-testid="diagram-panel"
      data-viewpoint-id={viewpoint.id}
      className="relative flex flex-1 flex-col"
    >
      <div
        data-testid="canvas-toolbar"
        className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-card px-3"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {viewpoint.label}
        </span>
        <span aria-hidden="true" className="h-4 w-px bg-border" />
        <button
          type="button"
          data-testid="toolbar-add-block"
          onClick={handleAddBlock}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
        >
          + Block
        </button>
        <button
          type="button"
          data-testid="toolbar-delete"
          onClick={deleteSelection}
          disabled={selectedElementIds.length === 0}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      <div ref={canvasRef} className="relative flex-1">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={viewpoint.nodeTypes}
          edgeTypes={viewpoint.edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          deleteKeyCode={['Delete', 'Backspace']}
          fitView={false}
          proOptions={{ hideAttribution: true }}
          minZoom={0.25}
          maxZoom={2}
          className="bg-muted/20"
        >
          <Background gap={16} size={1} />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
        {pending ? (
          <EdgeKindPopover
            x={pending.x}
            y={pending.y}
            onPick={confirmPending}
            onCancel={cancelPending}
          />
        ) : null}
      </div>
    </div>
  );
}

export function CanvasPane(): JSX.Element {
  const diagrams = useWorkspaceStore((s) => s.diagrams);
  const activeDiagramId = useWorkspaceStore((s) => s.activeDiagramId);
  const setActiveDiagram = useWorkspaceStore((s) => s.setActiveDiagram);

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
      <ReactFlowProvider>
        <CanvasInner />
      </ReactFlowProvider>
    </section>
  );
}
