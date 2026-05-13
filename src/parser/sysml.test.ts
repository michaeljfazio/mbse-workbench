import { describe, expect, it } from 'vitest';
import type {
  EdgeId,
  ElementId,
  ModelEdge,
  ModelElement,
  ProjectId,
} from '@/model';
import { EMPTY_COMMAND_HISTORY, type Project } from '@/repository';
import { serializeProject } from '@/serializer/sysml';
import { parseSysmlText } from './sysml';

function eid(s: string): ElementId {
  return s as ElementId;
}
function edgeId(s: string): EdgeId {
  return s as EdgeId;
}

function buildProject(
  elements: readonly ModelElement[],
  edges: readonly ModelEdge[] = [],
  name = 'TestProject',
): Project {
  return {
    id: 'P1' as ProjectId,
    name,
    createdAt: '2026-01-01T00:00:00Z',
    modifiedAt: '2026-01-01T00:00:00Z',
    elements,
    edges,
    diagrams: [],
    history: EMPTY_COMMAND_HISTORY,
    conversations: [],
  };
}

function roundTrip(elements: readonly ModelElement[], edges: readonly ModelEdge[] = []) {
  const text = serializeProject(buildProject(elements, edges));
  const result = parseSysmlText(text);
  if (!result.ok) {
    throw new Error('parse failed: ' + JSON.stringify(result.errors));
  }
  return result.value;
}

describe('parseSysmlText — header and ID recovery', () => {
  it('recovers the project id from the header comment', () => {
    const text = serializeProject(buildProject([{ id: eid('a1'), kind: 'Actor', name: 'U' }]));
    const res = parseSysmlText(text);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.projectId).toBe('P1');
    }
  });

  it('returns parse error with line/col on bad input', () => {
    const res = parseSysmlText('package {');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors[0]?.line).toBeGreaterThan(0);
      expect(res.errors[0]?.col).toBeGreaterThan(0);
    }
  });
});

