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
  buildPortUsageOwnership,
  defaultUseCaseEdgeKindFor,
  IBD_PART_USAGE_HEIGHT,
  IBD_PART_USAGE_WIDTH,
  IBD_VIEWPOINT_ID,
  isValidActivityConnection,
  isValidIbdConnection,
  isValidParametricConnection,
  isValidStateMachineConnection,
  isValidUseCaseConnection,
  REQUIREMENT_NODE_HEIGHT,
  REQUIREMENT_NODE_WIDTH,
  REQUIREMENTS_VIEWPOINT_ID,
  resolveIbdEdgeEndpoints,
  resolvePartHandles,
  STATE_MACHINE_STATE_HEIGHT,
  STATE_MACHINE_STATE_WIDTH,
  PARAMETRIC_CONSTRAINT_USAGE_HEIGHT,
  PARAMETRIC_CONSTRAINT_USAGE_WIDTH,
  PARAMETRIC_VALUE_PROPERTY_HEIGHT,
  PARAMETRIC_VALUE_PROPERTY_WIDTH,
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

import { ContextMenu, deriveNavTargets, type NavTarget } from './contextMenu';
import { EdgeKindPopover } from './EdgeKindPopover';
import { ExportMenu } from './ExportMenu';
import { PartUsageTypePopover } from './PartUsageTypePopover';
import { TraceKindPopover } from './TraceKindPopover';
import { UseCaseEdgeKindPopover } from './UseCaseEdgeKindPopover';
import type { Diagram } from './diagram';
import { downloadDiagramPng, downloadDiagramSvg } from './export';
import {
  getActiveDiagram,
  getActiveViewpoint,
  useWorkspaceStore,
} from './store';
import { ActivityPalette } from './ActivityPalette';
import { ParametricPalette } from './ParametricPalette';
import { StateMachinePalette } from './StateMachinePalette';
import { UseCasePalette } from './UseCasePalette';
import {
  PROJECT_TREE_DRAG_NODE_TYPE,
  PROJECT_TREE_DRAG_STATE_TYPE,
  PROJECT_TREE_DRAG_TYPE,
} from './tree/ProjectTree';

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

