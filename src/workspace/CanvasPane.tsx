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
  type NodeDragHandler,
} from '@xyflow/react';

import type {
  EdgeId,
  ElementId,
  ElementKind,
  PartDefinitionElement,
  RequirementTraceKind,
} from '@/model';
import type { UseCaseEdgeKind } from '@/viewpoints';
import { isActionNodeType, isStateNodeType } from '@/model';
import {
  BDD_BLOCK_HEIGHT,
  BDD_BLOCK_WIDTH,
} from '@/viewpoints/bdd/BlockNode';
import {
  ACTIVITY_ACTION_HEIGHT,
  ACTIVITY_ACTION_WIDTH,
  ACTIVITY_VIEWPOINT_ID,
  actionNodeSize,
  allowedUseCaseEdgeKindsFor,
  BDD_VIEWPOINT_ID,
  defaultUseCaseEdgeKindFor,
  IBD_PART_USAGE_HEIGHT,
  IBD_PART_USAGE_WIDTH,
  IBD_VIEWPOINT_ID,
  isValidActivityConnection,
  isValidIbdConnection,
  isValidPackageConnection,
  isValidParametricConnection,
  isValidStateMachineConnection,
  isValidUseCaseConnection,
  REQUIREMENT_NODE_HEIGHT,
  REQUIREMENT_NODE_WIDTH,
  REQUIREMENTS_VIEWPOINT_ID,
  STATE_MACHINE_STATE_HEIGHT,
  STATE_MACHINE_STATE_WIDTH,
  PARAMETRIC_CONSTRAINT_USAGE_HEIGHT,
  PARAMETRIC_CONSTRAINT_USAGE_WIDTH,
  PARAMETRIC_VALUE_PROPERTY_HEIGHT,
  PARAMETRIC_VALUE_PROPERTY_WIDTH,
  PACKAGE_VIEWPOINT_ID,
  PARAMETRIC_VIEWPOINT_ID,
  STATE_MACHINE_VIEWPOINT_ID,
  stateNodeSize,
  USE_CASE_ACTOR_HEIGHT,
  USE_CASE_ACTOR_WIDTH,
  USE_CASE_USE_CASE_HEIGHT,
  USE_CASE_USE_CASE_WIDTH,
  USE_CASE_VIEWPOINT_ID,
  validTraceKindsFor,
  type BddEdgeKind,
  type Viewpoint,
} from '@/viewpoints';

import { isLibraryElement } from '@/library';

import { RequirementsSurface } from './RequirementsSurface';
import { SecondaryCanvasPane } from './SecondaryCanvasPane';
import { toFlowEdges, toFlowNodes } from './flowGraph';
import { ContextMenu, deriveNavTargets, type NavTarget } from './contextMenu';
import { EdgeKindPopover } from './EdgeKindPopover';
import { ExportMenu } from './ExportMenu';
import { EmptyState } from './EmptyState';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorTestThrower } from './ErrorTestThrower';
import { ImportMenu } from './ImportMenu';
import { ImportErrorBanner } from './ImportErrorBanner';
import { CommandErrorBanner } from './CommandErrorBanner';
import { PartUsageTypePopover } from './PartUsageTypePopover';
import { TraceKindPopover } from './TraceKindPopover';
import { UseCaseEdgeKindPopover } from './UseCaseEdgeKindPopover';
import {
  downloadDiagramPng,
  downloadDiagramSvg,
  downloadProjectSysml,
  downloadProjectJson,
} from './export';
import {
  getActiveDiagram,
  getActiveViewpoint,
  useWorkspaceStore,
} from './store';
import { ActivityPalette } from './ActivityPalette';
import { ImpactBanner } from './ImpactBanner';
import { ParametricPalette } from './ParametricPalette';
import type { DragPos } from './dragCoord';
import { DragCoordOverlay } from './DragCoordOverlay';
import { StateMachinePalette } from './StateMachinePalette';
import { UseCasePalette } from './UseCasePalette';
import {
  PROJECT_TREE_DRAG_ELEMENT_ID,
  PROJECT_TREE_DRAG_NODE_TYPE,
  PROJECT_TREE_DRAG_STATE_TYPE,
  PROJECT_TREE_DRAG_TYPE,
} from './tree/ProjectTree';
import { resolveTreeDragTrace } from './treeDragTrace';
import {
  autoLayoutDisabledReason,
  deleteDisabledReason,
  exportDisabledReason,
  redoDisabledReason,
  REDO_ENABLED_TITLE,
  splitDisabledReason,
  undoDisabledReason,
  UNDO_ENABLED_TITLE,
} from './toolbarDisabledReasons';

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

interface PendingTrace {
  readonly connection: Connection;
  readonly allowedKinds: readonly RequirementTraceKind[];
  readonly x: number;
  readonly y: number;
}

interface PendingUseCaseEdge {
  readonly connection: Connection;
  readonly allowedKinds: readonly UseCaseEdgeKind[];
  readonly defaultKind: UseCaseEdgeKind;
  readonly x: number;
  readonly y: number;
}

interface ContextMenuState {
  readonly x: number;
  readonly y: number;
  readonly targets: readonly NavTarget[];
}


