import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import { createInMemorySessionRepository } from '@/repository';
import {
  resetWorkspaceStoreForTests,
  useWorkspaceStore,
} from '@/workspace';
import type { ElementId } from '@/model';

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
}

describe('workspace store — impact analysis', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('initial state has no impact highlight', () => {
    const s = useWorkspaceStore.getState();
    expect(s.impactRootId).toBeNull();
    expect(s.impactHighlightedIds.size).toBe(0);
    expect(s.impactHighlightedEdgeIds.size).toBe(0);
  });

  it('runImpactAnalysis on an unknown id clears any prior highlight and returns false', async () => {
    await bootstrap();
    const ok = useWorkspaceStore
      .getState()
      .runImpactAnalysis('does-not-exist' as ElementId);
    expect(ok).toBe(false);
    const s = useWorkspaceStore.getState();
    expect(s.impactRootId).toBeNull();
    expect(s.impactHighlightedIds.size).toBe(0);
  });

  it('runImpactAnalysis on a lone block highlights only the root', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const ok = useWorkspaceStore.getState().runImpactAnalysis(a);
    expect(ok).toBe(true);
    const s = useWorkspaceStore.getState();
    expect(s.impactRootId).toBe(a);
    expect(s.impactHighlightedIds.has(a)).toBe(true);
    expect(s.impactHighlightedIds.size).toBe(1);
    expect(s.impactHighlightedEdgeIds.size).toBe(0);
  });

  it('runImpactAnalysis walks composition downstream', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    const edgeId = useWorkspaceStore
      .getState()
      .linkBlocks(a, b, 'Composition')!;
    useWorkspaceStore.getState().runImpactAnalysis(a);
    const s = useWorkspaceStore.getState();
    expect(s.impactHighlightedIds.has(a)).toBe(true);
    expect(s.impactHighlightedIds.has(b)).toBe(true);
    expect(s.impactHighlightedEdgeIds.has(edgeId)).toBe(true);
  });

  it('clearImpactHighlight resets root and id sets', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().runImpactAnalysis(a);
    expect(useWorkspaceStore.getState().impactRootId).toBe(a);
    useWorkspaceStore.getState().clearImpactHighlight();
    const s = useWorkspaceStore.getState();
    expect(s.impactRootId).toBeNull();
    expect(s.impactHighlightedIds.size).toBe(0);
    expect(s.impactHighlightedEdgeIds.size).toBe(0);
  });

  it('recomputes the highlight when the model changes under an active root', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().runImpactAnalysis(a);
    expect(useWorkspaceStore.getState().impactHighlightedIds.has(b)).toBe(false);
    useWorkspaceStore.getState().linkBlocks(a, b, 'Composition');
    const s = useWorkspaceStore.getState();
    expect(s.impactRootId).toBe(a);
    expect(s.impactHighlightedIds.has(b)).toBe(true);
  });

  it('drops the highlight when the root element is deleted', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().runImpactAnalysis(a);
    expect(useWorkspaceStore.getState().impactRootId).toBe(a);
    useWorkspaceStore.getState().deleteElement(a);
    const s = useWorkspaceStore.getState();
    expect(s.impactRootId).toBeNull();
    expect(s.impactHighlightedIds.size).toBe(0);
    expect(s.impactHighlightedEdgeIds.size).toBe(0);
  });

  it('runImpactAnalysis on a new root replaces the previous highlight', async () => {
    await bootstrap();
    const a = useWorkspaceStore.getState().createBlock()!;
    const b = useWorkspaceStore.getState().createBlock()!;
    useWorkspaceStore.getState().runImpactAnalysis(a);
    useWorkspaceStore.getState().runImpactAnalysis(b);
    const s = useWorkspaceStore.getState();
    expect(s.impactRootId).toBe(b);
    expect(s.impactHighlightedIds.has(a)).toBe(false);
    expect(s.impactHighlightedIds.has(b)).toBe(true);
  });
});
