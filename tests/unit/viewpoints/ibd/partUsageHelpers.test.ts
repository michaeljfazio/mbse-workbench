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
    reg.add({
      id: mkElementId('port-d-fuel'),
      kind: 'PortDefinition',
      name: 'fuel',
      direction: 'in',
    });
    reg.add({
      id: mkElementId('port-d-power'),
      kind: 'PortDefinition',
      name: 'power',
      direction: 'out',
    });
    reg.add({
      id: mkElementId('port-u-fuel'),
      kind: 'PortUsage',
      name: 'fuel',
      definitionId: mkElementId('port-d-fuel'),
    });
    reg.add({
      id: mkElementId('port-u-power'),
      kind: 'PortUsage',
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
      name: 'engine',
      definitionId: mkElementId('pd-1'),
      portUsageIds: [mkElementId('port-u-fuel'), mkElementId('port-u-power')],
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

  it('skips ids that point at missing or wrong-kind elements (defensive)', () => {
    const reg = buildRegistry();
    const partUsage: PartUsageElement = {
      id: mkElementId('pu-1'),
      kind: 'PartUsage',
      name: 'engine',
      definitionId: mkElementId('pd-1'),
      portUsageIds: [
        mkElementId('does-not-exist'),
        mkElementId('port-u-fuel'),
      ],
    };

    const specs = resolvePartHandles({ partUsage, registry: reg });
    expect(specs).toHaveLength(1);
    expect(specs[0]?.label).toBe('fuel');
  });
});
