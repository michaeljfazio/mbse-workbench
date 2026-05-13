# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D merged. Slice E (#221)
in flight on branch `issue/221-mutating-tools-diff-preview`. Remaining
after E: slice F gate (#222).

## Current iteration
- Iteration #: 393
- Started: 2026-05-13T09:55:00Z
- Branch: issue/221-mutating-tools-diff-preview
- Working on: #221 slice E — first mutating tool `create_element`.

## Last test run
- `pnpm exec vitest run tests/unit/llm src/llm` → 46 tests pass (8 new for
  create_element).
- `pnpm exec tsc --noEmit` → clean.
- `pnpm exec eslint src/llm/tools/create-element.ts ...` → clean.

## What changed this iteration
- New `src/llm/tools/create-element.ts` exposing a **mutating** tool that
  returns a `ProposedChange`. Supports curated kinds: Package,
  PartDefinition, Requirement, UseCase, Actor.
- Strict zod schema; Requirement kind requires nested `requirement` object;
  optional `owningPackageId` chains an `update-element` command on the
  package's `memberIds`.
- Handler throws (→ dispatcher reports `is_error`) when `owningPackageId`
  is unknown or refers to a non-Package element.
- Registered in `src/llm/tools/index.ts` with `mutating: true`.
- 8 unit tests cover: defaults, package chaining, Requirement defaults,
  missing requirement field error, unknown package id, non-Package owner,
  unknown kind, strict-schema extra-key rejection.

## What changed prior iteration (commit 68d4061)
- Added `ProposalResolver` / `ProposalResolution` types in `dispatcher.ts`
  and threaded `resolveProposal` callback through `createDispatcher`. When
  a tool returns `kind:'proposed-change'`:
  - With resolver: await user accept/reject, serialise
    `{accepted:true,appliedSummary}` or `{accepted:false,reason}`.
  - Without resolver: existing summary-only fallback preserved.
- Three dispatcher tests cover all three paths.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — deferred from slice C.
- Visual baselines for `chat-tools.spec.ts` already in repo.
- Slice E remaining work: 4 more mutating tools (link_requirement,
  propose_decomposition, generate_requirements_from_text,
  suggest_missing_elements), `PendingProposal` store slice + accept/reject
  actions, diff-card UI, e2e fixture, `@visual` and `@a11y` baselines.

## Decisions log
- 2026-05-13 (iter-391, this branch's commit 68d4061): Dispatcher hook —
  see above.
- 2026-05-13 (iter-392): Implemented `create_element` as the first
  mutating tool. Curated kinds (Package/PartDefinition/Requirement/
  UseCase/Actor) chosen because they have no required `ElementId`
  references — keeps schema validation simple and the LLM doesn't need
  to know about cross-element wiring. Higher-arity kinds (PartUsage,
  PortDefinition, etc.) deferred — they need a separate `link_*` tool
  family. Chose to chain `update-element` on Package memberIds within the
  same ProposedChange so accept dispatches one compound transaction and
  undo treats it as a single step.
- 2026-05-13 (iter-355): main is advancing faster than ~8m CI cycle — slice
  E may need to rebase multiple times. Kept as standing note.
- 2026-05-13 (iter-332): `@visual` baselines from CI: extract Linux PNGs
  from playwright-report base64 blob and commit.

## Next action
Continue slice E:
1. Add `PendingProposal` store slice to `src/workspace/store.ts` —
   `pendingProposals: ReadonlyMap<id, ProposedChange>`, `enqueueProposal`,
   `acceptProposal` (dispatches the command list as a compound through the
   bus), `rejectProposal` actions.
2. Wire ChatPane to construct a `ProposalResolver` that enqueues the
   proposal and returns a `Promise<ProposalResolution>` resolved when the
   user clicks Accept or Reject in the diff card.
3. Then move on to remaining four mutating tool handlers.
