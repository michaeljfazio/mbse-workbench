import { describe, expect, it } from 'vitest';

import {
  createElementRegistry,
  type ModelElement,
} from '@/model';
import {
  allowedUseCaseEdgeKindsFor,
  defaultUseCaseEdgeKindFor,
  isValidUseCaseConnection,
} from '@/viewpoints';

import { mkElementId } from '../../model/helpers';

function mkActor(idSlug: string): ModelElement {
  return {
    id: mkElementId(idSlug),
    kind: 'Actor',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: idSlug,
  };
}

function mkUseCase(idSlug: string): ModelElement {
  return {
    id: mkElementId(idSlug),
    kind: 'UseCase',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: idSlug,
  };
}

function mkBlock(idSlug: string): ModelElement {
  return {
    id: mkElementId(idSlug),
    kind: 'PartDefinition',
    ownerId: null,
    ownerRole: 'member',
    ownerIndex: 0,
    name: idSlug,
    isAbstract: false,
  };
}

function setup(elements: readonly ModelElement[]) {
  const registry = createElementRegistry();
  for (const el of elements) registry.add(el);
  return registry;
}

describe('isValidUseCaseConnection (ADR 0007 § 4)', () => {
  it('accepts UseCase → UseCase', () => {
    const a = mkUseCase('uc-a');
    const b = mkUseCase('uc-b');
    const registry = setup([a, b]);
    expect(
      isValidUseCaseConnection({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null }, registry),
    ).toBe(true);
  });

  it('accepts Actor → Actor', () => {
    const a = mkActor('actor-a');
    const b = mkActor('actor-b');
    const registry = setup([a, b]);
    expect(
      isValidUseCaseConnection({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null }, registry),
    ).toBe(true);
  });

  it('accepts Actor ↔ UseCase in both directions (phase-15 #517 Association)', () => {
    const actor = mkActor('actor');
    const useCase = mkUseCase('uc');
    const registry = setup([actor, useCase]);
    expect(
      isValidUseCaseConnection({ source: actor.id, target: useCase.id, sourceHandle: null, targetHandle: null }, registry),
    ).toBe(true);
    expect(
      isValidUseCaseConnection({ source: useCase.id, target: actor.id, sourceHandle: null, targetHandle: null }, registry),
    ).toBe(true);
  });

  it('rejects self-loops', () => {
    const a = mkUseCase('uc-a');
    const registry = setup([a]);
    expect(
      isValidUseCaseConnection({ source: a.id, target: a.id, sourceHandle: null, targetHandle: null }, registry),
    ).toBe(false);
  });

  it('rejects unknown endpoints and non-Actor/UseCase elements', () => {
    const a = mkUseCase('uc-a');
    const b = mkBlock('block-b');
    const registry = setup([a, b]);
    expect(
      isValidUseCaseConnection({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null }, registry),
    ).toBe(false);
  });
});

describe('defaultUseCaseEdgeKindFor', () => {
  it('UseCase↔UseCase → Include', () => {
    expect(defaultUseCaseEdgeKindFor(mkUseCase('a'), mkUseCase('b'))).toBe(
      'Include',
    );
  });
  it('Actor↔Actor → Generalization', () => {
    expect(defaultUseCaseEdgeKindFor(mkActor('a'), mkActor('b'))).toBe(
      'Generalization',
    );
  });
  it('Actor → UseCase → Association (phase-15 #517)', () => {
    expect(defaultUseCaseEdgeKindFor(mkActor('a'), mkUseCase('b'))).toBe(
      'Association',
    );
  });
  it('UseCase → Actor → Association (phase-15 #517)', () => {
    expect(defaultUseCaseEdgeKindFor(mkUseCase('a'), mkActor('b'))).toBe(
      'Association',
    );
  });
});

describe('allowedUseCaseEdgeKindsFor', () => {
  it('UseCase↔UseCase allows Include + Extend + Generalization', () => {
    expect(allowedUseCaseEdgeKindsFor(mkUseCase('a'), mkUseCase('b'))).toEqual([
      'Include',
      'Extend',
      'Generalization',
    ]);
  });
  it('Actor↔Actor only allows Generalization', () => {
    expect(allowedUseCaseEdgeKindsFor(mkActor('a'), mkActor('b'))).toEqual([
      'Generalization',
    ]);
  });
  it('Actor → UseCase allows Association (phase-15 #517)', () => {
    expect(allowedUseCaseEdgeKindsFor(mkActor('a'), mkUseCase('b'))).toEqual([
      'Association',
    ]);
  });
  it('UseCase → Actor allows Association (phase-15 #517)', () => {
    expect(allowedUseCaseEdgeKindsFor(mkUseCase('a'), mkActor('b'))).toEqual([
      'Association',
    ]);
  });
});
