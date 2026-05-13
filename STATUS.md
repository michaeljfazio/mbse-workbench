# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D merged. Slice E (#221)
in flight on branch `issue/221-mutating-tools-diff-preview`. Remaining
after E: slice F gate (#222).

## Current iteration
- Iteration #: 394
- Started: 2026-05-13T17:55:00Z
- Branch: issue/221-mutating-tools-diff-preview
- Working on: #221 slice E — PendingProposal store slice landed; next is
  ChatPane wiring + remaining mutating tools.

## Last test run
- `pnpm exec vitest run tests/unit/workspace tests/unit/llm` → 348 tests
  pass (8 new for PendingProposal actions).
- `pnpm exec tsc --noEmit` → clean.
- `pnpm exec eslint` on changed files → clean.

## What changed this iteration (commit 989891d)
- New state field `pendingProposals: readonly ProposedChange[]` on the
  workspace store. INITIAL_STATE empty.
- New actions:
  - `enqueueProposal(change) → Promise<ProposalResolution>`: appends to
    pendingProposals and returns a Promise that resolves when the user
    accepts or rejects.
  - `acceptProposal(id)`: dispatches `{ kind: 'compound', commands }`
    through the bus so accept = one undo step; removes from pending;
    resolves the resolver with `{ kind: 'accepted', appliedSummary }`.
  - `rejectProposal(id, reason?)`: removes from pending; resolves with
    `{ kind: 'rejected', reason? }` (omits the `reason` field when not
    given).
- Resolvers stored in a **module-level** `Map<id, (res)=>void>` —
  functions are not serialisable and only matter for the in-flight LLM
  turn. Cleared by `resetWorkspaceStoreForTests`.
- Public re-export of `ProposalResolution` / `ProposalResolver` types
  from `@/llm` so the store and future UI can use them without reaching
  into `@/llm/dispatcher`.
- 8 new tests in `tests/unit/workspace/proposalActions.test.ts` cover:
  enqueue adds to pending; accept dispatches + resolves with summary;
  reject does not dispatch + resolves with reason; reject without reason
  omits the field; accept/reject on unknown id are no-ops; accept of one
  of multiple proposals only removes that one; accept/undo/redo of a
  multi-command proposal is a single undo step.

## What changed prior iterations
- iter-393 / commit 064d099: `create_element` mutating tool returning
  ProposedChange. Curated kinds Package/PartDefinition/Requirement/
  UseCase/Actor with optional `owningPackageId` chaining an
  `update-element` command on the package's memberIds.
- iter-391 / commit 68d4061: `ProposalResolver` hook on the dispatcher.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — deferred from slice C.
- Visual baselines for `chat-tools.spec.ts` already in repo.
- Slice E remaining work: ChatPane wiring (construct ProposalResolver
  via `enqueueProposal`), diff-card UI with Accept/Reject buttons,
  4 more mutating tools (link_requirement, propose_decomposition,
  generate_requirements_from_text, suggest_missing_elements), e2e
  fixture, `@visual` and `@a11y` baselines.

## Decisions log
- 2026-05-13 (iter-394): Resolvers stored in a module-level Map rather
  than in Zustand state. Functions are not serialisable (`saveProject`
  would otherwise need to skip them) and they're transient — only valid
  for the current dispatcher turn. State holds the proposals themselves
  for UI reactivity.
- 2026-05-13 (iter-394): `acceptProposal` always dispatches a
  `compound` command (even for a single-command proposal). Makes
  undo/redo uniform — every accepted proposal is exactly one history
  step regardless of internal command count.
- 2026-05-13 (iter-393, this branch's commit 064d099): create_element
  curated kinds — see prior STATUS.
- 2026-05-13 (iter-391, this branch's commit 68d4061): Dispatcher
  ProposalResolver hook — see prior STATUS.
- 2026-05-13 (iter-355): main is advancing faster than ~8m CI cycle — slice
  E may need to rebase multiple times. Kept as standing note.
- 2026-05-13 (iter-332): `@visual` baselines from CI: extract Linux PNGs
  from playwright-report base64 blob and commit.

## Next action
Continue slice E:
1. Wire ChatPane to construct a `ProposalResolver` that calls
   `enqueueProposal(change)` and returns its promise — pass it to
   `createDispatcher`.
2. Render a diff-card list reading from `pendingProposals` with
   Accept / Reject buttons calling the respective store actions.
3. Then move on to remaining four mutating tool handlers.
