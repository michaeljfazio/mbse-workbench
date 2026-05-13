# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D merged. Slice E (#221)
in flight on branch `issue/221-mutating-tools-diff-preview`. All four
mutating tools now landed on the branch; remaining E work is e2e + visual
+ a11y baselines, then PR open. Remaining after E: slice F gate (#222).

## Current iteration
- Iteration #: 399
- Started: 2026-05-13T18:14:00Z
- Branch: issue/221-mutating-tools-diff-preview
- Working on: #221 slice E — fourth mutating tool
  (`suggest_missing_elements`) — complete this iteration.

## Last test run
- `pnpm exec vitest run tests/unit/llm` → 73 tests pass (12 new for
  `suggest_missing_elements`).
- `pnpm exec tsc --noEmit` → clean.
- `pnpm exec eslint` on changed files → clean.

## What changed this iteration (commit b2bf40e)
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
- Slice E remaining work: Playwright e2e exercising Accept path with a
  recorded fixture; `@visual` baselines for diff card pending /
  accepted / rejected; `@a11y` scan on diff card. Branch is now 11
  commits ahead of main — slice E PR should be opened next iteration.

## Decisions log
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
Slice E remaining work (all four mutating tools are now in):
1. Playwright e2e exercising the chat Accept path end-to-end using a
   recorded fixture response that calls `create_element`.
2. `@visual` baselines for ProposalCard pending / accepted / rejected
   states on Chromium + WebKit.
3. `@a11y` scan on the diff card.
4. Rebase onto main, open the slice-E PR for #221, enable auto-merge.
