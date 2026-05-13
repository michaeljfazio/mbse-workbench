import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSessionUser } from '@/collab';
import type { ProposedChange } from '@/llm';
import { createElementId, type PackageElement } from '@/model';
import { createInMemorySessionRepository } from '@/repository';
import { resetWorkspaceStoreForTests, useWorkspaceStore } from '@/workspace';

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

function makePackageProposal(name = 'Pkg'): ProposedChange {
  const id = createElementId();
  const pkg: PackageElement = { id, kind: 'Package', name, memberIds: [] };
  return {
    id,
    summary: `Create Package "${name}"`,
    commands: [{ kind: 'create-element', element: pkg }],
  };
}

describe('workspace store — pending proposal actions (issue #221)', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('enqueueProposal adds the proposal to pendingProposals', async () => {
    await bootstrap();
    expect(useWorkspaceStore.getState().pendingProposals).toEqual([]);

    const change = makePackageProposal();
    void useWorkspaceStore.getState().enqueueProposal(change);

    const pending = useWorkspaceStore.getState().pendingProposals;
    expect(pending).toHaveLength(1);
    expect(pending[0]).toBe(change);
  });

  it('acceptProposal dispatches commands through the bus and resolves with appliedSummary', async () => {
    await bootstrap();
    const beforeCount = useWorkspaceStore.getState().elements.length;
    const change = makePackageProposal('Acme');

    const promise = useWorkspaceStore.getState().enqueueProposal(change);
    useWorkspaceStore.getState().acceptProposal(change.id);
    const resolution = await promise;

    expect(resolution).toEqual({ kind: 'accepted', appliedSummary: 'Create Package "Acme"' });
    const s = useWorkspaceStore.getState();
    expect(s.pendingProposals).toEqual([]);
    expect(s.elements.length).toBe(beforeCount + 1);
    expect(s.elements.some((e) => e.id === change.id && e.kind === 'Package')).toBe(true);
  });

  it('rejectProposal does not dispatch commands and resolves with rejected', async () => {
    await bootstrap();
    const beforeCount = useWorkspaceStore.getState().elements.length;
    const change = makePackageProposal();

    const promise = useWorkspaceStore.getState().enqueueProposal(change);
    useWorkspaceStore.getState().rejectProposal(change.id, 'user said no');
    const resolution = await promise;

    expect(resolution).toEqual({ kind: 'rejected', reason: 'user said no' });
    const s = useWorkspaceStore.getState();
    expect(s.pendingProposals).toEqual([]);
    expect(s.elements.length).toBe(beforeCount);
  });

  it('rejectProposal omits the reason field when none is provided', async () => {
    await bootstrap();
    const change = makePackageProposal();

    const promise = useWorkspaceStore.getState().enqueueProposal(change);
    useWorkspaceStore.getState().rejectProposal(change.id);
    const resolution = await promise;

    expect(resolution).toEqual({ kind: 'rejected' });
  });

  it('acceptProposal on an unknown id is a no-op (does not throw)', async () => {
    await bootstrap();
    const beforeCount = useWorkspaceStore.getState().elements.length;
    expect(() => useWorkspaceStore.getState().acceptProposal('nope')).not.toThrow();
    expect(useWorkspaceStore.getState().elements.length).toBe(beforeCount);
  });

  it('rejectProposal on an unknown id is a no-op (does not throw)', async () => {
    await bootstrap();
    expect(() => useWorkspaceStore.getState().rejectProposal('nope')).not.toThrow();
  });

  it('accepting one of multiple pending proposals only removes that one', async () => {
    await bootstrap();
    const a = makePackageProposal('A');
    const b = makePackageProposal('B');

    const promiseA = useWorkspaceStore.getState().enqueueProposal(a);
    void useWorkspaceStore.getState().enqueueProposal(b);

    expect(useWorkspaceStore.getState().pendingProposals).toHaveLength(2);

    useWorkspaceStore.getState().acceptProposal(a.id);
    await promiseA;

    const pending = useWorkspaceStore.getState().pendingProposals;
    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe(b.id);
  });

  it('accept undo-redo treats a multi-command proposal as a single step', async () => {
    await bootstrap();
    const beforeCount = useWorkspaceStore.getState().elements.length;

    const pkgId = createElementId();
    const blockId = createElementId();
    const change: ProposedChange = {
      id: pkgId,
      summary: 'Create Package and Block',
      commands: [
        {
          kind: 'create-element',
          element: { id: pkgId, kind: 'Package', name: 'P', memberIds: [] },
        },
        {
          kind: 'create-element',
          element: {
            id: blockId,
            kind: 'PartDefinition',
            name: 'B',
            isAbstract: false,
            propertyIds: [],
            portIds: [],
          },
        },
      ],
    };

    const promise = useWorkspaceStore.getState().enqueueProposal(change);
    useWorkspaceStore.getState().acceptProposal(change.id);
    await promise;

    expect(useWorkspaceStore.getState().elements.length).toBe(beforeCount + 2);

    useWorkspaceStore.getState().undo();
    expect(useWorkspaceStore.getState().elements.length).toBe(beforeCount);

    useWorkspaceStore.getState().redo();
    expect(useWorkspaceStore.getState().elements.length).toBe(beforeCount + 2);
  });
});
