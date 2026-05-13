# STATUS

## Current phase
phase:10 — Requirements traceability. Phase 9 closed; `vphase-9` tagged at 82b8262. Phase 10 remaining: **#198 matrix UI panel (slice 1 merged via PR #200 at `f08fa1f`; slice 2 in progress)**, **#178 gate spec (blocked on #198)**. Design issue **#197** still open as parent. Sibling bug: **#161** p2 inspector-transition flake.

## Current iteration
- Iteration #: 128
- Started: 2026-05-13T(poll)
- Branch: `issue/198-matrix-panel-slice2`
- Working on: #198 slice 2 — mount `RequirementsMatrixPanel` on `RequirementsSurface` as a 3rd tab beside Editor/Coverage.

## Last test run
- Command: `pnpm typecheck && pnpm vitest run tests/unit/workspace/RequirementsSurface.test.tsx tests/unit/workspace/RequirementsMatrixPanel.test.tsx && pnpm lint`
- Result: PASS (typecheck clean; 36 tests pass across the two files; 0 lint errors, 4 pre-existing warnings)
- Failures: n/a

## Known issues / blockers
- #178 — blocked on #198. Gate spec unblocks once slice 3 (e2e + @a11y + @visual) lands; slice 2 in PR shortly.
- #161 — p2 inspector-transition flake. Still deferred; pick up after phase-10 gate lands.

## Decisions log
- 2026-05-13 (iter-122): Polled CI run `25773308495` — completed `success`; PR #194 auto-merged at `0e0475f` (squash). Closed #176 — verified diff included panel, surface wiring, unit + e2e + a11y + visual baselines.
- 2026-05-13 (iter-123): While scoping #178, discovered the matrix surface does not exist on main — #175 shipped only `src/workspace/requirements/matrix.ts` helpers, no UI tab. `grep -rn buildTraceabilityMatrix src/ --include='*.tsx'` returns nothing. Filed design issue #197 with three resolution options, picked option A (new feature issue + slicing ladder), filed #198 for the matrix panel itself. Relabelled #178 `status:blocked`. Journal entry added under the design-decision notable-moment rule.
- 2026-05-13 (iter-124): #198 slice 1 — wrote `RequirementsMatrixPanel.tsx` + 10 unit tests TDD-style. Chose `«s»/«v»/«d»/«r»` guillemet stereotypes per #198 spec rather than reusing the bare `S/V/D/R` glyphs in `matrix.ts` (those serve a different purpose, originally intended for an unbuilt CSV/text export). Pure props-only; selection callback fires from both the row label and from non-empty cells, so the user can click anywhere along a row's link to focus the requirement in the Inspector. Opened PR #200; auto-merge enabled.
- 2026-05-13 (iter-127): CI run `25773969761` on PR #200 concluded `success`. Discovered prior STATUS doc commits on the PR branch (iter-124..126) had been cancelling each CI run and preventing convergence — loop protocol says STATUS belongs on main via FF PR, not on the feature branch. Lesson recorded in `docs/CONTEXT.md`. Resolved post-CI DIRTY (origin/main advanced with #199's iter-123 cherry-pick) by merging origin/main and taking the slice-1 superset of STATUS.
- 2026-05-13 (iter-128): PR #200 merged at `f08fa1f`. Began #198 slice 2: added `'matrix'` to `RequirementsSurfaceTab` union in `store.ts`, mounted `RequirementsMatrixPanel` behind a new `requirements-tab-matrix-button` tab in `RequirementsSurface.tsx`, wired `buildTraceabilityMatrix(elements, edges)` + `filterMatrix({text})` with local filter state (mirrors the local query state of the Editor tab — surface state is ephemeral, not persisted). Added 4 unit tests covering button presence/aria-controls, tab swap, glyph rendering + cell-click selection, and filter narrowing. 36 tests green locally; typecheck + lint clean.

## Next action
Commit slice 2, push branch, open PR closing #198 (deferred until slice 3 ships e2e). Per AGENT.md: STATUS edits go through FF PRs to main, NOT on the feature branch — so commit code only on `issue/198-matrix-panel-slice2`, and update STATUS via a separate PR to main after the feature PR opens.
