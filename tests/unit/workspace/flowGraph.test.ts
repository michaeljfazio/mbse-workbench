import { describe, expect, it } from 'vitest';

import {
  createElementRegistry,
  type ConstraintDefinitionElement,
  type ConstraintUsageElement,
  type ElementId,
  type ModelElement,
  type PackageElement,
  type PartDefinitionElement,
  type PartUsageElement,
  type PortDefinitionElement,
  type ValuePropertyElement,
} from '@/model';
import {
  activityViewpoint,
  bddViewpoint,
  ibdViewpoint,
  IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
  IBD_ENCLOSING_FRAME_NODE_TYPE,
  IBD_ENCLOSING_FRAME_PADDING,
  stateMachineViewpoint,
} from '@/viewpoints';
import type { Diagram, DiagramId } from '@/workspace/diagram';
import { toFlowNodes, type RegistryLookup } from '@/workspace/flowGraph';

import { mkElementId } from '../model/helpers';

const noopRename = (_id: ElementId, _name: string): void => undefined;
const EMPTY = new Set<ElementId>();

function mkPartDef(id: string, name: string): PartDefinitionElement {
  return {
    id: mkElementId(id),
    kind: 'PartDefinition',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name,
    isAbstract: false,
  };
}

function mkPartUsage(
  id: string,
  name: string,
  defId: string,
): PartUsageElement {
  return {
    id: mkElementId(id),
    kind: 'PartUsage',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name,
    definitionId: mkElementId(defId),
  };
}

function buildRegistry(elements: readonly ModelElement[]): RegistryLookup {
  const registry = createElementRegistry();
  for (const el of elements) registry.add(el);
  return registry;
}

function ibdDiagram(
  context: Diagram['context'],
  positions: Diagram['positions'] = {},
): Diagram {
  return {
    id: 'd-ibd' as DiagramId,
    viewpointId: 'ibd',
    name: 'Pump IBD',
    positions,
    context,
  };
}

describe('toFlowNodes — defensive skip of unrenderable accepted kinds (T-13.44)', () => {
  // Activity / State Machine viewpoints list a "reserved for future" element
  // kind in `acceptedElementKinds` whose `nodeTypeFor` still throws today.
  // Verify those elements are silently skipped rather than crashing the
  // canvas. Regression shield for the bug surfaced by the Phase-13 gate
  // item #1 cold-start walkthrough (PR closing T-13.44).

  it('skips ActionDefinition on Activity viewpoint without throwing', () => {
    const actionDef: ModelElement = {
      id: mkElementId('action-def-1'),
      kind: 'ActionDefinition',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'Do Thing',
    };
    const actionUsage: ModelElement = {
      id: mkElementId('action-usage-1'),
      kind: 'ActionUsage',
      ownerId: actionDef.id,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'step1',
      nodeType: 'action',
      definitionId: actionDef.id,
    };
    const diagram: Diagram = {
      id: 'd-activity-1' as DiagramId,
      viewpointId: 'activity',
      name: 'Activity',
      positions: { [actionUsage.id]: { x: 0, y: 0 } },
      context: { kind: 'actionDefinition', id: actionDef.id },
    };
    const registry = buildRegistry([actionDef, actionUsage]);
    const nodes = toFlowNodes(
      [actionDef, actionUsage],
      activityViewpoint,
      diagram,
      EMPTY,
      noopRename,
      registry,
      EMPTY,
    );
    // ActionDefinition is in acceptedElementKinds but nodeTypeFor throws
    // for it — defensive filter must drop it.
    expect(nodes.map((n) => n.id)).toEqual([actionUsage.id]);
  });

  it('skips StateDefinition on State Machine viewpoint without throwing', () => {
    const stateDef: ModelElement = {
      id: mkElementId('state-def-1'),
      kind: 'StateDefinition',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'Run',
      isComposite: false,
    };
    const stateUsage: ModelElement = {
      id: mkElementId('state-usage-1'),
      kind: 'StateUsage',
      ownerId: stateDef.id,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 's1',
      stateType: 'state',
      definitionId: stateDef.id,
    };
    const diagram: Diagram = {
      id: 'd-sm-1' as DiagramId,
      viewpointId: 'state-machine',
      name: 'SM',
      positions: { [stateUsage.id]: { x: 0, y: 0 } },
      context: { kind: 'stateDefinition', id: stateDef.id },
    };
    const registry = buildRegistry([stateDef, stateUsage]);
    const nodes = toFlowNodes(
      [stateDef, stateUsage],
      stateMachineViewpoint,
      diagram,
      EMPTY,
      noopRename,
      registry,
      EMPTY,
    );
    expect(nodes.map((n) => n.id)).toEqual([stateUsage.id]);
  });
});

