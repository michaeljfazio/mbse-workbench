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
import {
  EMPTY_COMMAND_HISTORY,
  type Project,
} from '@/repository';
import { serializeProject } from './sysml';

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

/**
 * Build a project where every passed element is a `member`-role child of the
 * synthetic root Package. Tests that need finer-grained containment (port,
 * property, parameter, portDefinition) pre-stamp those children themselves
 * with `own(...)` before passing them in — the helper leaves pre-stamped
 * elements alone.
 */
function buildProject(
  elements: readonly ModelElement[],
  edges: readonly ModelEdge[] = [],
  name = 'TestProject',
): Project {
  const stamped = elements.map((e, i) =>
    e.ownerId === undefined ? asMember(e as Loose<ModelElement>, i) : e,
  );
  return {
    id: 'P1' as ProjectId,
    name,
    createdAt: '2026-01-01T00:00:00Z',
    modifiedAt: '2026-01-01T00:00:00Z',
    rootId: R,
    elements: [rootPkg, ...stamped],
    edges,
    diagrams: [],
    history: EMPTY_COMMAND_HISTORY,
    conversations: [],
  };
}

describe('serializeProject — element kinds in isolation', () => {
  it('emits a Package with member containment', () => {
    const pkg: PackageElement = asMember(
      { id: eid('pkg1'), kind: 'Package', name: 'RootPkg' },
      0,
    );
    const actor = own<Extract<ModelElement, { kind: 'Actor' }>>(
      { id: eid('actor1'), kind: 'Actor', name: 'User' },
      pkg.id,
      'member',
      0,
    );
    const text = serializeProject(buildProject([pkg, actor]));
    expect(text).toContain('package RootPkg {');
    expect(text).toContain('// id: pkg1');
    expect(text).toContain('actor User;');
    expect(text).toContain('// id: actor1');
    // member must be indented four spaces (root, RootPkg, actor)
    expect(text).toMatch(/^ {4}actor User;/m);
  });

  it('emits PartDefinition with abstract, ports, and value properties', () => {
    const partDef = asMember<Extract<ModelElement, { kind: 'PartDefinition' }>>(
      {
        id: eid('def1'),
        kind: 'PartDefinition',
        name: 'Engine',
        isAbstract: true,
      },
      0,
    );
    const portDef = own<Extract<ModelElement, { kind: 'PortDefinition' }>>(
      {
        id: eid('pd1'),
        kind: 'PortDefinition',
        name: 'powerIn',
        direction: 'in',
      },
      partDef.id,
      'port',
      0,
    );
    const value = own<Extract<ModelElement, { kind: 'ValueProperty' }>>(
      {
        id: eid('vp1'),
        kind: 'ValueProperty',
        name: 'mass',
        valueType: 'number',
        defaultValue: 12.5,
      },
      partDef.id,
      'property',
      0,
    );
    const text = serializeProject(buildProject([partDef, portDef, value]));
    expect(text).toContain('abstract part def Engine {');
    expect(text).toContain('port def in powerIn;');
    expect(text).toContain('attribute mass : number = 12.5;');
  });

  it('emits PartUsage with definition reference, multiplicity, and port usages', () => {
    const def = asMember<Extract<ModelElement, { kind: 'PartDefinition' }>>(
      {
        id: eid('def1'),
        kind: 'PartDefinition',
        name: 'Wheel',
        isAbstract: false,
      },
      0,
    );
    const portDef = asMember<Extract<ModelElement, { kind: 'PortDefinition' }>>(
      {
        id: eid('pd1'),
        kind: 'PortDefinition',
        name: 'axle',
        direction: 'inout',
      },
      1,
    );
    const usage = asMember<Extract<ModelElement, { kind: 'PartUsage' }>>(
      {
        id: eid('use1'),
        kind: 'PartUsage',
        name: 'frontWheel',
        definitionId: eid('def1'),
        multiplicity: '1..4',
      },
      2,
    );
    const portUsage = own<Extract<ModelElement, { kind: 'PortUsage' }>>(
      {
        id: eid('pu1'),
        kind: 'PortUsage',
        name: 'frontAxle',
        definitionId: eid('pd1'),
      },
      usage.id,
      'port',
      0,
    );
    const text = serializeProject(
      buildProject([def, portDef, usage, portUsage]),
    );
    expect(text).toContain('part frontWheel : Wheel[1..4] {');
    expect(text).toContain('port frontAxle : axle;');
  });

  it('emits InterfaceDefinition containing its port definitions', () => {
    const iface = asMember<
      Extract<ModelElement, { kind: 'InterfaceDefinition' }>
    >(
      {
        id: eid('if1'),
        kind: 'InterfaceDefinition',
        name: 'SerialBus',
      },
      0,
    );
    const portDef = own<Extract<ModelElement, { kind: 'PortDefinition' }>>(
      {
        id: eid('pd1'),
        kind: 'PortDefinition',
        name: 'signal',
        direction: 'out',
      },
      iface.id,
      'portDefinition',
      0,
    );
    const text = serializeProject(buildProject([iface, portDef]));
    expect(text).toContain('interface def SerialBus {');
    expect(text).toContain('port def out signal;');
  });

  it('emits ConnectionUsage and ItemFlow', () => {
    const conn = asMember<Extract<ModelElement, { kind: 'ConnectionUsage' }>>(
      {
        id: eid('c1'),
        kind: 'ConnectionUsage',
        name: 'wire1',
        sourceId: eid('a'),
        targetId: eid('b'),
      },
      0,
    );
    const flow = asMember<Extract<ModelElement, { kind: 'ItemFlow' }>>(
      {
        id: eid('f1'),
        kind: 'ItemFlow',
        name: 'powerFlow',
        sourceId: eid('a'),
        targetId: eid('b'),
        itemType: 'Watts',
      },
      1,
    );
    const text = serializeProject(buildProject([conn, flow]));
    expect(text).toContain('connection wire1 connect a to b;');
    expect(text).toContain('flow powerFlow of Watts from a to b;');
  });

  it('emits Requirement with all metadata fields', () => {
    const req = asMember<Extract<ModelElement, { kind: 'Requirement' }>>(
      {
        id: eid('r1'),
        kind: 'Requirement',
        name: 'BrakingDistance',
        reqId: 'REQ-001',
        text: 'Stop within 40m',
        priority: 'high',
        status: 'approved',
        rationale: 'Safety regulation',
      },
      0,
    );
    const text = serializeProject(buildProject([req]));
    expect(text).toContain('requirement REQ-001 BrakingDistance {');
    expect(text).toContain('priority high;');
    expect(text).toContain('status approved;');
    expect(text).toContain('text "Stop within 40m";');
    expect(text).toContain('rationale "Safety regulation";');
  });

  it('emits ActionDefinition with its parameters', () => {
    const def = asMember<
      Extract<ModelElement, { kind: 'ActionDefinition' }>
    >(
      {
        id: eid('ad1'),
        kind: 'ActionDefinition',
        name: 'Accelerate',
      },
      0,
    );
    const param = own<Extract<ModelElement, { kind: 'ValueProperty' }>>(
      {
        id: eid('p1'),
        kind: 'ValueProperty',
        name: 'duration',
        valueType: 'number',
      },
      def.id,
      'parameter',
      0,
    );
    const text = serializeProject(buildProject([def, param]));
    expect(text).toContain('action def Accelerate {');
    expect(text).toContain('attribute duration : number;');
  });

  it('emits ActionUsage with node type and optional definition', () => {
    const def = asMember<
      Extract<ModelElement, { kind: 'ActionDefinition' }>
    >(
      { id: eid('ad1'), kind: 'ActionDefinition', name: 'Run' },
      0,
    );
    const usage = asMember<Extract<ModelElement, { kind: 'ActionUsage' }>>(
      {
        id: eid('au1'),
        kind: 'ActionUsage',
        name: 'go',
        definitionId: eid('ad1'),
        nodeType: 'action',
      },
      1,
    );
    const fork = asMember<Extract<ModelElement, { kind: 'ActionUsage' }>>(
      {
        id: eid('au2'),
        kind: 'ActionUsage',
        name: 'split',
        nodeType: 'fork',
      },
      2,
    );
    const text = serializeProject(buildProject([def, usage, fork]));
    expect(text).toContain('action action go : Run;');
    expect(text).toContain('action fork split;');
  });

  it('emits StateDefinition and StateUsage with entry/exit/do', () => {
    const def = asMember<Extract<ModelElement, { kind: 'StateDefinition' }>>(
      {
        id: eid('sd1'),
        kind: 'StateDefinition',
        name: 'IdleState',
        isComposite: true,
      },
      0,
    );
    const usage = asMember<Extract<ModelElement, { kind: 'StateUsage' }>>(
      {
        id: eid('su1'),
        kind: 'StateUsage',
        name: 'idle',
        stateType: 'state',
        definitionId: eid('sd1'),
        entryAction: 'log',
        doAction: 'wait',
      },
      1,
    );
    const text = serializeProject(buildProject([def, usage]));
    expect(text).toContain('composite state def IdleState;');
    expect(text).toContain('state state idle : IdleState {');
    expect(text).toContain('entry "log";');
    expect(text).toContain('do "wait";');
  });

  it('emits Transition with trigger/guard/effect', () => {
    const t = asMember<Extract<ModelElement, { kind: 'Transition' }>>(
      {
        id: eid('t1'),
        kind: 'Transition',
        name: 'startup',
        sourceId: eid('a'),
        targetId: eid('b'),
        trigger: 'power',
        guard: 'ready',
        effect: 'boot',
      },
      0,
    );
    const text = serializeProject(buildProject([t]));
    expect(text).toContain(
      'transition startup first a then b trigger "power" guard "ready" effect "boot";',
    );
  });

  it('emits UseCase (with and without text) and Actor', () => {
    const uc = asMember<Extract<ModelElement, { kind: 'UseCase' }>>(
      {
        id: eid('uc1'),
        kind: 'UseCase',
        name: 'Login',
        text: 'User logs in',
      },
      0,
    );
    const actor = asMember<Extract<ModelElement, { kind: 'Actor' }>>(
      { id: eid('a1'), kind: 'Actor', name: 'Admin' },
      1,
    );
    const text = serializeProject(buildProject([uc, actor]));
    expect(text).toContain('use case Login {');
    expect(text).toContain('text "User logs in";');
    expect(text).toContain('actor Admin;');
  });

  it('emits ConstraintDefinition with expression and ConstraintUsage', () => {
    const def = asMember<
      Extract<ModelElement, { kind: 'ConstraintDefinition' }>
    >(
      {
        id: eid('cd1'),
        kind: 'ConstraintDefinition',
        name: 'MaxSpeed',
        expression: 'speed < 120',
      },
      0,
    );
    const use = asMember<Extract<ModelElement, { kind: 'ConstraintUsage' }>>(
      {
        id: eid('cu1'),
        kind: 'ConstraintUsage',
        name: 'limit',
        definitionId: eid('cd1'),
      },
      1,
    );
    const text = serializeProject(buildProject([def, use]));
    expect(text).toContain('constraint def MaxSpeed {');
    expect(text).toContain('expr "speed < 120";');
    expect(text).toContain('constraint limit : MaxSpeed;');
  });

  it('emits ValueProperty with string and boolean literals', () => {
    const v1 = asMember<Extract<ModelElement, { kind: 'ValueProperty' }>>(
      {
        id: eid('v1'),
        kind: 'ValueProperty',
        name: 'label',
        valueType: 'string',
        defaultValue: 'on',
      },
      0,
    );
    const v2 = asMember<Extract<ModelElement, { kind: 'ValueProperty' }>>(
      {
        id: eid('v2'),
        kind: 'ValueProperty',
        name: 'active',
        valueType: 'boolean',
        defaultValue: true,
      },
      1,
    );
    const text = serializeProject(buildProject([v1, v2]));
    expect(text).toContain('attribute label : string = "on";');
    expect(text).toContain('attribute active : boolean = true;');
  });
});

