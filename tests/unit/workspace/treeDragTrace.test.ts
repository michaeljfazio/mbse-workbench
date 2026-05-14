import { describe, expect, it } from 'vitest';

import {
  createElementRegistry,
  type ModelElement,
} from '@/model';
import { resolveTreeDragTrace } from '@/workspace/treeDragTrace';

import { mkElementId } from '../model/helpers';

function mkReq(slug: string): ModelElement {
  return {
    id: mkElementId(slug),
    kind: 'Requirement',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: slug,
    text: '',
    priority: 'medium',
    status: 'draft',
  };
}

function mkBlock(slug: string): ModelElement {
  return {
    id: mkElementId(slug),
    kind: 'PartDefinition',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: slug,
    isAbstract: false,
  };
}

function mkPort(slug: string): ModelElement {
  return {
    id: mkElementId(slug),
    kind: 'PortDefinition',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: slug,
    direction: 'inout',
  };
}

function setup(elements: readonly ModelElement[]) {
  const registry = createElementRegistry();
  for (const el of elements) registry.add(el);
  return registry;
}

describe('resolveTreeDragTrace', () => {
  it('returns null when source or target id is missing', () => {
    const registry = setup([mkReq('R1'), mkBlock('B1')]);
    expect(resolveTreeDragTrace(null, mkElementId('B1'), registry)).toBeNull();
    expect(resolveTreeDragTrace(mkElementId('R1'), null, registry)).toBeNull();
    expect(resolveTreeDragTrace('', '', registry)).toBeNull();
  });

  it('returns null when source is the same as target', () => {
    const registry = setup([mkReq('R1')]);
    expect(
      resolveTreeDragTrace(mkElementId('R1'), mkElementId('R1'), registry),
    ).toBeNull();
  });

  it('returns null when source is not a Requirement', () => {
    const registry = setup([mkBlock('B1'), mkBlock('B2')]);
    expect(
      resolveTreeDragTrace(mkElementId('B1'), mkElementId('B2'), registry),
    ).toBeNull();
  });

  it('returns null when source does not resolve in the registry', () => {
    const registry = setup([mkBlock('B1')]);
    expect(
      resolveTreeDragTrace(mkElementId('missing'), mkElementId('B1'), registry),
    ).toBeNull();
  });

  it('returns null when target does not resolve in the registry', () => {
    const registry = setup([mkReq('R1')]);
    expect(
      resolveTreeDragTrace(mkElementId('R1'), mkElementId('missing'), registry),
    ).toBeNull();
  });

  it('returns null when the target kind is not a trace target (e.g. PortDefinition)', () => {
    const registry = setup([mkReq('R1'), mkPort('P1')]);
    expect(
      resolveTreeDragTrace(mkElementId('R1'), mkElementId('P1'), registry),
    ).toBeNull();
  });

  it('returns satisfy+verify for a Requirement→PartDefinition drag', () => {
    const registry = setup([mkReq('R1'), mkBlock('B1')]);
    const resolved = resolveTreeDragTrace(
      mkElementId('R1'),
      mkElementId('B1'),
      registry,
    );
    expect(resolved).not.toBeNull();
    expect(resolved?.source).toBe(mkElementId('R1'));
    expect(resolved?.target).toBe(mkElementId('B1'));
    expect([...(resolved?.allowedKinds ?? [])]).toEqual(['satisfy', 'verify']);
  });

  it('returns all four kinds for a Requirement→Requirement drag', () => {
    const registry = setup([mkReq('R1'), mkReq('R2')]);
    const resolved = resolveTreeDragTrace(
      mkElementId('R1'),
      mkElementId('R2'),
      registry,
    );
    expect(resolved).not.toBeNull();
    expect([...(resolved?.allowedKinds ?? [])]).toEqual([
      'derive',
      'satisfy',
      'verify',
      'refine',
    ]);
  });
});
