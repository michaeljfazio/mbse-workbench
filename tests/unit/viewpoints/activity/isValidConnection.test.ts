import { describe, expect, it } from 'vitest';
import type { Connection } from '@xyflow/react';

import {
  createElementRegistry,
  type ActionNodeType,
  type ActionUsageElement,
  type ElementRegistry,
  type PartDefinitionElement,
} from '@/model';
import { isValidActivityConnection } from '@/viewpoints/activity/isValidConnection';

import { mkElementId } from '../../model/helpers';

interface ActionSeed {
  readonly id: string;
  readonly nodeType: ActionNodeType;
}

function seed(actions: readonly ActionSeed[]): ElementRegistry {
  const registry = createElementRegistry();
  for (const a of actions) {
    const action: ActionUsageElement = {
      id: mkElementId(a.id),
      kind: 'ActionUsage',
      name: a.id,
      nodeType: a.nodeType,
    };
    registry.add(action);
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

describe('isValidActivityConnection', () => {
  it('accepts action → action', () => {
    const registry = seed([
      { id: 'a1', nodeType: 'action' },
      { id: 'a2', nodeType: 'action' },
    ]);
    expect(isValidActivityConnection(conn('a1', 'a2'), registry)).toBe(true);
  });

  it('accepts initial → action (initial as source is allowed)', () => {
    const registry = seed([
      { id: 'i1', nodeType: 'initial' },
      { id: 'a1', nodeType: 'action' },
    ]);
    expect(isValidActivityConnection(conn('i1', 'a1'), registry)).toBe(true);
  });

  it('accepts action → final (final as target is allowed)', () => {
    const registry = seed([
      { id: 'a1', nodeType: 'action' },
      { id: 'f1', nodeType: 'final' },
    ]);
    expect(isValidActivityConnection(conn('a1', 'f1'), registry)).toBe(true);
  });

  it('accepts action → decision → action chain endpoints', () => {
    const registry = seed([
      { id: 'a1', nodeType: 'action' },
      { id: 'd1', nodeType: 'decision' },
      { id: 'a2', nodeType: 'action' },
    ]);
    expect(isValidActivityConnection(conn('a1', 'd1'), registry)).toBe(true);
    expect(isValidActivityConnection(conn('d1', 'a2'), registry)).toBe(true);
  });

  it.each(['action', 'decision', 'fork', 'join', 'merge', 'final'] as const)(
    'rejects %s → initial (initial cannot be a flow target)',
    (sourceNodeType) => {
      const registry = seed([
        { id: 'src', nodeType: sourceNodeType },
        { id: 'i1', nodeType: 'initial' },
      ]);
      expect(isValidActivityConnection(conn('src', 'i1'), registry)).toBe(
        false,
      );
    },
  );

  it.each(['action', 'decision', 'fork', 'join', 'merge', 'initial'] as const)(
    'rejects final → %s (final cannot be a flow source)',
    (targetNodeType) => {
      const registry = seed([
        { id: 'f1', nodeType: 'final' },
        { id: 'tgt', nodeType: targetNodeType },
      ]);
      expect(isValidActivityConnection(conn('f1', 'tgt'), registry)).toBe(
        false,
      );
    },
  );

  it('rejects self-loops', () => {
    const registry = seed([{ id: 'a1', nodeType: 'action' }]);
    expect(isValidActivityConnection(conn('a1', 'a1'), registry)).toBe(false);
  });

  it('rejects connection when source id does not resolve', () => {
    const registry = seed([{ id: 'a1', nodeType: 'action' }]);
    expect(isValidActivityConnection(conn('ghost', 'a1'), registry)).toBe(
      false,
    );
  });

  it('rejects connection when target id does not resolve', () => {
    const registry = seed([{ id: 'a1', nodeType: 'action' }]);
    expect(isValidActivityConnection(conn('a1', 'ghost'), registry)).toBe(
      false,
    );
  });

  it('rejects connection when endpoint is not an ActionUsage', () => {
    const registry = createElementRegistry();
    const action: ActionUsageElement = {
      id: mkElementId('a1'),
      kind: 'ActionUsage',
      name: 'a1',
      nodeType: 'action',
    };
    const block: PartDefinitionElement = {
      id: mkElementId('b1'),
      kind: 'PartDefinition',
      name: 'Block',
      isAbstract: false,
      propertyIds: [],
      portIds: [],
    };
    registry.add(action);
    registry.add(block);
    expect(isValidActivityConnection(conn('a1', 'b1'), registry)).toBe(false);
    expect(isValidActivityConnection(conn('b1', 'a1'), registry)).toBe(false);
  });

  it('rejects when source or target is null/empty', () => {
    const registry = seed([{ id: 'a1', nodeType: 'action' }]);
    // React Flow can emit Connection-shaped objects with nullable endpoints
    // during in-progress drags; cast through unknown to exercise that branch.
    const nullSource = {
      source: null,
      target: 'a1',
      sourceHandle: null,
      targetHandle: 'top',
    } as unknown as Connection;
    const nullTarget = {
      source: 'a1',
      target: null,
      sourceHandle: 'bottom',
      targetHandle: null,
    } as unknown as Connection;
    expect(isValidActivityConnection(nullSource, registry)).toBe(false);
    expect(isValidActivityConnection(nullTarget, registry)).toBe(false);
  });
});
