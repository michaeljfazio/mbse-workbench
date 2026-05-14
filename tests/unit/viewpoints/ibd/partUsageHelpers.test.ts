import { Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { createElementRegistry, type PartUsageElement } from '@/model';
import {
  HANDLE_TYPE_BY_DIRECTION,
  placeHandle,
  resolvePartHandles,
} from '@/viewpoints';

import { mkElementId } from '../../model/helpers';

describe('placeHandle', () => {
  it('alternates between left and right by index', () => {
    expect(placeHandle(0, 4).position).toBe(Position.Left);
    expect(placeHandle(1, 4).position).toBe(Position.Right);
    expect(placeHandle(2, 4).position).toBe(Position.Left);
    expect(placeHandle(3, 4).position).toBe(Position.Right);
  });

  it('spaces handles evenly within each side', () => {
    // Four ports → two on each side at 25% and 75%.
    expect(placeHandle(0, 4).top).toBeCloseTo(25);
    expect(placeHandle(1, 4).top).toBeCloseTo(25);
    expect(placeHandle(2, 4).top).toBeCloseTo(75);
    expect(placeHandle(3, 4).top).toBeCloseTo(75);
  });

  it('centers a single port at 50% on the left', () => {
    expect(placeHandle(0, 1)).toEqual({ position: Position.Left, top: 50 });
  });

  it('falls back to a left-center handle for empty port lists', () => {
    expect(placeHandle(0, 0)).toEqual({ position: Position.Left, top: 50 });
  });
});

describe('HANDLE_TYPE_BY_DIRECTION', () => {
  it('maps in → target, out → source, inout → source', () => {
    expect(HANDLE_TYPE_BY_DIRECTION.in).toBe('target');
    expect(HANDLE_TYPE_BY_DIRECTION.out).toBe('source');
    expect(HANDLE_TYPE_BY_DIRECTION.inout).toBe('source');
  });
});

describe('resolvePartHandles', () => {
  function buildRegistry() {
    const reg = createElementRegistry();
    const puId = mkElementId('pu-1');
    reg.add({
      id: mkElementId('port-d-fuel'),
      kind: 'PortDefinition',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'fuel',
      direction: 'in',
    });
    reg.add({
      id: mkElementId('port-d-power'),
      kind: 'PortDefinition',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 1,
      name: 'power',
      direction: 'out',
    });
    reg.add({
      id: mkElementId('port-u-fuel'),
      kind: 'PortUsage',
      ownerId: puId,
      ownerRole: 'port',
      ownerIndex: 0,
      name: 'fuel',
      definitionId: mkElementId('port-d-fuel'),
    });
    reg.add({
      id: mkElementId('port-u-power'),
      kind: 'PortUsage',
      ownerId: puId,
      ownerRole: 'port',
      ownerIndex: 1,
      name: 'power',
      definitionId: mkElementId('port-d-power'),
    });
    return reg;
  }

  it('returns one spec per PortUsage in order with label + direction from the PortDefinition', () => {
    const reg = buildRegistry();
    const partUsage: PartUsageElement = {
      id: mkElementId('pu-1'),
      kind: 'PartUsage',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'engine',
      definitionId: mkElementId('pd-1'),
    };

    const specs = resolvePartHandles({ partUsage, registry: reg });

    expect(specs).toEqual([
      {
        portUsageId: mkElementId('port-u-fuel'),
        portDefinitionId: mkElementId('port-d-fuel'),
        label: 'fuel',
        direction: 'in',
      },
      {
        portUsageId: mkElementId('port-u-power'),
        portDefinitionId: mkElementId('port-d-power'),
        label: 'power',
        direction: 'out',
      },
    ]);
  });

  it('skips children whose PortDefinition is missing or wrong-kind (defensive)', () => {
    const reg = buildRegistry();
    // Add a third PortUsage under pu-1 whose definitionId points at nothing.
    reg.add({
      id: mkElementId('port-u-orphan'),
      kind: 'PortUsage',
      ownerId: mkElementId('pu-1'),
      ownerRole: 'port',
      ownerIndex: 2,
      name: 'orphan',
      definitionId: mkElementId('does-not-exist'),
    });
    const partUsage: PartUsageElement = {
      id: mkElementId('pu-1'),
      kind: 'PartUsage',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      name: 'engine',
      definitionId: mkElementId('pd-1'),
    };

    const specs = resolvePartHandles({ partUsage, registry: reg });
    // fuel + power resolve; orphan is dropped because its PortDefinition is missing.
    expect(specs).toHaveLength(2);
    expect(specs.map((s) => s.label)).toEqual(['fuel', 'power']);
  });
});
