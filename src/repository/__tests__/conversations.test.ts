import { describe, expect, it } from 'vitest';
import type { Conversation } from '@/llm';
import {
  createInMemorySessionRepository,
  EMPTY_COMMAND_HISTORY,
  type Project,
} from '@/repository';
import type { ProjectId } from '@/model';

function createFakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    key(index) {
      const keys = Array.from(map.keys());
      return index >= 0 && index < keys.length ? (keys[index] as string) : null;
    },
    removeItem(key) {
      map.delete(key);
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
}

const CONVERSATION: Conversation = {
  id: 'conv-1',
  title: 'Decompose engine',
  createdAt: '2026-05-13T10:00:00.000Z',
  modifiedAt: '2026-05-13T10:05:00.000Z',
  messages: [
    {
      role: 'user',
      content: [{ type: 'text', text: 'Decompose Engine into subsystems.' }],
    },
    {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Proposed: Cylinder, FuelInjector.' },
        { type: 'tool_use', id: 'tu_1', name: 'propose_decomposition', input: { parent: 'Engine' } },
      ],
    },
    {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'tu_1',
          content: '{"accepted":true}',
        },
      ],
    },
  ],
};

function makeProject(): Project {
  return {
    id: 'p-conv' as ProjectId,
    name: 'conv-test',
    createdAt: '2026-05-13T09:00:00.000Z',
    modifiedAt: '2026-05-13T10:05:00.000Z',
    elements: [],
    edges: [],
    diagrams: [],
    history: EMPTY_COMMAND_HISTORY,
    conversations: [CONVERSATION],
  };
}

describe('conversation store via ModelRepository', () => {
  it('round-trips a multi-block conversation losslessly', async () => {
    const repo = createInMemorySessionRepository({ storage: createFakeStorage() });
    const project = makeProject();
    await repo.save(project);
    const loaded = await repo.load(project.id);
    expect(loaded.conversations).toHaveLength(1);
    expect(loaded.conversations[0]).toEqual(CONVERSATION);
  });

  it('defaults `conversations` to an empty array when missing from stored JSON', async () => {
    const storage = createFakeStorage();
    storage.setItem(
      'mbse:v1:project:legacy-conv',
      JSON.stringify({
        id: 'legacy-conv',
        name: 'legacy',
        createdAt: '2026-05-13T09:00:00.000Z',
        modifiedAt: '2026-05-13T09:00:00.000Z',
        elements: [],
        edges: [],
        diagrams: [],
        history: { undo: [], redo: [] },
      }),
    );
    const repo = createInMemorySessionRepository({ storage });
    const loaded = await repo.load('legacy-conv' as ProjectId);
    expect(loaded.conversations).toEqual([]);
  });

  it('defaults `conversations` to an empty array when present but malformed', async () => {
    const storage = createFakeStorage();
    storage.setItem(
      'mbse:v1:project:bad-conv',
      JSON.stringify({
        id: 'bad-conv',
        name: 'bad',
        createdAt: '2026-05-13T09:00:00.000Z',
        modifiedAt: '2026-05-13T09:00:00.000Z',
        elements: [],
        edges: [],
        diagrams: [],
        history: { undo: [], redo: [] },
        conversations: 'oops',
      }),
    );
    const repo = createInMemorySessionRepository({ storage });
    const loaded = await repo.load('bad-conv' as ProjectId);
    expect(loaded.conversations).toEqual([]);
  });
});
