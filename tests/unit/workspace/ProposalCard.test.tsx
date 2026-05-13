import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { createSessionUser } from '@/collab';
import type { ProposedChange, ProposalResolution } from '@/llm';
import { createElementId, type PackageElement } from '@/model';
import { createInMemorySessionRepository } from '@/repository';
import { PendingProposalsList, ProposalCard } from '@/workspace/chat/ProposalCard';
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

describe('<ProposalCard /> + <PendingProposalsList />', () => {
  beforeEach(() => resetWorkspaceStoreForTests());
  afterEach(() => resetWorkspaceStoreForTests());

  it('renders the summary and each command kind', async () => {
    await bootstrap();
    const change = makePackageProposal('Cooling');
    render(<ProposalCard change={change} />);
    expect(screen.getByTestId('proposal-summary').textContent).toBe('Create Package "Cooling"');
    const items = screen.getByTestId('proposal-commands').querySelectorAll('li');
    expect(items.length).toBe(1);
    expect(items[0]!.textContent).toBe('create-element');
  });

  it('Accept calls store.acceptProposal and resolves the resolver', async () => {
    await bootstrap();
    const change = makePackageProposal();
    render(<PendingProposalsList />);
    let resolution!: Promise<ProposalResolution>;
    act(() => {
      resolution = useWorkspaceStore.getState().enqueueProposal(change);
    });
    expect(screen.getByTestId('proposal-card')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId('proposal-accept'));
    });

    const res: ProposalResolution = await resolution;
    expect(res.kind).toBe('accepted');
    expect(useWorkspaceStore.getState().pendingProposals).toEqual([]);
  });

  it('Reject calls store.rejectProposal and resolves with rejection', async () => {
    await bootstrap();
    const change = makePackageProposal();
    render(<PendingProposalsList />);
    let resolution!: Promise<ProposalResolution>;
    act(() => {
      resolution = useWorkspaceStore.getState().enqueueProposal(change);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('proposal-reject'));
    });

    const res: ProposalResolution = await resolution;
    expect(res.kind).toBe('rejected');
    expect(useWorkspaceStore.getState().pendingProposals).toEqual([]);
  });

  it('PendingProposalsList renders nothing when there are no pending proposals', async () => {
    await bootstrap();
    const { container } = render(<PendingProposalsList />);
    expect(container.firstChild).toBeNull();
  });

  it('PendingProposalsList renders one card per pending proposal', async () => {
    await bootstrap();
    const a = makePackageProposal('A');
    const b = makePackageProposal('B');
    render(<PendingProposalsList />);
    act(() => {
      void useWorkspaceStore.getState().enqueueProposal(a);
      void useWorkspaceStore.getState().enqueueProposal(b);
    });
    expect(screen.getAllByTestId('proposal-card').length).toBe(2);
  });
});
