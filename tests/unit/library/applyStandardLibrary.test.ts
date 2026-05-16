import { describe, expect, it } from 'vitest';

import type { ElementId, ProjectId } from '@/model';
import type { Project } from '@/repository/types';
import { EMPTY_COMMAND_HISTORY } from '@/repository';
import {
  applyStandardLibrary,
  KERML_CORE_LIBRARY_ROOT_ID,
} from '@/library';
import { kermlCoreElements } from '@/library/kerml/core';

function minimalProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p' as ProjectId,
    name: 'demo',
    createdAt: '2026-05-16T00:00:00.000Z',
    modifiedAt: '2026-05-16T00:00:00.000Z',
    rootId: 'root' as ElementId,
    elements: [
      {
        id: 'root' as ElementId,
        kind: 'Package',
        name: 'demo',
        ownerId: null,
        ownerRole: 'member',
        ownerIndex: 0,
      },
    ],
    edges: [],
    diagrams: [],
    history: EMPTY_COMMAND_HISTORY,
    conversations: [],
    ...overrides,
  };
}

describe('applyStandardLibrary (T-14.04)', () => {
  it('seeds libraryRootIds with the KerML root id on a fresh project', () => {
    const out = applyStandardLibrary(minimalProject());
    expect(out.libraryRootIds).toEqual([KERML_CORE_LIBRARY_ROOT_ID]);
  });

  it('appends every library element to elements', () => {
    const out = applyStandardLibrary(minimalProject());
    const expectedIds = kermlCoreElements().map((e) => e.id);
    for (const id of expectedIds) {
      expect(out.elements.some((e) => e.id === id)).toBe(true);
    }
    // The original root is also still present.
    expect(out.elements.some((e) => e.id === 'root')).toBe(true);
  });

  it('is idempotent — re-applying does not duplicate elements or root ids', () => {
    const once = applyStandardLibrary(minimalProject());
    const twice = applyStandardLibrary(once);
    expect(twice).toBe(once); // reference-equal: no change at all
    expect(twice.libraryRootIds).toEqual([KERML_CORE_LIBRARY_ROOT_ID]);
    expect(twice.elements.length).toBe(once.elements.length);
  });

  it('preserves user-set library roots when prepending the KerML root', () => {
    const seeded = minimalProject({
      libraryRootIds: ['user-lib-1' as ElementId, 'user-lib-2' as ElementId],
    });
    const out = applyStandardLibrary(seeded);
    expect(out.libraryRootIds).toEqual([
      KERML_CORE_LIBRARY_ROOT_ID,
      'user-lib-1',
      'user-lib-2',
    ]);
  });

  it('does not re-prepend when KerML root is already in libraryRootIds', () => {
    const seeded = minimalProject({
      libraryRootIds: ['user-lib' as ElementId, KERML_CORE_LIBRARY_ROOT_ID],
    });
    const out = applyStandardLibrary(seeded);
    expect(out.libraryRootIds).toEqual([
      'user-lib',
      KERML_CORE_LIBRARY_ROOT_ID,
    ]);
  });

  it('returns the same project (reference) when nothing needs changing', () => {
    // Pre-seed with full library content + root id.
    const lib = kermlCoreElements();
    const seeded = minimalProject({
      elements: [
        ...minimalProject().elements,
        ...lib,
      ] as Project['elements'],
      libraryRootIds: [KERML_CORE_LIBRARY_ROOT_ID],
    });
    const out = applyStandardLibrary(seeded);
    expect(out).toBe(seeded);
  });

  it('does not mutate the input project', () => {
    const seeded = minimalProject();
    const originalElementsRef = seeded.elements;
    const originalIds = seeded.libraryRootIds;
    applyStandardLibrary(seeded);
    expect(seeded.elements).toBe(originalElementsRef);
    expect(seeded.libraryRootIds).toBe(originalIds);
  });

  it('library elements all carry isReadOnly chain rooted at the Base package', () => {
    const out = applyStandardLibrary(minimalProject());
    const byId = new Map(out.elements.map((e) => [e.id, e]));
    const root = byId.get(KERML_CORE_LIBRARY_ROOT_ID);
    if (root?.kind !== 'Package') throw new Error('expected Package root');
    expect(root.isReadOnly).toBe(true);
    // Each non-root library element walks up to the read-only root.
    for (const lib of kermlCoreElements()) {
      if (lib.id === KERML_CORE_LIBRARY_ROOT_ID) continue;
      const owner = byId.get(lib.ownerId!);
      if (owner?.kind !== 'Package') throw new Error('expected Package owner');
      // Owner is the KerML Base — which is read-only.
      expect(owner.id).toBe(KERML_CORE_LIBRARY_ROOT_ID);
      expect(owner.isReadOnly).toBe(true);
    }
  });
});
