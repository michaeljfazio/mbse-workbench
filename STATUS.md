# STATUS

## Current phase
phase:10 — Requirements traceability. Final child issue **#178 (gate spec)** in flight via PR #207 with auto-merge enabled; once merged, the phase-10 epic (#11) closes via `Closes #178`. Sibling bug: **#161** p2 inspector-transition flake.

## Current iteration
- Iteration #: 130
- Started: 2026-05-13T(poll)
- Branch: `status/iter-130` (docs-only FF PR to main)
- Working on: #178 — gate spec authored, baselines regenerated, PR #207 opened with auto-merge enabled.

## Last test run
- Command: `pnpm exec tsc --noEmit && pnpm exec eslint tests/e2e/phase-10-gate.spec.ts && pnpm exec playwright test tests/e2e/phase-10-gate.spec.ts --project=chromium`
- Result: PASS — typecheck clean, lint clean, 4/4 chromium tests passing in 2.8s. `@visual` skipped locally on darwin per `SKIP_VISUAL_LOCALLY`.
- Failures: n/a

## Known issues / blockers
- #178 — `status:in-progress`, p1. PR #207 open with auto-merge `--squash`. CI in progress as of poll.
- #161 — p2 inspector-transition flake. Still deferred; pick up after phase-10 gate lands.

## Decisions log
- 2026-05-13 (iter-122): Polled CI run `25773308495` — completed `success`; PR #194 auto-merged at `0e0475f` (squash). Closed #176 — verified diff included panel, surface wiring, unit + e2e + a11y + visual baselines.
- 2026-05-13 (iter-123): While scoping #178, discovered the matrix surface does not exist on main — #175 shipped only `src/workspace/requirements/matrix.ts` helpers, no UI tab. Filed design issue #197, picked option A (new feature issue + slicing ladder), filed #198 for the matrix panel itself. Relabelled #178 `status:blocked`.
- 2026-05-13 (iter-124): #198 slice 1 — wrote `RequirementsMatrixPanel.tsx` + 10 unit tests TDD-style. Chose `«s»/«v»/«d»/«r»` guillemet stereotypes per #198 spec. Opened PR #200; auto-merge enabled.
- 2026-05-13 (iter-127): CI run `25773969761` on PR #200 concluded `success`. Discovered prior STATUS doc commits on the PR branch had been cancelling each CI run — loop protocol says STATUS belongs on main via FF PR, not on the feature branch. Lesson recorded in `docs/CONTEXT.md`.
- 2026-05-13 (iter-128): PR #200 merged at `f08fa1f`. Began #198 slice 2: mounted `RequirementsMatrixPanel` behind `requirements-tab-matrix-button`, wired projection + filter state.
- 2026-05-13 (iter-129): PR #202 CI run `25774918400` concluded `success` after 7 min. Auto-merge fired at `b92f40e`; #198 closed. Relabelled #178 `status:blocked` → `status:ready`.
- 2026-05-13 (iter-130): Wrote `tests/e2e/phase-10-gate.spec.ts` (one orchestrated walkthrough + 3 `@a11y` scans + 1 `@visual` baseline). Block + Action seeded; link/matrix/coverage/impact steps exercise real UI. Cross-tab selection uses `project-tree-leaf-<id>` to avoid ReactFlow cross-instance multi-selection. Visual baselines regenerated via `scripts/regen-baselines.sh` in the arm64 Linux container; only the two new `phase-10-final-*` files committed (other rewrites reverted per the iter-25 lesson). Cleaned up three duplicate STATUS PRs (#204, #205 closed as duplicates of #206; #206 itself was the iter-129 follow-on). PR #207 opened against #178; auto-merge `--squash` enabled.

## Next action
Poll PR #207 CI. On green merge: close the phase-10 epic (#11) (auto-closes via `Closes #178`), open a `type:release` issue for the phase, tag `vphase-10` on main, then exercise the deployed release. Append a phase-completion entry to `JOURNAL.md`. On CI red: diagnose and patch on `issue/178-phase-10-gate-spec` (NOT on this STATUS branch).
