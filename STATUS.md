# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D merged. Slice E (#221)
in flight on branch `issue/221-mutating-tools-diff-preview`. All four
mutating tools now landed on the branch; remaining E work is e2e + visual
+ a11y baselines, then PR open. Remaining after E: slice F gate (#222).

## Current iteration
- Iteration #: 403
- Started: 2026-05-13T10:24:20Z
- Branch: issue/221-mutating-tools-diff-preview
- Working on: #221 slice E — PR #228 CI in progress (run
  25793196468, started 10:23:50Z; unit tests step in progress at
  iter start). Auto-merge armed (SQUASH). Mid-PR resume rule
  applies; no new work started this iteration.

## Last test run
- `pnpm exec playwright test tests/e2e/chat-proposal-accept.spec.ts
  --project=chromium --grep-invert "@visual"` → 3/3 pass (Accept,
  Reject, @a11y).
- `pnpm exec tsc --noEmit` → clean.
- `pnpm exec eslint tests/e2e/chat-proposal-accept.spec.ts` → clean.

## What changed this iteration (commit 7dba072)
- New fixture `tests/fixtures/llm/create-element-accept-round-trip.json`:
  round 1 emits `create_element` tool_use with
  `{kind:"PartDefinition", name:"Pump"}`; round 2 is the final
  "Pump has been added" assistant message.
- New `tests/e2e/chat-proposal-accept.spec.ts` with 4 specs:
  - Accept path: send chat → ProposalCard appears with summary
    "Create PartDefinition \"Pump\"" → click Accept → card clears →
    round 2 streams → "Pump" leaf appears in `project-tree`.
  - Reject path: card appears → click Reject → card clears →
    dispatcher resumes but no `Pump` leaf exists.
  - `@a11y` scan on the visible proposal card — 0 serious/critical
    violations on chromium.
  - `@visual` baseline for `proposal-card-pending.png` (Linux PNGs
    will be extracted from CI per the iter-332 workflow).

## What changed prior iterations (commit 5510210 / b2bf40e)
- iter-399: `suggest_missing_elements` mutating tool +12 unit tests.

## What changed earlier prior iterations (commit be281de)
- New `src/llm/tools/suggest-missing-elements.ts` exporting:
  - `suggestMissingElementsSchema` — strict zod:
    `{ owningPackageId?, maxSuggestions?: int [1..20] }`.
  - `suggestMissingElementsDefinition` — Anthropic tool definition.
  - `suggestMissingElementsHandler` — scans elements for
    PartDefinitions that have no incoming RequirementTrace edge of
    *any* kind, slices the candidates to `maxSuggestions` (default 5),
    and emits a paired `create-element` (placeholder Requirement,
    medium/draft, text `"<part> shall fulfil its intended purpose."`)
    + `link` (RequirementTrace, traceKind `satisfy`, sourceId = new
    requirement, targetId = part) for each. If `owningPackageId`
    resolves to an existing Package, appends an `update-element`
    extending the package's memberIds. Single ProposedChange whose
    `id` is the first new requirement's id.
- Registered in `src/llm/tools/index.ts` with `mutating: true`.
- 12 new tests covering happy path, skip already-traced parts (any
  trace kind counts), throw when no candidates / no parts at all,
  maxSuggestions cap + default of 5, owning-package append, missing
  package, non-Package owner, schema bounds (0, 21, non-integer),
  strict extras, unique ids.

## What changed prior iterations (commit be281de)
- iter-398: new `src/llm/tools/propose-decomposition.ts` exporting:
  - `proposeDecompositionSchema` — strict zod:
    `{ parentPartDefinitionId, childNames: string[1..20] (each 1..120) }`.
  - `proposeDecompositionDefinition` — Anthropic tool definition.
  - `proposeDecompositionHandler` — validates parent is an existing
    PartDefinition, rejects duplicate child names (case-insensitive),
    rejects names that collide with an existing direct Composition child
    of the same parent (case-insensitive; same name under a *different*
    parent is fine). Emits one `create-element` + one `link`
    (Composition, parent→child) command per name. Single ProposedChange
    whose id is the first new child's id.
- iter-397 / commit 1b86145: `generate_requirements_from_text` mutating
  tool. parseRequirementLines helper, optional owningPackageId append.

## What changed earlier prior iterations
- iter-396 / commit 2e21fa4: `link_requirement` mutating tool.
- iter-395 / commit cf9e29a: ChatPane wired to ProposalResolver +
  ProposalCard / PendingProposalsList UI.
- iter-394 / commit 989891d: PendingProposal store slice.
- iter-393 / commit 064d099: `create_element` mutating tool.
- iter-391 / commit 68d4061: `ProposalResolver` hook on dispatcher.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — deferred from slice C.
- Slice E remaining work: rebase onto main, open the slice-E PR for
  #221, enable auto-merge, extract the Linux `proposal-card-pending.png`
  baseline from CI's playwright-report and commit it. Branch is now 12
  commits ahead of main.

## Decisions log
- 2026-05-13 (iter-400): Accept-path e2e asserts the new "Pump" leaf
  appears in `project-tree` (not the BDD canvas). Reason: an
  uncontainerised PartDefinition is rendered in the tree as soon as it
  is created; BDD canvas only shows it once it has been dragged onto a
  diagram. The tree assertion is the cleanest proof the compound
  command was actually dispatched.
