import { describe, expect, it } from 'vitest';

import type {
  ElementId,
  PartDefinitionElement,
  PartUsageElement,
  PortDefinitionElement,
  RequirementElement,
  RequirementTraceEdge,
} from '@/model';
import {
  BDD_VIEWPOINT_ID,
  IBD_VIEWPOINT_ID,
  REQUIREMENTS_VIEWPOINT_ID,
  bddViewpoint,
  createViewpointRegistry,
  ibdViewpoint,
  requirementsViewpoint,
} from '@/viewpoints';
import { deriveNavTargets } from '@/workspace/contextMenu';
import type { NavTargetActions } from '@/workspace/contextMenu';
import type { Diagram, DiagramId } from '@/workspace';

import { mkEdgeId, mkElementId } from '../model/helpers';

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
    showRequirementTracesFor: (elementId) => {
      calls.push(['showRequirementTracesFor', [elementId]]);
      return null;
    },
    runImpactAnalysis: (elementId) => {
      calls.push(['runImpactAnalysis', [elementId]]);
      return true;
    },
  };
  return { actions, calls };
}

const defId = mkElementId('def-1');
const def2Id = mkElementId('def-2');
const portDefId = mkElementId('port-d-1');
const partUsageId = mkElementId('pu-1');
const ROOT_ID = mkElementId('root-pkg');

const partDef: PartDefinitionElement = {
  id: defId,
  kind: 'PartDefinition',
  ownerId: null,
  ownerRole: 'member',
  ownerIndex: 0,
  name: 'Engine',
  isAbstract: false,
};

const otherDef: PartDefinitionElement = {
  id: def2Id,
  kind: 'PartDefinition',
  ownerId: null,
  ownerRole: 'member',
  ownerIndex: 0,
  name: 'Wheel',
  isAbstract: false,
};

const portDef: PortDefinitionElement = {
  id: portDefId,
  kind: 'PortDefinition',
  ownerId: null,
  ownerRole: 'member',
  ownerIndex: 0,
  name: 'power',
  direction: 'out',
};

const partUsage: PartUsageElement = {
  id: partUsageId,
  kind: 'PartUsage',
  ownerId: null,
  ownerRole: 'member',
  ownerIndex: 0,
  name: 'engine',
  definitionId: defId,
};

