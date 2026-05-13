# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D merged. Slice E (#221)
in flight on branch `issue/221-mutating-tools-diff-preview`. Remaining
after E: slice F gate (#222).

## Current iteration
- Iteration #: 398
- Started: 2026-05-13T18:12:00Z
- Branch: issue/221-mutating-tools-diff-preview
- Working on: #221 slice E — fourth mutating tool
  (`propose_decomposition`).

## Last test run
- `pnpm exec vitest run tests/unit/llm` → 61 tests pass (13 new for
  `propose_decomposition`).
- `pnpm exec tsc --noEmit` → clean.
- `pnpm exec eslint` on changed files → clean.

## What changed this iteration (commit be281de)
- New `src/llm/tools/propose-decomposition.ts` exporting:
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
- Registered in `src/llm/tools/index.ts` with `mutating: true`.
- 13 new tests covering happy path, summary singular/plural, missing
  parent, non-PartDefinition parent, duplicate names, sibling collision,
  cross-parent non-collision, name trimming, schema bounds (empty array,
  >20 names, >120-char name), strict extras, and unique id emission.

## What changed prior iterations (commit 1b86145)
- iter-397: new `src/llm/tools/generate-requirements-from-text.ts` exporting:
  - `generateRequirementsFromTextSchema` — strict zod:
    `{ text, owningPackageId?, defaultPriority?, defaultStatus? }` with
    enum-validated priority/status.
  - `generateRequirementsFromTextDefinition` — Anthropic tool definition.
  - `parseRequirementLines(text)` — pure helper. Splits on `\r?\n`,
    strips leading bullet markers (`-`, `*`, `•`, `1.`, `1)`), drops
    lines < 3 chars. Derives a name ≤ 60 chars from the first sentence
    of each line, truncating at a word boundary with an ellipsis.
  - `generateRequirementsFromTextHandler` — validates `owningPackageId`
    if present (must resolve to an existing Package), generates one
    `create-element` command per parsed line, optionally appends an
    `update-element` extending the package's memberIds with the new
    ids. Returns a single ProposedChange whose `id` is the first new
    requirement's id and whose summary names the count + optional
    package id.
- Registered in `src/llm/tools/index.ts` with `mutating: true`. The
  ProposalResolver pathway routes it identically to `create_element`
  and `link_requirement`.
- 14 new tests in
  `tests/unit/llm/tools/generate-requirements-from-text.test.ts`
  covering `parseRequirementLines` (line splitting, bullet stripping,
  blank/too-short drop, sentence-aware naming, ellipsis truncation)
  and the handler (happy path, default priority/status overrides,
  default fallback to medium/draft, owning package append, missing
  package error, non-Package owner error, empty-parse error, schema
  enum rejection, strict-mode extra-property rejection).

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
- Slice E remaining work: 1 more mutating tool (`suggest_missing_elements`);
  Playwright e2e exercising Accept path with a recorded fixture;
  `@visual` baselines for diff card pending / accepted / rejected;
  `@a11y` scan on diff card. Branch is now 10 commits ahead of main —
  slice E PR should be opened once the remaining mutating tool is in.

## Decisions log
- 2026-05-13 (iter-398): `propose_decomposition` rejects child names
  that collide with an *existing direct Composition child of the same
  parent* (case-insensitive), but does NOT block the same name under a
  different parent. Reason: SysMLv2 PartDefinitions are namespace-free
  globally; "Engine" can legitimately exist under both "Truck" and
  "Boat". Blocking globally would force awkward renames during
  decomposition. Per-parent uniqueness matches how users actually read
  a BDD.
- 2026-05-13 (iter-398): One ProposedChange containing 2N commands
  (create + link, paired) rather than separate proposals per child.
  Reason: a decomposition is a single mental act — approving the parent
  → triplet of children as a unit is what the user expects, and a
  single compound undo restores the state cleanly.
- 2026-05-13 (iter-398): Decomposition only creates BDD-level
  Composition edges, not PartUsages on the parent's `propertyIds`.
  Reason: BDD is the structure-definition viewpoint; IBD authoring is
  where PartUsages get instantiated (and the user picks port wiring).
  An LLM-proposed decomposition should not silently pre-populate the
  IBD-level usage tree.
- 2026-05-13 (iter-397): `generate_requirements_from_text` returns ONE
  ProposedChange containing N create-element commands rather than N
  separate proposals. Reason: the user is approving a batch generated
  from a single prose paragraph; per-line accept/reject would force the
  human to triage line-by-line, defeating the point of bulk
  generation. The compound command also gives one-step undo, matching
  the `acceptProposal` always-compound decision from iter-394.
- 2026-05-13 (iter-397): Parsing is server-side (in the tool) rather
  than asking the LLM to pre-split into a structured array. Reason: the
  tool name is `from_text` — the model should be free to paste raw
  prose. Naming heuristic (first sentence ≤ 60 chars, ellipsis at word
  boundary) is deterministic and reviewable in tests; if the LLM later
  wants finer control it can call `create_element` per item instead.
- 2026-05-13 (iter-397): Minimum line length is 3 characters after
  bullet stripping. Lines like `ab`, `a.`, or single tokens almost
  always indicate parse noise (page numbers, stray punctuation), not a
  real requirement. Tested explicitly so the threshold is documented.
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
Continue slice E:
1. Add `suggest_missing_elements` mutating tool — read the current model
   snapshot, propose Requirements/Parts that look obviously missing
   (e.g. heuristics: PartDefinitions with no ports, Requirements with
   no traces). One ProposedChange wrapping create-element +
   link/update commands.
2. Then Playwright e2e (recorded fixture) + `@visual` + `@a11y`
   baselines for the diff card.
3. Open the slice-E PR for #221 once all 4 mutating tools are in.
