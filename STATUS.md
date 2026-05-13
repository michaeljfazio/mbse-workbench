# STATUS

## Current phase
phase:10 — Requirements traceability. Phase 9 closed; `vphase-9` tagged at 82b8262. Phase 10 remaining: **#176 coverage panel (in-progress; PR #194 in CI)**, **#178 gate spec (ready, gated on #176)**. Sibling bug: **#161** p2 inspector-transition flake.

## Current iteration
- Iteration #: 109
- Started: 2026-05-13T01:51Z
- Branch: `issue/176-coverage-panel-slice1`
- Working on: **PR #194 (coverage panel slice 1)** — auto-merge SQUASH enabled, MERGEABLE, mergeStateStatus BLOCKED only on the `check` status which is IN_PROGRESS. Fresh run `25773256002` on HEAD `97a5513` started 2026-05-13T01:50:55Z. PR #195 and PR #196 (downstream slices 2/3 in the slice-1 stack) already MERGED into the slice-1 branch and are included in #194's diff.
- Prior CI history on this HEAD lineage: `c170854` failed, `4194aa2` failed (test ID mismatch — fixed at 4194aa2 by aligning testid to the `-button` suffix the SurfaceTab actually renders), then `97a5513` adopted CI actuals for 4 new/drifted visual baselines. New run is the first CI run after both fixes are in.

## Last test run
- Command: (CI) — `check` status on `97a5513`
- Result: IN_PROGRESS (run `25773256002`)
- Failures: n/a yet

## Known issues / blockers
- #194 — DIRTY/CONFLICTING recurrence on the slice-1 long-lived branch each time `main` lands a STATUS.md commit. Mitigation rule for the rest of phase 10: **do not write a STATUS.md commit on `main` while #194 is awaiting auto-merge.** Once #194 squashes, the slice-1 branch dies and the structural conflict trap is gone. This iter's STATUS write lives on `slice-1` only — not main — to preserve that rule.
- #161 — p2 flake. Defer until #176 closes; do not interleave a second PR onto main while #194 is in-flight.

## Decisions log
- 2026-05-13 (iter-107): Resolved first DIRTY on #194 by `git checkout origin/main -- STATUS.md` then committing onto slice-1 (commit `3136605`). CI restarted clean.
- 2026-05-13 (iter-108): DIRTY recurred immediately because iter-107's STATUS write landed on main as `fc501c7` after the slice-1 merge. Re-resolved the same way. Generalised lesson now in "Known issues": pause main STATUS commits while a stacked-slice PR is awaiting auto-merge.
- 2026-05-13 (iter-108): Adopted CI actuals for 4 new/drifted visual baselines under `tests/e2e/__screenshots__/` (commit `97a5513`). Justification: new coverage-panel surface (slices 2/3) added screens that had no prior baseline, and the existing requirements-surface baseline drifted by an acceptable pixel ratio after the tab additions. Documented per AGENT.md §8 visual baseline rule.
- 2026-05-13 (iter-108): Fixed test selector at `4194aa2` to use the `-button` testid suffix that `SurfaceTab` actually renders, rather than the bare surface id.
- 2026-05-13 (iter-109): No new code work; #194 is mid-PR with CI just kicked off (43s in). Per Ralph loop step 5, do not start a new branch. STATUS-only write, committed on slice-1 (not main) per the conflict-avoidance rule.

## Next action
Next iteration: re-check `gh pr view 194` and `gh run view 25773256002`. If `check` is `success` and auto-merge has squashed #194, close-confirm issue #176, then evaluate phase-10 epic remaining work (#178 gate spec, now unblocked) and pick it up on a fresh branch from main. If `check` is `failure`, diagnose and push a fix to the same branch.
