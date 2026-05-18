# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-847: fix #483 — ADR 0016 path-filter top-level `*.md` exclusion.** PR adds `'!*.md'` sibling to the `dorny/paths-filter@v3` rule in `.github/workflows/ci.yml` so root-level `STATUS.md` / `JOURNAL.md` / `README.md` / `AGENT.md` correctly classify as `code = false` and skip the e2e shard matrix. ADR 0016 carries a "Correction (iter-847)" note documenting the picomatch landmine (`**/*.md` requires ≥1 path segment before `*.md`). This PR self-tests the unchanged positive path (it touches `ci.yml` → classifier sees `code = true` → full e2e runs); empirical validation of the new exclusion path is the next doc-only iteration sync. No rubric movement; A.12 termination table unchanged. iter-847 open-PR count at iteration start = 0 (iter-846 work fully merged via #480 + #482).

🎯 **Iter-846: resume #480 + STATUS sync (PR #482).** Rebased PR #480 (`gh pr update-branch` succeeded cleanly), opened PR #482 to sync STATUS after iter-845's board-resync detour. **Both merged during iter-846** (#480 as `fcddc0e`, #482 as `6357df2`). #483 filed during iter-846 close as a follow-up bug observed in #482's CI run: STATUS-only PR triggered full e2e despite ADR 0016's doc-only-skip promise. Picked up as iter-847's work.

🎯 **Iter-845: in-flight claim board re-sync via PR #480 (closes #479).** Three rows on the board (iter-836 STATUS sync via #459, walk-24 close-out via #463, iter-840 board-sync via #471) corresponded to branches already merged hours earlier. Iter-845 dispatched a single-file doc-only PR replacing them with the only actually-in-flight row at iter-845 start: `phase-15/iter-844-merge-queue-blocked` (#478). #480 went BEHIND 26 s after open when #478 merged; rebased iter-846, merged iter-846.

🎯 **Iter-844: CI restructure step 3 BLOCKED — merge queue not available on user-owned public repos.** PR #477 merged the `merge_group:` workflow trigger to `main`. Rulesets POST returned 422 across every parameter variation; root cause: `.owner.type == "User"`. GitHub gates merge queue to org-owned repos. **#469 relabeled `status:needs-human`**; operator decides (a) org transfer, (b) wontfix, or (c) non-queue alternative.

🎯 **Iter-842/843 (compressed): CI step 2 SHIPPED via PR #475 (squash `0ea8f52`) at iter-842 close; merged into the velocity baseline at iter-843.** PR-gate wallclock 4m 10s vs step-1 5m 46s = ~28% additional cut. Cumulative vs pre-restructure ~30-40min ≈ **~7-9× speedup**. New `ci-full-matrix.yml` runs all four projects on push-to-main + daily 09:00-UTC cron + `workflow_dispatch`; first push-to-main run reported success.

🎯 **Iter-841: CI restructure step 1 SHIPPED — PR #472 merged at 12:05:31Z.** Split monolithic `check` → `fast` + 4-way sharded `e2e` matrix + `merge-reports` + umbrella `check`. PR-gate wallclock 5m 46s vs prior ~30-40min baseline = **~6× speedup**. Issue #467 closed.

