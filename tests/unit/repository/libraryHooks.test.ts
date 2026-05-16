import { describe, expect, it } from 'vitest';

import type { PackageElement } from '@/model';
import { migrateLegacyProject } from '@/repository/migrate';
import { createInMemorySessionRepository } from '@/repository';

function makeMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

describe('Phase 14 — library schema hooks (T-14.01)', () => {
  it('PackageElement accepts isReadOnly: true and migrateLegacyProject preserves it', () => {
    const project = migrateLegacyProject({
      id: 'p',
      name: 'p',
      createdAt: '2026-05-16T00:00:00.000Z',
      modifiedAt: '2026-05-16T00:00:00.000Z',
      rootId: 'root',
      elements: [
        {
          id: 'root',
          kind: 'Package',
          name: 'p',
          ownerId: null,
          ownerRole: 'member',
          ownerIndex: 0,
        },
        {
          id: 'lib',
          kind: 'Package',
          name: 'KerML',
          ownerId: 'root',
          ownerRole: 'member',
          ownerIndex: 0,
          isReadOnly: true,
        },
      ],
      edges: [],
      diagrams: [],
    });

    const lib = project.elements.find((e) => e.id === 'lib') as
      | PackageElement
      | undefined;
    expect(lib).toBeDefined();
    expect(lib?.isReadOnly).toBe(true);
  });

  it('PackageElement.isReadOnly is omitted (or false-y) when absent on legacy projects', () => {
    const project = migrateLegacyProject({
      id: 'p',
      name: 'p',
      createdAt: '2026-05-16T00:00:00.000Z',
      modifiedAt: '2026-05-16T00:00:00.000Z',
      rootId: 'root',
      elements: [
        {
          id: 'root',
          kind: 'Package',
          name: 'p',
          ownerId: null,
          ownerRole: 'member',
          ownerIndex: 0,
        },
      ],
      edges: [],
      diagrams: [],
    });

    const root = project.elements.find((e) => e.id === 'root') as
      | PackageElement
      | undefined;
    expect(root?.isReadOnly).toBeUndefined();
  });

  it('Project accepts libraryRootIds and migrateLegacyProject preserves it', () => {
    const project = migrateLegacyProject({
      id: 'p',
      name: 'p',
      createdAt: '2026-05-16T00:00:00.000Z',
      modifiedAt: '2026-05-16T00:00:00.000Z',
      rootId: 'root',
      libraryRootIds: ['lib-kerml'],
      elements: [
        {
          id: 'root',
          kind: 'Package',
          name: 'p',
          ownerId: null,
          ownerRole: 'member',
          ownerIndex: 0,
        },
        {
          id: 'lib-kerml',
          kind: 'Package',
          name: 'KerML',
          ownerId: null,
          ownerRole: 'member',
          ownerIndex: 0,
          isReadOnly: true,
        },
      ],
      edges: [],
      diagrams: [],
    });

    expect(project.libraryRootIds).toEqual(['lib-kerml']);
  });

  it('Project.libraryRootIds is undefined on legacy projects that lack the field', () => {
    const project = migrateLegacyProject({
      id: 'p',
      name: 'p',
      createdAt: '2026-05-16T00:00:00.000Z',
      modifiedAt: '2026-05-16T00:00:00.000Z',
      rootId: 'root',
      elements: [
        {
          id: 'root',
          kind: 'Package',
          name: 'p',
          ownerId: null,
          ownerRole: 'member',
          ownerIndex: 0,
        },
      ],
      edges: [],
      diagrams: [],
    });

    expect(project.libraryRootIds).toBeUndefined();
  });

  it('migrateLegacyProject ignores libraryRootIds when not an array of strings', () => {
    const project = migrateLegacyProject({
      id: 'p',
      name: 'p',
      createdAt: '2026-05-16T00:00:00.000Z',
      modifiedAt: '2026-05-16T00:00:00.000Z',
      rootId: 'root',
      libraryRootIds: ['valid', 42, null],
      elements: [
        {
          id: 'root',
          kind: 'Package',
          name: 'p',
          ownerId: null,
          ownerRole: 'member',
          ownerIndex: 0,
        },
      ],
      edges: [],
      diagrams: [],
    });

    expect(project.libraryRootIds).toBeUndefined();
  });

  it('repository round-trip preserves isReadOnly + libraryRootIds (save → load → deepEqual)', async () => {
    const storage = makeMemoryStorage();
    const repo = createInMemorySessionRepository({ storage });

    const seeded = migrateLegacyProject({
      id: 'p',
      name: 'demo',
      createdAt: '2026-05-16T00:00:00.000Z',
      modifiedAt: '2026-05-16T00:00:00.000Z',
      rootId: 'root',
      libraryRootIds: ['lib-kerml'],
      elements: [
        {
          id: 'root',
          kind: 'Package',
          name: 'demo',
          ownerId: null,
          ownerRole: 'member',
          ownerIndex: 0,
        },
        {
          id: 'lib-kerml',
          kind: 'Package',
          name: 'KerML',
          ownerId: null,
          ownerRole: 'member',
          ownerIndex: 0,
          isReadOnly: true,
        },
      ],
      edges: [],
      diagrams: [],
    });

    await repo.save(seeded);
    const loaded = await repo.load('p');

    expect(loaded.libraryRootIds).toEqual(['lib-kerml']);
    const lib = loaded.elements.find((e) => e.id === 'lib-kerml') as
      | PackageElement
      | undefined;
    expect(lib?.isReadOnly).toBe(true);
  });
});
