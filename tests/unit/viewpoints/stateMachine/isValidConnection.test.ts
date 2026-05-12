import { describe, expect, it } from 'vitest';
import type { Connection } from '@xyflow/react';

import {
  createElementRegistry,
  type ElementRegistry,
  type PartDefinitionElement,
  type RequirementElement,
  type StateNodeType,
  type StateUsageElement,
} from '@/model';
import { isValidStateMachineConnection } from '@/viewpoints/stateMachine/connection';

import { mkElementId } from '../../model/helpers';

interface StateSeed {
  readonly id: string;
  readonly stateType: StateNodeType;
}

function seed(states: readonly StateSeed[]): ElementRegistry {
  const registry = createElementRegistry();
  for (const s of states) {
    const state: StateUsageElement = {
      id: mkElementId(s.id),
      kind: 'StateUsage',
      name: s.id,
      stateType: s.stateType,
    };
    registry.add(state);
  }
  return registry;
}

function conn(sourceId: string, targetId: string): Connection {
  return {
    source: mkElementId(sourceId) as unknown as string,
    target: mkElementId(targetId) as unknown as string,
    sourceHandle: 'bottom',
    targetHandle: 'top',
  };
}

describe('isValidStateMachineConnection', () => {
  it('accepts state → state', () => {
    const registry = seed([
      { id: 's1', stateType: 'state' },
      { id: 's2', stateType: 'state' },
    ]);
    expect(isValidStateMachineConnection(conn('s1', 's2'), registry)).toBe(true);
  });

  it('accepts initial → state (initial as source is allowed)', () => {
    const registry = seed([
      { id: 'i1', stateType: 'initial' },
      { id: 's1', stateType: 'state' },
    ]);
    expect(isValidStateMachineConnection(conn('i1', 's1'), registry)).toBe(true);
  });

  it('accepts state → final (final as target is allowed)', () => {
    const registry = seed([
      { id: 's1', stateType: 'state' },
      { id: 'f1', stateType: 'final' },
    ]);
    expect(isValidStateMachineConnection(conn('s1', 'f1'), registry)).toBe(true);
  });

  it.each(['state', 'final'] as const)(
    'rejects %s → initial (initial cannot be a transition target)',
    (sourceStateType) => {
      const registry = seed([
        { id: 'src', stateType: sourceStateType },
        { id: 'i1', stateType: 'initial' },
      ]);
      expect(isValidStateMachineConnection(conn('src', 'i1'), registry)).toBe(
        false,
      );
    },
  );

  it('rejects initial → initial (also: initial cannot be target)', () => {
    const registry = seed([
      { id: 'i1', stateType: 'initial' },
      { id: 'i2', stateType: 'initial' },
    ]);
    expect(isValidStateMachineConnection(conn('i1', 'i2'), registry)).toBe(false);
  });

  it.each(['state', 'initial'] as const)(
    'rejects final → %s (final cannot be a transition source)',
    (targetStateType) => {
      const registry = seed([
        { id: 'f1', stateType: 'final' },
        { id: 'tgt', stateType: targetStateType },
      ]);
      expect(isValidStateMachineConnection(conn('f1', 'tgt'), registry)).toBe(
        false,
      );
    },
  );

  it('rejects final → final', () => {
    const registry = seed([
      { id: 'f1', stateType: 'final' },
      { id: 'f2', stateType: 'final' },
    ]);
    expect(isValidStateMachineConnection(conn('f1', 'f2'), registry)).toBe(false);
  });

  it('rejects self-loops', () => {
    const registry = seed([{ id: 's1', stateType: 'state' }]);
    expect(isValidStateMachineConnection(conn('s1', 's1'), registry)).toBe(false);
  });

  it('rejects connection when source id does not resolve', () => {
    const registry = seed([{ id: 's1', stateType: 'state' }]);
    expect(isValidStateMachineConnection(conn('ghost', 's1'), registry)).toBe(
      false,
    );
  });

  it('rejects connection when target id does not resolve', () => {
    const registry = seed([{ id: 's1', stateType: 'state' }]);
    expect(isValidStateMachineConnection(conn('s1', 'ghost'), registry)).toBe(
      false,
    );
  });

  it('rejects when source endpoint is not a StateUsage (PartDefinition)', () => {
    const registry = createElementRegistry();
    const state: StateUsageElement = {
      id: mkElementId('s1'),
      kind: 'StateUsage',
      name: 's1',
      stateType: 'state',
    };
    const block: PartDefinitionElement = {
      id: mkElementId('b1'),
      kind: 'PartDefinition',
      name: 'Block',
      isAbstract: false,
      propertyIds: [],
      portIds: [],
    };
    registry.add(state);
    registry.add(block);
    expect(isValidStateMachineConnection(conn('b1', 's1'), registry)).toBe(false);
    expect(isValidStateMachineConnection(conn('s1', 'b1'), registry)).toBe(false);
  });

  it('rejects when endpoint is a Requirement (foreign kind)', () => {
    const registry = createElementRegistry();
    const state: StateUsageElement = {
      id: mkElementId('s1'),
      kind: 'StateUsage',
      name: 's1',
      stateType: 'state',
    };
    const requirement: RequirementElement = {
      id: mkElementId('r1'),
      kind: 'Requirement',
      name: 'R1',
      text: '',
      priority: 'medium',
      status: 'draft',
    };
    registry.add(state);
    registry.add(requirement);
    expect(isValidStateMachineConnection(conn('r1', 's1'), registry)).toBe(false);
    expect(isValidStateMachineConnection(conn('s1', 'r1'), registry)).toBe(false);
  });

  it('rejects when source or target is null/empty', () => {
    const registry = seed([{ id: 's1', stateType: 'state' }]);
    const nullSource = {
      source: null,
      target: 's1',
      sourceHandle: null,
      targetHandle: 'top',
    } as unknown as Connection;
    const nullTarget = {
      source: 's1',
      target: null,
      sourceHandle: 'bottom',
      targetHandle: null,
    } as unknown as Connection;
    expect(isValidStateMachineConnection(nullSource, registry)).toBe(false);
    expect(isValidStateMachineConnection(nullTarget, registry)).toBe(false);
  });
});
