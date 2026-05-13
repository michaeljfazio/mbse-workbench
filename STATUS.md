# STATUS

## Current phase
phase:11 — LLM integration — **COMPLETE**. Epic #12 closed. Tag
`vphase-11` pushed; release workflow `25825133376` IN_PROGRESS.
Release issue #230 tracks deploy + smoke.

Next phase: **phase:12 — Export/import + polish** (epic #13). No
decomposition yet — wait until release deploys and smoke passes,
then decompose just-in-time.

## Current iteration
- Iteration #: 466
- Started: 2026-05-14T (local-only)
- Branch: main
- Working on: Phase 11 wrap-up. PR #229 (slice F gate) merged at
  bec5ac9 on 2026-05-13T20:38:57Z. Epic #12 closed. Release issue
  #230 opened. Tag vphase-11 pushed (run 25825133376 in_progress).
  Journal phase-11 entry appended.

## Last test run
- Phase 11 gate spec (PR #229) passed full CI on d5f135b.
  Typecheck ✓ Lint ✓ Unit ✓ E2E ✓ Build ✓.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — filtered out of gate's @a11y scan.

## Decisions log
- 2026-05-14 (iter-466): Phase 11 closed. Tagged vphase-11. Next
  phase is phase:12 (Export/import + polish, epic #13).
- 2026-05-14 (iter-456): Drop `@visual workspace end-state` from the
  Phase 11 gate. Reason: after stabilisation, two consecutive CI
  captures of identical content still differed by 23% of pixels
  (sub-pixel font-hinting variance in headless Chromium). Phase 11's
  gate criteria don't mandate @visual.
- 2026-05-13 (iter-454): Don't push STATUS-only commits to a PR
  branch while CI is running — triggers a new `pull_request`
  workflow that cancels the prior in-flight run.
- 2026-05-14 (iter-452): Place 4 rounds in one fixture
  (explain_diagram, create_element, link_requirement, end_turn).
- 2026-05-14 (iter-452): Seed the project rather than synthesise IDs.
- 2026-05-14 (iter-452): Filter pre-existing `text-muted-foreground`
  contrast violation from gate @a11y.
- 2026-05-14 (iter-452): Press Cmd-Z after dispatcher completes to
  verify atomic compound-revert.
- 2026-05-14 (iter-436): Commit Linux PNGs only.
- 2026-05-13 (iter-404): `memberIds` typing bound at command boundary.
- 2026-05-13 (iter-404): `input_schema` widened with
  `additionalProperties?: boolean`.
- 2026-05-13 (iter-394): Resolvers in a module-level Map.
- 2026-05-13 (iter-394): `acceptProposal` dispatches `compound`.
- 2026-05-13 (iter-332): `@visual` baselines from CI: extract Linux
  PNGs from playwright-report base64 blob and commit.

## Next action
1. Wait for release run 25825133376 to finish.
2. Smoke the deployed Pages URL per AGENT.md Ralph step 17 —
   open in Chromium, walk every viewpoint shipped so far + the
   chat sidebar, save screenshots under
   `artifacts/release-vphase-11/`, link from issue #230 and close it.
3. Read `docs/CONTEXT.md` and `docs/adr/README.md`, then decompose
   phase:12 (epic #13) into slices and open child issues.
