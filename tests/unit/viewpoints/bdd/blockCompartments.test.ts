import { describe, expect, it } from 'vitest';

import {
  createElementRegistry,
  type ConstraintDefinitionElement,
  type ConstraintUsageElement,
  type ModelElement,
  type PartDefinitionElement,
  type PartUsageElement,
  type PortDefinitionElement,
  type ValuePropertyElement,
} from '@/model';
import {
  BDD_BLOCK_COMPARTMENT_DEFAULT_MAX_VISIBLE,
  bddBlockEmptyCompartments,
  computeBddBlockCompartments,
  formatConstraintUsageLabel,
  formatPartUsageLabel,
  formatPortDefinitionLabel,
  formatValuePropertyLabel,
} from '@/viewpoints/bdd/blockCompartments';

import { mkElementId } from '../../model/helpers';

function mkPartDefinition(
  id: string,
  name: string,
  ownerId: string | null = null,
  ownerIndex = 0,
): PartDefinitionElement {
  return {
    kind: 'PartDefinition',
    id: mkElementId(id),
    ownerId: ownerId === null ? null : mkElementId(ownerId),
    ownerRole: 'member',
    ownerIndex,
    name,
    isAbstract: false,
  };
}

function mkPartUsage(
  id: string,
  name: string,
  ownerId: string,
  ownerIndex: number,
  definitionId: string,
): PartUsageElement {
  return {
    kind: 'PartUsage',
    id: mkElementId(id),
    ownerId: mkElementId(ownerId),
    ownerRole: 'member',
    ownerIndex,
    name,
    definitionId: mkElementId(definitionId),
  };
}

