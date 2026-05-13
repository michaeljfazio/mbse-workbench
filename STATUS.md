# STATUS

## Current phase
phase:12 — Export/import + polish. Epic #13 OPEN. Slices A/F/G/H merged.
Open child slices: B (#232 in-progress this iter), C (#233), D (#234),
E (#235).

## Current iteration
- Iteration #: 517
- Started: 2026-05-13T22:52:00Z
- Branch: issue/232-empty-state-error-boundaries
- Working on: #232 slice B — Empty-state UX & error boundaries.
  PR not yet opened; iteration just committed locally. Push +
  PR-open next.

## Last health check (iter-480)
- Pages https://michaeljfazio.github.io/mbse-workbench/ → 200 ✓
- Last 5 merged PRs (#243, #242, #241, #240, #239) all merged ✓
- 0 open `status:needs-human` issues ✓
- Last 3 CI runs on `main` all `success` ✓

## Last test run
- `pnpm exec tsc -b` ✓
- `pnpm lint` ✓ (4 pre-existing react-refresh warnings)
- `pnpm run test:unit` ✓ 857/857 (incl. new 3 ErrorBoundary tests)
- `pnpm exec playwright test empty-state-error-boundary --project=chromium` ✓ 5/5
- `pnpm exec playwright test empty-state-error-boundary --project=webkit` ✓ 5/5
- @visual NOT runnable locally on darwin; CI will generate. Expected
  bdd-empty baseline drift this PR (new empty-state CTA replaces the
  blank BDD canvas). Will refresh via the CI-extract pattern per
  docs/CONTEXT.md iter-332.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- bdd-empty visual baseline (chromium+webkit) drifts this PR — new
  empty-state CTA replaces the blank BDD canvas. Justified in PR
  body; refresh PNGs from CI artifact next iter if CI is red on
  @visual.

## Decisions log
- 2026-05-13 (iter-517): Slice B empty-state gated to BDD viewpoint
  only — Activity/State Machine/Use Case/Parametric/Package have
  their own `*-empty` baselines that intentionally show a blank
  canvas. Empty-state is the BDD entry-point experience.
- 2026-05-13 (iter-517): Boundaries use a window-flag test seam
  (`__WORKSPACE_FORCE_ERROR__`) read by a tiny <ErrorTestThrower/>
  embedded in each boundary. No production code path writes the
  flag, so the harness is a strict no-op outside e2e.
- 2026-05-13 (iter-517): Three boundaries — `canvas`,
  `requirements`, `chat`. Inspector is not wrapped (slice B
  acceptance lists "each diagram surface, requirements, chat"; the
  Inspector is too tightly coupled to selection state to recover
  via a local reset).
- 2026-05-14 (iter-501): Slice A JSON import/export shape (kept).
- 2026-05-13 (iter-492): UTC clock-check (kept).
- 2026-05-14 (iter-485): Phase 12 gate short diagram names (kept).
- 2026-05-14 (iter-485): Phase 12 gate elements+edges only (kept).
- 2026-05-14 (iter-477): parametric-empty baseline refresh (kept).
- 2026-05-14 (iter-469): Slice G parser tokenizer (kept).
- 2026-05-14 (iter-469): Forward-reference resolution (kept).
- 2026-05-14 (iter-469): `importSysmlText` rebuilds bus (kept).
- 2026-05-14 (iter-467): Phase 12 slice F serializer (kept).
- 2026-05-14 (iter-466): Phase 11 closed. Tagged vphase-11.
- 2026-05-14 (iter-456): Drop `@visual workspace end-state` (kept).
- 2026-05-13 (iter-454): No STATUS-only commits while CI runs.
- 2026-05-14 (iter-452): 4 rounds in one LLM fixture.
- 2026-05-14 (iter-452): Seed the project rather than synthesise IDs.
- 2026-05-14 (iter-452): Filter pre-existing contrast violation.
- 2026-05-14 (iter-452): Cmd-Z verifies compound-revert.
- 2026-05-14 (iter-436): Commit Linux PNGs only.
- 2026-05-13 (iter-404): `memberIds` typing at command boundary.
- 2026-05-13 (iter-404): `input_schema` widened.
- 2026-05-13 (iter-394): Resolvers in module-level Map.
- 2026-05-13 (iter-394): `acceptProposal` dispatches `compound`.
- 2026-05-13 (iter-332): @visual baselines from CI Linux artifact.

## Next action
1. Commit + push branch `issue/232-empty-state-error-boundaries`,
   open PR with `Closes #232`, enable auto-merge --squash.
2. PR will likely fail @visual `bdd-empty` chromium+webkit on first
   CI run (drift is intentional). Next iter: extract Linux PNGs
   from CI report and commit refreshed baseline.
3. After merge, pick next slice (#233) in following iteration.
