# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D merged. Slice E
(#221) PR #228 — auto-merge armed. Iter-436 commits Linux baselines for
`proposal-card-pending.png` (chromium + webkit) extracted from
playwright-report run 25793854867.

## Current iteration
- Iteration #: 446
- Started: 2026-05-14
- Branch: issue/221-mutating-tools-diff-preview
- Working on: #221 slice E — CI run 25820690853 had been stuck
  in_progress for 22+ hours on the E2E step (started
  2026-05-13T19:13:33Z), well past GitHub Actions' 6-hour job timeout.
  Cancelled the stuck run via `gh run cancel` and re-triggered it with
  `gh run rerun 25820690853`. Same run id, now `queued` again on head
  0261ff8. mergeStateStatus=BLOCKED until the new attempt completes;
  auto-merge remains armed.

## Last test run
- CI run 25820690853 on 0261ff8 PENDING (latest head, iter-443).
- CI run 25820465557 on b355461 superseded.
- CI run 25820423170 on 8dc8b24 superseded by the iter-441 status push.
- CI run 25820383152 on a2e063c superseded by the iter-440 status push.
- CI run 25820331886 on b82bd199 superseded by the iter-439 status push.
- Prior runs: 25820296495 on 539ea84 still in_progress; 25820258140
  on fade5d2 cancelled by newer push.
- Prior CI run 25793854867 on ea02f73 FAILED with exactly the predicted
  cause: `A snapshot doesn't exist at …/proposal-card-pending-{chromium,webkit}.png,
  writing actual.` Phase-6 flake was marked flaky and passed on retry
  (517 passed, 2 failed = visual baseline misses).
- Extracted both Linux actuals from the playwright-report artifact:
  - chromium: data/a26ab09c8…png (335×128)
  - webkit:   data/d593350a4…png (335×128)
- Committed under
  `tests/e2e/__screenshots__/chat-proposal-accept.spec.ts/`.

## How the baselines were obtained
- `gh run download 25793854867 -n playwright-report` →
  `index.html` contains a `window.playwrightReportBase64` data URI
  zip; decoded with python, the JSON manifest
  (`643257f5d295b65cfaec.json`) maps each test's `attachments[].path`
  to a `data/<sha>.png`. The "expected" attachment (Playwright writes
  the actual to that slot on first run) is the file to commit.
- Recorded the recipe in `docs/CONTEXT.md` (iter-332 entry already
  covers the general approach; today's extraction matches).

## Known issues / blockers
- #161 — p2 inspector-transition flake. Phase-6 retry passed on this
  run; deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — deferred from slice C.

## Decisions log
- 2026-05-14 (iter-436): Commit Linux PNGs only. macOS contributors
  generate their own host baselines locally via Playwright
  `--update-snapshots`; CI only runs Linux so committing Linux PNGs
  is sufficient for the gate.
- 2026-05-13 (iter-404): Fix `memberIds` typing by binding the command
  to `UpdateElementCommand<'Package'>` rather than casting the patch.
  Reason: keeps the type narrative at the command boundary.
- 2026-05-13 (iter-404): Widened `input_schema` to allow
  `additionalProperties?: boolean` rather than removing the flag from
  call sites.
- 2026-05-13 (iter-400): Accept-path e2e asserts the new "Pump" leaf
  appears in `project-tree` (not the BDD canvas).
- 2026-05-13 (iter-400): Reject-path e2e asserts dispatcher resumes
  but no `Pump` leaf is created.
- 2026-05-13 (iter-400): `@visual` baseline scoped to the
  `proposal-card` locator.
- 2026-05-13 (iter-399): `suggest_missing_elements` heuristic = parts
  with no incoming RequirementTrace of any kind.
- 2026-05-13 (iter-399): Throws if no candidates rather than empty
  ProposedChange.
- 2026-05-13 (iter-399): Placeholder Requirement text is generic.
- 2026-05-13 (iter-399): Default maxSuggestions = 5, hard max = 20.
- 2026-05-13 (iter-398): `propose_decomposition` rejects child names
  that collide under the same parent only (case-insensitive).
- 2026-05-13 (iter-398): One ProposedChange containing 2N commands.
- 2026-05-13 (iter-398): Decomposition creates BDD-level Composition
  edges, not PartUsages.
- 2026-05-13 (iter-397): `generate_requirements_from_text` returns ONE
  ProposedChange with N create-element commands.
- 2026-05-13 (iter-397): Parsing is server-side.
- 2026-05-13 (iter-397): Minimum line length is 3 chars after bullet
  stripping.
- 2026-05-13 (iter-396): `link_requirement` rejects exact-duplicate
  traces but allows a different kind between the same pair.
- 2026-05-13 (iter-396): Requirement is `sourceId`; element is
  `targetId`.
- 2026-05-13 (iter-395): `ProposalCard` shows command kinds as bullets.
- 2026-05-13 (iter-395): Accept/Reject disabled on click.
- 2026-05-13 (iter-394): Resolvers in a module-level Map.
- 2026-05-13 (iter-394): `acceptProposal` dispatches `compound`.
- 2026-05-13 (iter-355): main may advance faster than CI; rebase as
  needed.
- 2026-05-13 (iter-332): `@visual` baselines from CI: extract Linux
  PNGs from playwright-report base64 blob and commit.

## Next action
1. Push the baseline commit; wait for CI; auto-merge should fire on green.
2. After #228 merges, move to slice F (#222) — phase 11 gate.