function mkPortDefinition(
  id: string,
  name: string,
  ownerId: string,
  ownerIndex: number,
  direction: 'in' | 'out' | 'inout' = 'in',
): PortDefinitionElement {
  return {
    kind: 'PortDefinition',
    id: mkElementId(id),
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
  valueType: 'string' | 'number' | 'boolean',
  defaultValue?: string | number | boolean,
): ValuePropertyElement {
  return {
    kind: 'ValueProperty',
    id: mkElementId(id),
    ownerId: mkElementId(ownerId),
    ownerRole: 'property',
    ownerIndex,
    name,
    valueType,
    defaultValue,
  };
}

function mkConstraintDefinition(
  id: string,
  name: string,
  ownerId: string | null,
  ownerIndex: number,
  expression: string,
): ConstraintDefinitionElement {
  return {
    kind: 'ConstraintDefinition',
    id: mkElementId(id),
    ownerId: ownerId === null ? null : mkElementId(ownerId),
    ownerRole: 'member',
    ownerIndex,
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
    kind: 'ConstraintUsage',
    id: mkElementId(id),
    ownerId: mkElementId(ownerId),
    ownerRole: 'member',
    ownerIndex,
    name,
    definitionId: mkElementId(definitionId),
  };
}

function registryWith(elements: readonly ModelElement[]) {
  const registry = createElementRegistry();
  for (const el of elements) registry.add(el);
  return registry;
}

describe('formatPartUsageLabel', () => {
  it('renders "<name> : <DefinitionName>" when the definition resolves', () => {
    expect(formatPartUsageLabel('engine', 'Engine')).toBe('engine : Engine');
  });

  it('falls back to the name when the definition is missing', () => {
    expect(formatPartUsageLabel('engine', null)).toBe('engine');
  });
});

describe('formatPortDefinitionLabel', () => {
  it('renders "<name> : <direction>"', () => {
    expect(formatPortDefinitionLabel('inlet', 'in')).toBe('inlet : in');
    expect(formatPortDefinitionLabel('outlet', 'out')).toBe('outlet : out');
    expect(formatPortDefinitionLabel('signal', 'inout')).toBe('signal : inout');
  });
});

describe('formatValuePropertyLabel', () => {
  it('renders "<name> : <type>" when no default value', () => {
    expect(formatValuePropertyLabel('mass', 'number', undefined)).toBe(
      'mass : number',
    );
  });

  it('renders "<name> : <type> = <default>" for primitives', () => {
    expect(formatValuePropertyLabel('mass', 'number', 12.5)).toBe(
      'mass : number = 12.5',
    );
    expect(formatValuePropertyLabel('active', 'boolean', true)).toBe(
      'active : boolean = true',
    );
  });

  it('quotes the string literal in the default value', () => {
    expect(formatValuePropertyLabel('label', 'string', 'alpha')).toBe(
      'label : string = "alpha"',
    );
  });
});

describe('formatConstraintUsageLabel', () => {
  it('appends the expression when present', () => {
    expect(formatConstraintUsageLabel('cap', 'mass < 10')).toBe(
      'cap : mass < 10',
    );
  });

  it('falls back to the name when expression is empty / whitespace', () => {
    expect(formatConstraintUsageLabel('cap', '')).toBe('cap');
    expect(formatConstraintUsageLabel('cap', '   ')).toBe('cap');
  });
});

describe('bddBlockEmptyCompartments', () => {
  it('returns the canonical empty shape for every compartment', () => {
    const empty = bddBlockEmptyCompartments();
    expect(empty.parts).toEqual({ items: [], overflow: 0 });
    expect(empty.ports).toEqual({ items: [], overflow: 0 });
    expect(empty.values).toEqual({ items: [], overflow: 0 });
    expect(empty.constraints).toEqual({ items: [], overflow: 0 });
  });
});

describe('computeBddBlockCompartments', () => {
  it('returns empty compartments for a PartDefinition with no children', () => {
    const root = mkPartDefinition('pd-1', 'Tank');
    const registry = registryWith([root]);
    const result = computeBddBlockCompartments(root.id, registry);
    expect(result).toEqual(bddBlockEmptyCompartments());
  });

  it('groups members by kind: parts vs. constraints', () => {
    const root = mkPartDefinition('pd-1', 'Tank');
    const pumpDef = mkPartDefinition('pd-2', 'Pump', null, 1);
    const pumpUsage = mkPartUsage('pu-1', 'pump', root.id, 0, pumpDef.id);
    const valveUsage = mkPartUsage('pu-2', 'valve', root.id, 1, pumpDef.id);
    const constraintDef = mkConstraintDefinition(
      'cd-1',
      'PressureLimit',
      null,
      2,
      'pressure < 100',
    );
    const constraintUsage = mkConstraintUsage(
      'cu-1',
      'limit',
      root.id,
      2,
      constraintDef.id,
    );
    const registry = registryWith([
      root,
      pumpDef,
      pumpUsage,
      valveUsage,
      constraintDef,
      constraintUsage,
    ]);

    const result = computeBddBlockCompartments(root.id, registry);
    expect(result.parts.items).toEqual([
      { id: pumpUsage.id, label: 'pump : Pump' },
      { id: valveUsage.id, label: 'valve : Pump' },
    ]);
    expect(result.parts.overflow).toBe(0);
    expect(result.constraints.items).toEqual([
      { id: constraintUsage.id, label: 'limit : pressure < 100' },
    ]);
    expect(result.constraints.overflow).toBe(0);
  });

  it('collects ports from the "port" ownerRole bucket', () => {
    const root = mkPartDefinition('pd-1', 'Tank');
    const portIn = mkPortDefinition('po-1', 'inlet', root.id, 0, 'in');
    const portOut = mkPortDefinition('po-2', 'outlet', root.id, 1, 'out');
    const registry = registryWith([root, portIn, portOut]);

    const result = computeBddBlockCompartments(root.id, registry);
    expect(result.ports.items).toEqual([
      { id: portIn.id, label: 'inlet : in' },
      { id: portOut.id, label: 'outlet : out' },
    ]);
    expect(result.ports.overflow).toBe(0);
  });

  it('collects values from the "property" ownerRole bucket with formatted defaults', () => {
    const root = mkPartDefinition('pd-1', 'Tank');
    const v1 = mkValueProperty('vp-1', 'mass', root.id, 0, 'number', 12.5);
    const v2 = mkValueProperty('vp-2', 'label', root.id, 1, 'string');
    const registry = registryWith([root, v1, v2]);

    const result = computeBddBlockCompartments(root.id, registry);
    expect(result.values.items).toEqual([
      { id: v1.id, label: 'mass : number = 12.5' },
      { id: v2.id, label: 'label : string' },
    ]);
    expect(result.values.overflow).toBe(0);
  });

  it('respects the default maxVisible cap and reports overflow', () => {
    const root = mkPartDefinition('pd-1', 'Tank');
    const ports = Array.from({ length: 5 }, (_, i) =>
      mkPortDefinition(`po-${i}`, `p${i}`, root.id, i, 'in'),
    );
    const registry = registryWith([root, ...ports]);

    const result = computeBddBlockCompartments(root.id, registry);
    expect(result.ports.items).toHaveLength(
      BDD_BLOCK_COMPARTMENT_DEFAULT_MAX_VISIBLE,
    );
    expect(result.ports.overflow).toBe(
      ports.length - BDD_BLOCK_COMPARTMENT_DEFAULT_MAX_VISIBLE,
    );
  });

  it('honours an explicit maxVisible option', () => {
    const root = mkPartDefinition('pd-1', 'Tank');
    const ports = Array.from({ length: 4 }, (_, i) =>
      mkPortDefinition(`po-${i}`, `p${i}`, root.id, i, 'in'),
    );
    const registry = registryWith([root, ...ports]);

    const result = computeBddBlockCompartments(root.id, registry, {
      maxVisible: 2,
    });
    expect(result.ports.items).toHaveLength(2);
    expect(result.ports.overflow).toBe(2);
  });

  it('preserves ownerIndex ordering inside each compartment', () => {
    const root = mkPartDefinition('pd-1', 'Tank');
    const pumpDef = mkPartDefinition('pd-pump', 'Pump', null, 9);
    // Insert in non-sorted order on purpose.
    const u3 = mkPartUsage('pu-3', 'third', root.id, 2, pumpDef.id);
    const u1 = mkPartUsage('pu-1', 'first', root.id, 0, pumpDef.id);
    const u2 = mkPartUsage('pu-2', 'second', root.id, 1, pumpDef.id);
    const registry = registryWith([root, pumpDef, u3, u1, u2]);

    const result = computeBddBlockCompartments(root.id, registry);
    expect(result.parts.items.map((it) => it.label)).toEqual([
      'first : Pump',
      'second : Pump',
      'third : Pump',
    ]);
  });

  it('falls back to "unknown" for PartUsage with missing definition', () => {
    const root = mkPartDefinition('pd-1', 'Tank');
    const orphan = mkPartUsage('pu-1', 'orphan', root.id, 0, 'pd-missing');
    const registry = registryWith([root, orphan]);

    const result = computeBddBlockCompartments(root.id, registry);
    expect(result.parts.items).toEqual([{ id: orphan.id, label: 'orphan' }]);
  });

  it('handles ConstraintUsage with a missing definition gracefully', () => {
    const root = mkPartDefinition('pd-1', 'Tank');
    const orphan = mkConstraintUsage('cu-1', 'limit', root.id, 0, 'cd-missing');
    const registry = registryWith([root, orphan]);

    const result = computeBddBlockCompartments(root.id, registry);
    expect(result.constraints.items).toEqual([
      { id: orphan.id, label: 'limit' },
    ]);
  });
});
