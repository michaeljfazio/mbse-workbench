import { describe, expect, it } from 'vitest';
import {
  ELEMENT_KINDS,
  type ElementKind,
  type ModelElement,
} from '@/model';
import { assertNever, mkElementId, mkUserId } from './helpers';

function describeElement(element: ModelElement): string {
  switch (element.kind) {
    case 'Package':
      return `Package(${element.memberIds.length} members)`;
    case 'PartDefinition':
      return `PartDefinition(abstract=${element.isAbstract})`;
    case 'PartUsage':
      return `PartUsage(def=${element.definitionId})`;
    case 'PortDefinition':
      return `PortDefinition(${element.direction})`;
    case 'PortUsage':
      return `PortUsage(def=${element.definitionId})`;
    case 'InterfaceDefinition':
      return `InterfaceDefinition(${element.portDefinitionIds.length} ports)`;
    case 'ConnectionUsage':
      return `ConnectionUsage(${element.sourceId}->${element.targetId})`;
    case 'ItemFlow':
      return `ItemFlow(${element.sourceId}->${element.targetId})`;
    case 'Requirement':
      return `Requirement(${element.priority}/${element.status})`;
    case 'ActionDefinition':
      return `ActionDefinition(${element.parameterIds.length} params)`;
    case 'ActionUsage':
      return `ActionUsage(${element.nodeType})`;
    case 'StateDefinition':
      return `StateDefinition(composite=${element.isComposite})`;
    case 'StateUsage':
      return `StateUsage(${element.stateType})`;
    case 'Transition':
      return `Transition(${element.sourceId}->${element.targetId})`;
    case 'UseCase':
      return `UseCase`;
    case 'Actor':
      return `Actor`;
    case 'ConstraintDefinition':
      return `ConstraintDefinition(${element.expression})`;
    case 'ConstraintUsage':
      return `ConstraintUsage(def=${element.definitionId})`;
    case 'ValueProperty':
      return `ValueProperty(${element.valueType})`;
    default:
      return assertNever(element);
  }
}

const sampleByKind: { [K in ElementKind]: () => Extract<ModelElement, { kind: K }> } = {
  Package: () => ({
    id: mkElementId('pkg-1'),
    kind: 'Package',
    name: 'root',
    memberIds: [],
  }),
  PartDefinition: () => ({
    id: mkElementId('pd-1'),
    kind: 'PartDefinition',
    name: 'Vehicle',
    isAbstract: false,
    propertyIds: [],
    portIds: [],
  }),
  PartUsage: () => ({
    id: mkElementId('pu-1'),
    kind: 'PartUsage',
    name: 'wheel',
    definitionId: mkElementId('pd-1'),
    portUsageIds: [],
  }),
  PortDefinition: () => ({
    id: mkElementId('port-d-1'),
    kind: 'PortDefinition',
    name: 'fuel',
    direction: 'in',
  }),
  PortUsage: () => ({
    id: mkElementId('port-u-1'),
    kind: 'PortUsage',
    name: 'fuelIn',
    definitionId: mkElementId('port-d-1'),
  }),
  InterfaceDefinition: () => ({
    id: mkElementId('if-1'),
    kind: 'InterfaceDefinition',
    name: 'FuelLine',
    portDefinitionIds: [],
  }),
  ConnectionUsage: () => ({
    id: mkElementId('conn-1'),
    kind: 'ConnectionUsage',
    name: 'c1',
    sourceId: mkElementId('a'),
    targetId: mkElementId('b'),
  }),
  ItemFlow: () => ({
    id: mkElementId('flow-1'),
    kind: 'ItemFlow',
    name: 'fuelFlow',
    sourceId: mkElementId('a'),
    targetId: mkElementId('b'),
  }),
  Requirement: () => ({
    id: mkElementId('req-1'),
    kind: 'Requirement',
    name: 'R1',
    text: 'The system shall start in under 5 seconds.',
    priority: 'high',
    status: 'draft',
  }),
  ActionDefinition: () => ({
    id: mkElementId('ad-1'),
    kind: 'ActionDefinition',
    name: 'StartEngine',
    parameterIds: [],
  }),
  ActionUsage: () => ({
    id: mkElementId('au-1'),
    kind: 'ActionUsage',
    name: 'start',
    nodeType: 'action',
  }),
  StateDefinition: () => ({
    id: mkElementId('sd-1'),
    kind: 'StateDefinition',
    name: 'EngineState',
    isComposite: false,
  }),
  StateUsage: () => ({
    id: mkElementId('su-1'),
    kind: 'StateUsage',
    name: 'running',
    stateType: 'state',
  }),
  Transition: () => ({
    id: mkElementId('tr-1'),
    kind: 'Transition',
    name: 't1',
    sourceId: mkElementId('s1'),
    targetId: mkElementId('s2'),
  }),
  UseCase: () => ({
    id: mkElementId('uc-1'),
    kind: 'UseCase',
    name: 'Drive',
  }),
  Actor: () => ({
    id: mkElementId('actor-1'),
    kind: 'Actor',
    name: 'Driver',
  }),
  ConstraintDefinition: () => ({
    id: mkElementId('cd-1'),
    kind: 'ConstraintDefinition',
    name: 'mass = volume * density',
    expression: 'mass = volume * density',
    parameterIds: [],
  }),
  ConstraintUsage: () => ({
    id: mkElementId('cu-1'),
    kind: 'ConstraintUsage',
    name: 'fuelMass',
    definitionId: mkElementId('cd-1'),
  }),
  ValueProperty: () => ({
    id: mkElementId('vp-1'),
    kind: 'ValueProperty',
    name: 'mass',
    valueType: 'number',
    defaultValue: 0,
  }),
};

describe('metamodel — elements', () => {
  it('declares all 19 SysMLv2 element kinds in ELEMENT_KINDS', () => {
    expect(ELEMENT_KINDS).toHaveLength(19);
    expect(new Set(ELEMENT_KINDS).size).toBe(19);
  });

  it('every kind has a constructible sample that round-trips through JSON', () => {
    for (const kind of ELEMENT_KINDS) {
      const make = sampleByKind[kind];
      const element = make();
      expect(element.kind).toBe(kind);
      const cloned = JSON.parse(JSON.stringify(element)) as ModelElement;
      expect(cloned).toEqual(element);
    }
  });

  it('describeElement exhaustively narrows every kind (compile-time check)', () => {
    for (const kind of ELEMENT_KINDS) {
      const element = sampleByKind[kind]();
      expect(describeElement(element)).toContain('');
    }
  });

  it('ownerId is optional on every element', () => {
    const owned = sampleByKind.Package();
    const withOwner: typeof owned = { ...owned, ownerId: mkUserId('u-1') };
    expect(withOwner.ownerId).toBe('u-1');
  });
});
