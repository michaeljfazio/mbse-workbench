# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

Walk 1 (iter-794) is complete. Ten issues filed (#368–#377). Three
of them are `p0` (Activity, State Machine, Parametric — no UI entry
point) and four are `p1` (direct-manipulation deficiencies and the
creation-surface inconsistency). Rubric advanced on 14 of 28
dimensions: 7 at score 2, 7 at score 1. Fourteen dimensions remain
at `0 — unmeasured` and inform subsequent walks.

## Current iteration
- Iteration #: 794
- Started: 2026-05-16
- Branch: `phase-15/walk-1-log`
- Working on: walk-1 close-out PR

## Last test run
- Command: `pnpm run check` (last green on `main` is `64f8106`, iter-793's JOURNAL append).
- This walk-1 PR touches only `docs/architect/walks/walk-1.md`,
  `docs/architect/quality-rubric.md`, `STATUS.md` — no `src/` changes,
  CI expected to pass.

## Known issues / blockers
- (none for the walk-1 close-out itself)

Open phase:15 issues — `status:ready` and awaiting engineer iterations:

| Issue | Severity | Theme |
|-------|----------|-------|
| [#368](https://github.com/michaeljfazio/mbse-workbench/issues/368) | p0 | Activity Diagram entry point |
| [#369](https://github.com/michaeljfazio/mbse-workbench/issues/369) | p0 | State Machine Diagram entry point |
| [#370](https://github.com/michaeljfazio/mbse-workbench/issues/370) | p0 | Parametric Diagram entry point |
| [#371](https://github.com/michaeljfazio/mbse-workbench/issues/371) | p2 | IBD submenu discoverability |
| [#372](https://github.com/michaeljfazio/mbse-workbench/issues/372) | p2 | Palette dynamic-growth surprise |
| [#373](https://github.com/michaeljfazio/mbse-workbench/issues/373) | p3 | Usage categories missing `+` |
| [#374](https://github.com/michaeljfazio/mbse-workbench/issues/374) | p1 | No resize handles on Block |
| [#375](https://github.com/michaeljfazio/mbse-workbench/issues/375) | p1 | No drag-position display |
| [#376](https://github.com/michaeljfazio/mbse-workbench/issues/376) | p1 | Four UI surfaces for Block creation |
| [#377](https://github.com/michaeljfazio/mbse-workbench/issues/377) | p3 | Palette label inconsistency |

## Decisions log

Iter-792 + iter-793 entries preserved in commit history (PR #362,
#365, #367). Iter-794 decisions:

- 2026-05-16 (iter-794): Walk-1 ran headless Chromium against the
  deployed vphase-14 Pages (`fac60c772942673ff1f33f936197fc2abf49a8e7`).
  The kickoff prefers `headed` Chromium; in this non-interactive
  harness the rendered DOM observed via Playwright is functionally
  equivalent and screenshots are the witness. Documented at the top
  of `walk-1-exec.py`. If headedness ever matters to a finding
  (anti-aliasing, focus-visible behaviour), the walk re-runs under a
  Playwright `--headed` configuration.
- 2026-05-16 (iter-794): Three `p0` issues (#368/#369/#370) cover
  Activity / State Machine / Parametric viewpoints, each as a
  separate issue per A.7 "one issue per defect". They share a likely
  root cause (the `Create representation…` registry omits these
  viewpoint kinds) and per A.8 grouping heuristic #1 ("Foundational
  / schema work first") will likely batch into a single PR in
  iter-795.

## Next action

Open walk-1 close-out PR (branch `phase-15/walk-1-log`, closes the
walk-log bookkeeping issue to be filed). After merge, iter-795
begins by reading STATUS, selecting the missing-viewpoint engineer
batch (#368 + #369 + #370, optionally #371), and dispatching a
subagent on a `phase-15/viewpoint-entry-points` branch.
