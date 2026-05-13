# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D merged. Slice E (#221)
in flight on branch `issue/221-mutating-tools-diff-preview`. Remaining
after E: slice F gate (#222).

## Current iteration
- Iteration #: 396
- Started: 2026-05-13T18:05:00Z
- Branch: issue/221-mutating-tools-diff-preview
- Working on: #221 slice E — second mutating tool (`link_requirement`).

## Last test run
- `pnpm exec vitest run tests/unit/llm` → 34 tests pass (10 new for
  `link_requirement`).
- `pnpm exec tsc --noEmit` → clean.
- `pnpm exec eslint` on changed files → clean.

## What changed this iteration (commit 2e21fa4)
- New `src/llm/tools/link-requirement.ts` exporting:
  - `linkRequirementSchema` — strict zod: `{ requirementId, targetId,
    traceKind ∈ {satisfy, verify, derive, refine} }`.
  - `linkRequirementDefinition` — Anthropic tool definition with matching
    JSON schema and a description that documents source/target
    orientation (requirement is the source).
  - `linkRequirementHandler(input, ctx, reader)` — validates that
    `requirementId` resolves to a Requirement, that `targetId` resolves
    to some element, that source ≠ target, and that no identical
    (source, target, traceKind) trace already exists. On success
    returns a `proposed-change` ToolOutput whose single command is
    `{ kind: 'link', edge: RequirementTraceEdge }`. The proposal `id`
    is the new edge id (matches the create_element convention of
    `change.id === created entity id`). Summary is
    `Link requirement "X" --satisfy--> "Y" (PartDefinition)`.
- Registered in `src/llm/tools/index.ts` with `mutating: true`, so the
  dispatcher routes it through the ProposalResolver hook landed in
  iter-391. No ChatPane changes needed: the existing PendingProposalsList
  / ProposalCard renders any ProposedChange shape.
- 10 new tests in `tests/unit/llm/tools/link-requirement.test.ts`:
  happy path, all four trace kinds, missing/non-Requirement source,
  missing target, self-link, duplicate (source,target,kind),
  same-pair-different-kind allowed, schema rejects unknown traceKind,
  schema rejects extra properties.

## What changed prior iterations
- iter-395 / commit cf9e29a: ChatPane wired to ProposalResolver +
  ProposalCard/PendingProposalsList UI.
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
- Slice E remaining work: 3 more mutating tools
  (`propose_decomposition`, `generate_requirements_from_text`,
  `suggest_missing_elements`); Playwright e2e exercising Accept path
  with a recorded fixture; `@visual` baselines for diff card pending /
  accepted / rejected; `@a11y` scan on diff card.

## Decisions log
- 2026-05-13 (iter-396): `link_requirement` rejects exact-duplicate
  traces but allows a second trace of a different kind between the same
  pair (e.g., satisfy + verify on the same requirement→part pair).
  Matches how the matrix view aggregates traceKinds per cell — a single
  cell is allowed to carry multiple glyphs.
- 2026-05-13 (iter-396): `link_requirement` orients the edge with the
  requirement as `sourceId` and the satisfying/verifying element as
  `targetId`. Confirmed against existing `RequirementTraceEdge` usage
  in `src/workspace/requirements/__tests__/coverage.test.ts` and the
  matrix builder. Reversing this would silently break the matrix.
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
1. Add `generate_requirements_from_text` mutating tool handler — parses
   free text into one ProposedChange whose commands create N Requirement
   elements (and optionally add them to a target package).
2. Then `propose_decomposition` and `suggest_missing_elements`.
3. Then Playwright e2e (recorded fixture) + `@visual` + `@a11y`
   baselines for the diff card.
