import { describe, it, expect, beforeEach } from 'vitest';
import {
  EDGE_KINDS,
  ELEMENT_KINDS,
  type EdgeKind,
  type ElementKind,
  type ModelEdge,
  type ModelElement,
  type ProjectId,
} from '@/model';
import {
  createInMemorySessionRepository,
  EMPTY_COMMAND_HISTORY,
  ProjectNotFoundError,
  StorageQuotaError,
  type Project,
} from '@/repository';
import type { Command, UndoEntry } from '@/commands';
import { mkElementId, mkEdgeId, mkUserId } from '../../../tests/unit/model/helpers';

function createFakeStorage(): Storage {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string): string | null {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    key(index: number): string | null {
      const keys = Array.from(map.keys());
      return index >= 0 && index < keys.length ? (keys[index] as string) : null;
    },
    removeItem(key: string): void {
      map.delete(key);
    },
    setItem(key: string, value: string): void {
      map.set(key, value);
    },
  };
  return storage;
}

const A = mkElementId('A');
const B = mkElementId('B');

function elementOf(kind: ElementKind, id: string): ModelElement {
  const base = { id: mkElementId(id), name: `${kind}-${id}` };
  switch (kind) {
    case 'Package':
      return { ...base, kind: 'Package', memberIds: [A, B] };
    case 'PartDefinition':
      return {
        ...base,
        kind: 'PartDefinition',
        isAbstract: false,
        propertyIds: [],
        portIds: [],
      };
    case 'PartUsage':
      return {
        ...base,
        kind: 'PartUsage',
        definitionId: A,
        portUsageIds: [],
        multiplicity: '1..*',
      };
    case 'PortDefinition':
      return { ...base, kind: 'PortDefinition', direction: 'inout' };
    case 'PortUsage':
      return { ...base, kind: 'PortUsage', definitionId: A };
    case 'InterfaceDefinition':
      return { ...base, kind: 'InterfaceDefinition', portDefinitionIds: [A] };
    case 'ConnectionUsage':
      return { ...base, kind: 'ConnectionUsage', sourceId: A, targetId: B };
    case 'ItemFlow':
      return {
        ...base,
        kind: 'ItemFlow',
        sourceId: A,
        targetId: B,
        itemType: 'Signal',
      };
    case 'Requirement':
      return {
        ...base,
        kind: 'Requirement',
        text: 'must do thing',
        reqId: 'R-1',
        priority: 'high',
        status: 'approved',
        rationale: 'because',
      };
    case 'ActionDefinition':
      return { ...base, kind: 'ActionDefinition', parameterIds: [] };
    case 'ActionUsage':
      return {
        ...base,
        kind: 'ActionUsage',
        definitionId: A,
        nodeType: 'action',
      };
    case 'StateDefinition':
      return { ...base, kind: 'StateDefinition', isComposite: true };
    case 'StateUsage':
      return {
        ...base,
        kind: 'StateUsage',
        stateType: 'state',
        entryAction: 'enter',
        exitAction: 'leave',
        doAction: 'do',
      };
    case 'Transition':
      return {
        ...base,
        kind: 'Transition',
        sourceId: A,
        targetId: B,
        trigger: 'tick',
        guard: 'x > 0',
        effect: 'fire()',
      };
    case 'UseCase':
      return { ...base, kind: 'UseCase', text: 'do business' };
    case 'Actor':
      return { ...base, kind: 'Actor' };
    case 'ConstraintDefinition':
      return {
        ...base,
        kind: 'ConstraintDefinition',
        expression: 'x + y = z',
        parameterIds: [],
      };
    case 'ConstraintUsage':
      return { ...base, kind: 'ConstraintUsage', definitionId: A };
    case 'ValueProperty':
      return {
        ...base,
        kind: 'ValueProperty',
        valueType: 'number',
        defaultValue: 42,
      };
  }
}

