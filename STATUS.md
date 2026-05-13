# STATUS

## Current phase
phase:10 — Requirements traceability. Phase 9 closed; `vphase-9` tagged at 82b8262. Phase 10 remaining: **#198 matrix UI panel (slice 1 in PR #200, CI re-running on merge commit)**, **#178 gate spec (blocked on #198)**. Design issue **#197** still open as parent. Sibling bug: **#161** p2 inspector-transition flake.

## Current iteration
- Iteration #: 128
- Started: 2026-05-13T02:22Z
- Branch: `issue/198-matrix-panel-slice1` (PR #200; CI run `25774273615` `in_progress` on merge commit `8122990`)
- Working on: monitoring CI on PR #200's merge commit. No-op iteration on the feature branch (per iter-127 lesson: STATUS does not go to feature branches). This STATUS update lands on main via `chore/status-iter-128`.

## Last test run
- Command: CI run `25774273615` on PR #200 (`check` job)
- Result: `in_progress` (started 02:21:32Z on `8122990`)
- Failures: n/a — prior run `25773969761` on `b779f58` was SUCCESS; this re-run is on the post-merge HEAD.

## Known issues / blockers
- #178 — blocked on #198 (matrix UI panel missing). Slice 1 in PR #200; gate spec unblocks once slice 2 (surface mount) lands.
- #161 — p2 inspector-transition flake. Still deferred; pick up after phase-10 gate lands.

## Decisions log
- 2026-05-13 (iter-122): Polled CI run `25773308495` — completed `success`; PR #194 auto-merged at `0e0475f` (squash). Closed #176 — verified diff included panel, surface wiring, unit + e2e + a11y + visual baselines.
- 2026-05-13 (iter-123): While scoping #178, discovered the matrix surface does not exist on main — #175 shipped only `src/workspace/requirements/matrix.ts` helpers, no UI tab. `grep -rn buildTraceabilityMatrix src/ --include='*.tsx'` returns nothing. Filed design issue #197 with three resolution options, picked option A (new feature issue + slicing ladder), filed #198 for the matrix panel itself. Relabelled #178 `status:blocked`. Journal entry added under the design-decision notable-moment rule.
- 2026-05-13 (iter-124): #198 slice 1 — wrote `RequirementsMatrixPanel.tsx` + 10 unit tests TDD-style. Chose `«s»/«v»/«d»/«r»` guillemet stereotypes per #198 spec rather than reusing the bare `S/V/D/R` glyphs in `matrix.ts`. Pure props-only; selection callback fires from both the row label and non-empty cells. Opened PR #200; auto-merge enabled.
- 2026-05-13 (iter-127): CI run `25773969761` on PR #200 concluded `success`. Discovered prior STATUS doc commits on the PR branch (iter-124..126) had been cancelling each CI run and preventing convergence — loop protocol says STATUS belongs on main via FF PR, not on the feature branch. Lesson recorded in `docs/CONTEXT.md`. Resolved post-CI DIRTY (origin/main advanced with #199's iter-123 cherry-pick) by merging origin/main and taking the slice-1 superset of STATUS.
- 2026-05-13 (iter-128): Merge commit `8122990` pushed; CI re-running as `25774273615`. STATUS now updated on main via `chore/status-iter-128` worktree to avoid touching the feature branch.

## Next action
Wait for CI run `25774273615` to converge. On green, GitHub auto-merge squashes PR #200 and closes slice 1 of #198. Then start slice 2 from fresh `issue/198-matrix-panel-slice2` off main: mount `RequirementsMatrixPanel` on `RequirementsSurface` as a `requirements-tab-matrix-button` sibling, wire `buildTraceabilityMatrix(elements, edges)` selector and filter state. **Do not push STATUS commits to feature branches.**
