# STATUS

## Current phase
phase:10 — Requirements traceability. Phase 9 closed; `vphase-9` tagged at 82b8262. Phase 10 remaining: **#198 matrix UI panel (ready, blocks #178)**, **#178 gate spec (blocked on #198)**. Newly filed design: **#197**. Sibling bug: **#161** p2 inspector-transition flake.

## Current iteration
- Iteration #: 123
- Started: 2026-05-13T (later)Z
- Branch: `issue/197-status-design-matrix-gap` (STATUS + JOURNAL only)
- Working on: design-decision iteration — filed #197 (design) and #198 (feature), blocked #178 on #198. Closed #176 (all acceptance landed in 0e0475f). PR #194 merged; `check` run 25773308495 concluded `success`.

## Last test run
- Command: (CI on main) — PR #194 squash-merged to `0e0475f`; `check` run `25773308495` `success` 02:00:51Z.
- Result: PASS
- Failures: n/a

## Known issues / blockers
- #178 — blocked on #198 (matrix UI panel missing). Gate body step 4 ("Open the matrix, assert glyphs…") needs a real surface, not just the `buildTraceabilityMatrix` helper that #175 shipped.
- #161 — p2 inspector-transition flake. Still deferred; pick up after phase-10 gate lands.

## Decisions log
- 2026-05-13 (iter-122): Polled CI run `25773308495` — completed `success`; PR #194 auto-merged at `0e0475f` (squash). Closed #176 — verified diff included panel, surface wiring, unit + e2e + a11y + visual baselines.
- 2026-05-13 (iter-123): While scoping #178, discovered the matrix surface does not exist on main — #175 shipped only `src/workspace/requirements/matrix.ts` helpers, no UI tab. `grep -rn buildTraceabilityMatrix src/ --include='*.tsx'` returns nothing. Filed design issue #197 with three resolution options, picked option A (new feature issue + slicing ladder), filed #198 for the matrix panel itself. Relabelled #178 `status:blocked`. Journal entry added under the design-decision notable-moment rule.

## Next action
Next iteration: pick up #198 slice 1 — pure `RequirementsMatrixPanel` component + unit tests, no surface coupling. Use the #173 / #176 slicing pattern verbatim. Fresh branch `issue/198-matrix-panel-slice1` from main.
