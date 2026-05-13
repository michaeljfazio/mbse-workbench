# STATUS

## Current phase
phase:10 — Requirements traceability. Phase 9 closed; `vphase-9` tagged at 82b8262. Phase 10 remaining: **#198 matrix UI panel (slice 1 in PR #200, CI green, merging)**, **#178 gate spec (blocked on #198)**. Design issue **#197** still open as parent. Sibling bug: **#161** p2 inspector-transition flake.

## Current iteration
- Iteration #: 127
- Started: 2026-05-13T(poll)
- Branch: `issue/198-matrix-panel-slice1` (PR #200; CI run `25773969761` SUCCESS; resolved DIRTY after #199 landed)
- Working on: merge conflict resolution on STATUS.md (origin/main got iter-123 via #199). Re-pushing merge commit so auto-merge can squash.

## Last test run
- Command: CI run `25773969761` on PR #200 (`check` job)
- Result: SUCCESS (completed 2026-05-13)
- Failures: n/a

## Known issues / blockers
- #178 — blocked on #198 (matrix UI panel missing). Slice 1 in PR #200; gate spec unblocks once slice 2 (surface mount) lands.
- #161 — p2 inspector-transition flake. Still deferred; pick up after phase-10 gate lands.

## Decisions log
- 2026-05-13 (iter-122): Polled CI run `25773308495` — completed `success`; PR #194 auto-merged at `0e0475f` (squash). Closed #176 — verified diff included panel, surface wiring, unit + e2e + a11y + visual baselines.
- 2026-05-13 (iter-123): While scoping #178, discovered the matrix surface does not exist on main — #175 shipped only `src/workspace/requirements/matrix.ts` helpers, no UI tab. `grep -rn buildTraceabilityMatrix src/ --include='*.tsx'` returns nothing. Filed design issue #197 with three resolution options, picked option A (new feature issue + slicing ladder), filed #198 for the matrix panel itself. Relabelled #178 `status:blocked`. Journal entry added under the design-decision notable-moment rule.
- 2026-05-13 (iter-124): #198 slice 1 — wrote `RequirementsMatrixPanel.tsx` + 10 unit tests TDD-style. Chose `«s»/«v»/«d»/«r»` guillemet stereotypes per #198 spec rather than reusing the bare `S/V/D/R` glyphs in `matrix.ts` (those serve a different purpose, originally intended for an unbuilt CSV/text export). Pure props-only; selection callback fires from both the row label and from non-empty cells, so the user can click anywhere along a row's link to focus the requirement in the Inspector. Opened PR #200; auto-merge enabled.
- 2026-05-13 (iter-127): CI run `25773969761` on PR #200 concluded `success`. Discovered prior STATUS doc commits on the PR branch (iter-124..126) had been cancelling each CI run and preventing convergence — loop protocol says STATUS belongs on main via FF PR, not on the feature branch. Lesson recorded in `docs/CONTEXT.md`. Resolved post-CI DIRTY (origin/main advanced with #199's iter-123 cherry-pick) by merging origin/main and taking the slice-1 superset of STATUS.

## Next action
Push the merge commit to `issue/198-matrix-panel-slice1`. Auto-merge will squash once `check` re-runs green. Then pick up #198 slice 2: mount `RequirementsMatrixPanel` on `RequirementsSurface` as `requirements-tab-matrix-button` sibling, wire `buildTraceabilityMatrix(elements, edges)` selector and filter state. Fresh branch `issue/198-matrix-panel-slice2` from main once #200 squashes. **Do not push STATUS commits to the feature branch.**
