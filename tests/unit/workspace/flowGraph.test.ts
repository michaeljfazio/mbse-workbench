import { describe, expect, it } from 'vitest';

import {
  createElementRegistry,
  type ElementId,
  type ModelElement,
  type PackageElement,
  type PartDefinitionElement,
  type PartUsageElement,
} from '@/model';
import {
  bddViewpoint,
  ibdViewpoint,
  IBD_ENCLOSING_FRAME_HEADER_HEIGHT,
  IBD_ENCLOSING_FRAME_NODE_TYPE,
  IBD_ENCLOSING_FRAME_PADDING,
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

  it('does not inject a frame when the diagram has no context', () => {
    const def = mkPartDef('def-pump', 'Pump');
    const usage = mkPartUsage('use-1', 'p1', 'def-pump');
    const registry = buildRegistry([def, usage]);
    const diagram = ibdDiagram(undefined, { [usage.id]: { x: 0, y: 0 } });
    const nodes = toFlowNodes(
      [def, usage],
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
