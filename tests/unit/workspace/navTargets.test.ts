import { describe, expect, it } from 'vitest';

import type {
  ElementId,
  PartDefinitionElement,
  PartUsageElement,
  PortDefinitionElement,
} from '@/model';
import {
  BDD_VIEWPOINT_ID,
  IBD_VIEWPOINT_ID,
  bddViewpoint,
  createViewpointRegistry,
  ibdViewpoint,
} from '@/viewpoints';
import { deriveNavTargets } from '@/workspace/contextMenu';
import type { NavTargetActions } from '@/workspace/contextMenu';
import type { Diagram, DiagramId } from '@/workspace';

import { mkElementId } from '../model/helpers';

function makeRegistry() {
  const reg = createViewpointRegistry();
  reg.register(bddViewpoint);
  reg.register(ibdViewpoint);
  return reg;
}

function recordingActions() {
  const calls: Array<readonly [string, readonly unknown[]]> = [];
  const actions: NavTargetActions = {
    openInternalDiagram: (id) => {
      calls.push(['openInternalDiagram', [id]]);
      return null;
    },
    showDefinitionOnBdd: (id) => {
      calls.push(['showDefinitionOnBdd', [id]]);
      return null;
    },
    navigateToElementOnDiagram: (elementId, diagramId) => {
      calls.push(['navigateToElementOnDiagram', [elementId, diagramId]]);
    },
  };
  return { actions, calls };
}

const defId = mkElementId('def-1');
const def2Id = mkElementId('def-2');
const portDefId = mkElementId('port-d-1');
const partUsageId = mkElementId('pu-1');
const portUsageId = mkElementId('puu-1');

const partDef: PartDefinitionElement = {
  id: defId,
  kind: 'PartDefinition',
  name: 'Engine',
  isAbstract: false,
  propertyIds: [],
  portIds: [portDefId],
};

const otherDef: PartDefinitionElement = {
  id: def2Id,
  kind: 'PartDefinition',
  name: 'Wheel',
  isAbstract: false,
  propertyIds: [],
  portIds: [],
};

const portDef: PortDefinitionElement = {
  id: portDefId,
  kind: 'PortDefinition',
  name: 'power',
  direction: 'out',
};

const partUsage: PartUsageElement = {
  id: partUsageId,
  kind: 'PartUsage',
  name: 'engine',
  definitionId: defId,
  portUsageIds: [portUsageId],
};

const bddDiagram: Diagram = {
  id: 'd-bdd' as DiagramId,
  viewpointId: BDD_VIEWPOINT_ID,
  name: 'Main BDD',
  positions: {
    [defId]: { x: 10, y: 10 },
    [def2Id]: { x: 100, y: 10 },
  },
};

const ibdDiagram: Diagram = {
  id: 'd-ibd' as DiagramId,
  viewpointId: IBD_VIEWPOINT_ID,
  name: 'Engine IBD',
  positions: {
    [partUsageId]: { x: 0, y: 0 },
  },
  context: { kind: 'partDefinition', id: defId },
};