describe('parseSysmlText — round-trip per element kind', () => {
  it('Actor', () => {
    const els: ModelElement[] = [{ id: eid('a1'), kind: 'Actor', name: 'User' }];
    expect(roundTrip(els).elements).toEqual(els);
  });

  it('Package with member containment', () => {
    const els: ModelElement[] = [
      { id: eid('p1'), kind: 'Package', name: 'Root', memberIds: [eid('a1')] },
      { id: eid('a1'), kind: 'Actor', name: 'User' },
    ];
    const parsed = roundTrip(els);
    const pkg = parsed.elements.find((e) => e.kind === 'Package');
    expect(pkg?.id).toBe('p1');
    if (pkg && pkg.kind === 'Package') expect(pkg.memberIds).toEqual(['a1']);
    expect(parsed.elements.some((e) => e.kind === 'Actor' && e.id === 'a1')).toBe(true);
  });

  it('PartDefinition with abstract, port, and value property', () => {
    const els: ModelElement[] = [
      { id: eid('pd1'), kind: 'PortDefinition', name: 'powerIn', direction: 'in' },
      { id: eid('vp1'), kind: 'ValueProperty', name: 'mass', valueType: 'number', defaultValue: 12.5 },
      {
        id: eid('def1'),
        kind: 'PartDefinition',
        name: 'Engine',
        isAbstract: true,
        portIds: [eid('pd1')],
        propertyIds: [eid('vp1')],
      },
    ];
    const parsed = roundTrip(els);
    const def = parsed.elements.find((e) => e.kind === 'PartDefinition');
    expect(def?.id).toBe('def1');
    if (def && def.kind === 'PartDefinition') {
      expect(def.isAbstract).toBe(true);
      expect(def.portIds).toEqual(['pd1']);
      expect(def.propertyIds).toEqual(['vp1']);
    }
  });

  it('PartUsage with multiplicity', () => {
    const els: ModelElement[] = [
      {
        id: eid('def1'),
        kind: 'PartDefinition',
        name: 'Wheel',
        isAbstract: false,
        portIds: [],
        propertyIds: [],
      },
      {
        id: eid('u1'),
        kind: 'PartUsage',
        name: 'wheels',
        definitionId: eid('def1'),
        portUsageIds: [],
        multiplicity: '4',
      },
    ];
    const parsed = roundTrip(els);
    const u = parsed.elements.find((e) => e.kind === 'PartUsage');
    if (u && u.kind === 'PartUsage') {
      expect(u.definitionId).toBe('def1');
      expect(u.multiplicity).toBe('4');
    }
  });

  it('InterfaceDefinition + PortDefinition with interfaceId', () => {
    const els: ModelElement[] = [
      {
        id: eid('if1'),
        kind: 'InterfaceDefinition',
        name: 'PowerBus',
        portDefinitionIds: [eid('pd1')],
      },
      {
        id: eid('pd1'),
        kind: 'PortDefinition',
        name: 'powerIn',
        direction: 'in',
        interfaceId: eid('if1'),
      },
    ];
    const parsed = roundTrip(els);
    const pd = parsed.elements.find((e) => e.kind === 'PortDefinition');
    if (pd && pd.kind === 'PortDefinition') expect(pd.interfaceId).toBe('if1');
  });

  it('ConnectionUsage and ItemFlow', () => {
    const els: ModelElement[] = [
      {
        id: eid('c1'),
        kind: 'ConnectionUsage',
        name: 'link',
        sourceId: eid('p1'),
        targetId: eid('p2'),
      },
      {
        id: eid('f1'),
        kind: 'ItemFlow',
        name: 'flow1',
        sourceId: eid('p1'),
        targetId: eid('p2'),
        itemType: 'Signal',
      },
    ];
    const parsed = roundTrip(els);
    expect(parsed.elements).toHaveLength(2);
    expect(parsed.elements.find((e) => e.kind === 'ItemFlow')).toMatchObject({
      itemType: 'Signal',
      sourceId: 'p1',
      targetId: 'p2',
    });
  });

  it('Requirement with optional fields', () => {
    const els: ModelElement[] = [
      {
        id: eid('r1'),
        kind: 'Requirement',
        name: 'Reliability',
        reqId: 'R-1',
        text: 'system shall be reliable',
        priority: 'high',
        status: 'approved',
        rationale: 'critical mission',
      },
    ];
    const parsed = roundTrip(els);
    const r = parsed.elements[0];
    if (r && r.kind === 'Requirement') {
      expect(r.reqId).toBe('R-1');
      expect(r.priority).toBe('high');
      expect(r.status).toBe('approved');
      expect(r.text).toBe('system shall be reliable');
      expect(r.rationale).toBe('critical mission');
    }
  });

  it('ActionDefinition and ActionUsage', () => {
    const els: ModelElement[] = [
      { id: eid('ad1'), kind: 'ActionDefinition', name: 'Compute', parameterIds: [] },
      {
        id: eid('au1'),
        kind: 'ActionUsage',
        name: 'compute',
        nodeType: 'action',
        definitionId: eid('ad1'),
      },
      { id: eid('au2'), kind: 'ActionUsage', name: 'start', nodeType: 'initial' },
    ];
    const parsed = roundTrip(els);
    const u = parsed.elements.find((e) => e.kind === 'ActionUsage' && e.name === 'compute');
    if (u && u.kind === 'ActionUsage') expect(u.definitionId).toBe('ad1');
    const init = parsed.elements.find((e) => e.kind === 'ActionUsage' && e.name === 'start');
    if (init && init.kind === 'ActionUsage') expect(init.nodeType).toBe('initial');
  });

  it('StateDefinition and StateUsage with entry/do/exit', () => {
    const els: ModelElement[] = [
      { id: eid('sd1'), kind: 'StateDefinition', name: 'Powered', isComposite: true },
      {
        id: eid('su1'),
        kind: 'StateUsage',
        name: 'on',
        stateType: 'state',
        definitionId: eid('sd1'),
        entryAction: 'turnOn()',
        doAction: 'run()',
        exitAction: 'turnOff()',
      },
    ];
    const parsed = roundTrip(els);
    const u = parsed.elements.find((e) => e.kind === 'StateUsage');
    if (u && u.kind === 'StateUsage') {
      expect(u.entryAction).toBe('turnOn()');
      expect(u.doAction).toBe('run()');
      expect(u.exitAction).toBe('turnOff()');
      expect(u.definitionId).toBe('sd1');
    }
  });

  it('Transition with trigger/guard/effect', () => {
    const els: ModelElement[] = [
      {
        id: eid('t1'),
        kind: 'Transition',
        name: 'go',
        sourceId: eid('s1'),
        targetId: eid('s2'),
        trigger: 'click',
        guard: 'ready',
        effect: 'log',
      },
    ];
    const parsed = roundTrip(els);
    const t = parsed.elements[0];
    if (t && t.kind === 'Transition') {
      expect(t.trigger).toBe('click');
      expect(t.guard).toBe('ready');
      expect(t.effect).toBe('log');
    }
  });

  it('UseCase with and without text', () => {
    const els: ModelElement[] = [
      { id: eid('uc1'), kind: 'UseCase', name: 'Login', text: 'user logs in' },
      { id: eid('uc2'), kind: 'UseCase', name: 'Logout' },
    ];
    const parsed = roundTrip(els);
    const u1 = parsed.elements.find((e) => e.kind === 'UseCase' && e.name === 'Login');
    if (u1 && u1.kind === 'UseCase') expect(u1.text).toBe('user logs in');
    const u2 = parsed.elements.find((e) => e.kind === 'UseCase' && e.name === 'Logout');
    if (u2 && u2.kind === 'UseCase') expect(u2.text).toBeUndefined();
  });

  it('ConstraintDefinition + ConstraintUsage', () => {
    const els: ModelElement[] = [
      {
        id: eid('cd1'),
        kind: 'ConstraintDefinition',
        name: 'Mass',
        expression: 'm > 0',
        parameterIds: [],
      },
      {
        id: eid('cu1'),
        kind: 'ConstraintUsage',
        name: 'mass',
        definitionId: eid('cd1'),
      },
    ];
    const parsed = roundTrip(els);
    const cu = parsed.elements.find((e) => e.kind === 'ConstraintUsage');
    if (cu && cu.kind === 'ConstraintUsage') expect(cu.definitionId).toBe('cd1');
    const cd = parsed.elements.find((e) => e.kind === 'ConstraintDefinition');
    if (cd && cd.kind === 'ConstraintDefinition') expect(cd.expression).toBe('m > 0');
  });

  it('ValueProperty with default values (string, number, boolean)', () => {
    const els: ModelElement[] = [
      { id: eid('v1'), kind: 'ValueProperty', name: 'tag', valueType: 'string', defaultValue: 'x' },
      { id: eid('v2'), kind: 'ValueProperty', name: 'mass', valueType: 'number', defaultValue: 3.14 },
      { id: eid('v3'), kind: 'ValueProperty', name: 'on', valueType: 'boolean', defaultValue: true },
    ];
    const parsed = roundTrip(els);
    expect(parsed.elements.map((e) => (e.kind === 'ValueProperty' ? e.defaultValue : null))).toEqual(['x', 3.14, true]);
  });
});

