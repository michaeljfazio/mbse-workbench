# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D merged. Slice E (#221)
in flight on branch `issue/221-mutating-tools-diff-preview`. Remaining
after E: slice F gate (#222).

## Current iteration
- Iteration #: 395
- Started: 2026-05-13T18:00:00Z
- Branch: issue/221-mutating-tools-diff-preview
- Working on: #221 slice E — ChatPane wired to ProposalResolver; diff-card UI lands.

## Last test run
- `pnpm exec vitest run tests/unit/workspace tests/unit/llm` → 353 tests
  pass (5 new for ProposalCard).
- `pnpm exec tsc --noEmit` → clean.
- `pnpm exec eslint` on changed files → clean.

## What changed this iteration (commit cf9e29a)
- New `src/workspace/chat/ProposalCard.tsx` exporting:
  - `ProposalCard({ change })`: renders summary, a list of command kinds,
    and Accept / Reject buttons. Buttons call `acceptProposal(id)` /
    `rejectProposal(id)` on the store. Buttons go `disabled` once
    clicked to prevent double-fire.
  - `PendingProposalsList()`: subscribes to `pendingProposals`, renders
    `null` when empty, otherwise a stack of `ProposalCard`s.
- `ChatPane.tsx`:
  - Imports `PendingProposalsList` and renders it above the composer.
  - In `handleSend`, fetches `enqueueProposal` from the store and passes
    it as `resolveProposal` to `createDispatcher`. The dispatcher's
    `tool_result` for any mutating tool now reflects the user's
    accept/reject decision.
- 5 new unit tests in `tests/unit/workspace/ProposalCard.test.tsx`:
  summary + commands render; Accept resolves with `kind: 'accepted'` and
  clears pending; Reject resolves with `kind: 'rejected'` and clears
  pending; empty list renders nothing; multi-pending renders multiple
  cards.

## What changed prior iterations
- iter-394 / commit 989891d: PendingProposal store slice (enqueue /
  accept / reject + module-level resolver map).
- iter-393 / commit 064d099: `create_element` mutating tool returning
  ProposedChange.
- iter-391 / commit 68d4061: `ProposalResolver` hook on the dispatcher.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — deferred from slice C.
- Slice E remaining work: 4 more mutating tools (link_requirement,
  propose_decomposition, generate_requirements_from_text,
  suggest_missing_elements); Playwright e2e exercising Accept path with
  a recorded fixture; `@visual` baselines for diff card pending /
  accepted / rejected; `@a11y` scan on diff card.

## Decisions log
- 2026-05-13 (iter-395): `ProposalCard` shows command kinds as a simple
  bullet list (`cmd.kind` string) rather than a synthesized natural-
  language description. The dispatcher already produces a human-readable
  `summary` field per ProposedChange; the per-command lines are an at-a-
  glance fingerprint, not a re-translation. Avoids a second
  serialisation surface that would drift from the actual command
  semantics.
- 2026-05-13 (iter-395): Buttons go `disabled` on click (local `busy`
  state) rather than waiting for the proposal to disappear from the
  store. The store removal happens synchronously in the action, but the
  re-render order across multiple cards is not guaranteed; local busy
  flag prevents a flash of double-click before unmount.
- 2026-05-13 (iter-394): Resolvers stored in a module-level Map rather
  than in Zustand state.
- 2026-05-13 (iter-394): `acceptProposal` always dispatches a
  `compound` command — undo is one step regardless of internal count.
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
1. Add `link_requirement` mutating tool handler (returns ProposedChange
   with `create-edge` commands for satisfy / verify / derive / refine).
2. Then `generate_requirements_from_text` handler.
3. Then `propose_decomposition` and `suggest_missing_elements`.
4. Then Playwright e2e (recorded fixture) + `@visual` + `@a11y`
   baselines for the diff card.
