import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import {
  ACTIVITY_VIEWPOINT_ID,
  BDD_VIEWPOINT_ID,
  PACKAGE_VIEWPOINT_ID,
  REQUIREMENTS_VIEWPOINT_ID,
  USE_CASE_VIEWPOINT_ID,
  createViewpointRegistry,
  bddViewpoint,
  ibdViewpoint,
  activityViewpoint,
  stateMachineViewpoint,
  useCaseViewpoint,
  parametricViewpoint,
  packageViewpoint,
  requirementsViewpoint,
} from '@/viewpoints';
import {
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';

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

async function bootstrap() {
  const storage = makeMemoryStorage();
  const repository = createInMemorySessionRepository({ storage });
  const user = createSessionUser();
  await useWorkspaceStore.getState().bootstrap({ repository, user, storage });
  return { storage, repository, user };
}

/**
 * Phase-13 gate invariants from JOURNAL iter-531 / AGENT.md "Phase 13 gate":
 *   1. exactly one element has ownerId === null and equals project.rootId
 *   2. every other element's ownerId resolves to an existing element
 *   3. every diagram has a context whose target element exists and whose kind
 *      is in the active viewpoint's acceptedContextKinds
 *   4. persisted JSON contains no parent-side child arrays
 *
 * The persistence-shape invariant (#4) is already enforced by
 * `src/repository/__tests__/sessionStorage.test.ts` (the `migrates legacy
 * parent-side child arrays...` spec). This file codifies #1–#3 as a single
 * gate scenario that operates a freshly-bootstrapped workspace.
 */
describe('Phase-13 gate invariants (JOURNAL iter-531)', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('a freshly-bootstrapped workspace satisfies all three live invariants', async () => {
    await bootstrap();

    const s = useWorkspaceStore.getState();
    const { project, diagrams, viewpoints } = s;
    expect(project).not.toBeNull();
    const elements = project!.elements;
    const byId = new Map(elements.map((e) => [e.id, e]));

    // Invariant 1 (evolved by Phase 14): every `ownerId === null` element is
    // either the project rootId or a library root listed in libraryRootIds.
    // ADR 0011 §Invariant-1 originally said "exactly one root"; T-14.04
    // introduces vendored library subtrees whose Package roots are also
    // ownerId-null siblings — the invariant becomes "exactly one *project*
    // root plus N *library* roots".
    const roots = elements.filter((e) => e.ownerId === null);
    const projectRoots = roots.filter((e) => e.id === project!.rootId);
    expect(projectRoots).toHaveLength(1);
    const libraryRootIdSet = new Set(project!.libraryRootIds ?? []);
    const otherRoots = roots.filter((e) => e.id !== project!.rootId);
    for (const r of otherRoots) {
      expect(libraryRootIdSet.has(r.id)).toBe(true);
    }

    // Invariant 2
    for (const e of elements) {
      if (e.ownerId === null) continue;
      expect(byId.has(e.ownerId)).toBe(true);
    }

    // Invariant 3
    for (const d of diagrams) {
      const vp = viewpoints.get(d.viewpointId);
      expect(vp).toBeDefined();
      expect(vp!.acceptedContextKinds).toContain(d.context.kind);
      // The default workspace's only diagram is the seed BDD anchored at
      // root. Verify target element resolves.
      expect(byId.has(d.context.id)).toBe(true);
    }
  });

  it('every viewpoint produces a context-valid diagram via createDiagram when accepted (T-13.30)', async () => {
    await bootstrap();
    const rootId = useWorkspaceStore.getState().project!.rootId;

    // Viewpoints that accept 'package' — createDiagram defaults to root.
    const packageAccepting = [
      BDD_VIEWPOINT_ID,
      REQUIREMENTS_VIEWPOINT_ID,
      USE_CASE_VIEWPOINT_ID,
      PACKAGE_VIEWPOINT_ID,
    ] as const;
    for (const vp of packageAccepting) {
      const id = useWorkspaceStore.getState().createDiagram(vp);
      expect(id, `${vp} should accept default package context`).not.toBeNull();
      const d = useWorkspaceStore.getState().diagrams.find((x) => x.id === id);
      expect(d!.context).toEqual({ kind: 'package', id: rootId });
    }

    // Activity requires explicit actionDefinition context — defaulting fails.
    const failed = useWorkspaceStore
      .getState()
      .createDiagram(ACTIVITY_VIEWPOINT_ID);
    expect(failed).toBeNull();
  });

  it('the canonical viewpoint registry exposes all eight viewpoints with non-empty acceptedContextKinds', () => {
    const reg = createViewpointRegistry();
    for (const vp of [
      bddViewpoint,
      ibdViewpoint,
      requirementsViewpoint,
      activityViewpoint,
      stateMachineViewpoint,
      useCaseViewpoint,
      parametricViewpoint,
      packageViewpoint,
    ]) {
      reg.register(vp);
    }
    const all = reg.list();
    expect(all).toHaveLength(8);
    for (const vp of all) {
      expect(vp.acceptedContextKinds.length).toBeGreaterThan(0);
    }
  });
});
