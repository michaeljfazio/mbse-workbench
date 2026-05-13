# STATUS

## Current phase
phase:12 — Export/import + polish (epic #13). Decomposed into 8 slice
issues #231–#238. Slice F (serializer) and G (parser) are the load-
bearing pieces; H is the gate.

## Current iteration
- Iteration #: 467
- Started: 2026-05-14T (local-only)
- Branch: chore/iter-467-phase-11-smoke-and-phase-12-decomposition
- Working on: Phase 11 release wrap-up + phase 12 decomposition.
  - Release `vphase-11` deploy successful (run 25825133376).
  - Pages URL https://michaeljfazio.github.io/mbse-workbench/ HTTP 200.
  - Phase 11 smoke captured in Chromium (8 viewpoints + chat sidebar
    needs-key + API key modal); 11 screenshots uploaded to release
    `vphase-11` assets and linked from issue #230. Issue #230 closed.
  - `scripts/smoke-vphase-11.mjs` committed for reproducibility.
  - Phase 12 slices opened: #231 JSON import/export UI, #232
    empty-state + error boundaries, #233 keyboard shortcuts, #234
    Cmd-K palette, #235 split view, #236 SysMLv2 serializer, #237
    SysMLv2 parser, #238 phase-12 gate. Epic #13 body updated with
    child checklist.

## Last test run
- Phase 11 gate spec (PR #229) passed full CI on d5f135b.
  Typecheck ✓ Lint ✓ Unit ✓ E2E ✓ Build ✓.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — filtered out of gate's @a11y scan.

## Decisions log
- 2026-05-14 (iter-467): Phase 12 slicing — emit element IDs as
  trailing `// id:` comments in SysMLv2 text so round-trip is lossless
  without inventing a non-standard property syntax (slice F/G).
- 2026-05-14 (iter-467): Order phase 12 slices low-risk-first
  (JSON UI, polish, shortcuts) before the heavy SysMLv2 text
  serializer/parser pair — lets a flaky F not block A–E.
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
1. Open PR for `scripts/smoke-vphase-11.mjs` + this STATUS update.
2. After merge, pick the highest-priority `status:ready` phase:12
   issue and begin work. Recommended first pick: #231 (slice A,
   JSON import/export UI) — small, independent, low-risk warm-up
   into the phase 12 codebase.
