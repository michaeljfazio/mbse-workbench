import { useState } from 'react';
import type { ProposedChange } from '@/llm';
import { useWorkspaceStore } from '../store';

export function ProposalCard({ change }: { readonly change: ProposedChange }): JSX.Element {
  const acceptProposal = useWorkspaceStore((s) => s.acceptProposal);
  const rejectProposal = useWorkspaceStore((s) => s.rejectProposal);
  const [busy, setBusy] = useState(false);

  const handleAccept = () => {
    if (busy) return;
    setBusy(true);
    acceptProposal(change.id);
  };

  const handleReject = () => {
    if (busy) return;
    setBusy(true);
    rejectProposal(change.id);
  };

  return (
    <div
      data-testid="proposal-card"
      data-proposal-id={change.id}
      className="mb-2 rounded-md border border-border bg-card p-3 text-sm shadow-sm"
    >
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Proposed change
      </div>
      <div data-testid="proposal-summary" className="mb-2 text-foreground">
        {change.summary}
      </div>
      <ul
        data-testid="proposal-commands"
        className="mb-3 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground"
      >
        {change.commands.map((cmd, i) => (
          <li key={i}>{cmd.kind}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="proposal-accept"
          aria-label="Accept proposed change"
          onClick={handleAccept}
          disabled={busy}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Accept
        </button>
        <button
          type="button"
          data-testid="proposal-reject"
          aria-label="Reject proposed change"
          onClick={handleReject}
          disabled={busy}
          className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

export function PendingProposalsList(): JSX.Element | null {
  const pendingProposals = useWorkspaceStore((s) => s.pendingProposals);
  if (pendingProposals.length === 0) return null;
  return (
    <div data-testid="pending-proposals" className="border-t border-border px-3 py-2">
      {pendingProposals.map((p) => (
        <ProposalCard key={p.id} change={p} />
      ))}
    </div>
  );
}