function edgeOf(kind: EdgeKind, id: string): ModelEdge {
  const base = {
    id: mkEdgeId(id),
    sourceId: A,
    targetId: B,
    label: `${kind}-label`,
  };
  switch (kind) {
    case 'Composition':
      return { ...base, kind: 'Composition' };
    case 'Generalization':
      return { ...base, kind: 'Generalization' };
    case 'RequirementTrace':
      return { ...base, kind: 'RequirementTrace', traceKind: 'satisfy' };
    case 'ControlFlow':
      return { ...base, kind: 'ControlFlow', guard: 'x > 0' };
    case 'ObjectFlow':
      return { ...base, kind: 'ObjectFlow', itemType: 'Signal' };
    case 'Include':
      return { ...base, kind: 'Include' };
    case 'Extend':
      return { ...base, kind: 'Extend', extensionPoint: 'failure' };
    case 'ParameterBinding':
      return { ...base, kind: 'ParameterBinding' };
    case 'PackageImport':
      return { ...base, kind: 'PackageImport' };
  }
}

function projectWithEverything(id: string): Project {
  return {
    id: id as ProjectId,
    name: `project-${id}`,
    createdAt: '2026-05-11T10:00:00.000Z',
    modifiedAt: '2026-05-11T10:05:00.000Z',
    elements: ELEMENT_KINDS.map((kind, i) => elementOf(kind, `e-${i}`)),
    edges: EDGE_KINDS.map((kind, i) => edgeOf(kind, `g-${i}`)),
    diagrams: [],
    history: EMPTY_COMMAND_HISTORY,
    conversations: [],
  };
}