🎯 **Iter-836: walk-23 — Pages-side regression of the dim-14 fixture against the deployed `vphase-15.6` / `v1.5.0` bundle.** All four iter-833 pass-criteria GREEN against the live Pages URL. **Rubric dim 14 holds at 3** (promoted at walk-22). **Convergence chain (A.12 #3): 1 → 2**.

🎯 **Iter-826: walks 14 + 19 merged → rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **2 of 28** at 3 (dim 5 BDD; dim 14 Round-trip integrity); 20 at 2, 2 at 1 (dim 17 edge editing; dim 22 import/export), 4 at 0 (incl. dim 13, dim 23) |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **2 open `type:design`** — #452 (CI-velocity epic; step 3 `status:needs-human` per iter-844), #454 (status:blocked, gated on #469). **1 open `type:bug` in flight**: #483 (this PR). |
| A.12 #3 | Three consecutive convergence walks | **chain at 2** (walk-22, walk-23). One more zero-issue walk completes A.12 #3; walk-25 deferred to iter-848. |
| A.12 #4 | FBW example shipped + loadable | partial — engineering-unblocked at dim-14 = 3; remaining bottleneck is architect authoring throughput vs A.6 coverage thresholds. |

## Current iteration
- Iteration #: 847
- Started: 2026-05-18
- Branch: `phase-15/iter-847-paths-filter-toplevel-md`
- Working on: **#483 — ADR 0016 path-filter misses top-level `*.md`** — add `'!*.md'` sibling exclusion to `dorny/paths-filter@v3` rule in `.github/workflows/ci.yml`; carry "Correction (iter-847)" note in ADR 0016 documenting the picomatch landmine. Touched files: `.github/workflows/ci.yml`, `docs/adr/0016-ci-doc-only-skip-e2e.md`, `docs/architect/in-flight.md`, `STATUS.md`.

## Last test run
- This PR touches `.github/workflows/ci.yml` → `dorny/paths-filter@v3` will classify the diff as `code = true` → full e2e matrix runs (per ADR 0016 self-test principle). No unit-test-level test for path-filter classification exists; empirical validation of the new exclusion is the next doc-only PR.

## Last PR sweep
- Iter-846 close: PRs #480 (`fcddc0e`) and #482 (`6357df2`) both merged. 0 open PRs at iter-847 start.
- Iter-847 dispatch: opening this PR (#483 fix). Cap usage: 1/5.

## Known issues / blockers
- **#469 (CI step 3, merge queue) BLOCKED:** GitHub feature-gates merge queue to org-owned repos. `status:needs-human` stands pending operator decision.
- All other rubric/walk advancement unblocked. `phase:15` backlog at iter-847 open: 2 design (#452, #454) + 1 bug-in-flight (#483 via this PR).

## Open phase:15 issues at iter-847 open
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Steps 1+2 done; step 3 (#469) blocked. Closeable when operator decides #469 fate.
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap. Indefinitely blocked behind #469.
- #483 (p2, type:bug, status:in-progress, area:cross-cutting) — **ADR 0016 path-filter top-level `*.md` fix (this PR)**.

## Decisions log

**Iter-808..iter-840 entries preserved in earlier commits.**

- **Iter-829 — walk-20:** Filed #446 (SysML round-trip broken on default project name). Dim 14: 0 → 1.
- **Iter-830/831 — #448 quoted-ident emission/parse lands.** A.12 #2 transiently satisfied.
- **Iter-832 — walk-21:** Filed #449 (SysML round-trip dropped diagrams). Dim 14: 1 → 2.
- **Iter-833 — #451 lands** (serializer view-block emit + parser recovery; six unit tests).
- **Iter-834 — walk-22:** All pass-criteria green. **Rubric dim 14: 2 → 3.** Convergence chain A.12 #3 restarts at chain[1]. PR #456 merged.
- **Iter-835 — `vphase-15.6` / `v1.5.0` release tagged + Pages deployed.** SemVer minor bump per A.8 outward-facing rationale.
- **Iter-836 — walk-23 Pages-side regression:** Dim 14 holds at 3. **Convergence chain A.12 #3: 1 → 2.**
- **Iter-837..840 (compressed):** A.8 cap unblock via rebase-all; walk-23/9/16 close-outs merged; ADR 0016 doc-only e2e-skip path filter shipped via #466 (closing #453 by implementation); PR #465 explorer diagram-tab fix; PR #464 IBD enclosing-frame seed; CI-velocity epic #452 decomposed into 3 step-issues (#467 / #468 / #469); walk-24 dispatched (#463); in-flight board sync dispatched (#471); visual baseline thresholds raised on known-flake screens (#460).
- **Iter-841 — CI step 1 shipped (PR #472 → squash `6d15ca9`).** Split monolithic `check` → `fast` + 4-way sharded `e2e` + `merge-reports` + umbrella `check`. PR-gate wallclock 5m 46s vs prior ~30-40min = ~6× speedup.
- **Iter-842 — CI step 2 PR opened (#475 → closes #468).** `ci.yml` PR-gate trimmed to chromium projects only; new `ci-full-matrix.yml` runs all four projects on push-to-main + daily 09:00-UTC cron + `workflow_dispatch`.
- **Iter-843 — CI step 2 merged (PR #475 → squash `0ea8f52`).** Cumulative ~7-9× speedup. Issue #468 closed.
- **Iter-844 — CI step 3 BLOCKED on repo-ownership feature gate.** PR #477 shipped the `merge_group:` workflow trigger (squash `42c84ed`). Rulesets POST returned 422 across every parameter variation; root cause: `.owner.type == "User"`. **#469 relabeled `status:needs-human`** with diagnosis comment. Workflow trigger left in place (dormant) so a future org transfer is a one-API-call activation.
- **Iter-845 — board re-sync detour (PR #480, closes #479).** Replaced 3 stale rows with the only actually-in-flight row (`phase-15/iter-844-merge-queue-blocked` / #478). #478 merged 26 s after #480 opened.
- **Iter-846 — resume #480 + STATUS sync (PR #482, closes #481).** `gh pr update-branch 480` succeeded cleanly. PR #480 + PR #482 both merged during iter-846. #483 filed at iter-846 close after observing PR #482's `STATUS.md`-only diff triggered full e2e despite ADR 0016's doc-only-skip promise.
- **Iter-847 — fix #483 picomatch landmine.** `dorny/paths-filter@v3` uses picomatch where `**/*.md` requires ≥1 path segment before `*.md`; root-level `STATUS.md` falls through to `**` and classifies as code. Added `'!*.md'` sibling exclusion; ADR 0016 carries Correction (iter-847) note. PR self-tests unchanged positive path (touches `ci.yml`); empirical validation of new exclusion is next doc-only PR.

## Session checkpoint summary

This session (iter-793 → iter-847) executed **55 iterations** spanning bootstrap, **12 architect walks** (6-10 FBW + 14-23 viewpoints + round-trip ×4) plus walk-24 merged, **~24 engineer batches**, **6 release tags**, **3 ADRs** (0014/0015/0016 with iter-847 correction), and CI-velocity restructure steps 1 (#472) + 2 (#475) shipped + step 3 (#469) blocked on org-only feature gate. Cumulative delivery:

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 | Palette show-all-kinds + label consistency |
| vphase-15.4 / v1.3.0 | 2026-05-17 | IBD palette, usage hints, implicit-owner Package row, bus-dispatched diagrams, ADR 0014/0015 step 1 |
| vphase-15.5 / v1.4.0 | 2026-05-18 | ADR 0015 steps 2/3/4 (empty-state click-shortcut, inspector contextual, toolbar `+` retires) |
| vphase-15.6 / v1.5.0 | 2026-05-18 | #448 quoted-ident + #451 SysML view-block round-trip → dim 14 to 3 |

Rubric: **2 × score-3** (dim 5 BDD, dim 14 Round-trip integrity) + 20 × score-2 + 2 × score-1 + 4 × score-0.

## Next action

**Iter-848 — recommended pickup: walk-25 dim-13 follow-up.** Rationale: this iter-847 doc-classifier fix closes the loop-efficiency gap from iter-846; #469 / #452 / #454 remain operator-blocked; rubric advancement is again the front. Walk-25 targets dim-13 (cross-diagram coherence — same element across viewpoints stays in sync, cross-diagram navigation, rename reflection, registry integrity) toward score 2 → 3. Write the walk plan at `docs/architect/walks/walk-25.md` *before* opening the browser per A.5.

**Iter-848 PR sweep:** if this PR is still in flight at iter-848 start, leave it (CI will resolve); otherwise iter-848 opens with 0 open PRs.

**#469 (CI step 3, merge queue):** No further loop work. `status:needs-human` until operator decides.

**ADR for raising A.8 cap (#454):** indefinitely blocked behind #454's gating issue #469.

**FBW example (A.12 #4):** engineering-unblocked at dim-14 = 3. Architect authoring throughput against A.6 coverage thresholds remains the bottleneck — walk-25 dim-13 work is the higher-marginal-value path.

**In-flight at iter-847 open (1/5 of A.8 cap):** this PR. Touched-file set disjoint from any future architect walk doc.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 55, well under the 300 churn ceiling.