function exportNodeSizeFor(viewpoint: Viewpoint): { width: number; height: number } {
  // Export takes a single (width, height) pair per call. Until export grows
  // per-element sizing (out of scope for #88), pick a viewpoint-wide default.
  if (viewpoint.id === IBD_VIEWPOINT_ID) {
    return { width: IBD_PART_USAGE_WIDTH, height: IBD_PART_USAGE_HEIGHT };
  }
  if (viewpoint.id === REQUIREMENTS_VIEWPOINT_ID) {
    return { width: REQUIREMENT_NODE_WIDTH, height: REQUIREMENT_NODE_HEIGHT };
  }
  if (viewpoint.id === ACTIVITY_VIEWPOINT_ID) {
    return { width: ACTIVITY_ACTION_WIDTH, height: ACTIVITY_ACTION_HEIGHT };
  }
  if (viewpoint.id === STATE_MACHINE_VIEWPOINT_ID) {
    return { width: STATE_MACHINE_STATE_WIDTH, height: STATE_MACHINE_STATE_HEIGHT };
  }
  if (viewpoint.id === USE_CASE_VIEWPOINT_ID) {
    return { width: USE_CASE_USE_CASE_WIDTH, height: USE_CASE_USE_CASE_HEIGHT };
  }
  return { width: BDD_BLOCK_WIDTH, height: BDD_BLOCK_HEIGHT };
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
  const setNodeSize = useWorkspaceStore((s) => s.setNodeSize);
  const createBlock = useWorkspaceStore((s) => s.createBlock);
  const deleteSelection = useWorkspaceStore((s) => s.deleteSelection);
  const deleteElement = useWorkspaceStore((s) => s.deleteElement);
  const unlinkEdge = useWorkspaceStore((s) => s.unlinkEdge);
  const linkBlocks = useWorkspaceStore((s) => s.linkBlocks);
  const renameElement = useWorkspaceStore((s) => s.renameElement);
  const runAutoLayout = useWorkspaceStore((s) => s.runAutoLayout);
  const connectPorts = useWorkspaceStore((s) => s.connectPorts);
  const connectItemFlow = useWorkspaceStore((s) => s.connectItemFlow);
  const connectControlFlow = useWorkspaceStore((s) => s.connectControlFlow);
  const connectObjectFlow = useWorkspaceStore((s) => s.connectObjectFlow);
  const connectStateTransition = useWorkspaceStore(
    (s) => s.connectStateTransition,
  );
  const createRequirement = useWorkspaceStore((s) => s.createRequirement);
  const createActionUsage = useWorkspaceStore((s) => s.createActionUsage);
  const createStateUsage = useWorkspaceStore((s) => s.createStateUsage);
  const createActor = useWorkspaceStore((s) => s.createActor);
  const createUseCase = useWorkspaceStore((s) => s.createUseCase);
  const createConstraintUsage = useWorkspaceStore((s) => s.createConstraintUsage);
  const createValueProperty = useWorkspaceStore((s) => s.createValueProperty);
  const createPackage = useWorkspaceStore((s) => s.createPackage);
  const linkRequirementTrace = useWorkspaceStore(
    (s) => s.linkRequirementTrace,
  );
  const linkUseCaseEdge = useWorkspaceStore((s) => s.linkUseCaseEdge);
  const linkParameterBinding = useWorkspaceStore(
    (s) => s.linkParameterBinding,
  );
  const linkPackageImport = useWorkspaceStore((s) => s.linkPackageImport);
  const moveElementBetweenPackages = useWorkspaceStore(
    (s) => s.moveElementBetweenPackages,
  );

  const [pending, setPending] = useState<PendingConnection | null>(null);
  const [pendingPart, setPendingPart] = useState<PendingPartDrop | null>(null);
  const [pendingTrace, setPendingTrace] = useState<PendingTrace | null>(null);
  const [pendingUseCaseEdge, setPendingUseCaseEdge] =
    useState<PendingUseCaseEdge | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  // Transient drag-coord overlay state — not persisted, cleared on drag-stop.
  const [dragPos, setDragPos] = useState<DragPos | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isConnectingRef = useRef(false);
  const shiftHeldRef = useRef(false);
  const reactFlow = useReactFlow();
  const createPartUsage = useWorkspaceStore((s) => s.createPartUsage);
  const diagrams = useWorkspaceStore((s) => s.diagrams);
  const activeDiagramId = useWorkspaceStore((s) => s.activeDiagramId);
  const viewpointRegistry = useWorkspaceStore((s) => s.viewpoints);
  const openInternalDiagram = useWorkspaceStore((s) => s.openInternalDiagram);
  const showDefinitionOnBdd = useWorkspaceStore((s) => s.showDefinitionOnBdd);
  const navigateToElementOnDiagram = useWorkspaceStore(
    (s) => s.navigateToElementOnDiagram,
  );
  const showRequirementTracesFor = useWorkspaceStore(
    (s) => s.showRequirementTracesFor,
  );
  const runImpactAnalysis = useWorkspaceStore((s) => s.runImpactAnalysis);
  const impactHighlightedIds = useWorkspaceStore((s) => s.impactHighlightedIds);
  const impactHighlightedEdgeIds = useWorkspaceStore(
    (s) => s.impactHighlightedEdgeIds,
  );
  const bus = useWorkspaceStore((s) => s.bus);
  const modelVersion = useWorkspaceStore((s) => s.modelVersion);
  const undo = useWorkspaceStore((s) => s.undo);
  const redo = useWorkspaceStore((s) => s.redo);
  // `modelVersion` ticks on every dispatch/undo/redo so canUndo/canRedo
  // re-read from the bus each render — same pattern as CommandPalette.
  void modelVersion;
  const canUndo = bus?.canUndo() ?? false;
  const canRedo = bus?.canRedo() ?? false;

  const selectedSet = useMemo(() => new Set(selectedElementIds), [selectedElementIds]);

  const libraryRootIds = useWorkspaceStore(
    (s) => s.project?.libraryRootIds ?? undefined,
  );

  // Library elements live in the read-only "Libraries" tree, not on any
  // diagram canvas. Strip them before handing the element list to the flow
  // builders so a fresh BDD doesn't pre-paint with KerML core PartDefinitions.
  const canvasElements = useMemo(
    () => elements.filter((e) => !isLibraryElement(e, libraryRootIds, elements)),
    [elements, libraryRootIds],
  );

  const partDefinitions = useMemo(
    () =>
      elements
        .filter((e): e is PartDefinitionElement => e.kind === 'PartDefinition')
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [elements],
  );

  const onResize = useCallback(
    (elementId: ElementId, width: number, height: number) => {
      if (!diagram) return;
      setNodeSize(diagram.id, elementId, width, height);
    },
    [diagram, setNodeSize],
  );

  const flowNodes = useMemo(() => {
    if (!viewpoint || !diagram) return [];
    return toFlowNodes(
      canvasElements,
      viewpoint,
      diagram,
      selectedSet,
      renameElement,
      registry,
      impactHighlightedIds,
      onResize,
    );
  }, [
    canvasElements,
    viewpoint,
    diagram,
    selectedSet,
    renameElement,
    registry,
    impactHighlightedIds,
    onResize,
  ]);

  const flowEdges = useMemo(() => {
    if (!viewpoint) return [];
    return toFlowEdges(
      edges,
      canvasElements,
      viewpoint,
      selectedSet,
      impactHighlightedEdgeIds,
    );
  }, [edges, canvasElements, viewpoint, selectedSet, impactHighlightedEdgeIds]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const hasSelectChange = changes.some((c) => c.type === 'select');
      // React Flow emits a stray `{type:'select', selected:true}` for the
      // connection-drag source node after a successful onConnect. Ignore node
      // select changes while a connection drag is in progress so that pressing
      // Backspace afterwards removes only the new edge, not the source node.
      const shouldIgnoreNodeSelect = isConnectingRef.current;
      if (hasSelectChange && !shouldIgnoreNodeSelect) {
        // Only diff selection when ReactFlow actually emitted a node-select
        // change. Otherwise (position/dimension/remove emits) we'd clobber
        // selections that were set from outside RF — e.g. a newly-created
        // ConnectionUsage that lives on the edge layer.
        const next = applyNodeChanges(changes, flowNodes);
        const nodeIds = new Set(next.map((n) => n.id as ElementId));
        const nextNodeSelected: ElementId[] = next
          .filter((n) => n.selected)
          .map((n) => n.id as ElementId);
        // Preserve any non-node selections (element-as-edge ids like a
        // ConnectionUsage are not in `flowNodes`).
        const preserved = selectedElementIds.filter((id) => !nodeIds.has(id));
        const merged: ElementId[] = [...preserved, ...nextNodeSelected];
        const same =
          merged.length === selectedElementIds.length &&
          merged.every((id, i) => id === selectedElementIds[i]);
        if (!same) setSelection(merged);
      }

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
      // Edge ids can be either ModelEdge ids or ElementId for element-as-edge
      // kinds (ConnectionUsage / ItemFlow / Transition). We need to know which
      // is which to (a) route deletions to the right store action and (b)
      // reconcile selection across the two layers.
      const elementEdgeIds = new Set(
        flowEdges
          .filter((e) => registry?.get(e.id as ElementId))
          .map((e) => e.id as ElementId),
      );
      // Selectable ModelEdges include all flow edges whose id is NOT an
      // element id — these are real `ModelEdge` rows. Requirements
      // RequirementTrace edges show up in the inspector via this path.
      const modelEdgeIds = new Set(
        flowEdges
          .filter((e) => !elementEdgeIds.has(e.id as ElementId))
          .map((e) => e.id as unknown as ElementId),
      );

      const hasSelectChange = changes.some((c) => c.type === 'select');
      // Mirror the onNodesChange guard. After connectXxx() creates an edge
      // and we call setSelection([newEdgeId]) imperatively, RF v12 sometimes
      // emits a stray `{type:'select', id:<newEdge>, selected:false}` a few
      // render ticks later — its internal edge state hasn't caught up to the
      // externally-driven `selected:true` we set on the next render's edges
      // prop. Without this guard, that stray change runs through
      // applyEdgeChanges and computes `merged=[]` (preserved drops the
      // newEdgeId because it IS in elementEdgeIds; nextElementEdgeSelected is
      // empty because the change deselects it), which clobbers the auto-
      // selection. Issue #161's inspector-transition flake is exactly this:
      // under amplified CI load (workers=4) the stray emission lands inside
      // the 250ms post-onConnectEnd window and the inspector renders empty.
      const shouldIgnoreEdgeSelect = isConnectingRef.current;
      if (hasSelectChange && !shouldIgnoreEdgeSelect) {
        const next = applyEdgeChanges(changes, flowEdges);
        const nextElementEdgeSelected: ElementId[] = next
          .filter((e) => e.selected && elementEdgeIds.has(e.id as ElementId))
          .map((e) => e.id as ElementId);
        const nextModelEdgeSelected: ElementId[] = next
          .filter(
            (e) =>
              e.selected &&
              modelEdgeIds.has(e.id as unknown as ElementId),
          )
          .map((e) => e.id as unknown as ElementId);
        const preserved = selectedElementIds.filter(
          (id) => !elementEdgeIds.has(id) && !modelEdgeIds.has(id),
        );
        const merged: ElementId[] = [
          ...preserved,
          ...nextElementEdgeSelected,
          ...nextModelEdgeSelected,
        ];
        const same =
          merged.length === selectedElementIds.length &&
          merged.every((id, i) => id === selectedElementIds[i]);
        if (!same) setSelection(merged);
      }

      for (const change of changes) {
        if (change.type === 'remove') {
          const id = change.id as ElementId;
          if (elementEdgeIds.has(id)) {
            deleteElement(id);
          } else {
            unlinkEdge(change.id as EdgeId);
          }
        }
      }
    },
    [
      flowEdges,
      registry,
      selectedElementIds,
      setSelection,
      deleteElement,
      unlinkEdge,
    ],
  );

  const onConnectStart = useCallback(
    (event: MouseEvent | TouchEvent) => {
      isConnectingRef.current = true;
      // Capture initial Shift state from the drag-start event. The window
      // listener below keeps it in sync if the user presses/releases Shift
      // during the drag.
      if ('shiftKey' in event) {
        shiftHeldRef.current = event.shiftKey;
      }
    },
    [],
  );

  const onConnectEnd = useCallback(() => {
    // React Flow emits two classes of stray select changes a few render
    // ticks after onConnect/onConnectEnd:
    //   1. `{type:'select', id:<sourceNode>, selected:true}` for the
    //      connection-drag source node (caught by onNodesChange's guard).
    //   2. `{type:'select', id:<newEdge>, selected:false}` for the
    //      freshly-added edge whose externally-set `selected:true` RF
    //      hasn't yet propagated into its internal state (caught by
    //      onEdgesChange's matching guard).
    // We keep `isConnecting` true long enough for both classes to be
    // ignored. 100ms was sufficient under the prior CI config (workers=2)
    // but iter-769's workers=4 bump amplified concurrent activity and
    // pushed the late edge-select emission past 100ms — producing the
    // #161 inspector-transition flake. 250ms covers the new envelope
    // without affecting normal interaction (next drag resets the flag
    // immediately).
    setTimeout(() => {
      isConnectingRef.current = false;
    }, 250);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!viewpoint) return;
      if (viewpoint.id === BDD_VIEWPOINT_ID) {
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
        return;
      }
      if (viewpoint.id === IBD_VIEWPOINT_ID) {
        // Shift held during the drag promotes the connection to an ItemFlow
        // (directed flow of an item-type) instead of a plain ConnectionUsage.
        const id = shiftHeldRef.current
          ? connectItemFlow(connection)
          : connectPorts(connection);
        if (id) setSelection([id]);
        return;
      }
      if (viewpoint.id === ACTIVITY_VIEWPOINT_ID) {
        // Mirrors the IBD ConnectionUsage/ItemFlow split per ADR 0005 § 5:
        // Shift-held drag creates an ObjectFlow (dashed, item-typed),
        // unmodified drag creates a ControlFlow (solid, with optional guard).
        const id = shiftHeldRef.current
          ? connectObjectFlow(connection)
          : connectControlFlow(connection);
        if (id) setSelection([id as unknown as ElementId]);
        return;
      }
      if (viewpoint.id === STATE_MACHINE_VIEWPOINT_ID) {
        // ADR 0006 § 3: single transition kind, no shift-modifier split.
        const id = connectStateTransition(connection);
        if (id) setSelection([id]);
        return;
      }
      if (viewpoint.id === REQUIREMENTS_VIEWPOINT_ID && registry) {
        const allowed = validTraceKindsFor(connection, registry);
        if (allowed.length === 0) return;
        const targetNode = flowNodes.find((n) => n.id === connection.target);
        const screenPos = targetNode
          ? reactFlow.flowToScreenPosition({
              x: targetNode.position.x + REQUIREMENT_NODE_WIDTH / 2,
              y: targetNode.position.y,
            })
          : { x: 0, y: 0 };
        const rect = canvasRef.current?.getBoundingClientRect();
        const x = screenPos.x - (rect?.left ?? 0);
        const y = screenPos.y - (rect?.top ?? 0);
        setPendingTrace({ connection, allowedKinds: allowed, x, y });
        return;
      }
      if (viewpoint.id === PARAMETRIC_VIEWPOINT_ID) {
        // ADR 0008 § 3: single ParameterBinding edge kind, no shift-modifier
        // split. Store action canonicalises ConstraintUsage→ValueProperty.
        const id = linkParameterBinding(connection);
        if (id) setSelection([id as unknown as ElementId]);
        return;
      }
      if (viewpoint.id === PACKAGE_VIEWPOINT_ID) {
        const id = linkPackageImport(connection);
        if (id) setSelection([id as unknown as ElementId]);
        return;
      }
      if (viewpoint.id === USE_CASE_VIEWPOINT_ID && registry) {
        // ADR 0007 § 4: three accepted edge kinds (Include/Extend/Generalization).
        // Popover picker at the drop site — shift-modifier discriminates only
        // two kinds, so it's not enough here.
        if (!isValidUseCaseConnection(connection, registry)) return;
        const sourceEl = registry.get(connection.source as ElementId);
        const targetEl = registry.get(connection.target as ElementId);
        if (!sourceEl || !targetEl) return;
        const allowed = allowedUseCaseEdgeKindsFor(sourceEl, targetEl);
        if (allowed.length === 0) return;
        const defaultKind = defaultUseCaseEdgeKindFor(sourceEl, targetEl);
        if (!defaultKind) return;
        const targetNode = flowNodes.find((n) => n.id === connection.target);
        const isUseCase = targetEl.kind === 'UseCase';
        const width = isUseCase ? USE_CASE_USE_CASE_WIDTH : USE_CASE_ACTOR_WIDTH;
        const screenPos = targetNode
          ? reactFlow.flowToScreenPosition({
              x: targetNode.position.x + width / 2,
              y: targetNode.position.y,
            })
          : { x: 0, y: 0 };
        const rect = canvasRef.current?.getBoundingClientRect();
        const x = screenPos.x - (rect?.left ?? 0);
        const y = screenPos.y - (rect?.top ?? 0);
        setPendingUseCaseEdge({
          connection,
          allowedKinds: allowed,
          defaultKind,
          x,
          y,
        });
        return;
      }
    },
    [
      viewpoint,
      flowNodes,
      reactFlow,
      connectPorts,
      connectItemFlow,
      connectControlFlow,
      connectObjectFlow,
      connectStateTransition,
      linkParameterBinding,
      linkPackageImport,
      setSelection,
      registry,
    ],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (!viewpoint || !registry) return false;
      const { source, target } = connection;
      if (!source || !target || source === target) return false;
      if (viewpoint.id === IBD_VIEWPOINT_ID) {
        // IBD uses the typed port-direction check from ADR 0003.
        // EdgeChange shapes lack sourceHandle/targetHandle, but a real drag
        // connection always carries them — this branch only runs while the
        // user is dragging from a Handle.
        const conn = connection as Connection;
        if (!conn.sourceHandle || !conn.targetHandle) return false;
        return isValidIbdConnection(conn, registry);
      }
      if (viewpoint.id === REQUIREMENTS_VIEWPOINT_ID) {
        // Requirements viewpoint: source must be Requirement; target depends
        // on the chosen traceKind. During drag we don't know the kind yet, so
        // the validity check is satisfied as long as *some* kind would work.
        const conn = connection as Connection;
        return validTraceKindsFor(conn, registry).length > 0;
      }
      if (viewpoint.id === ACTIVITY_VIEWPOINT_ID) {
        // Activity viewpoint: same ADR-0005 §4 rules for ControlFlow and
        // ObjectFlow — Shift only switches which edge kind gets created on
        // commit, it does not change validity.
        return isValidActivityConnection(connection as Connection, registry);
      }
      if (viewpoint.id === STATE_MACHINE_VIEWPOINT_ID) {
        return isValidStateMachineConnection(
          connection as Connection,
          registry,
        );
      }
      if (viewpoint.id === USE_CASE_VIEWPOINT_ID) {
        return isValidUseCaseConnection(connection as Connection, registry);
      }
      if (viewpoint.id === PARAMETRIC_VIEWPOINT_ID) {
        return isValidParametricConnection(
          connection as Connection,
          registry,
          edges,
        );
      }
      if (viewpoint.id === PACKAGE_VIEWPOINT_ID) {
        return isValidPackageConnection(
          connection as Connection,
          registry,
          edges,
        );
      }
      // BDD: both endpoints must resolve to a PartDefinition.
      const s = registry.get(source as ElementId);
      const t = registry.get(target as ElementId);
      if (!s || !t) return false;
      return s.kind === 'PartDefinition' && t.kind === 'PartDefinition';
    },
    [viewpoint, registry, edges],
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

  const confirmPendingTrace = useCallback(
    (traceKind: RequirementTraceKind) => {
      if (!pendingTrace) return;
      const { source, target } = pendingTrace.connection;
      if (!source || !target) {
        setPendingTrace(null);
        return;
      }
      const id = linkRequirementTrace(
        source as ElementId,
        target as ElementId,
        traceKind,
      );
      setPendingTrace(null);
      if (id) setSelection([id as unknown as ElementId]);
    },
    [pendingTrace, linkRequirementTrace, setSelection],
  );

  const cancelPendingTrace = useCallback(() => setPendingTrace(null), []);

  const confirmPendingUseCaseEdge = useCallback(
    (kind: UseCaseEdgeKind) => {
      if (!pendingUseCaseEdge) return;
      const { source, target } = pendingUseCaseEdge.connection;
      if (!source || !target) {
        setPendingUseCaseEdge(null);
        return;
      }
      const id = linkUseCaseEdge(
        source as ElementId,
        target as ElementId,
        kind,
      );
      setPendingUseCaseEdge(null);
      if (id) setSelection([id as unknown as ElementId]);
    },
    [pendingUseCaseEdge, linkUseCaseEdge, setSelection],
  );

  const cancelPendingUseCaseEdge = useCallback(
    () => setPendingUseCaseEdge(null),
    [],
  );

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

  const handleAddAction = useCallback(() => {
    if (!diagram) return;
    const cascadeIndex = Object.keys(diagram.positions).length;
    const columns = 2;
    const col = cascadeIndex % columns;
    const row = Math.floor(cascadeIndex / columns);
    const stepX = ACTIVITY_ACTION_WIDTH + 40;
    const stepY = ACTIVITY_ACTION_HEIGHT + 40;
    const id = createActionUsage(
      diagram.id,
      { x: 60 + col * stepX, y: 60 + row * stepY },
      'action',
    );
    if (id) setSelection([id]);
  }, [createActionUsage, diagram, setSelection]);

  const handleAddRequirement = useCallback(() => {
    if (!diagram) return;
    const cascadeIndex = Object.keys(diagram.positions).length;
    const columns = 2;
    const col = cascadeIndex % columns;
    const row = Math.floor(cascadeIndex / columns);
    const stepX = REQUIREMENT_NODE_WIDTH + 40;
    const stepY = REQUIREMENT_NODE_HEIGHT + 40;
    const id = createRequirement(diagram.id, {
      x: 60 + col * stepX,
      y: 60 + row * stepY,
    });
    if (id) setSelection([id]);
  }, [createRequirement, diagram, setSelection]);

  const handleAddState = useCallback(() => {
    if (!diagram) return;
    const cascadeIndex = Object.keys(diagram.positions).length;
    const columns = 2;
    const col = cascadeIndex % columns;
    const row = Math.floor(cascadeIndex / columns);
    const stepX = STATE_MACHINE_STATE_WIDTH + 40;
    const stepY = STATE_MACHINE_STATE_HEIGHT + 40;
    const id = createStateUsage(
      diagram.id,
      { x: 60 + col * stepX, y: 60 + row * stepY },
      'state',
    );
    if (id) setSelection([id]);
  }, [createStateUsage, diagram, setSelection]);

  const handleAddActor = useCallback(() => {
    if (!diagram) return;
    const cascadeIndex = Object.keys(diagram.positions).length;
    const columns = 2;
    const col = cascadeIndex % columns;
    const row = Math.floor(cascadeIndex / columns);
    const stepX = USE_CASE_ACTOR_WIDTH + 40;
    const stepY = USE_CASE_ACTOR_HEIGHT + 40;
    const id = createActor(diagram.id, {
      x: 60 + col * stepX,
      y: 60 + row * stepY,
    });
    if (id) setSelection([id]);
  }, [createActor, diagram, setSelection]);

  const handleAddUseCase = useCallback(() => {
    if (!diagram) return;
    const cascadeIndex = Object.keys(diagram.positions).length;
    const columns = 2;
    const col = cascadeIndex % columns;
    const row = Math.floor(cascadeIndex / columns);
    const stepX = USE_CASE_USE_CASE_WIDTH + 40;
    const stepY = USE_CASE_USE_CASE_HEIGHT + 40;
    const id = createUseCase(diagram.id, {
      x: 60 + col * stepX,
      y: 60 + row * stepY,
    });
    if (id) setSelection([id]);
  }, [createUseCase, diagram, setSelection]);

  const handleAutoLayout = useCallback(() => {
    if (!diagram) return;
    runAutoLayout(diagram.id);
  }, [diagram, runAutoLayout]);

  const handleExportPng = useCallback(() => {
    if (!viewpoint || !diagram) return;
    const { width, height } = exportNodeSizeFor(viewpoint);
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

  const handleExportSysml = useCallback(() => {
    const project = useWorkspaceStore.getState().project;
    if (!project) return;
    downloadProjectSysml({ project });
  }, []);

  const handleImportSysml = useCallback(() => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sysml,.txt,text/plain';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.text().then((text) => {
        void useWorkspaceStore.getState().importSysmlText(text);
      });
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(() => {
      input.remove();
    }, 0);
  }, []);

  const handleExportJson = useCallback(() => {
    const project = useWorkspaceStore.getState().project;
    if (!project) return;
    downloadProjectJson({ project });
  }, []);

  const handleImportJson = useCallback(() => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.text().then((text) => {
        void useWorkspaceStore.getState().importProjectJson(text);
      });
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(() => {
      input.remove();
    }, 0);
  }, []);

  const handleExportSvg = useCallback(() => {
    if (!viewpoint || !diagram) return;
    const { width, height } = exportNodeSizeFor(viewpoint);
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

  const openContextMenuForElement = useCallback(
    (event: React.MouseEvent, elementId: ElementId): void => {
      if (!registry) return;
      const element = registry.get(elementId);
      if (!element) return;
      const targets = deriveNavTargets({
        element,
        diagrams,
        activeDiagramId,
        elements,
        edges,
        viewpoints: viewpointRegistry,
        actions: {
          openInternalDiagram,
          showDefinitionOnBdd,
          navigateToElementOnDiagram,
          showRequirementTracesFor,
          runImpactAnalysis,
        },
      });
      if (targets.length === 0) return;
      event.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      setContextMenu({
        x: event.clientX - (rect?.left ?? 0),
        y: event.clientY - (rect?.top ?? 0),
        targets,
      });
    },
    [
      registry,
      diagrams,
      activeDiagramId,
      elements,
      edges,
      viewpointRegistry,
      openInternalDiagram,
      showDefinitionOnBdd,
      navigateToElementOnDiagram,
      showRequirementTracesFor,
      runImpactAnalysis,
    ],
  );

  // Show the drag-coord overlay while dragging; clear it on drag-stop.
  const onNodeDrag = useCallback<NodeDragHandler>(
    (_event, node) => {
      setDragPos({ x: node.position.x, y: node.position.y });
    },
    [],
  );

  const onNodeDragStop = useCallback<NodeDragHandler>(
    () => {
      setDragPos(null);
    },
    [],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node): void => {
      openContextMenuForElement(event, node.id as ElementId);
    },
    [openContextMenuForElement],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge): void => {
      openContextMenuForElement(event, edge.id as ElementId);
    },
    [openContextMenuForElement],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (event.dataTransfer.types.includes(PROJECT_TREE_DRAG_TYPE)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        return;
      }
      if (event.dataTransfer.types.includes(PROJECT_TREE_DRAG_ELEMENT_ID)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    },
    [],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!viewpoint || !diagram) return;
      const droppedElementId = event.dataTransfer.getData(
        PROJECT_TREE_DRAG_ELEMENT_ID,
      );
      if (droppedElementId && registry) {
        // Drag a Requirement from the project tree onto any canvas element to
        // create a RequirementTrace. The drop target is the ReactFlow node
        // under the cursor (data-id on the node wrapper); if the source is a
        // Requirement and the pair admits at least one trace kind, defer to
        // the existing TraceKindPopover. Viewpoint-agnostic — works on BDD,
        // IBD, Activity, etc., not just the Requirements canvas.
        const point = document.elementFromPoint(event.clientX, event.clientY);
        const nodeEl = point?.closest<HTMLElement>('[data-id]');
        const targetId = nodeEl?.getAttribute('data-id');
        const resolved = resolveTreeDragTrace(
          droppedElementId,
          targetId,
          registry,
        );
        if (resolved) {
          event.preventDefault();
          const rect = canvasRef.current?.getBoundingClientRect();
          setPendingTrace({
            connection: {
              source: resolved.source,
              target: resolved.target,
              sourceHandle: null,
              targetHandle: null,
            },
            allowedKinds: resolved.allowedKinds,
            x: event.clientX - (rect?.left ?? 0),
            y: event.clientY - (rect?.top ?? 0),
          });
          return;
        }
      }
      if (droppedElementId && viewpoint.id === PACKAGE_VIEWPOINT_ID) {
        // Find the package node under the cursor. React Flow nodes carry a
        // `data-id` attribute on the wrapping div; we use elementFromPoint
        // and walk up to the nearest one. Drops on empty canvas no-op.
        const point = document.elementFromPoint(event.clientX, event.clientY);
        const nodeEl = point?.closest<HTMLElement>('[data-id]');
        const targetPackageId = nodeEl?.getAttribute('data-id');
        if (!targetPackageId) return;
        event.preventDefault();
        const moved = moveElementBetweenPackages(
          droppedElementId as ElementId,
          targetPackageId as ElementId,
        );
        if (moved) setSelection([droppedElementId as ElementId]);
        return;
      }
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
      if (
        viewpoint.id === REQUIREMENTS_VIEWPOINT_ID &&
        kind === 'Requirement'
      ) {
        const id = createRequirement(diagram.id, {
          x: flowPos.x - REQUIREMENT_NODE_WIDTH / 2,
          y: flowPos.y - REQUIREMENT_NODE_HEIGHT / 2,
        });
        if (id) setSelection([id]);
        return;
      }
      if (viewpoint.id === ACTIVITY_VIEWPOINT_ID && kind === 'ActionUsage') {
        // Pull the palette item's `defaultData.nodeType` to discriminate
        // between the seven ActionUsage variants. Drag from outside the
        // palette (no defaultData) falls back to a default action node.
        const rawNodeType = event.dataTransfer.getData(
          PROJECT_TREE_DRAG_NODE_TYPE,
        );
        const nodeType = isActionNodeType(rawNodeType) ? rawNodeType : 'action';
        const { width, height } = actionNodeSize(nodeType);
        const id = createActionUsage(
          diagram.id,
          { x: flowPos.x - width / 2, y: flowPos.y - height / 2 },
          nodeType,
        );
        if (id) setSelection([id]);
        return;
      }
      if (viewpoint.id === USE_CASE_VIEWPOINT_ID && kind === 'Actor') {
        const id = createActor(diagram.id, {
          x: flowPos.x - USE_CASE_ACTOR_WIDTH / 2,
          y: flowPos.y - USE_CASE_ACTOR_HEIGHT / 2,
        });
        if (id) setSelection([id]);
        return;
      }
      if (viewpoint.id === USE_CASE_VIEWPOINT_ID && kind === 'UseCase') {
        const id = createUseCase(diagram.id, {
          x: flowPos.x - USE_CASE_USE_CASE_WIDTH / 2,
          y: flowPos.y - USE_CASE_USE_CASE_HEIGHT / 2,
        });
        if (id) setSelection([id]);
        return;
      }
      if (
        viewpoint.id === PARAMETRIC_VIEWPOINT_ID &&
        kind === 'ConstraintUsage'
      ) {
        const id = createConstraintUsage(diagram.id, {
          x: flowPos.x - PARAMETRIC_CONSTRAINT_USAGE_WIDTH / 2,
          y: flowPos.y - PARAMETRIC_CONSTRAINT_USAGE_HEIGHT / 2,
        });
        if (id) setSelection([id]);
        return;
      }
      if (
        viewpoint.id === PARAMETRIC_VIEWPOINT_ID &&
        kind === 'ValueProperty'
      ) {
        const id = createValueProperty(diagram.id, {
          x: flowPos.x - PARAMETRIC_VALUE_PROPERTY_WIDTH / 2,
          y: flowPos.y - PARAMETRIC_VALUE_PROPERTY_HEIGHT / 2,
        });
        if (id) setSelection([id]);
        return;
      }
      if (viewpoint.id === PACKAGE_VIEWPOINT_ID && kind === 'Package') {
        const { width, height } = viewpoint.nodeSizeFor({
          id: '' as ElementId,
          kind: 'Package',
          name: '',
          ownerId: null,
          ownerRole: 'member',
          ownerIndex: 0,
        });
        const id = createPackage(diagram.id, {
          x: flowPos.x - width / 2,
          y: flowPos.y - height / 2,
        });
        if (id) setSelection([id]);
        return;
      }
      if (viewpoint.id === STATE_MACHINE_VIEWPOINT_ID && kind === 'StateUsage') {
        // Same two-MIME pattern as Activity: the palette carries the
        // StateNodeType discriminator; tree-only drops fall back to 'state'.
        const rawStateType = event.dataTransfer.getData(
          PROJECT_TREE_DRAG_STATE_TYPE,
        );
        const stateType = isStateNodeType(rawStateType) ? rawStateType : 'state';
        const { width, height } = stateNodeSize(stateType);
        const id = createStateUsage(
          diagram.id,
          { x: flowPos.x - width / 2, y: flowPos.y - height / 2 },
          stateType,
        );
        if (id) setSelection([id]);
        return;
      }
      // BDD: drop creates a Block (PartDefinition) directly.
      const id = createBlock({
        x: flowPos.x - BDD_BLOCK_WIDTH / 2,
        y: flowPos.y - BDD_BLOCK_HEIGHT / 2,
      });
      if (id) setSelection([id]);
    },
    [
      viewpoint,
      diagram,
      reactFlow,
      createBlock,
      createRequirement,
      createActionUsage,
      createStateUsage,
      createActor,
      createUseCase,
      createConstraintUsage,
      createValueProperty,
      createPackage,
      moveElementBetweenPackages,
      setSelection,
      registry,
    ],
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

  const elementCount = canvasElements.filter((e) => e.ownerId !== null).length;

  useEffect(() => {
    if (!pending) return;
    return () => {
      // dialog effect-cleanup hook intentionally empty; popover owns its own listeners
    };
  }, [pending]);

  // Track Shift state on the window so the IBD onConnect handler can read it
  // even when the user toggles Shift mid-drag. KeyboardEvent.shiftKey reflects
  // the live modifier state after every key event.
  useEffect(() => {
    const updateShift = (event: KeyboardEvent): void => {
      shiftHeldRef.current = event.shiftKey;
    };
    window.addEventListener('keydown', updateShift);
    window.addEventListener('keyup', updateShift);
    return () => {
      window.removeEventListener('keydown', updateShift);
      window.removeEventListener('keyup', updateShift);
    };
  }, []);

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
      className="relative flex min-w-0 flex-1 flex-col"
    >
      <div
        data-testid="canvas-toolbar"
        className="flex h-10 shrink-0 items-center gap-2 overflow-x-auto border-b border-border bg-card px-3"
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
        {viewpoint.id === REQUIREMENTS_VIEWPOINT_ID ? (
          <button
            type="button"
            data-testid="toolbar-add-requirement"
            onClick={handleAddRequirement}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
          >
            + Requirement
          </button>
        ) : null}
        {viewpoint.id === ACTIVITY_VIEWPOINT_ID ? (
          <button
            type="button"
            data-testid="toolbar-add-action"
            onClick={handleAddAction}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
          >
            + Action
          </button>
        ) : null}
        {viewpoint.id === STATE_MACHINE_VIEWPOINT_ID ? (
          <button
            type="button"
            data-testid="toolbar-add-state"
            onClick={handleAddState}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
          >
            + State
          </button>
        ) : null}
        {viewpoint.id === USE_CASE_VIEWPOINT_ID ? (
          <>
            <button
              type="button"
              data-testid="toolbar-add-actor"
              onClick={handleAddActor}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
            >
              + Actor
            </button>
            <button
              type="button"
              data-testid="toolbar-add-usecase"
              onClick={handleAddUseCase}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
            >
              + Use case
            </button>
          </>
        ) : null}
        <button
          type="button"
          data-testid="toolbar-undo"
          onClick={undo}
          disabled={!canUndo}
          title={undoDisabledReason(canUndo) ?? UNDO_ENABLED_TITLE}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Undo
        </button>
        <button
          type="button"
          data-testid="toolbar-redo"
          onClick={redo}
          disabled={!canRedo}
          title={redoDisabledReason(canRedo) ?? REDO_ENABLED_TITLE}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Redo
        </button>
        <button
          type="button"
          data-testid="toolbar-auto-layout"
          onClick={handleAutoLayout}
          disabled={elementCount === 0}
          title={
            autoLayoutDisabledReason(elementCount) ??
            'Re-arrange blocks with dagre layout'
          }
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Auto-layout
        </button>
        <button
          type="button"
          data-testid="toolbar-delete"
          onClick={deleteSelection}
          disabled={selectedElementIds.length === 0}
          title={deleteDisabledReason(selectedElementIds.length)}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
        <div className="ml-auto flex items-center gap-2">
          <ImportMenu
            onImportSysml={handleImportSysml}
            onImportJson={handleImportJson}
          />
          <ExportMenu
            disabled={elementCount === 0}
            disabledReason={exportDisabledReason(elementCount)}
            onExportPng={handleExportPng}
            onExportSvg={handleExportSvg}
            onExportSysml={handleExportSysml}
            onExportJson={handleExportJson}
          />
        </div>
      </div>
      <ImportErrorBanner />
      <CommandErrorBanner />
      <ImpactBanner />
      {viewpoint.id === ACTIVITY_VIEWPOINT_ID ? <ActivityPalette /> : null}
      {viewpoint.id === STATE_MACHINE_VIEWPOINT_ID ? <StateMachinePalette /> : null}
      {viewpoint.id === USE_CASE_VIEWPOINT_ID ? <UseCasePalette /> : null}
      {viewpoint.id === PARAMETRIC_VIEWPOINT_ID ? <ParametricPalette /> : null}
      <div
        ref={canvasRef}
        data-testid="canvas-drop-target"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative flex-1"
      >
        {elementCount === 0 && viewpoint.id === BDD_VIEWPOINT_ID ? (
          <EmptyState onImportJson={handleImportJson} />
        ) : null}
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={viewpoint.nodeTypes}
          edgeTypes={viewpoint.edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
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
        <DragCoordOverlay dragPos={dragPos} />
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
            portCountFor={(definitionId) =>
              elements.reduce(
                (n, e) =>
                  e.kind === 'PortDefinition' &&
                  e.ownerId === definitionId &&
                  e.ownerRole === 'port'
                    ? n + 1
                    : n,
                0,
              )
            }
            onPick={confirmPendingPart}
            onCancel={cancelPendingPart}
          />
        ) : null}
        {pendingTrace ? (
          <TraceKindPopover
            x={pendingTrace.x}
            y={pendingTrace.y}
            allowedKinds={pendingTrace.allowedKinds}
            onPick={confirmPendingTrace}
            onCancel={cancelPendingTrace}
          />
        ) : null}
        {pendingUseCaseEdge ? (
          <UseCaseEdgeKindPopover
            x={pendingUseCaseEdge.x}
            y={pendingUseCaseEdge.y}
            allowedKinds={pendingUseCaseEdge.allowedKinds}
            defaultKind={pendingUseCaseEdge.defaultKind}
            onPick={confirmPendingUseCaseEdge}
            onCancel={cancelPendingUseCaseEdge}
          />
        ) : null}
        {contextMenu ? (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            targets={contextMenu.targets}
            onClose={closeContextMenu}
          />
        ) : null}
      </div>
    </div>
  );
}

