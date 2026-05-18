# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-861: `vphase-15.8` / `v1.5.2` released.** PR #502 merged at 2026-05-18T18:24:10Z (squash `95fb6c2`), closing #499 (`p1` `area:viewpoint:ibd` IBD ConnectionMode root cause) + #500 (`p2` PartUsage acronym auto-name). Tags `vphase-15.8` + `v1.5.2` pushed to `main` at the same SHA; both release workflows ran clean (build + deploy + github-release all green). Pages last-modified `Mon, 18 May 2026 18:32:43 GMT`. GitHub Releases: vphase-15.8 published 18:33:54Z, v1.5.2 published 18:32:58Z. Live URL `https://michaeljfazio.github.io/mbse-workbench/` returns HTTP 200. Patch bump (not minor) per SemVer: the work is fix-not-feature — both #499 and #500 were defects surfaced by walk-27, no outward-facing capability gained beyond what walk-27 had attempted to exercise.

🎯 **Iter-860: #499 + #500 engineer batch shipped as PR #502** (closed by squash-merge `95fb6c2`).

🎯 **Iter-859: walk-27 (IBD deep-dive) executed on `vphase-15.7` Pages → 5/8 PCs PASS, 2 issues filed.** First dim-6 score-3 attempt. PC3 (drag-create `ConnectionUsage`) + PC5 (Shift+drag → `ItemFlow`) silently FAIL — root-caused: `HANDLE_TYPE_BY_DIRECTION.inout = 'source'` + React Flow's default `connectionMode` rejects source→source drags before the typed `isValidIbdConnection` validator. Filed #499 (`p1`) + #500 (`p2`). Convergence chain[2] → **chain[0 / 3]** (reset). Walk-27 PR #501 squash-merged at 18:05:28Z as `633436a`.

