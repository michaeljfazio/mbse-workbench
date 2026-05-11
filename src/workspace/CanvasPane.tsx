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

import type {
  EdgeId,
  ElementId,
  ElementKind,
  ModelEdge,
  ModelElement,
  PartDefinitionElement,
} from '@/model';
import {
  BDD_BLOCK_HEIGHT,
  BDD_BLOCK_WIDTH,
} from '@/viewpoints/bdd/BlockNode';
import {
  BDD_VIEWPOINT_ID,
  IBD_PART_USAGE_HEIGHT,
  IBD_PART_USAGE_WIDTH,
  IBD_VIEWPOINT_ID,
  resolvePartHandles,
  type BddEdgeKind,
  type Viewpoint,
} from '@/viewpoints';

import { EdgeKindPopover } from './EdgeKindPopover';
import { ExportMenu } from './ExportMenu';
import { PartUsageTypePopover } from './PartUsageTypePopover';
import type { Diagram } from './diagram';
import { downloadDiagramPng, downloadDiagramSvg } from './export';
import {
  getActiveDiagram,
  getActiveViewpoint,
  useWorkspaceStore,
} from './store';
import { PROJECT_TREE_DRAG_TYPE } from './tree/ProjectTree';

interface PendingConnection {
  readonly connection: Connection;
  readonly x: number;
  readonly y: number;
}

interface PendingPartDrop {
  readonly flowPosition: { x: number; y: number };
  readonly popoverX: number;
  readonly popoverY: number;
}

interface RegistryLookup {
  get(id: ElementId): ModelElement | undefined;
}

function nodeSizeFor(viewpoint: Viewpoint): { width: number; height: number } {
  if (viewpoint.id === IBD_VIEWPOINT_ID) {
    return { width: IBD_PART_USAGE_WIDTH, height: IBD_PART_USAGE_HEIGHT };
  }
  return { width: BDD_BLOCK_WIDTH, height: BDD_BLOCK_HEIGHT };
}