export function CanvasPane(): JSX.Element {
  const diagrams = useWorkspaceStore((s) => s.diagrams);
  const activeDiagramId = useWorkspaceStore((s) => s.activeDiagramId);
  const openDiagramIds = useWorkspaceStore((s) => s.openDiagramIds);
  const setActiveDiagram = useWorkspaceStore((s) => s.setActiveDiagram);
  const closeDiagramTab = useWorkspaceStore((s) => s.closeDiagramTab);
  const activeSurfaceKind = useWorkspaceStore((s) => s.activeSurfaceKind);
  const setActiveSurface = useWorkspaceStore((s) => s.setActiveSurface);
  const secondaryDiagramId = useWorkspaceStore((s) => s.secondaryDiagramId);
  const splitDiagram = useWorkspaceStore((s) => s.splitDiagram);

  const requirementsActive = activeSurfaceKind === 'requirements';

  // Resolve open ids → diagrams (filtering out any open ids whose diagram
  // no longer exists; defensive against ordering bugs in deleteDiagram).
  const openTabs = useMemo(() => {
    const byId = new Map(diagrams.map((d) => [d.id, d] as const));
    return openDiagramIds.flatMap((id) => {
      const d = byId.get(id);
      return d ? [d] : [];
    });
  }, [openDiagramIds, diagrams]);

  return (
    <section
      role="region"
      aria-label="Canvas"
      data-testid="canvas-pane"
      className="flex min-w-0 flex-1 flex-col bg-muted/30"
    >
      <div
        data-testid="surface-tablist"
        className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-card px-2"
      >
        <div role="tablist" aria-label="Diagram tabs" className="flex items-center gap-1">
        <button
          role="tab"
          type="button"
          data-testid="surface-tab-requirements"
          aria-selected={requirementsActive}
          aria-controls="requirements-surface-panel"
          id="surface-tab-requirements"
          tabIndex={requirementsActive ? 0 : -1}
          onClick={() => setActiveSurface('requirements')}
          className={`rounded-md px-3 py-1 text-xs font-medium transition ${
            requirementsActive
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          Requirements
        </button>
        <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
        {openTabs.length === 0 ? (
          <span
            data-testid="diagram-tablist-empty"
            className="px-1 text-xs text-muted-foreground"
          >
            {diagrams.length === 0
              ? 'No diagrams'
              : 'No open diagrams — open one from the tree'}
          </span>
        ) : (
          openTabs.map((d) => {
            const isActive = !requirementsActive && d.id === activeDiagramId;
            // The close X is a styled <span> (not a nested <button>) so
            // the tab stays a valid `role="tab"` <button> with no nested
            // interactive HTML elements and no nested tabindex — both axe
            // serious-violation triggers under the ARIA tabs pattern.
            // Keyboard close is via Cmd-W / Backspace on focused tab; the
            // span is a mouse affordance only, gated by aria-hidden=true so
            // assistive tech only announces the tab name.
            return (
              <button
                key={d.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`diagram-panel-${d.id}`}
                id={`diagram-tab-${d.id}`}
                data-testid={`diagram-tab-${d.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => {
                  if (requirementsActive) setActiveSurface('diagram');
                  setActiveDiagram(d.id);
                }}
                onKeyDown={(e) => {
                  // Standard "close current tab" shortcuts: Backspace and
                  // Delete close the focused tab without activating it.
                  if (e.key === 'Backspace' || e.key === 'Delete') {
                    e.preventDefault();
                    closeDiagramTab(d.id);
                  }
                }}
                className={`inline-flex items-center gap-1 rounded-md py-1 pl-3 pr-1.5 text-xs font-medium transition ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <span>{d.name}</span>
                <span
                  aria-hidden="true"
                  title={`Close ${d.name}`}
                  data-testid={`diagram-tab-close-${d.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDiagramTab(d.id);
                  }}
                  className={`inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded text-xs leading-none transition ${
                    isActive
                      ? 'hover:bg-primary-foreground/20'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  ×
                </span>
              </button>
            );
          })
        )}
        </div>
        {diagrams.length > 0 ? (
          <div
            role="toolbar"
            aria-label="Split-view actions"
            data-testid="split-toolbar"
            className="ml-1 flex items-center gap-0.5"
          >
            {/* The split toolbar exposes every project diagram as a
                "compare against" affordance — independent of whether the
                diagram currently has an open tab. Clicking splitDiagram(id)
                also adds the diagram to openDiagramIds so the operator can
                later promote it from the secondary pane via its tab. */}
            {diagrams.map((d) => {
              const isActive = d.id === activeDiagramId;
              const isSecondary = d.id === secondaryDiagramId;
              const splitDisabled = isActive || isSecondary;
              const splitReason = splitDisabledReason({
                isActiveDiagram: isActive,
                isSecondaryDiagram: isSecondary,
              });
              return (
                <button
                  key={d.id}
                  type="button"
                  aria-label={`Split ${d.name} into secondary pane`}
                  title={splitReason ?? `Split ${d.name} right`}
                  data-testid={`split-tab-${d.id}`}
                  disabled={splitDisabled}
                  onClick={() => splitDiagram(d.id)}
                  className="ml-0.5 inline-flex h-6 w-5 items-center justify-center rounded text-xs text-muted-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ⇆
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {requirementsActive ? (
        <ErrorBoundary boundaryId="requirements" label="Requirements">
          <ErrorTestThrower boundaryId="requirements" />
          <RequirementsSurface />
        </ErrorBoundary>
      ) : (
        <div
          data-testid="canvas-split-container"
          data-split={secondaryDiagramId ? 'true' : 'false'}
          className="flex min-h-0 flex-1"
        >
          <ErrorBoundary boundaryId="canvas" label="Diagram canvas">
            <ErrorTestThrower boundaryId="canvas" />
            <ReactFlowProvider>
              <CanvasInner />
            </ReactFlowProvider>
          </ErrorBoundary>
          <SecondaryCanvasPane />
        </div>
      )}
    </section>
  );
}