- 2026-05-13 (iter-400): Reject-path e2e asserts the dispatcher
  resumes (round 2 fires, streaming clears) but no `Pump` leaf is
  created. Reason: this catches a regression where Reject would either
  leak a pending proposal or accidentally apply the change.
- 2026-05-13 (iter-400): `@visual` baseline scoped to the
  `proposal-card` locator, not the whole sidebar. Reason: the rest of
  the sidebar (chat scrollback) flaps when streaming text width
  changes; pinning to the card keeps the baseline stable across
  fixture tweaks.
- 2026-05-13 (iter-399): `suggest_missing_elements` heuristic = "find
  PartDefinitions with no incoming RequirementTrace of any kind". Reason:
  this is the most actionable un-required-ness signal and produces a
  deterministic, testable candidate set. Other heuristics ("parts with
  no ports", "requirements with no traces") were considered but the
  former isn't a "missing element" (port shape is unknowable without
  domain input) and the latter would be solved by `link_requirement`
  rather than by inventing more requirements.
- 2026-05-13 (iter-399): Tool throws if no candidates exist rather than
  returning an empty ProposedChange. Reason: an empty proposed-change
  with 0 commands is confusing UX (the diff card would show "nothing");
  a clean error lets the chat surface "the model is fully traced" as
  prose. Matches the error-on-no-op pattern in
  `generate_requirements_from_text`.
- 2026-05-13 (iter-399): Placeholder Requirement text is a generic
  `"<Name> shall fulfil its intended purpose."` rather than something
  smarter. Reason: the tool's job is to surface the *gap*, not to invent
  domain semantics. The user (or a follow-up LLM call) refines the text
  after accepting; the placeholder is a deliberately uninteresting
  starting point that must be edited.
- 2026-05-13 (iter-399): Default maxSuggestions = 5, hard max = 20.
  Reason: a diff card showing 40 paired commands at once is hostile.
  The model can call again to address the next batch; bounded batches
  also keep ProposedChange render cost predictable.
- 2026-05-13 (iter-398): `propose_decomposition` rejects child names
  that collide with an *existing direct Composition child of the same
  parent* (case-insensitive), but does NOT block the same name under a
  different parent. SysMLv2 PartDefinitions are namespace-free globally;
  "Engine" can legitimately exist under both "Truck" and "Boat".
- 2026-05-13 (iter-398): One ProposedChange containing 2N commands
  (create + link, paired) rather than separate proposals per child.
  Single compound undo restores the state cleanly.
- 2026-05-13 (iter-398): Decomposition only creates BDD-level
  Composition edges, not PartUsages on the parent's `propertyIds`.
  IBD authoring is where PartUsages get instantiated.
- 2026-05-13 (iter-397): `generate_requirements_from_text` returns ONE
  ProposedChange containing N create-element commands rather than N
  separate proposals.
- 2026-05-13 (iter-397): Parsing is server-side (in the tool) rather
  than asking the LLM to pre-split.
- 2026-05-13 (iter-397): Minimum line length is 3 characters after
  bullet stripping.
- 2026-05-13 (iter-396): `link_requirement` rejects exact-duplicate
  traces but allows a second trace of a different kind between the
  same pair.
- 2026-05-13 (iter-396): `link_requirement` orients the edge with the
  requirement as `sourceId` and the satisfying/verifying element as
  `targetId`.
- 2026-05-13 (iter-395): `ProposalCard` shows command kinds as a simple
  bullet list rather than a synthesized natural-language description.
- 2026-05-13 (iter-395): Accept/Reject buttons go `disabled` on click
  via local busy state.
- 2026-05-13 (iter-394): Resolvers stored in a module-level Map rather
  than in Zustand state.
- 2026-05-13 (iter-394): `acceptProposal` always dispatches a
  `compound` command — undo is one step regardless of internal count.
- 2026-05-13 (iter-393): create_element curated kinds — see prior STATUS.
- 2026-05-13 (iter-391): Dispatcher ProposalResolver hook — see prior
  STATUS.
- 2026-05-13 (iter-355): main is advancing faster than ~8m CI cycle —
  slice E may need to rebase multiple times. Kept as standing note.
- 2026-05-13 (iter-332): `@visual` baselines from CI: extract Linux
  PNGs from playwright-report base64 blob and commit.

## Next action
1. Wait for PR #228 CI. If green and auto-merge fires, extract the
   Linux `proposal-card-pending.png` baselines (chromium + webkit)
   from the playwright-report base64 blob — but note the @visual
   spec is configured to write baselines, not assert against them
   on first run; verify whether CI produced them and decide whether
   a follow-up commit is needed before merge.
2. If CI red on the visual spec (no baseline), commit the extracted
   PNGs to the same branch (this is the iter-332 workflow).
3. After #228 merges, move to slice F (#222) — phase 11 gate:
   one Playwright e2e using a recorded fixture response file to
   drive a full UI flow without hitting the real API. Slice E's
   chat-proposal-accept spec already gets close; #222 may end up
   as a thin wrapper labelling the existing spec as the gate, or
   a slightly broader scenario.