describe('serializeProject — edges', () => {
  it('emits all edge kinds with appropriate keywords', () => {
    const edges: ModelEdge[] = [
      {
        id: edgeId('e1'),
        kind: 'Composition',
        sourceId: eid('a'),
        targetId: eid('b'),
      },
      {
        id: edgeId('e2'),
        kind: 'Generalization',
        sourceId: eid('a'),
        targetId: eid('c'),
      },
      {
        id: edgeId('e3'),
        kind: 'RequirementTrace',
        sourceId: eid('r'),
        targetId: eid('p'),
        traceKind: 'satisfy',
      },
      {
        id: edgeId('e4'),
        kind: 'ControlFlow',
        sourceId: eid('a'),
        targetId: eid('b'),
        guard: 'ok',
      },
      {
        id: edgeId('e5'),
        kind: 'ObjectFlow',
        sourceId: eid('a'),
        targetId: eid('b'),
        itemType: 'Token',
      },
      {
        id: edgeId('e6'),
        kind: 'Include',
        sourceId: eid('a'),
        targetId: eid('b'),
      },
      {
        id: edgeId('e7'),
        kind: 'Extend',
        sourceId: eid('a'),
        targetId: eid('b'),
        extensionPoint: 'errorPath',
      },
      {
        id: edgeId('e8'),
        kind: 'ParameterBinding',
        sourceId: eid('a'),
        targetId: eid('b'),
      },
      {
        id: edgeId('e9'),
        kind: 'PackageImport',
        sourceId: eid('a'),
        targetId: eid('b'),
      },
    ];
    const text = serializeProject(buildProject([], edges));
    expect(text).toContain('composition a -> b;');
    expect(text).toContain('generalization a -> c;');
    expect(text).toContain('trace satisfy r -> p;');
    expect(text).toContain('control-flow [ok] a -> b;');
    expect(text).toContain('object-flow of Token a -> b;');
    expect(text).toContain('include a -> b;');
    expect(text).toContain('extend at errorPath a -> b;');
    expect(text).toContain('binding a -> b;');
    expect(text).toContain('import a -> b;');
  });
});

