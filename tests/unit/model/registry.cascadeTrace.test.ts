import { describe, expect, it } from 'vitest';

import {
  createEdgeId,
  createElementId,
  createElementRegistry,
  type PartDefinitionElement,
  type RequirementElement,
  type RequirementTraceEdge,
} from '@/model';

function mkRequirement(name: string): RequirementElement {
  return {
    id: createElementId(),
    kind: 'Requirement',
    name,
    text: '',
    priority: 'medium',
    status: 'draft',
  };
}

function mkPartDef(name: string): PartDefinitionElement {
  return {
    id: createElementId(),
    kind: 'PartDefinition',
    name,
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  };
}

describe('ElementRegistry — RequirementTrace cascade on element removal', () => {
  it('removing the source Requirement cascades through traces where it is the source', () => {
    const r = createElementRegistry();
    const reqA = mkRequirement('A');
    const reqB = mkRequirement('B');
    const block = mkPartDef('Block');
    r.add(reqA);
    r.add(reqB);
    r.add(block);

    const traceAB: RequirementTraceEdge = {
      id: createEdgeId(),
      kind: 'RequirementTrace',
      sourceId: reqA.id,
      targetId: reqB.id,
      traceKind: 'derive',
    };
    const traceABlock: RequirementTraceEdge = {
      id: createEdgeId(),
      kind: 'RequirementTrace',
      sourceId: reqA.id,
      targetId: block.id,
      traceKind: 'satisfy',
    };
    r.addEdge(traceAB);
    r.addEdge(traceABlock);

    r.remove(reqA.id);

    expect(r.getEdge(traceAB.id)).toBeUndefined();
    expect(r.getEdge(traceABlock.id)).toBeUndefined();
    expect(r.edges()).toHaveLength(0);
  });

  it('removing the target (non-Requirement) cascades through traces where it is the target', () => {
    const r = createElementRegistry();
    const reqA = mkRequirement('A');
    const reqB = mkRequirement('B');
    const block = mkPartDef('Block');
    r.add(reqA);
    r.add(reqB);
    r.add(block);

    const satisfy: RequirementTraceEdge = {
      id: createEdgeId(),
      kind: 'RequirementTrace',
      sourceId: reqA.id,
      targetId: block.id,
      traceKind: 'satisfy',
    };
    const verify: RequirementTraceEdge = {
      id: createEdgeId(),
      kind: 'RequirementTrace',
      sourceId: reqB.id,
      targetId: block.id,
      traceKind: 'verify',
    };
    const unrelated: RequirementTraceEdge = {
      id: createEdgeId(),
      kind: 'RequirementTrace',
      sourceId: reqA.id,
      targetId: reqB.id,
      traceKind: 'derive',
    };
    r.addEdge(satisfy);
    r.addEdge(verify);
    r.addEdge(unrelated);

    r.remove(block.id);

    expect(r.getEdge(satisfy.id)).toBeUndefined();
    expect(r.getEdge(verify.id)).toBeUndefined();
    expect(r.getEdge(unrelated.id)).toEqual(unrelated);
    expect(r.edges()).toHaveLength(1);
  });

  it('removing a Requirement that is both source and target cascades both sides', () => {
    const r = createElementRegistry();
    const reqA = mkRequirement('A');
    const reqB = mkRequirement('B');
    const reqC = mkRequirement('C');
    r.add(reqA);
    r.add(reqB);
    r.add(reqC);

    const aFromB: RequirementTraceEdge = {
      id: createEdgeId(),
      kind: 'RequirementTrace',
      sourceId: reqB.id,
      targetId: reqA.id,
      traceKind: 'derive',
    };
    const aToC: RequirementTraceEdge = {
      id: createEdgeId(),
      kind: 'RequirementTrace',
      sourceId: reqA.id,
      targetId: reqC.id,
      traceKind: 'derive',
    };
    r.addEdge(aFromB);
    r.addEdge(aToC);

    r.remove(reqA.id);

    expect(r.getEdge(aFromB.id)).toBeUndefined();
    expect(r.getEdge(aToC.id)).toBeUndefined();
    expect(r.edges()).toHaveLength(0);
  });
});