describe('toFlowNodes — IBD enclosing-frame injection (T-13.20)', () => {
  it('prepends a frame node when context resolves to a PartDefinition with at least one PartUsage', () => {
    const def = mkPartDef('def-pump', 'Pump');
    const usage = mkPartUsage('use-1', 'p1', 'def-pump');
    const registry = buildRegistry([def, usage]);
    const diagram = ibdDiagram(
      { kind: 'partDefinition', id: def.id },
      { [usage.id]: { x: 100, y: 200 } },
    );
    const nodes = toFlowNodes(
      [def, usage],
      ibdViewpoint,
      diagram,
      EMPTY,
      noopRename,
      registry,
      EMPTY,
    );
    expect(nodes).toHaveLength(2);
    expect(nodes[0]?.type).toBe(IBD_ENCLOSING_FRAME_NODE_TYPE);
    expect(nodes[0]?.id).toBe(`ibd-enclosing-frame:${def.id}`);
    expect(nodes[0]?.selectable).toBe(false);
    expect(nodes[0]?.draggable).toBe(false);
    expect(nodes[0]?.zIndex).toBe(-1);
    expect(nodes[0]?.data).toEqual({
      partDefinitionId: def.id,
      name: 'Pump',
    });
    // Frame surrounds the single PartUsage rect (200x100) with default padding.
    expect(nodes[0]?.position).toEqual({
      x: 100 - IBD_ENCLOSING_FRAME_PADDING,
      y: 200 - IBD_ENCLOSING_FRAME_PADDING - IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
    });
    expect(nodes[0]?.width).toBe(200 + 2 * IBD_ENCLOSING_FRAME_PADDING);
    expect(nodes[0]?.height).toBe(
      100 + 2 * IBD_ENCLOSING_FRAME_PADDING + IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
    );
    // Element node order is preserved after the frame head.
    expect(nodes[1]?.id).toBe(usage.id);
  });

  it('does not inject a frame when context kind is not partDefinition', () => {
    const pkg: PackageElement = {
      id: mkElementId('pkg-root'),
      kind: 'Package',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'Root',
    };
    const usage = mkPartUsage('use-1', 'p1', 'def-x');
    const registry = buildRegistry([pkg, usage]);
    const diagram = ibdDiagram(
      { kind: 'package', id: pkg.id },
      { [usage.id]: { x: 0, y: 0 } },
    );
    const nodes = toFlowNodes(
      [pkg, usage],
      ibdViewpoint,
      diagram,
      EMPTY,
      noopRename,
      registry,
      EMPTY,
    );
    expect(nodes.every((n) => n.type !== IBD_ENCLOSING_FRAME_NODE_TYPE)).toBe(
      true,
    );
  });

  it('does not inject a frame when no PartUsage nodes are rendered', () => {
    const def = mkPartDef('def-pump', 'Pump');
    const registry = buildRegistry([def]);
    const diagram = ibdDiagram({ kind: 'partDefinition', id: def.id });
    const nodes = toFlowNodes(
      [def],
      ibdViewpoint,
      diagram,
      EMPTY,
      noopRename,
      registry,
      EMPTY,
    );
    expect(nodes).toHaveLength(0);
  });

  it('does not inject a frame when the referenced PartDefinition is missing from the registry', () => {
    const usage = mkPartUsage('use-1', 'p1', 'def-pump');
    const registry = buildRegistry([usage]);
    const diagram = ibdDiagram(
      { kind: 'partDefinition', id: mkElementId('def-pump') },
      { [usage.id]: { x: 0, y: 0 } },
    );
    const nodes = toFlowNodes(
      [usage],
      ibdViewpoint,
      diagram,
      EMPTY,
      noopRename,
      registry,
      EMPTY,
    );
    expect(nodes.every((n) => n.type !== IBD_ENCLOSING_FRAME_NODE_TYPE)).toBe(
      true,
    );
  });

  it('does not inject a frame for non-IBD viewpoints even when context resolves', () => {
    const def = mkPartDef('def-pump', 'Pump');
    const registry = buildRegistry([def]);
    const diagram: Diagram = {
      id: 'd-bdd' as DiagramId,
      viewpointId: 'bdd',
      name: 'Root BDD',
      positions: { [def.id]: { x: 0, y: 0 } },
      context: { kind: 'partDefinition', id: def.id },
    };
    const nodes = toFlowNodes(
      [def],
      bddViewpoint,
      diagram,
      EMPTY,
      noopRename,
      registry,
      EMPTY,
    );
    expect(nodes.every((n) => n.type !== IBD_ENCLOSING_FRAME_NODE_TYPE)).toBe(
      true,
    );
  });
});