function toFlowNodes(
  elements: readonly ModelElement[],
  viewpoint: Viewpoint,
  diagram: Diagram,
  selectedIds: ReadonlySet<ElementId>,
  onRename: (id: ElementId, name: string) => void,
  registry: RegistryLookup | null,
): Node[] {
  const { width, height } = nodeSizeFor(viewpoint);
  return elements
    .filter((el) => viewpoint.acceptedElementKinds.includes(el.kind))
    .map((el) => {
      const pos = diagram.positions[el.id] ?? { x: 0, y: 0 };
      let data: Record<string, unknown>;
      if (el.kind === 'PartUsage' && registry) {
        const definition = registry.get(el.definitionId);
        const definitionName =
          definition?.kind === 'PartDefinition' ? definition.name : 'unknown';
        const ports = resolvePartHandles({ partUsage: el, registry });
        data = {
          elementId: el.id,
          name: el.name,
          definitionName,
          ports,
        };
      } else {
        data = { elementId: el.id, name: el.name, onRename };
      }
      const node: Node = {
        id: el.id,
        type: viewpoint.nodeTypeFor(el),
        position: pos,
        width,
        height,
        selected: selectedIds.has(el.id),
        data,
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
  const runAutoLayout = useWorkspaceStore((s) => s.runAutoLayout);

  const [pending, setPending] = useState<PendingConnection | null>(null);
  const [pendingPart, setPendingPart] = useState<PendingPartDrop | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow();
  const createPartUsage = useWorkspaceStore((s) => s.createPartUsage);

  const selectedSet = useMemo(() => new Set(selectedElementIds), [selectedElementIds]);

  const partDefinitions = useMemo(
    () =>
      elements
        .filter((e): e is PartDefinitionElement => e.kind === 'PartDefinition')
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [elements],
  );

  const flowNodes = useMemo(() => {
    if (!viewpoint || !diagram) return [];
    return toFlowNodes(
      elements,
      viewpoint,
      diagram,
      selectedSet,
      renameElement,
      registry,
    );
  }, [elements, viewpoint, diagram, selectedSet, renameElement, registry]);

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
      // BDD is the only viewpoint with edge creation in Phase 3; IBD's
      // connection authoring lands in #51. Bail early for everything else.
      if (!viewpoint || viewpoint.id !== BDD_VIEWPOINT_ID) return;
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
    [viewpoint, flowNodes, reactFlow],
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

  const handleAutoLayout = useCallback(() => {
    if (!diagram) return;
    runAutoLayout(diagram.id);
  }, [diagram, runAutoLayout]);

  const handleExportPng = useCallback(() => {
    if (!viewpoint || !diagram) return;
    const { width, height } = nodeSizeFor(viewpoint);
    void downloadDiagramPng({
      diagramName: diagram.name,
      svgInput: {
        elements,
        edges,
        positions: diagram.positions,
        viewpoint,
        nodeWidth: width,
        nodeHeight: height,
      },
    });
  }, [viewpoint, diagram, elements, edges]);

  const handleExportSvg = useCallback(() => {
    if (!viewpoint || !diagram) return;
    const { width, height } = nodeSizeFor(viewpoint);
    void downloadDiagramSvg({
      diagramName: diagram.name,
      svgInput: {
        elements,
        edges,
        positions: diagram.positions,
        viewpoint,
        nodeWidth: width,
        nodeHeight: height,
      },
    });
  }, [viewpoint, diagram, elements, edges]);

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (event.dataTransfer.types.includes(PROJECT_TREE_DRAG_TYPE)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }
    },
    [],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!viewpoint || !diagram) return;
      const kind = event.dataTransfer.getData(PROJECT_TREE_DRAG_TYPE);
      if (!kind) return;
      if (!viewpoint.acceptedElementKinds.includes(kind as ElementKind)) return;
      event.preventDefault();
      const flowPos = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      if (viewpoint.id === IBD_VIEWPOINT_ID && kind === 'PartUsage') {
        // Defer creation: prompt the user for which PartDefinition to type
        // this part as. The popover handles empty/cancel.
        const rect = canvasRef.current?.getBoundingClientRect();
        setPendingPart({
          flowPosition: {
            x: flowPos.x - IBD_PART_USAGE_WIDTH / 2,
            y: flowPos.y - IBD_PART_USAGE_HEIGHT / 2,
          },
          popoverX: event.clientX - (rect?.left ?? 0),
          popoverY: event.clientY - (rect?.top ?? 0),
        });
        return;
      }
      // BDD: drop creates a Block (PartDefinition) directly.
      const id = createBlock({
        x: flowPos.x - BDD_BLOCK_WIDTH / 2,
        y: flowPos.y - BDD_BLOCK_HEIGHT / 2,
      });
      if (id) setSelection([id]);
    },
    [viewpoint, diagram, reactFlow, createBlock, setSelection],
  );

  const confirmPendingPart = useCallback(
    (definitionId: ElementId) => {
      if (!pendingPart || !diagram) return;
      const id = createPartUsage(
        diagram.id,
        definitionId,
        pendingPart.flowPosition,
      );
      setPendingPart(null);
      if (id) setSelection([id]);
    },
    [pendingPart, diagram, createPartUsage, setSelection],
  );

  const cancelPendingPart = useCallback(() => setPendingPart(null), []);

  const elementCount = elements.length;

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
        {viewpoint.id === BDD_VIEWPOINT_ID ? (
          <button
            type="button"
            data-testid="toolbar-add-block"
            onClick={handleAddBlock}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
          >
            + Block
          </button>
        ) : null}
        <button
          type="button"
          data-testid="toolbar-auto-layout"
          onClick={handleAutoLayout}
          disabled={elementCount === 0}
          title="Re-arrange blocks with dagre layout"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Auto-layout
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
        <div className="ml-auto">
          <ExportMenu
            disabled={elementCount === 0}
            onExportPng={handleExportPng}
            onExportSvg={handleExportSvg}
          />
        </div>
      </div>
      <div
        ref={canvasRef}
        data-testid="canvas-drop-target"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative flex-1"
      >
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
        {pendingPart ? (
          <PartUsageTypePopover
            x={pendingPart.popoverX}
            y={pendingPart.popoverY}
            definitions={partDefinitions}
            onPick={confirmPendingPart}
            onCancel={cancelPendingPart}
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