🎯 **Iter-857: walk-27 plan SEALED + IBD deep-dive conventions research-populated** (PR #498 merged).

🎯 **Iter-856: walk-26 executed clean on `vphase-15.7` Pages** — chain[1] → chain[2] / 3.

🎯 **Iter-855: `vphase-15.7` / `v1.5.1` released.**

🎯 **Iter-853: walk-25 executed → CLEAN REGRESSION on local dev** (dim 6 1 → 2, dim 13 0 → 2).

🎯 **Iter-826: walks 14 + 19 merged → rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451).**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **2 of 28** at 3 (dim 5 BDD, dim 14 Round-trip integrity); **22** at 2; 1 at 1 (dim 17 Edge editing — fix shipped in `vphase-15.8`, awaiting walk-28 measurement); 3 at 0. The IBD `ConnectionMode.Loose` fix is on Pages; **walk-28** (regression of walk-27) is the next decisive measurement — clean outcome promotes dim 6 (IBD) from 2 to 3 AND advances dim 17 from 1 toward 2/3 simultaneously. |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **0 open `type:bug`** (held since #499 + #500 closed at 18:24:11Z). **2 open `type:design`**: #452 (`status:needs-human` via #469), #454 (blocked behind #469). **1 open `type:chore` `status:needs-human`**: #469. |
| A.12 #3 | Three consecutive convergence walks | **chain[0 / 3]** (reset by walk-27). Walk-28 (regression) is the next chain[1] candidate; clean outcome → chain[1] AND dim 6 → 3 simultaneously. |
| A.12 #4 | FBW example shipped + loadable | unblocks once dim 6 reaches 3 (precondition for authoring A.6-coverage FBW IBDs via UI). |

## Current iteration
- Iteration #: 861
- Started: 2026-05-18 (UTC)
- Branch: `phase-15/iter-861-vphase-15.8-release`
- Working on: STATUS + in-flight.md update PR; release work itself complete.

## Last test run
- Iter-860 PR #502 CI: full code-path. `fast` (typecheck + lint + unit + classify) SUCCESS in ~5m; `e2e (shard 1/4)`, `(shard 2/4)`, `(shard 3/4)`, `(shard 4/4)` all SUCCESS; `merge-reports` + `check` umbrella SUCCESS. Run [26052034001](https://github.com/michaeljfazio/mbse-workbench/actions/runs/26052034001).
- Release workflows: v1.5.2 [26052695792](https://github.com/michaeljfazio/mbse-workbench/actions/runs/26052695792) success; vphase-15.8 [26052704429](https://github.com/michaeljfazio/mbse-workbench/actions/runs/26052704429) success. Both deployed the same `95fb6c2` artifact.

## Last PR sweep
- Iter-861 open: this STATUS PR (only). PR #502 merged 18:24:10Z (squash `95fb6c2`).
- No other PRs open at iter-861 start.

## Known issues / blockers
- **#469 (CI step 3, merge queue) BLOCKED:** `status:needs-human` pending operator decision.
- **#452 (CI velocity epic step 3):** blocked behind #469.
- **#454 (raise A.8 cap):** blocked behind #469.

## Open phase:15 issues at iter-861 close
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Steps 1+2 done; step 3 (#469) blocked.
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap. Blocked behind #469.

## Decisions log

**Iter-808..iter-860 entries preserved in earlier commits.**

- **Iter-861 — release-and-not-walk-28 in this iteration.** A.5 walks are budgeted at 1–3 hours of execution and produce their own close-out commit; bundling walk-28 into the same iteration as the release would couple two unrelated risk surfaces (release-workflow correctness vs walk-28 measurement validity) and would write a STATUS at iteration boundaries that didn't reflect what actually happened. Iter-861 ships only the release; **iter-862** writes the walk-28 plan section against the `vphase-15.8` Pages bundle and executes it. This matches the iter-855 / iter-856 pattern (release then walk-26 in separate iterations).
- **Iter-861 — kept patch SemVer (`v1.5.2`) not minor.** A strict A.8 reading on the boundary between fix and feature: PR #502 added new keyboard semantics (Shift+drag → ItemFlow) and a new naming behaviour. But the new keyboard semantics is the precondition for an existing-but-broken UX (PC5 from walk-27 failed because the precondition was missing), and the acronym branch is a defect fix. Neither adds a feature visible to a user of the deployed Pages beyond what walk-27 had attempted to exercise on `vphase-15.7`. Calling this a feature would inflate the SemVer line; `v1.5.2` is the honest patch bump. Recorded for the post-walk-28 release decision (which may justify a minor if dim 6 → 3 promotion is paired with new affordances).

## Session checkpoint summary

This session (iter-793 → iter-861) executed **69 iterations** spanning bootstrap, **15 architect walks** + **walks 26 + 27 executed against deployed Pages**, **~25 engineer batches**, **8 release tags**, **3 ADRs** (0014/0015/0016), CI-velocity steps 1+2 (#472, #475) shipped + step 3 (#469) blocked, the iter-847..851 ADR 0016 path-filter correction trail, and the iter-859 → iter-861 IBD ConnectionMode arc (walk-27 finding → #499/#500 batch → `vphase-15.8` ship).

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 | Palette show-all-kinds + label consistency |
| vphase-15.4 / v1.3.0 | 2026-05-17 | IBD palette, usage hints, implicit-owner Package row, bus-dispatched diagrams, ADR 0014/0015 step 1 |
| vphase-15.5 / v1.4.0 | 2026-05-17 | ADR 0015 steps 2/3/4 (empty-state click-shortcut, inspector contextual, toolbar `+` retires) |
| vphase-15.6 / v1.5.0 | 2026-05-18 | #448 quoted-ident + #451 SysML view-block round-trip → dim 14 to 3 |
| vphase-15.7 / v1.5.1 | 2026-05-18 | #464 IBD enclosing-frame seed + #465 tree-row activates diagram tab → dim 6 → 2, dim 13 → 2 |
| vphase-15.8 / v1.5.2 | 2026-05-18 | #499 IBD `ConnectionMode.Loose` for inout↔inout drag + #500 acronym auto-name |

Rubric: **2 × score-3** (dim 5 BDD, dim 14 Round-trip integrity) + **22 × score-2** + **1 × score-1** (dim 17 Edge editing — fix shipped, awaiting walk-28 measurement) + **3 × score-0** (incl. dim 23).

## Next action

**Iter-862 — walk-28** (regression of walk-27) against `vphase-15.8` Pages (`95fb6c2` deploy, Pages last-modified `Mon, 18 May 2026 18:32:43 GMT`). Re-run the same eight PCs from walk-27. Clean outcome → dim 6 (IBD) promotes from 2 to 3 (THIRD score-3 dimension), dim 17 (Edge editing) advances from 1 toward 2 via PC 3 (plain-line connection edge), and convergence chain advances from chain[0] to chain[1] / 3. Walk-28 follows the A.5 protocol: plan in `docs/architect/walks/walk-28.md` with `## Plan` written before opening the browser; close-out PR committed on `phase-15/walk-28-log`.

**If walk-28 finds new issues:** chain stays at 0; file each finding per A.7 (one-per-defect, area-labeled); rubric scores update per the walk-27 table outcomes.

**#469 (CI step 3, merge queue):** no further loop work. `status:needs-human` until operator decides.

**ADR for raising A.8 cap (#454):** indefinitely blocked behind #469.

**FBW example (A.12 #4):** unblocks the iteration after dim 6 reaches 3.

**In-flight at iter-861 close (1/5 of A.8 cap):** this STATUS PR.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 69, well under the 300 churn ceiling.