function mkPortDef(
  id: string,
  name: string,
  ownerId: string,
  ownerIndex: number,
  direction: 'in' | 'out' | 'inout' = 'in',
): PortDefinitionElement {
  return {
    id: mkElementId(id),
    kind: 'PortDefinition',
    ownerId: mkElementId(ownerId),
    ownerRole: 'port',
    ownerIndex,
    name,
    direction,
  };
}

function mkValueProperty(
  id: string,
  name: string,
  ownerId: string,
  ownerIndex: number,
): ValuePropertyElement {
  return {
    id: mkElementId(id),
    kind: 'ValueProperty',
    ownerId: mkElementId(ownerId),
    ownerRole: 'property',
    ownerIndex,
    name,
    valueType: 'number',
    defaultValue: 1,
  };
}

function mkConstraintDef(
  id: string,
  name: string,
  expression: string,
): ConstraintDefinitionElement {
  return {
    id: mkElementId(id),
    kind: 'ConstraintDefinition',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name,
    expression,
  };
}

function mkConstraintUsage(
  id: string,
  name: string,
  ownerId: string,
  ownerIndex: number,
  definitionId: string,
): ConstraintUsageElement {
  return {
    id: mkElementId(id),
    kind: 'ConstraintUsage',
    ownerId: mkElementId(ownerId),
    ownerRole: 'member',
    ownerIndex,
    name,
    definitionId: mkElementId(definitionId),
  };
}

function bddDiagram(positions: Diagram['positions'] = {}): Diagram {
  return {
    id: 'd-bdd' as DiagramId,
    viewpointId: 'bdd',
    name: 'Root BDD',
    positions,
    context: { kind: 'package', id: mkElementId('root') },
  };
}

describe('toFlowNodes — BDD PartDefinition compartment data (T-13.19)', () => {
  function makeFlat(parent: PartDefinitionElement, children: ModelElement[]) {
    const reparented = children.map((c) => ({
      ...c,
      ownerId: parent.id,
    })) as ModelElement[];
    return [parent, ...reparented];
  }

  it('renders an empty compartment shape when the PartDefinition has no children', () => {
    const def = mkPartDef('def-1', 'Tank');
    const elements: ModelElement[] = [def];
    const registry = buildRegistry(elements);
    const nodes = toFlowNodes(
      elements,
      bddViewpoint,
      bddDiagram({ [def.id]: { x: 0, y: 0 } }),
      EMPTY,
      noopRename,
      registry,
      EMPTY,
    );
    expect(nodes).toHaveLength(1);
    const data = nodes[0]?.data as Record<string, unknown>;
    expect(data.elementId).toBe(def.id);
    expect(data.name).toBe('Tank');
    expect(data.compartments).toEqual({
      parts: { items: [], overflow: 0 },
      ports: { items: [], overflow: 0 },
      values: { items: [], overflow: 0 },
      constraints: { items: [], overflow: 0 },
    });
    expect(typeof data.onRename).toBe('function');
  });

  it('populates parts / ports / values / constraints compartments from the registry', () => {
    const def = mkPartDef('def-1', 'Tank');
    const pumpDef = mkPartDef('def-pump', 'Pump');
    const usage = { ...mkPartUsage('pu-1', 'pump', 'def-pump'), ownerId: def.id } as PartUsageElement;
    const port = mkPortDef('po-1', 'inlet', def.id, 0, 'in');
    const value = mkValueProperty('vp-1', 'mass', def.id, 0);
    const constraintDef = mkConstraintDef('cd-1', 'PressureLimit', 'pressure < 100');
    const constraintUsage = mkConstraintUsage(
      'cu-1',
      'limit',
      def.id,
      1,
      'cd-1',
    );
    const elements: ModelElement[] = [
      def,
      pumpDef,
      usage,
      port,
      value,
      constraintDef,
      constraintUsage,
    ];
    const registry = buildRegistry(elements);
    const nodes = toFlowNodes(
      elements,
      bddViewpoint,
      bddDiagram({ [def.id]: { x: 0, y: 0 } }),
      EMPTY,
      noopRename,
      registry,
      EMPTY,
    );
    const data = nodes[0]?.data as Record<string, unknown>;
    expect(data.compartments).toEqual({
      parts: {
        items: [{ id: usage.id, label: 'pump : Pump' }],
        overflow: 0,
      },
      ports: {
        items: [{ id: port.id, label: 'inlet : in' }],
        overflow: 0,
      },
      values: {
        items: [{ id: value.id, label: 'mass : number = 1' }],
        overflow: 0,
      },
      constraints: {
        items: [{ id: constraintUsage.id, label: 'limit : pressure < 100' }],
        overflow: 0,
      },
    });
  });

  // Quiet unused-helper warnings if extracted later. The function is referenced
  // above for the second case via inline ownerId rewrite.
  void makeFlat;
});