describe('serializeProject — determinism + snapshot', () => {
  it('produces stable output across invocations', () => {
    const pkg = asMember<PackageElement>(
      { id: eid('pkg'), kind: 'Package', name: 'Sys' },
      0,
    );
    const a = own<Extract<ModelElement, { kind: 'Actor' }>>(
      { id: eid('a'), kind: 'Actor', name: 'A' },
      pkg.id,
      'member',
      1,
    );
    const b = own<Extract<ModelElement, { kind: 'Actor' }>>(
      { id: eid('b'), kind: 'Actor', name: 'B' },
      pkg.id,
      'member',
      0,
    );
    const project = buildProject([pkg, a, b]);
    const first = serializeProject(project);
    const second = serializeProject(project);
    expect(second).toBe(first);
  });

  it('snapshot of a small mixed-kind project', () => {
    const pkg = asMember<PackageElement>(
      { id: eid('pkg'), kind: 'Package', name: 'CarSys' },
      0,
    );
    const engine = own<Extract<ModelElement, { kind: 'PartDefinition' }>>(
      {
        id: eid('engine'),
        kind: 'PartDefinition',
        name: 'Engine',
        isAbstract: false,
      },
      pkg.id,
      'member',
      0,
    );
    const mass = own<Extract<ModelElement, { kind: 'ValueProperty' }>>(
      {
        id: eid('mass'),
        kind: 'ValueProperty',
        name: 'mass',
        valueType: 'number',
        defaultValue: 200,
      },
      engine.id,
      'property',
      0,
    );
    const req = own<Extract<ModelElement, { kind: 'Requirement' }>>(
      {
        id: eid('req1'),
        kind: 'Requirement',
        name: 'EngineWeight',
        reqId: 'REQ-1',
        text: 'Engine mass below 300kg',
        priority: 'high',
        status: 'draft',
      },
      pkg.id,
      'member',
      1,
    );
    const edge: ModelEdge = {
      id: edgeId('t1'),
      kind: 'RequirementTrace',
      sourceId: eid('req1'),
      targetId: eid('engine'),
      traceKind: 'satisfy',
    };
    const text = serializeProject(
      buildProject([pkg, engine, mass, req], [edge]),
    );
    expect(text).toMatchSnapshot();
  });
});