const bddDiagram: Diagram = {
  id: 'd-bdd' as DiagramId,
  viewpointId: BDD_VIEWPOINT_ID,
  name: 'Main BDD',
  positions: {
    [defId]: { x: 10, y: 10 },
    [def2Id]: { x: 100, y: 10 },
  },
  context: { kind: 'package', id: ROOT_ID },
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
      edges: [],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(targets.map((t) => t.id)).toEqual(['show-in-ibd', 'show-impact']);
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
      edges: [],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(targets.map((t) => t.id)).toEqual(['show-in-ibd', 'show-impact']);
    expect(targets[0]!.description).toMatch(/create/i);
  });

  it('returns a "Show definition in BDD" target for a PartUsage typed by a PartDefinition', () => {
    const { actions, calls } = recordingActions();
    const targets = deriveNavTargets({
      element: partUsage,
      diagrams: [bddDiagram, ibdDiagram],
      activeDiagramId: ibdDiagram.id,
      elements: [partDef, portDef, partUsage],
      edges: [],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(targets.map((t) => t.id)).toEqual([
      'show-definition-in-bdd',
      'show-impact',
    ]);
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
      edges: [],
      viewpoints: reg,
      actions,
    });
    expect(targets.map((t) => t.id)).toEqual(['show-impact']);
  });

  it('emits a same-element nav target for every other diagram where the element is placed', () => {
    const otherBdd: Diagram = {
      id: 'd-bdd-2' as DiagramId,
      viewpointId: BDD_VIEWPOINT_ID,
      name: 'Side BDD',
      positions: { [defId]: { x: 1, y: 2 } },
      context: { kind: 'package', id: ROOT_ID },
    };
    const { actions, calls } = recordingActions();
    const targets = deriveNavTargets({
      element: partDef,
      diagrams: [bddDiagram, ibdDiagram, otherBdd],
      activeDiagramId: bddDiagram.id,
      elements: [partDef, portDef, partUsage, otherDef],
      edges: [],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(targets.map((t) => t.id)).toEqual([
      'show-in-ibd',
      `show-in-${otherBdd.id}`,
      'show-impact',
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
      edges: [],
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
      context: { kind: 'partDefinition', id: defId },
    };
    const { actions } = recordingActions();
    const targets = deriveNavTargets({
      element: partDef,
      diagrams: [bddDiagram, odd],
      activeDiagramId: bddDiagram.id,
      elements: [partDef],
      edges: [],
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
      edges: [],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(targets.map((t) => t.id)).toEqual(['show-impact']);
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
      context: { kind: 'package', id: ROOT_ID },
    };
    const { actions } = recordingActions();
    const targets = deriveNavTargets({
      element: partDef,
      diagrams: [bddDiagram, inheritedDiagram],
      activeDiagramId: bddDiagram.id,
      elements: [partDef],
      edges: [],
      viewpoints: makeRegistry(),
      actions,
    });
    expect(
      targets.find((t) => t.id === `show-in-${inheritedDiagram.id}`),
    ).toBeUndefined();
  });

  // Slice 3a of #177 — context-menu entry that drives impact analysis.
  describe('show-impact target', () => {
    it('appends a show-impact entry last for every element', () => {
      const { actions } = recordingActions();
      const targets = deriveNavTargets({
        element: partDef,
        diagrams: [bddDiagram, ibdDiagram],
        activeDiagramId: bddDiagram.id,
        elements: [partDef, portDef, partUsage],
        edges: [],
        viewpoints: makeRegistry(),
        actions,
      });
      expect(targets.at(-1)).toMatchObject({
        id: 'show-impact',
        label: 'Show impact',
      });
    });

    it('invokes runImpactAnalysis with the element id when performed', () => {
      const { actions, calls } = recordingActions();
      const targets = deriveNavTargets({
        element: partDef,
        diagrams: [],
        activeDiagramId: null,
        elements: [partDef],
        edges: [],
        viewpoints: makeRegistry(),
        actions,
      });
      const impact = targets.find((t) => t.id === 'show-impact');
      expect(impact).toBeDefined();
      impact!.perform();
      expect(calls).toEqual([['runImpactAnalysis', [defId]]]);
    });
  });

  // Issue #73 — cross-diagram traceability via context menu.
  describe('show-requirement-traces target', () => {
    function makeRegistryWithReqs() {
      const reg = createViewpointRegistry();
      reg.register(bddViewpoint);
      reg.register(ibdViewpoint);
      reg.register(requirementsViewpoint);
      return reg;
    }

    const reqId = mkElementId('req-1');
    const req: RequirementElement = {
      id: reqId,
      kind: 'Requirement',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'Stop on red',
      reqId: 'R-001',
      text: '',
      priority: 'high',
      status: 'draft',
    };

    const reqDiagram: Diagram = {
      id: 'd-reqs' as DiagramId,
      viewpointId: REQUIREMENTS_VIEWPOINT_ID,
      name: 'System Requirements',
      positions: { [reqId]: { x: 0, y: 0 } },
      context: { kind: 'package', id: ROOT_ID },
    };

    const satisfyEdge: RequirementTraceEdge = {
      id: mkEdgeId('e-satisfy'),
      kind: 'RequirementTrace',
      sourceId: reqId,
      targetId: defId,
      traceKind: 'satisfy',
    };

    it('emits a "Show requirement traces" target when a target-kind element has at least one incoming trace', () => {
      const { actions, calls } = recordingActions();
      const targets = deriveNavTargets({
        element: partDef,
        diagrams: [bddDiagram, reqDiagram],
        activeDiagramId: bddDiagram.id,
        elements: [partDef, portDef, req],
        edges: [satisfyEdge],
        viewpoints: makeRegistryWithReqs(),
        actions,
      });
      const target = targets.find((t) => t.id === 'show-requirement-traces');
      expect(target).toBeDefined();
      expect(target!.label).toBe('Show requirement traces');
      expect(target!.description).toMatch(/1 trace on System Requirements/);
      target!.perform();
      expect(calls).toEqual([['showRequirementTracesFor', [defId]]]);
    });

    it('pluralises the count when more than one trace targets the element', () => {
      const secondEdge: RequirementTraceEdge = {
        id: mkEdgeId('e-verify'),
        kind: 'RequirementTrace',
        sourceId: reqId,
        targetId: defId,
        traceKind: 'verify',
      };
      const { actions } = recordingActions();
      const targets = deriveNavTargets({
        element: partDef,
        diagrams: [bddDiagram, reqDiagram],
        activeDiagramId: bddDiagram.id,
        elements: [partDef, portDef, req],
        edges: [satisfyEdge, secondEdge],
        viewpoints: makeRegistryWithReqs(),
        actions,
      });
      const target = targets.find((t) => t.id === 'show-requirement-traces');
      expect(target!.description).toMatch(/2 traces on System Requirements/);
    });

    it('omits the entry when the element has zero incoming traces', () => {
      const { actions } = recordingActions();
      const targets = deriveNavTargets({
        element: partDef,
        diagrams: [bddDiagram, reqDiagram],
        activeDiagramId: bddDiagram.id,
        elements: [partDef, portDef, req],
        edges: [],
        viewpoints: makeRegistryWithReqs(),
        actions,
      });
      expect(
        targets.find((t) => t.id === 'show-requirement-traces'),
      ).toBeUndefined();
    });

    it('omits the entry when there is no Requirements diagram', () => {
      const { actions } = recordingActions();
      const targets = deriveNavTargets({
        element: partDef,
        diagrams: [bddDiagram],
        activeDiagramId: bddDiagram.id,
        elements: [partDef, portDef, req],
        edges: [satisfyEdge],
        viewpoints: makeRegistryWithReqs(),
        actions,
      });
      expect(
        targets.find((t) => t.id === 'show-requirement-traces'),
      ).toBeUndefined();
    });

    it('emits the entry on Requirement targets too (derive/refine case)', () => {
      const req2: RequirementElement = {
        id: mkElementId('req-2'),
        kind: 'Requirement',
        ownerId: null,
        ownerRole: 'member',
        ownerIndex: 0,
        name: 'Brake',
        text: '',
        priority: 'medium',
        status: 'draft',
      };
      const deriveEdge: RequirementTraceEdge = {
        id: mkEdgeId('e-derive'),
        kind: 'RequirementTrace',
        sourceId: reqId,
        targetId: req2.id,
        traceKind: 'derive',
      };
      const { actions } = recordingActions();
      const targets = deriveNavTargets({
        element: req2,
        diagrams: [bddDiagram, reqDiagram],
        activeDiagramId: reqDiagram.id,
        elements: [partDef, req, req2],
        edges: [deriveEdge],
        viewpoints: makeRegistryWithReqs(),
        actions,
      });
      expect(
        targets.find((t) => t.id === 'show-requirement-traces'),
      ).toBeDefined();
    });
  });
});
