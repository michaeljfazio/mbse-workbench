import { describe, expect, it } from 'vitest';

import { ELEMENT_KINDS } from '@/model';
import { acceptedChildKinds } from '@/workspace/tree/childAcceptance';

describe('acceptedChildKinds', () => {
  it('Package accepts all the top-level definition kinds + Requirement + Actor + UseCase', () => {
    const kinds = acceptedChildKinds('Package').map((o) => o.kind);
    expect(kinds).toEqual([
      'Package',
      'PartDefinition',
      'InterfaceDefinition',
      'PortDefinition',
      'ActionDefinition',
      'StateDefinition',
      'ConstraintDefinition',
      'Requirement',
      'Actor',
      'UseCase',
    ]);
    for (const opt of acceptedChildKinds('Package')) {
      expect(opt.ownerRole).toBe('member');
    }
  });

  it('PartDefinition accepts Port (ownerRole: port) and ValueProperty (ownerRole: property)', () => {
    expect(acceptedChildKinds('PartDefinition')).toEqual([
      { kind: 'PortDefinition', ownerRole: 'port', label: 'Port' },
      { kind: 'ValueProperty', ownerRole: 'property', label: 'Value Property' },
    ]);
  });

  it('InterfaceDefinition accepts Port (ownerRole: portDefinition)', () => {
    expect(acceptedChildKinds('InterfaceDefinition')).toEqual([
      { kind: 'PortDefinition', ownerRole: 'portDefinition', label: 'Port' },
    ]);
  });

  it('ActionDefinition accepts Parameter (ValueProperty, ownerRole: parameter)', () => {
    expect(acceptedChildKinds('ActionDefinition')).toEqual([
      { kind: 'ValueProperty', ownerRole: 'parameter', label: 'Parameter' },
    ]);
  });

  it('ConstraintDefinition accepts Parameter (ValueProperty, ownerRole: parameter)', () => {
    expect(acceptedChildKinds('ConstraintDefinition')).toEqual([
      { kind: 'ValueProperty', ownerRole: 'parameter', label: 'Parameter' },
    ]);
  });

  it('Usage kinds and edge-like kinds are not free-standing tree containers', () => {
    const nonContainers = [
      'PartUsage',
      'PortUsage',
      'ConnectionUsage',
      'ItemFlow',
      'ActionUsage',
      'StateUsage',
      'Transition',
      'ConstraintUsage',
      'ValueProperty',
      'PortDefinition',
      'Requirement',
      'Actor',
      'UseCase',
      'StateDefinition',
    ] as const;
    for (const k of nonContainers) {
      expect(acceptedChildKinds(k)).toEqual([]);
    }
  });

  it('every element kind has a deterministic acceptance result (no undefined branches)', () => {
    for (const kind of ELEMENT_KINDS) {
      const out = acceptedChildKinds(kind);
      expect(Array.isArray(out)).toBe(true);
    }
  });
});
