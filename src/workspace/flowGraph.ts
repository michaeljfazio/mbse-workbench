import type { Edge, Node } from '@xyflow/react';

import type {
  EdgeId,
  ElementId,
  ModelEdge,
  ModelElement,
  OwnerRole,
} from '@/model';
import {
  buildPortUsageOwnership,
  computeBddBlockCompartments,
  computeEnclosingFrameBounds,
  IBD_ENCLOSING_FRAME_NODE_TYPE,
  IBD_VIEWPOINT_ID,
  resolveIbdEdgeEndpoints,
  resolveIbdEnclosingFrameLabel,
  resolvePartHandles,
  type IbdRect,
  type Viewpoint,
} from '@/viewpoints';

import type { Diagram } from './diagram';

export interface RegistryLookup {
  get(id: ElementId): ModelElement | undefined;
  childrenOf(id: ElementId, role?: OwnerRole): readonly ModelElement[];
}

export function toFlowNodes(
  elements: readonly ModelElement[],
  viewpoint: Viewpoint,
  diagram: Diagram,
  selectedIds: ReadonlySet<ElementId>,
  onRename: (id: ElementId, name: string) => void,
  registry: RegistryLookup | null,
  impactHighlightedIds: ReadonlySet<ElementId>,
  onResize?: (id: ElementId, width: number, height: number) => void,
): Node[] {
  const partUsageRects: IbdRect[] = [];
  const elementNodes = elements
    .filter((el) => viewpoint.acceptedElementKinds.includes(el.kind))
    // Some viewpoints list a "reserved for future" element kind in
    // `acceptedElementKinds` whose `nodeTypeFor` still throws — e.g. the
    // Activity viewpoint accepts `ActionDefinition` for an eventual
    // "called activity" frame (ADR 0005) but its `nodeTypeFor` rejects
    // it today, and the same for State Machine's `StateDefinition`
    // (ADR 0006). Skip those silently so the canvas doesn't crash when
    // such an element exists in the model.
    .filter((el) => {
      try {
        viewpoint.nodeTypeFor(el);
        return true;
      } catch {
        return false;
      }
    })
    .map((el) => {
      const pos = diagram.positions[el.id] ?? { x: 0, y: 0 };
      let data: Record<string, unknown>;
      if (el.kind === 'PartDefinition' && registry) {
        const compartments = computeBddBlockCompartments(el.id, registry);
        // onResize is required by BddBlockData. Provide a no-op fallback so
        // callers that predate the resize feature (tests, export) don't break.
        const onResizeFn = onResize ?? ((_id, _w, _h) => undefined);
        data = {
          elementId: el.id,
          name: el.name,
          compartments,
          onRename,
          onResize: onResizeFn,
        };
      } else if (el.kind === 'PartUsage' && registry) {
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
      } else if (el.kind === 'Package') {
        const packageId = el.id;
        let memberCount = 0;
        for (const other of elements) {
          if (
            other.ownerId === packageId &&
            other.ownerRole === 'member'
          ) {
            memberCount += 1;
          }
        }
        data = {
          elementId: el.id,
          name: el.name,
          memberCount,
          onRename,
        };
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
      const defaultSize = viewpoint.nodeSizeFor(el);
      // Prefer the persisted size (set when the user resizes via NodeResizer)
      // over the viewpoint's static default.
      const width = pos.width ?? defaultSize.width;
      const height = pos.height ?? defaultSize.height;
      const isImpact = impactHighlightedIds.has(el.id);
      const node: Node = {
        id: el.id,
        type: viewpoint.nodeTypeFor(el),
        position: pos,
        width,
        height,
        selected: selectedIds.has(el.id),
        data,
        className: isImpact ? 'mbse-impact-node' : undefined,
      };
      if (
        viewpoint.id === IBD_VIEWPOINT_ID &&
        el.kind === 'PartUsage'
      ) {
        partUsageRects.push({ x: pos.x, y: pos.y, width, height });
      }
      return node;
    });

  if (viewpoint.id === IBD_VIEWPOINT_ID && registry && partUsageRects.length > 0) {
    const label = resolveIbdEnclosingFrameLabel(diagram, registry);
    if (label) {
      const bounds = computeEnclosingFrameBounds(partUsageRects);
      if (bounds) {
        const frame: Node = {
          id: `ibd-enclosing-frame:${label.id}`,
          type: IBD_ENCLOSING_FRAME_NODE_TYPE,
          position: { x: bounds.x, y: bounds.y },
          width: bounds.width,
          height: bounds.height,
          selectable: false,
          draggable: false,
          focusable: false,
          zIndex: -1,
          data: {
            partDefinitionId: label.id,
            name: label.name,
          },
        };
        return [frame, ...elementNodes];
      }
    }
  }

  return elementNodes;
}

export function toFlowEdges(
  edges: readonly ModelEdge[],
  elements: readonly ModelElement[],
  viewpoint: Viewpoint,
  selectedIds: ReadonlySet<ElementId>,
  impactHighlightedEdgeIds: ReadonlySet<EdgeId>,
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
    if (e.kind === 'Association') {
      data.sourceMultiplicity = e.sourceMultiplicity;
      data.targetMultiplicity = e.targetMultiplicity;
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
      className: impactHighlightedEdgeIds.has(e.id)
        ? 'mbse-impact-edge'
        : undefined,
    });
  }

  if (viewpoint.acceptedEdgeElementKinds.length > 0) {
    const ownership = buildPortUsageOwnership(elements);
    for (const el of elements) {
      if (!viewpoint.acceptedEdgeElementKinds.includes(el.kind)) continue;
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
