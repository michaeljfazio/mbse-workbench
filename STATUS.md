# STATUS

## Current phase
phase:10 — Requirements traceability. Phase 9 closed; `vphase-9` tagged at 82b8262. Matrix panel UI (#198) now complete — slice 1 PR #200 at `f08fa1f`, slice 2 PR #202 at `b92f40e`. Remaining phase-10 feature work: **#178 gate spec (e2e end-to-end traceability walkthrough)**, now `status:ready`. Sibling bug: **#161** p2 inspector-transition flake.

## Current iteration
- Iteration #: 129
- Started: 2026-05-13T(poll)
- Branch: `status/iter-129` (docs-only FF PR to main)
- Working on: iter 128 closeout — polled PR #202 CI (`25774918400`) to `success`; PR auto-merged; #198 closed; #178 unblocked.

## Last test run
- Command: CI run `25774918400` on PR #202 (full `check`: typecheck + lint + unit + build + e2e + a11y + visual)
- Result: PASS — all jobs green; PR #202 auto-merged at `b92f40e` via squash.
- Failures: n/a

## Known issues / blockers
- #178 — `status:ready`, p1. End-to-end traceability gate spec. Now actionable: walk a fresh project through create-element → create-requirement → derive/satisfy/verify link → assert matrix cell glyph → assert coverage delta → impact-analysis highlight. Owns the phase-10 closeout gate.
- #161 — p2 inspector-transition flake. Still deferred; pick up after phase-10 gate lands.

## Decisions log
- 2026-05-13 (iter-122): Polled CI run `25773308495` — completed `success`; PR #194 auto-merged at `0e0475f` (squash). Closed #176 — verified diff included panel, surface wiring, unit + e2e + a11y + visual baselines.
- 2026-05-13 (iter-123): While scoping #178, discovered the matrix surface does not exist on main — #175 shipped only `src/workspace/requirements/matrix.ts` helpers, no UI tab. `grep -rn buildTraceabilityMatrix src/ --include='*.tsx'` returns nothing. Filed design issue #197 with three resolution options, picked option A (new feature issue + slicing ladder), filed #198 for the matrix panel itself. Relabelled #178 `status:blocked`. Journal entry added under the design-decision notable-moment rule.
- 2026-05-13 (iter-124): #198 slice 1 — wrote `RequirementsMatrixPanel.tsx` + 10 unit tests TDD-style. Chose `«s»/«v»/«d»/«r»` guillemet stereotypes per #198 spec rather than reusing the bare `S/V/D/R` glyphs in `matrix.ts` (those serve a different purpose, originally intended for an unbuilt CSV/text export). Pure props-only; selection callback fires from both the row label and from non-empty cells, so the user can click anywhere along a row's link to focus the requirement in the Inspector. Opened PR #200; auto-merge enabled.
- 2026-05-13 (iter-127): CI run `25773969761` on PR #200 concluded `success`. Discovered prior STATUS doc commits on the PR branch (iter-124..126) had been cancelling each CI run and preventing convergence — loop protocol says STATUS belongs on main via FF PR, not on the feature branch. Lesson recorded in `docs/CONTEXT.md`. Resolved post-CI DIRTY (origin/main advanced with #199's iter-123 cherry-pick) by merging origin/main and taking the slice-1 superset of STATUS.
- 2026-05-13 (iter-128): PR #200 merged at `f08fa1f`. Began #198 slice 2: added `'matrix'` to `RequirementsSurfaceTab` union in `store.ts`, mounted `RequirementsMatrixPanel` behind a new `requirements-tab-matrix-button` tab in `RequirementsSurface.tsx`, wired `buildTraceabilityMatrix(elements, edges)` + `filterMatrix({text})` with local filter state (mirrors the local query state of the Editor tab — surface state is ephemeral, not persisted). Added 4 unit tests covering button presence/aria-controls, tab swap, glyph rendering + cell-click selection, and filter narrowing. 36 tests green locally; typecheck + lint clean.
- 2026-05-13 (iter-129): PR #202 CI run `25774918400` concluded `success` after 7 min (typecheck/lint/unit/build/playwright-install all clean; e2e+@a11y+@visual green). Auto-merge fired at `b92f40e`; #198 closed via `Closes #198` in PR body. Confirmed merge cleanly fast-forwards main; deleted local `issue/198-matrix-panel-slice2` (was 228cc09). Relabelled #178 `status:blocked` → `status:ready` — matrix surface now exists on main, gate spec can target the real DOM (`requirements-tab-matrix-button`, matrix table aria-label, cell glyphs `«s»/«v»/«d»/«r»`).

## Next action
Pick up #178: write end-to-end Playwright spec under `tests/e2e/` that walks a fresh project through requirement creation → link to BDD block via derive/satisfy/verify → matrix cell glyph assertion → coverage panel delta → impact-analysis highlight set. Include `@visual` baseline of the matrix tab populated and `@a11y` scan. Test-first: scaffold the spec to fail against current state, identify any missing surface affordances (most likely: impact-analysis highlighting may not exist on main — verify before writing implementation issues), then implement to green. Slice if scope balloons.
