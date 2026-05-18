import { describe, expect, it } from 'vitest';
import type {
  EdgeId,
  ElementId,
  ModelEdge,
  ModelElement,
  OwnerRole,
  PackageElement,
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

const R = eid('R');
const rootPkg: PackageElement = {
  id: R,
  kind: 'Package',
  name: 'Root',
  ownerId: null,
  ownerRole: 'member',
  ownerIndex: 0,
};

type Loose<E extends ModelElement> = Omit<
  E,
  'ownerId' | 'ownerRole' | 'ownerIndex'
>;

function own<E extends ModelElement>(
  e: Loose<E>,
  ownerId: ElementId,
  role: OwnerRole,
  index: number,
): E {
  return { ...e, ownerId, ownerRole: role, ownerIndex: index } as E;
}

function asMember<E extends ModelElement>(e: Loose<E>, index: number): E {
  return own<E>(e, R, 'member', index);
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
    rootId: R,
    elements: [rootPkg, ...elements],
    edges,
    diagrams: [],
    history: EMPTY_COMMAND_HISTORY,
    conversations: [],
  };
}

function roundTrip(
  elements: readonly ModelElement[],
  edges: readonly ModelEdge[] = [],
) {
  const text = serializeProject(buildProject(elements, edges));
  const result = parseSysmlText(text);
  if (!result.ok) {
    throw new Error('parse failed: ' + JSON.stringify(result.errors));
  }
  return result.value;
}

