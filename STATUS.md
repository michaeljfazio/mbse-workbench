# STATUS

## Current phase
phase:10 — Requirements traceability. Phase 9 closed; `vphase-9` tagged at 82b8262. Phase 10 remaining: **#198 matrix UI panel (slice 1 merged at `f08fa1f`; slice 2 in PR #202 — CI in progress; slice 3 e2e/@a11y/@visual still to ship)**, **#178 gate spec (blocked on #198 slice 3)**. Design issue **#197** still open as parent. Sibling bug: **#161** p2 inspector-transition flake.

## Current iteration
- Iteration #: 129
- Started: 2026-05-13T(poll)
- Branch: `docs/iteration-129-poll-202` (STATUS-only; feature branch `issue/198-matrix-panel-slice2` is on PR #202 with auto-merge enabled)
- Working on: polling PR #202 — CI run `25774918400`. As of poll: typecheck/lint/unit/build/Playwright-install all green; E2E job in progress since 02:42:16 UTC. Auto-merge SQUASH enabled by `michaeljfazio` at 02:32:07 UTC; PR will merge automatically on green.

## Last test run
- Command: (CI on PR #202 — local `pnpm check` last green at iter-128)
- Result: IN PROGRESS upstream
- Failures: n/a so far

## Known issues / blockers
- #198 — slice 2 CI in flight. If green, branch auto-merges; pick up slice 3 (e2e/@a11y/@visual) next iteration.
- #178 — blocked on #198 slice 3. Gate spec unblocks once visual + a11y baselines for the matrix tab land.
- #161 — p2 inspector-transition flake. Still deferred; pick up after phase-10 gate lands.

## Decisions log
- 2026-05-13 (iter-122): Polled CI run `25773308495` — completed `success`; PR #194 auto-merged at `0e0475f` (squash). Closed #176 — verified diff included panel, surface wiring, unit + e2e + a11y + visual baselines.
- 2026-05-13 (iter-123): While scoping #178, discovered the matrix surface does not exist on main — #175 shipped only `src/workspace/requirements/matrix.ts` helpers, no UI tab. `grep -rn buildTraceabilityMatrix src/ --include='*.tsx'` returns nothing. Filed design issue #197 with three resolution options, picked option A (new feature issue + slicing ladder), filed #198 for the matrix panel itself. Relabelled #178 `status:blocked`. Journal entry added under the design-decision notable-moment rule.
- 2026-05-13 (iter-124): #198 slice 1 — wrote `RequirementsMatrixPanel.tsx` + 10 unit tests TDD-style. Chose `«s»/«v»/«d»/«r»` guillemet stereotypes per #198 spec rather than reusing the bare `S/V/D/R` glyphs in `matrix.ts` (those serve a different purpose, originally intended for an unbuilt CSV/text export). Pure props-only; selection callback fires from both the row label and from non-empty cells, so the user can click anywhere along a row's link to focus the requirement in the Inspector. Opened PR #200; auto-merge enabled.
- 2026-05-13 (iter-127): CI run `25773969761` on PR #200 concluded `success`. Discovered prior STATUS doc commits on the PR branch (iter-124..126) had been cancelling each CI run and preventing convergence — loop protocol says STATUS belongs on main via FF PR, not on the feature branch. Lesson recorded in `docs/CONTEXT.md`. Resolved post-CI DIRTY (origin/main advanced with #199's iter-123 cherry-pick) by merging origin/main and taking the slice-1 superset of STATUS.
- 2026-05-13 (iter-128): PR #200 merged at `f08fa1f`. Began #198 slice 2: added `'matrix'` to `RequirementsSurfaceTab` union in `store.ts`, mounted `RequirementsMatrixPanel` behind a new `requirements-tab-matrix-button` tab in `RequirementsSurface.tsx`, wired `buildTraceabilityMatrix(elements, edges)` + `filterMatrix({text})` with local filter state (mirrors the local query state of the Editor tab — surface state is ephemeral, not persisted). Added 4 unit tests covering button presence/aria-controls, tab swap, glyph rendering + cell-click selection, and filter narrowing. 36 tests green locally; typecheck + lint clean. PR #202 opened with auto-merge SQUASH; STATUS forward via PR #203 (`f3e72ea`).
- 2026-05-13 (iter-129): Polling CI run `25774918400` on PR #202. Static checks + unit + build all green; E2E in progress. No drift, no DIRTY. Auto-merge will land slice 2 on green. Per iter-127 lesson, STATUS update goes via this FF PR to main, NOT on the feature branch — committing to `issue/198-matrix-panel-slice2` would cancel the in-flight CI run.

## Next action
Wait for CI on PR #202 to finish. If green: auto-merge lands slice 2, then start #198 slice 3 (e2e covers tab switch + filter + cell-click→Inspector selection, plus a `@visual` baseline of the matrix tab and an `@a11y` axe scan). If red: triage failure, push fix to feature branch (still auto-merge). Iteration is otherwise idle.
