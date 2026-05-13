# STATUS

## Current phase
phase:10 — Requirements traceability. Phase 9 closed; `vphase-9` tagged at 82b8262. Phase 10 remaining: **#198 matrix UI panel (slice 1 in PR #200, auto-merge enabled)**, **#178 gate spec (blocked on #198)**. Design issue **#197** still open as parent. Sibling bug: **#161** p2 inspector-transition flake.

## Current iteration
- Iteration #: 124
- Started: 2026-05-13T10:08Z
- Branch: `issue/198-matrix-panel-slice1` (PR #200 opened, auto-merge enabled)
- Working on: #198 slice 1 — pure `RequirementsMatrixPanel` component + 10 unit tests. No surface coupling. Slice 2 will mount on `RequirementsSurface`; slice 3 e2e/@a11y/@visual. Also cherry-picked iter-123 STATUS+JOURNAL forward (the previous iter's design-decision commit `53ba48e` was made on a STATUS-only branch that was never PR'd to main).

## Last test run
- Command: `pnpm vitest run` (full unit suite); also targeted `pnpm vitest run tests/unit/workspace/RequirementsMatrixPanel.test.tsx`
- Result: PASS — 10/10 new tests; 700/700 across 63 files. `pnpm typecheck` clean. `pnpm lint` clean (4 pre-existing warnings, unrelated to this slice).
- Failures: n/a

## Known issues / blockers
- #178 — blocked on #198 (matrix UI panel missing). Slice 1 in PR #200; gate spec unblocks once slice 2 (surface mount) lands.
- #161 — p2 inspector-transition flake. Still deferred; pick up after phase-10 gate lands.

## Decisions log
- 2026-05-13 (iter-122): Polled CI run `25773308495` — completed `success`; PR #194 auto-merged at `0e0475f` (squash). Closed #176 — verified diff included panel, surface wiring, unit + e2e + a11y + visual baselines.
- 2026-05-13 (iter-123): While scoping #178, discovered the matrix surface does not exist on main — #175 shipped only `src/workspace/requirements/matrix.ts` helpers, no UI tab. `grep -rn buildTraceabilityMatrix src/ --include='*.tsx'` returns nothing. Filed design issue #197 with three resolution options, picked option A (new feature issue + slicing ladder), filed #198 for the matrix panel itself. Relabelled #178 `status:blocked`. Journal entry added under the design-decision notable-moment rule. **Note:** that iteration's docs commit (`53ba48e`) was made on a transient branch and never PR'd; iter-124 cherry-picks it forward so STATUS and JOURNAL reach main.
- 2026-05-13 (iter-124): #198 slice 1 — wrote `RequirementsMatrixPanel.tsx` + 10 unit tests TDD-style. Chose `«s»/«v»/«d»/«r»` guillemet stereotypes per #198 spec rather than reusing the bare `S/V/D/R` glyphs in `matrix.ts` (those serve a different purpose, originally intended for an unbuilt CSV/text export). Pure props-only; selection callback fires from both the row label and from non-empty cells, so the user can click anywhere along a row's link to focus the requirement in the Inspector. Opened PR #200; auto-merge enabled.

## Next action
Poll PR #200 CI. Once merged, pick up #198 slice 2: mount `RequirementsMatrixPanel` on `RequirementsSurface` as `requirements-tab-matrix-button` (sibling of editor + coverage), wire up store-backed projection (`buildTraceabilityMatrix(elements, edges)` selector) and filter state. Fresh branch `issue/198-matrix-panel-slice2` from main once #200 squashes.