describe('parseSysmlText — header and ID recovery', () => {
  it('recovers the project id from the header comment', () => {
    const text = serializeProject(
      buildProject([
        asMember<Extract<ModelElement, { kind: 'Actor' }>>(
          { id: eid('a1'), kind: 'Actor', name: 'U' },
          0,
        ),
      ]),
    );
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
    const actor = asMember<Extract<ModelElement, { kind: 'Actor' }>>(
      { id: eid('a1'), kind: 'Actor', name: 'User' },
      0,
    );
    const parsed = roundTrip([actor]);
    const found = parsed.elements.find((e) => e.kind === 'Actor');
    expect(found?.id).toBe('a1');
    expect(found?.name).toBe('User');
  });

  it('Package with member containment', () => {
    const inner = asMember<PackageElement>(
      { id: eid('p1'), kind: 'Package', name: 'Inner' },
      0,
    );
    const actor = own<Extract<ModelElement, { kind: 'Actor' }>>(
      { id: eid('a1'), kind: 'Actor', name: 'User' },
      inner.id,
      'member',
      0,
    );
    const parsed = roundTrip([inner, actor]);
    const pkg = parsed.elements.find(
      (e) => e.kind === 'Package' && e.name === 'Inner',
    );
    expect(pkg?.id).toBe('p1');
    const a = parsed.elements.find((e) => e.kind === 'Actor');
    expect(a?.id).toBe('a1');
    expect(a?.ownerId).toBe('p1');
    expect(a?.ownerRole).toBe('member');
  });

  it('PartDefinition with abstract, port, and value property', () => {
    const def = asMember<Extract<ModelElement, { kind: 'PartDefinition' }>>(
      {
        id: eid('def1'),
        kind: 'PartDefinition',
        name: 'Engine',
        isAbstract: true,
      },
      0,
    );
    const pd = own<Extract<ModelElement, { kind: 'PortDefinition' }>>(
      {
        id: eid('pd1'),
        kind: 'PortDefinition',
        name: 'powerIn',
        direction: 'in',
      },
      def.id,
      'port',
      0,
    );
    const vp = own<Extract<ModelElement, { kind: 'ValueProperty' }>>(
      {
        id: eid('vp1'),
        kind: 'ValueProperty',
        name: 'mass',
        valueType: 'number',
        defaultValue: 12.5,
      },
      def.id,
      'property',
      0,
    );
    const parsed = roundTrip([def, pd, vp]);
    const out = parsed.elements.find((e) => e.kind === 'PartDefinition');
    expect(out?.id).toBe('def1');
    if (out && out.kind === 'PartDefinition') expect(out.isAbstract).toBe(true);
    const port = parsed.elements.find((e) => e.kind === 'PortDefinition');
    expect(port?.ownerId).toBe('def1');
    expect(port?.ownerRole).toBe('port');
    const prop = parsed.elements.find((e) => e.kind === 'ValueProperty');
    expect(prop?.ownerId).toBe('def1');
    expect(prop?.ownerRole).toBe('property');
  });

  it('PartUsage with multiplicity', () => {
    const def = asMember<Extract<ModelElement, { kind: 'PartDefinition' }>>(
      {
        id: eid('def1'),
        kind: 'PartDefinition',
        name: 'Wheel',
        isAbstract: false,
      },
      0,
    );
    const usage = asMember<Extract<ModelElement, { kind: 'PartUsage' }>>(
      {
        id: eid('u1'),
        kind: 'PartUsage',
        name: 'wheels',
        definitionId: eid('def1'),
        multiplicity: '4',
      },
      1,
    );
    const parsed = roundTrip([def, usage]);
    const u = parsed.elements.find((e) => e.kind === 'PartUsage');
    if (u && u.kind === 'PartUsage') {
      expect(u.definitionId).toBe('def1');
      expect(u.multiplicity).toBe('4');
    }
  });

  it('InterfaceDefinition + PortDefinition with interfaceId', () => {
    const iface = asMember<
      Extract<ModelElement, { kind: 'InterfaceDefinition' }>
    >(
      { id: eid('if1'), kind: 'InterfaceDefinition', name: 'PowerBus' },
      0,
    );
    const pd = own<Extract<ModelElement, { kind: 'PortDefinition' }>>(
      {
        id: eid('pd1'),
        kind: 'PortDefinition',
        name: 'powerIn',
        direction: 'in',
        interfaceId: eid('if1'),
      },
      iface.id,
      'portDefinition',
      0,
    );
    const parsed = roundTrip([iface, pd]);
    const out = parsed.elements.find((e) => e.kind === 'PortDefinition');
    if (out && out.kind === 'PortDefinition') {
      expect(out.interfaceId).toBe('if1');
      expect(out.ownerId).toBe('if1');
      expect(out.ownerRole).toBe('portDefinition');
    }
  });

  it('ConnectionUsage and ItemFlow', () => {
    const conn = asMember<Extract<ModelElement, { kind: 'ConnectionUsage' }>>(
      {
        id: eid('c1'),
        kind: 'ConnectionUsage',
        name: 'link',
        sourceId: eid('p1'),
        targetId: eid('p2'),
      },
      0,
    );
    const flow = asMember<Extract<ModelElement, { kind: 'ItemFlow' }>>(
      {
        id: eid('f1'),
        kind: 'ItemFlow',
        name: 'flow1',
        sourceId: eid('p1'),
        targetId: eid('p2'),
        itemType: 'Signal',
      },
      1,
    );
    const parsed = roundTrip([conn, flow]);
    expect(parsed.elements.find((e) => e.kind === 'ConnectionUsage')?.id).toBe(
      'c1',
    );
    expect(parsed.elements.find((e) => e.kind === 'ItemFlow')).toMatchObject({
      itemType: 'Signal',
      sourceId: 'p1',
      targetId: 'p2',
    });
  });

  it('Requirement with optional fields', () => {
    const req = asMember<Extract<ModelElement, { kind: 'Requirement' }>>(
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
      0,
    );
    const parsed = roundTrip([req]);
    const r = parsed.elements.find((e) => e.kind === 'Requirement');
    if (r && r.kind === 'Requirement') {
      expect(r.reqId).toBe('R-1');
      expect(r.priority).toBe('high');
      expect(r.status).toBe('approved');
      expect(r.text).toBe('system shall be reliable');
      expect(r.rationale).toBe('critical mission');
    }
  });

  it('ActionDefinition and ActionUsage', () => {
    const ad = asMember<Extract<ModelElement, { kind: 'ActionDefinition' }>>(
      { id: eid('ad1'), kind: 'ActionDefinition', name: 'Compute' },
      0,
    );
    const au1 = asMember<Extract<ModelElement, { kind: 'ActionUsage' }>>(
      {
        id: eid('au1'),
        kind: 'ActionUsage',
        name: 'compute',
        nodeType: 'action',
        definitionId: eid('ad1'),
      },
      1,
    );
    const au2 = asMember<Extract<ModelElement, { kind: 'ActionUsage' }>>(
      {
        id: eid('au2'),
        kind: 'ActionUsage',
        name: 'start',
        nodeType: 'initial',
      },
      2,
    );
    const parsed = roundTrip([ad, au1, au2]);
    const u = parsed.elements.find(
      (e) => e.kind === 'ActionUsage' && e.name === 'compute',
    );
    if (u && u.kind === 'ActionUsage') expect(u.definitionId).toBe('ad1');
    const init = parsed.elements.find(
      (e) => e.kind === 'ActionUsage' && e.name === 'start',
    );
    if (init && init.kind === 'ActionUsage')
      expect(init.nodeType).toBe('initial');
  });

  it('StateDefinition and StateUsage with entry/do/exit', () => {
    const sd = asMember<Extract<ModelElement, { kind: 'StateDefinition' }>>(
      {
        id: eid('sd1'),
        kind: 'StateDefinition',
        name: 'Powered',
        isComposite: true,
      },
      0,
    );
    const su = asMember<Extract<ModelElement, { kind: 'StateUsage' }>>(
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
      1,
    );
    const parsed = roundTrip([sd, su]);
    const u = parsed.elements.find((e) => e.kind === 'StateUsage');
    if (u && u.kind === 'StateUsage') {
      expect(u.entryAction).toBe('turnOn()');
      expect(u.doAction).toBe('run()');
      expect(u.exitAction).toBe('turnOff()');
      expect(u.definitionId).toBe('sd1');
    }
  });

  it('Transition with trigger/guard/effect', () => {
    const t = asMember<Extract<ModelElement, { kind: 'Transition' }>>(
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
      0,
    );
    const parsed = roundTrip([t]);
    const out = parsed.elements.find((e) => e.kind === 'Transition');
    if (out && out.kind === 'Transition') {
      expect(out.trigger).toBe('click');
      expect(out.guard).toBe('ready');
      expect(out.effect).toBe('log');
    }
  });

  it('UseCase with and without text', () => {
    const uc1 = asMember<Extract<ModelElement, { kind: 'UseCase' }>>(
      { id: eid('uc1'), kind: 'UseCase', name: 'Login', text: 'user logs in' },
      0,
    );
    const uc2 = asMember<Extract<ModelElement, { kind: 'UseCase' }>>(
      { id: eid('uc2'), kind: 'UseCase', name: 'Logout' },
      1,
    );
    const parsed = roundTrip([uc1, uc2]);
    const u1 = parsed.elements.find(
      (e) => e.kind === 'UseCase' && e.name === 'Login',
    );
    if (u1 && u1.kind === 'UseCase') expect(u1.text).toBe('user logs in');
    const u2 = parsed.elements.find(
      (e) => e.kind === 'UseCase' && e.name === 'Logout',
    );
    if (u2 && u2.kind === 'UseCase') expect(u2.text).toBeUndefined();
  });

  it('ConstraintDefinition + ConstraintUsage', () => {
    const cd = asMember<
      Extract<ModelElement, { kind: 'ConstraintDefinition' }>
    >(
      {
        id: eid('cd1'),
        kind: 'ConstraintDefinition',
        name: 'Mass',
        expression: 'm > 0',
      },
      0,
    );
    const cu = asMember<Extract<ModelElement, { kind: 'ConstraintUsage' }>>(
      {
        id: eid('cu1'),
        kind: 'ConstraintUsage',
        name: 'mass',
        definitionId: eid('cd1'),
      },
      1,
    );
    const parsed = roundTrip([cd, cu]);
    const u = parsed.elements.find((e) => e.kind === 'ConstraintUsage');
    if (u && u.kind === 'ConstraintUsage') expect(u.definitionId).toBe('cd1');
    const def = parsed.elements.find((e) => e.kind === 'ConstraintDefinition');
    if (def && def.kind === 'ConstraintDefinition')
      expect(def.expression).toBe('m > 0');
  });

  it('ValueProperty with default values (string, number, boolean)', () => {
    const v1 = asMember<Extract<ModelElement, { kind: 'ValueProperty' }>>(
      {
        id: eid('v1'),
        kind: 'ValueProperty',
        name: 'tag',
        valueType: 'string',
        defaultValue: 'x',
      },
      0,
    );
    const v2 = asMember<Extract<ModelElement, { kind: 'ValueProperty' }>>(
      {
        id: eid('v2'),
        kind: 'ValueProperty',
        name: 'mass',
        valueType: 'number',
        defaultValue: 3.14,
      },
      1,
    );
    const v3 = asMember<Extract<ModelElement, { kind: 'ValueProperty' }>>(
      {
        id: eid('v3'),
        kind: 'ValueProperty',
        name: 'on',
        valueType: 'boolean',
        defaultValue: true,
      },
      2,
    );
    const parsed = roundTrip([v1, v2, v3]);
    const vals = parsed.elements
      .filter((e) => e.kind === 'ValueProperty')
      .map((e) => (e.kind === 'ValueProperty' ? e.defaultValue : null));
    expect(vals).toEqual(['x', 3.14, true]);
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
    const els: ModelElement[] = [
      asMember<Extract<ModelElement, { kind: 'Actor' }>>(
        { id: eid('a'), kind: 'Actor', name: 'A' },
        0,
      ),
      asMember<Extract<ModelElement, { kind: 'Actor' }>>(
        { id: eid('b'), kind: 'Actor', name: 'B' },
        1,
      ),
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

  // Issue #434 — Association edges round-trip optional multiplicities at
  // either end. Tested with both ends decorated, target-only, and bare to
  // verify the optional brackets do not poison the unambiguous parse of
  // other endpoint shapes.
  it('parses Association edges with optional [sourceMultiplicity] and [targetMultiplicity]', () => {
    const edges: ModelEdge[] = [
      {
        id: edgeId('ea1'),
        kind: 'Association',
        sourceId: eid('a'),
        targetId: eid('b'),
      },
      {
        id: edgeId('ea2'),
        kind: 'Association',
        sourceId: eid('a'),
        targetId: eid('b'),
        sourceMultiplicity: '1',
        targetMultiplicity: '0..*',
      },
      {
        id: edgeId('ea3'),
        kind: 'Association',
        sourceId: eid('a'),
        targetId: eid('b'),
        targetMultiplicity: '1..*',
      },
    ];
    const els: ModelElement[] = [
      asMember<Extract<ModelElement, { kind: 'Actor' }>>(
        { id: eid('a'), kind: 'Actor', name: 'A' },
        0,
      ),
      asMember<Extract<ModelElement, { kind: 'Actor' }>>(
        { id: eid('b'), kind: 'Actor', name: 'B' },
        1,
      ),
    ];
    const parsed = roundTrip(els, edges);
    const assocs = parsed.edges.filter(
      (e): e is Extract<ModelEdge, { kind: 'Association' }> =>
        e.kind === 'Association',
    );
    expect(assocs).toHaveLength(3);
    const byId = new Map(assocs.map((e) => [e.id, e]));
    expect(byId.get(edgeId('ea1'))?.sourceMultiplicity).toBeUndefined();
    expect(byId.get(edgeId('ea1'))?.targetMultiplicity).toBeUndefined();
    expect(byId.get(edgeId('ea2'))?.sourceMultiplicity).toBe('1');
    expect(byId.get(edgeId('ea2'))?.targetMultiplicity).toBe('0..*');
    expect(byId.get(edgeId('ea3'))?.sourceMultiplicity).toBeUndefined();
    expect(byId.get(edgeId('ea3'))?.targetMultiplicity).toBe('1..*');
  });
});

describe('parseSysmlText — import directives (T-14.05)', () => {
  it('accepts a single bare `import Foo::*;` directive at top level', () => {
    const text = `// id: P1\nimport Base::*;\n\npackage Foo { // id: pkg1\n}\n`;
    const res = parseSysmlText(text);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('parse failed');
    expect(res.value.imports).toEqual(['Base']);
    expect(res.value.elements).toHaveLength(1);
    expect(res.value.elements[0]?.kind).toBe('Package');
  });

  it('accepts a multi-segment qualified name', () => {
    const text = `import kerml::core::Base::*;\n`;
    const res = parseSysmlText(text);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('parse failed');
    expect(res.value.imports).toEqual(['kerml::core::Base']);
  });

  it('accepts multiple import directives, preserving source order', () => {
    const text = `import Base::*;\nimport std::Sys::*;\n`;
    const res = parseSysmlText(text);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('parse failed');
    expect(res.value.imports).toEqual(['Base', 'std::Sys']);
  });

  it('still parses the `import` *edge* form (PackageImport) when used as edge', () => {
    const text = `package A { // id: a\n}\npackage B { // id: b\n}\nimport a -> b; // id: e1\n`;
    const res = parseSysmlText(text);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('parse failed');
    expect(res.value.imports).toBeUndefined();
    expect(res.value.edges).toHaveLength(1);
    expect(res.value.edges[0]?.kind).toBe('PackageImport');
  });

  it('rejects a malformed import directive missing the `::*;` tail', () => {
    const text = `import Base;\n`;
    const res = parseSysmlText(text);
    // `import Base;` is neither a valid directive nor a valid edge —
    // missing arrow / package body — so it must fail with line/col.
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors[0]?.line).toBeGreaterThan(0);
    }
  });

  it('omits the imports field when no directives are present', () => {
    const text = `package Foo { // id: pkg1\n}\n`;
    const res = parseSysmlText(text);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('parse failed');
    expect(res.value.imports).toBeUndefined();
  });
});

describe('parseSysmlText — quoted identifiers (#446 — OMG SysMLv2 §4.4.1)', () => {
  it('tokenizes `<Untitled Project>` as a single ident whose value is the inner text', () => {
    const text = `package <Untitled Project> { // id: pkg1\n}\n`;
    const res = parseSysmlText(text);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error(`parse failed: ${JSON.stringify(res.errors)}`);
    const pkg = res.value.elements.find((e) => e.kind === 'Package');
    expect(pkg?.name).toBe('Untitled Project');
  });

  it('round-trips a Package whose name contains whitespace', () => {
    const pkg = asMember<PackageElement>(
      { id: eid('p1'), kind: 'Package', name: 'Untitled Project' },
      0,
    );
    const parsed = roundTrip([pkg]);
    const out = parsed.elements.find((e) => e.kind === 'Package' && e.name === 'Untitled Project');
    expect(out).toBeDefined();
  });

  it('round-trips a PartUsage whose definition reference name contains whitespace', () => {
    const def = asMember<Extract<ModelElement, { kind: 'PartDefinition' }>>(
      {
        id: eid('def1'),
        kind: 'PartDefinition',
        name: 'Flight Controller',
        isAbstract: false,
      },
      0,
    );
    const usage = asMember<Extract<ModelElement, { kind: 'PartUsage' }>>(
      {
        id: eid('use1'),
        kind: 'PartUsage',
        name: 'primary FCC',
        definitionId: eid('def1'),
      },
      1,
    );
    const parsed = roundTrip([def, usage]);
    const reusage = parsed.elements.find((e) => e.kind === 'PartUsage');
    expect(reusage?.name).toBe('primary FCC');
    expect(reusage?.kind === 'PartUsage' && reusage.definitionId).toBe(eid('def1'));
  });

  it('reports a parse error on an unterminated `<…` quoted identifier', () => {
    const text = `package <Untitled { // id: pkg1\n}\n`;
    const res = parseSysmlText(text);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors[0]?.message).toMatch(/quoted name|unterminated/i);
    }
  });
});