describe('deriveNavTargets', () => {
  it('returns a "Show in IBD" target for a PartDefinition with an existing IBD', () => {
    const { actions, calls } = recordingActions();
    const targets = deriveNavTargets({
      element: partDef,
      diagrams: [bddDiagram, ibdDiagram],
      activeDiagramId: bddDiagram.id,
      elements: [partDef, portDef, partUsage],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(targets.map((t) => t.id)).toEqual(['show-in-ibd']);
    expect(targets[0]!.label).toBe('Show in IBD');
    expect(targets[0]!.description).toContain('Engine IBD');
    targets[0]!.perform();
    expect(calls).toEqual([['openInternalDiagram', [defId]]]);
  });

  it('returns a "Show in IBD" target with a "create" hint when no IBD exists', () => {
    const { actions } = recordingActions();
    const targets = deriveNavTargets({
      element: partDef,
      diagrams: [bddDiagram],
      activeDiagramId: bddDiagram.id,
      elements: [partDef, portDef],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(targets.map((t) => t.id)).toEqual(['show-in-ibd']);
    expect(targets[0]!.description).toMatch(/create/i);
  });

  it('returns a "Show definition in BDD" target for a PartUsage typed by a PartDefinition', () => {
    const { actions, calls } = recordingActions();
    const targets = deriveNavTargets({
      element: partUsage,
      diagrams: [bddDiagram, ibdDiagram],
      activeDiagramId: ibdDiagram.id,
      elements: [partDef, portDef, partUsage],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(targets.map((t) => t.id)).toEqual(['show-definition-in-bdd']);
    expect(targets[0]!.label).toBe('Show definition in BDD');
    expect(targets[0]!.description).toBe('Engine');
    targets[0]!.perform();
    expect(calls).toEqual([['showDefinitionOnBdd', [partUsageId]]]);
  });

  it('skips the "Show definition in BDD" target when the BDD viewpoint is unregistered', () => {
    const reg = createViewpointRegistry();
    reg.register(ibdViewpoint);
    const { actions } = recordingActions();
    const targets = deriveNavTargets({
      element: partUsage,
      diagrams: [ibdDiagram],
      activeDiagramId: ibdDiagram.id,
      elements: [partDef, portDef, partUsage],
      viewpoints: reg,
      actions,
    });
    expect(targets).toHaveLength(0);
  });

  it('emits a same-element nav target for every other diagram where the element is placed', () => {
    const otherBdd: Diagram = {
      id: 'd-bdd-2' as DiagramId,
      viewpointId: BDD_VIEWPOINT_ID,
      name: 'Side BDD',
      positions: { [defId]: { x: 1, y: 2 } },
    };
    const { actions, calls } = recordingActions();
    const targets = deriveNavTargets({
      element: partDef,
      diagrams: [bddDiagram, ibdDiagram, otherBdd],
      activeDiagramId: bddDiagram.id,
      elements: [partDef, portDef, partUsage, otherDef],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(targets.map((t) => t.id)).toEqual([
      'show-in-ibd',
      `show-in-${otherBdd.id}`,
    ]);
    targets[1]!.perform();
    expect(calls).toEqual([
      ['navigateToElementOnDiagram', [defId, otherBdd.id]],
    ]);
  });

  it('does not emit same-element nav for the active diagram', () => {
    const { actions } = recordingActions();
    const targets = deriveNavTargets({
      element: partDef,
      diagrams: [bddDiagram, ibdDiagram],
      activeDiagramId: bddDiagram.id,
      elements: [partDef, portDef, partUsage],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(
      targets.find((t) => t.id === `show-in-${bddDiagram.id}`),
    ).toBeUndefined();
  });

  it('skips diagrams whose viewpoint does not accept the element kind', () => {
    const odd: Diagram = {
      id: 'd-odd' as DiagramId,
      viewpointId: IBD_VIEWPOINT_ID,
      name: 'Wrong viewpoint',
      positions: { [defId]: { x: 0, y: 0 } },
    };
    const { actions } = recordingActions();
    const targets = deriveNavTargets({
      element: partDef,
      diagrams: [bddDiagram, odd],
      activeDiagramId: bddDiagram.id,
      elements: [partDef],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(
      targets.find((t) => t.id === `show-in-${odd.id}`),
    ).toBeUndefined();
  });

  it('returns an empty list for an element with no cross-kind or same-kind targets', () => {
    const { actions } = recordingActions();
    const targets = deriveNavTargets({
      element: portDef,
      diagrams: [bddDiagram],
      activeDiagramId: bddDiagram.id,
      elements: [partDef, portDef],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(targets).toHaveLength(0);
  });

  // Forward-compat: confirm we do not accidentally match elements that share
  // an id only as an object value rather than an own key in positions.
  it('treats positions inherited via prototype as not present', () => {
    const proto: Record<ElementId, { x: number; y: number }> = {
      [defId]: { x: 0, y: 0 },
    };
    const positions = Object.create(proto) as Record<
      ElementId,
      { x: number; y: number }
    >;
    const inheritedDiagram: Diagram = {
      id: 'd-proto' as DiagramId,
      viewpointId: BDD_VIEWPOINT_ID,
      name: 'Proto',
      positions,
    };
    const { actions } = recordingActions();
    const targets = deriveNavTargets({
      element: partDef,
      diagrams: [bddDiagram, inheritedDiagram],
      activeDiagramId: bddDiagram.id,
      elements: [partDef],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(
      targets.find((t) => t.id === `show-in-${inheritedDiagram.id}`),
    ).toBeUndefined();
  });
});