describe('InMemorySessionRepository', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createFakeStorage();
  });

  it('round-trips every ElementKind through save/load', async () => {
    const repo = createInMemorySessionRepository({ storage });
    const project = projectWithEverything('p1');
    await repo.save(project);
    const loaded = await repo.load(project.id);

    expect(loaded.elements).toHaveLength(ELEMENT_KINDS.length);
    for (const kind of ELEMENT_KINDS) {
      expect(loaded.elements.some((e) => e.kind === kind)).toBe(true);
    }
    expect(loaded).toEqual(project);
  });

  it('round-trips every EdgeKind through save/load', async () => {
    const repo = createInMemorySessionRepository({ storage });
    const project = projectWithEverything('p1');
    await repo.save(project);
    const loaded = await repo.load(project.id);

    expect(loaded.edges).toHaveLength(EDGE_KINDS.length);
    for (const kind of EDGE_KINDS) {
      expect(loaded.edges.some((e) => e.kind === kind)).toBe(true);
    }
  });

  it('list returns metadata for every stored project, without element/edge arrays', async () => {
    const repo = createInMemorySessionRepository({ storage });
    await repo.save(projectWithEverything('p1'));
    await repo.save({
      id: 'p2' as ProjectId,
      name: 'project-p2',
      createdAt: '2026-05-11T11:00:00.000Z',
      modifiedAt: '2026-05-11T11:05:00.000Z',
      elements: [],
      edges: [],
      diagrams: [],
      history: EMPTY_COMMAND_HISTORY,
      conversations: [],
    });

    const metadata = await repo.list();
    expect(metadata).toHaveLength(2);
    const ids = metadata.map((m) => m.id).sort();
    expect(ids).toEqual(['p1', 'p2']);

    for (const m of metadata) {
      expect(m).toEqual({
        id: m.id,
        name: m.name,
        createdAt: m.createdAt,
        modifiedAt: m.modifiedAt,
      });
      expect('elements' in m).toBe(false);
      expect('edges' in m).toBe(false);
    }
  });

  it('list returns an empty array when no projects are stored', async () => {
    const repo = createInMemorySessionRepository({ storage });
    expect(await repo.list()).toEqual([]);
  });

  it('list ignores keys outside the mbse:v1:project: prefix', async () => {
    storage.setItem('unrelated:key', 'noise');
    storage.setItem('mbse:v1:other:foo', '{"id":"foo"}');
    const repo = createInMemorySessionRepository({ storage });
    await repo.save(projectWithEverything('p1'));
    const metadata = await repo.list();
    expect(metadata).toHaveLength(1);
    expect(metadata[0]?.id).toBe('p1');
  });

  it('load rejects with ProjectNotFoundError for an unknown id', async () => {
    const repo = createInMemorySessionRepository({ storage });
    await expect(repo.load('nope' as ProjectId)).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });

  it('save writes under the mbse:v1:project:<id> key', async () => {
    const repo = createInMemorySessionRepository({ storage });
    const project = projectWithEverything('p1');
    await repo.save(project);
    const raw = storage.getItem('mbse:v1:project:p1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.id).toBe('p1');
    expect(parsed.name).toBe('project-p1');
  });

  it('save replaces the existing project at the same id', async () => {
    const repo = createInMemorySessionRepository({ storage });
    const first = projectWithEverything('p1');
    await repo.save(first);

    const updated: Project = {
      ...first,
      name: 'renamed',
      modifiedAt: '2026-05-11T12:00:00.000Z',
      elements: [],
      edges: [],
      diagrams: [],
      history: EMPTY_COMMAND_HISTORY,
      conversations: [],
    };
    await repo.save(updated);

    const loaded = await repo.load(first.id);
    expect(loaded.name).toBe('renamed');
    expect(loaded.elements).toEqual([]);
    expect(loaded.edges).toEqual([]);
    expect(await repo.list()).toHaveLength(1);
  });

  it('save wraps QuotaExceededError as StorageQuotaError', async () => {
    const failing: Storage = {
      ...createFakeStorage(),
      setItem() {
        const err = new Error('quota');
        err.name = 'QuotaExceededError';
        throw err;
      },
    };
    const repo = createInMemorySessionRepository({ storage: failing });
    await expect(repo.save(projectWithEverything('p1'))).rejects.toBeInstanceOf(
      StorageQuotaError,
    );
  });

  it('createdAt and modifiedAt remain ISO strings after round-trip', async () => {
    const repo = createInMemorySessionRepository({ storage });
    const project = projectWithEverything('p1');
    await repo.save(project);
    const loaded = await repo.load(project.id);
    expect(typeof loaded.createdAt).toBe('string');
    expect(typeof loaded.modifiedAt).toBe('string');
    expect(() => new Date(loaded.createdAt).toISOString()).not.toThrow();
    expect(loaded.createdAt).toBe('2026-05-11T10:00:00.000Z');
  });

  it('load rejects with ProjectNotFoundError when stored JSON is malformed', async () => {
    storage.setItem('mbse:v1:project:p1', '{ not json');
    const repo = createInMemorySessionRepository({ storage });
    await expect(repo.load('p1' as ProjectId)).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });

  it('round-trips Diagram.context for IBD diagrams (#49)', async () => {
    const repo = createInMemorySessionRepository({ storage });
    const partId = mkElementId('engine');
    const ibdDiagramId =
      'ibd-1' as unknown as Project['diagrams'][number]['id'];
    const project: Project = {
      id: 'p-ibd' as ProjectId,
      name: 'p-ibd',
      createdAt: '2026-05-12T10:00:00.000Z',
      modifiedAt: '2026-05-12T10:05:00.000Z',
      elements: [],
      edges: [],
      diagrams: [
        {
          id: ibdDiagramId,
          viewpointId: 'ibd' as Project['diagrams'][number]['viewpointId'],
          name: 'Engine IBD',
          positions: {},
          context: { kind: 'partDefinition', id: partId },
        },
      ],
      history: EMPTY_COMMAND_HISTORY,
      conversations: [],
    };
    await repo.save(project);
    const loaded = await repo.load(project.id);
    expect(loaded.diagrams).toHaveLength(1);
    expect(loaded.diagrams[0]?.context).toEqual({
      kind: 'partDefinition',
      id: partId,
    });
  });

  it('forward-compat: pre-#49 stored diagrams (no `context` field) load with context undefined', async () => {
    storage.setItem(
      'mbse:v1:project:legacy-no-context',
      JSON.stringify({
        id: 'legacy-no-context',
        name: 'legacy',
        createdAt: '2026-05-11T10:00:00.000Z',
        modifiedAt: '2026-05-11T10:05:00.000Z',
        elements: [],
        edges: [],
        diagrams: [
          {
            id: 'd1',
            viewpointId: 'bdd',
            name: 'Main BDD',
            positions: {},
          },
        ],
        history: { undo: [], redo: [] },
      }),
    );
    const repo = createInMemorySessionRepository({ storage });
    const loaded = await repo.load('legacy-no-context' as ProjectId);
    expect(loaded.diagrams).toHaveLength(1);
    expect(loaded.diagrams[0]?.context).toBeUndefined();
  });

  it('round-trips diagrams and per-diagram positions', async () => {
    const repo = createInMemorySessionRepository({ storage });
    const project: Project = {
      id: 'p1' as ProjectId,
      name: 'p1',
      createdAt: '2026-05-11T10:00:00.000Z',
      modifiedAt: '2026-05-11T10:05:00.000Z',
      elements: [],
      edges: [],
      diagrams: [
        {
          id: 'd1' as unknown as Project['diagrams'][number]['id'],
          viewpointId: 'bdd' as Project['diagrams'][number]['viewpointId'],
          name: 'Main BDD',
          positions: {
            [mkElementId('a')]: { x: 100, y: 200 },
            [mkElementId('b')]: { x: 300, y: 400 },
          },
        },
      ],
      history: EMPTY_COMMAND_HISTORY,
      conversations: [],
    };
    await repo.save(project);
    const loaded = await repo.load(project.id);
    expect(loaded.diagrams).toHaveLength(1);
    expect(loaded.diagrams[0]?.positions[mkElementId('a')]).toEqual({
      x: 100,
      y: 200,
    });
    expect(loaded.diagrams[0]?.positions[mkElementId('b')]).toEqual({
      x: 300,
      y: 400,
    });
  });

  it('defaults `diagrams` to an empty array when missing from stored JSON', async () => {
    // Simulate an older persisted entry that pre-dates the diagrams field.
    storage.setItem(
      'mbse:v1:project:legacy',
      JSON.stringify({
        id: 'legacy',
        name: 'legacy',
        createdAt: '2026-05-11T10:00:00.000Z',
        modifiedAt: '2026-05-11T10:05:00.000Z',
        elements: [],
        edges: [],
      }),
    );
    const repo = createInMemorySessionRepository({ storage });
    const loaded = await repo.load('legacy' as ProjectId);
    expect(loaded.diagrams).toEqual([]);
  });

  it('round-trips command history losslessly', async () => {
    const repo = createInMemorySessionRepository({ storage });
    const elementId = mkElementId('h-block');
    const createBlock: Command = {
      kind: 'create-element',
      element: {
        id: elementId,
        kind: 'PartDefinition',
        name: 'Block-with-history',
        isAbstract: false,
        propertyIds: [],
        portIds: [],
      },
    };
    const deleteBlock: Command = { kind: 'delete-element', id: elementId };
    const entry: UndoEntry = {
      actor: { id: mkUserId('alice'), displayName: 'alice', color: '#abcdef' },
      forward: createBlock,
      inverse: deleteBlock,
    };
    const project: Project = {
      ...projectWithEverything('p-history'),
      history: { undo: [entry], redo: [] },
    };

    await repo.save(project);
    const loaded = await repo.load(project.id);

    expect(loaded.history.undo).toHaveLength(1);
    expect(loaded.history.redo).toHaveLength(0);
    expect(loaded.history.undo[0]).toEqual(entry);
  });

  it('defaults `history` to empty stacks when missing from stored JSON', async () => {
    storage.setItem(
      'mbse:v1:project:legacy-history',
      JSON.stringify({
        id: 'legacy-history',
        name: 'legacy-history',
        createdAt: '2026-05-11T10:00:00.000Z',
        modifiedAt: '2026-05-11T10:05:00.000Z',
        elements: [],
        edges: [],
        diagrams: [],
      }),
    );
    const repo = createInMemorySessionRepository({ storage });
    const loaded = await repo.load('legacy-history' as ProjectId);
    expect(loaded.history).toEqual({ undo: [], redo: [] });
  });

  it('defaults `history` to empty stacks when present but malformed', async () => {
    storage.setItem(
      'mbse:v1:project:bad-history',
      JSON.stringify({
        id: 'bad-history',
        name: 'bad-history',
        createdAt: '2026-05-11T10:00:00.000Z',
        modifiedAt: '2026-05-11T10:05:00.000Z',
        elements: [],
        edges: [],
        diagrams: [],
        history: { undo: 'not-an-array' },
      }),
    );
    const repo = createInMemorySessionRepository({ storage });
    const loaded = await repo.load('bad-history' as ProjectId);
    expect(loaded.history).toEqual({ undo: [], redo: [] });
  });
});