describe('parseSysmlText — edges round-trip', () => {
  it('parses every edge kind from the // edges block', () => {
    const edges: ModelEdge[] = [
      { id: edgeId('e1'), kind: 'Composition', sourceId: eid('a'), targetId: eid('b') },
      { id: edgeId('e2'), kind: 'Generalization', sourceId: eid('a'), targetId: eid('b') },
      {
        id: edgeId('e3'),
        kind: 'RequirementTrace',
        traceKind: 'satisfy',
        sourceId: eid('a'),
        targetId: eid('b'),
      },
      {
        id: edgeId('e4'),
        kind: 'ControlFlow',
        sourceId: eid('a'),
        targetId: eid('b'),
        guard: 'g>0',
      },
      {
        id: edgeId('e5'),
        kind: 'ObjectFlow',
        sourceId: eid('a'),
        targetId: eid('b'),
        itemType: 'Signal',
      },
      { id: edgeId('e6'), kind: 'Include', sourceId: eid('a'), targetId: eid('b') },
      {
        id: edgeId('e7'),
        kind: 'Extend',
        sourceId: eid('a'),
        targetId: eid('b'),
        extensionPoint: 'foo',
      },
      { id: edgeId('e8'), kind: 'ParameterBinding', sourceId: eid('a'), targetId: eid('b') },
      { id: edgeId('e9'), kind: 'PackageImport', sourceId: eid('a'), targetId: eid('b') },
    ];
    // need referenced elements for serializer; use Actors as placeholders
    const els: ModelElement[] = [
      { id: eid('a'), kind: 'Actor', name: 'A' },
      { id: eid('b'), kind: 'Actor', name: 'B' },
    ];
    const parsed = roundTrip(els, edges);
    expect(parsed.edges).toHaveLength(9);
    const kinds = parsed.edges.map((e) => e.kind).sort();
    expect(kinds).toEqual([
      'Composition',
      'ControlFlow',
      'Extend',
      'Generalization',
      'Include',
      'ObjectFlow',
      'PackageImport',
      'ParameterBinding',
      'RequirementTrace',
    ]);
  });
});