interface RegistryLookup {
  get(id: ElementId): ModelElement | undefined;
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

function toFlowNodes(
  elements: readonly ModelElement[],
  viewpoint: Viewpoint,
  diagram: Diagram,
  selectedIds: ReadonlySet<ElementId>,
  onRename: (id: ElementId, name: string) => void,
  registry: RegistryLookup | null,
): Node[] {
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
      } else if (el.kind === 'Requirement') {
        data = {
          elementId: el.id,
          name: el.name,
          reqId: el.reqId,
          text: el.text,
          priority: el.priority,
          status: el.status,
          onRename,
        };
      } else if (el.kind === 'ActionUsage') {
        data = {
          elementId: el.id,
          name: el.name,
          nodeType: el.nodeType,
          onRename,
        };
      } else if (el.kind === 'StateUsage') {
        data = {
          elementId: el.id,
          name: el.name,
          stateType: el.stateType,
          entryAction: el.entryAction,
          exitAction: el.exitAction,
          doAction: el.doAction,
          onRename,
        };
      } else if (el.kind === 'Actor' || el.kind === 'UseCase') {
        data = { elementId: el.id, name: el.name, onRename };
      } else if (el.kind === 'ConstraintUsage') {
        const def = registry?.get(el.definitionId);
        const expression =
          def && def.kind === 'ConstraintDefinition' ? def.expression : '';
        data = {
          elementId: el.id,
          name: el.name,
          expression,
          onRename,
        };
      } else if (el.kind === 'ValueProperty') {
        data = {
          elementId: el.id,
          name: el.name,
          valueType: el.valueType,
          defaultValue: el.defaultValue,
          onRename,
        };
      } else {
        data = { elementId: el.id, name: el.name, onRename };
      }
      const { width, height } = viewpoint.nodeSizeFor(el);
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
  elements: readonly ModelElement[],
  viewpoint: Viewpoint,
  selectedIds: ReadonlySet<ElementId>,
): Edge[] {
  const out: Edge[] = [];
  for (const e of edges) {
    if (!viewpoint.acceptedEdgeKinds.includes(e.kind)) continue;
    const data: Record<string, unknown> = { edgeId: e.id };
    if (e.kind === 'RequirementTrace') {
      data.traceKind = e.traceKind;
      data.label = e.label;
    }
    if (e.kind === 'ControlFlow') {
      data.guard = e.guard;
      data.label = e.label;
    }
    if (e.kind === 'ObjectFlow') {
      data.itemType = e.itemType;
      data.label = e.label;
    }
    if (e.kind === 'Include') {
      data.label = e.label;
    }
    if (e.kind === 'Extend') {
      data.label = e.label;
      data.extensionPoint = e.extensionPoint;
    }
    if (e.kind === 'ParameterBinding') {
      data.label = e.label;
    }
    out.push({
      id: e.id,
      type: viewpoint.edgeTypeFor(e),
      source: e.sourceId,
      target: e.targetId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      selected: selectedIds.has(e.id as unknown as ElementId),
      data,
    });
  }

  if (viewpoint.acceptedEdgeElementKinds.length > 0) {
    const ownership = buildPortUsageOwnership(elements);
    for (const el of elements) {
      if (!viewpoint.acceptedEdgeElementKinds.includes(el.kind)) continue;
      // The discriminated-union members that render as edges all carry
      // `sourceId` / `targetId` directly.
      if (
        el.kind !== 'ConnectionUsage' &&
        el.kind !== 'ItemFlow' &&
        el.kind !== 'Transition'
      ) {
        continue;
      }
      const data: Record<string, unknown> = {
        elementId: el.id,
        name: el.name,
      };
      let sourceNodeId: ElementId;
      let targetNodeId: ElementId;
      let sourceHandleId: string;
      let targetHandleId: string;
      if (el.kind === 'Transition') {
        // Transitions wire StateUsage→StateUsage directly; no handle indirection.
        // Match the default handle ids declared on StateUsageNode.
        sourceNodeId = el.sourceId;
        targetNodeId = el.targetId;
        sourceHandleId = 'bottom';
        targetHandleId = 'top';
        data.trigger = el.trigger;
        data.guard = el.guard;
        data.effect = el.effect;
      } else {
        const endpoints = resolveIbdEdgeEndpoints({
          sourcePortUsageId: el.sourceId,
          targetPortUsageId: el.targetId,
          portUsageToPartUsage: ownership,
        });
        if (!endpoints) continue;
        sourceNodeId = endpoints.sourceNodeId;
        targetNodeId = endpoints.targetNodeId;
        sourceHandleId = endpoints.sourceHandleId;
        targetHandleId = endpoints.targetHandleId;
        if (el.kind === 'ItemFlow') data.itemType = el.itemType;
      }
      out.push({
        id: el.id,
        type: viewpoint.edgeTypeForElement(el),
        source: sourceNodeId,
        target: targetNodeId,
        sourceHandle: sourceHandleId,
        targetHandle: targetHandleId,
        selected: selectedIds.has(el.id),
        data,
      });
    }
  }

  return out;
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
  const linkRequirementTrace = useWorkspaceStore(
    (s) => s.linkRequirementTrace,
  );
  const linkUseCaseEdge = useWorkspaceStore((s) => s.linkUseCaseEdge);
  const linkParameterBinding = useWorkspaceStore(
    (s) => s.linkParameterBinding,
  );

  const [pending, setPending] = useState<PendingConnection | null>(null);
  const [pendingPart, setPendingPart] = useState<PendingPartDrop | null>(null);
  const [pendingTrace, setPendingTrace] = useState<PendingTrace | null>(null);
  const [pendingUseCaseEdge, setPendingUseCaseEdge] =
    useState<PendingUseCaseEdge | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
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
    return toFlowEdges(edges, elements, viewpoint, selectedSet);
  }, [edges, elements, viewpoint, selectedSet]);

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
      if (hasSelectChange) {
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
    // React Flow emits a stray `{type:'select', selected:true}` for the
    // connection-drag source node a few render ticks after onConnect/onConnectEnd.
    // We keep `isConnecting` true long enough for those late emissions to be
    // ignored. A short timeout (longer than typical React render flush) is
    // sufficient; the next drag will set the flag back to true immediately.
    setTimeout(() => {
      isConnectingRef.current = false;
    }, 100);
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
    ],
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
      setSelection,
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

  const elementCount = elements.length;

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
