# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-842: CI restructure step 2 SHIPPED — PR #475 merged at 12:25Z (squash `0ea8f52`).** `.github/workflows/ci.yml` PR gate trimmed to chromium projects only and its `push: branches: [main]` trigger removed; new `.github/workflows/ci-full-matrix.yml` runs all four projects (chromium + chromium-visual + webkit + webkit-visual) on push-to-main + daily 09:00-UTC cron + `workflow_dispatch`. Measured PR-gate wallclock on #475's own run: **4m 10s** (kick-off 12:21:01Z → required `check` SUCCESS 12:25:11Z) vs iter-841 step-1 baseline of 5m 46s = **~28% additional cut** (cumulative vs pre-restructure monolithic ~30-40min ≈ **~7-9× speedup**). All 7 jobs green; auto-merge fired ~3 s after `check` turned SUCCESS. Branch-protection preserved. Issue #468 closed. First push-to-main `ci-full-matrix` run (SHA `0ea8f52`) kicked off 12:25:18Z — inaugural webkit signal on the post-restructure architecture.

🎯 **Iter-843: STATUS sync + PR sweep + observe first full-matrix run.** No source-code work this iteration. PR sweep rebased all 3 open PRs (#473 README link, #471 in-flight board sync, #463 walk-24) onto post-#475 main; auto-merge already enabled on each (SQUASH). First push-to-main `ci-full-matrix.yml` run in flight at iter-843 close — its conclusion is the data point that gates CI step 3 (#469, merge queue) per iter-842's exit criterion.

🎯 **Iter-841: CI restructure step 1 SHIPPED — PR #472 merged at 12:05:31Z.** `.github/workflows/ci.yml` split from monolithic `check` → `fast` + 4-way sharded `e2e` matrix + `merge-reports` + umbrella `check`. Total PR-gate wallclock measured on #472's own run: **5m 46s** (kick-off 11:59:42Z → required `check` SUCCESS 12:05:28Z) vs prior ~30-40min baseline = **~6× speedup**. All 7 jobs green; auto-merge fired 3 s after `check` turned SUCCESS. Branch-protection preserved (umbrella `check` keeps the exact context name required by `branches/main/protection`). Issue #467 closed. CI-velocity epic #452 advances to step 2 (#468, webkit-out-of-PR-gate, opening this iteration) and step 3 (#469, merge queue, ready).

🎯 **Iter-836: walk-23 — Pages-side regression of the dim-14 fixture against the deployed `vphase-15.6` / `v1.5.0` bundle (`9136ae8`).** Identical fixture to walk-21/walk-22 (6 elements, 5 whitespace names, 1 explicit BDD repr). All four iter-833 pass-criteria GREEN against the live Pages URL: JSON round-trip lossless; SysML round-trip lossless **including diagrams** (`diagram_total: 2 → 2`); `baseline.sysml` Pages-emitted **byte-identical (925 bytes)** to walk-22's dev output. Page errors: 0. Console errors: 0. **Rubric dim 14 holds at 3** (no change — promoted at walk-22). **Convergence chain (A.12 #3): 1 → 2** (walk-22 chain[1] → walk-23 chain[2]). Zero workbench issues filed.

🎯 **Iter-835: `vphase-15.6` / `v1.5.0` release shipped.** SemVer minor bump (A.8 outward-facing rationale: #433/#436 BDD edge-taxonomy + multiplicity features visible to a user loading the example). Pages deploy live (HTTP 200) at deploy SHA `9136ae8`. JOURNAL entry written per A.14.

🎯 **Iter-826: walks 14 + 19 merged → rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **2 of 28** at 3 (dim 5 BDD at iter-826; dim 14 Round-trip integrity at iter-834, Pages-side confirmed at iter-836); 20 at 2, 2 at 1 (dim 17 edge editing; dim 22 import/export), 4 at 0 (incl. dim 13, dim 23) |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **2 open `type:design`** — #452 (CI-velocity epic; closeable once #469 lands), #454 (raise A.8 cap; status:blocked, gated on #469). All CI-velocity meta-work. |
| A.12 #3 | Three consecutive convergence walks | **chain at 2** (walk-22, walk-23). One more zero-issue walk completes A.12 #3; walk-24 (#463) in flight. |
| A.12 #4 | FBW example shipped + loadable | partial — engineering-unblocked at dim-14 = 3; remaining bottleneck is architect authoring throughput vs A.6 coverage thresholds. |

## Current iteration
- Iteration #: 843
- Started: 2026-05-18
- Branch: `phase-15/iter-843-status-sync`
- Working on: **STATUS sync** reflecting iter-842's PR #475 merge + iter-843's PR sweep + observation of first push-to-main `ci-full-matrix` run. Doc-only diff (`STATUS.md`); doc-only paths-filter from ADR 0016 will skip the e2e matrix on this PR's `fast` job.

## Last test run
- No source-code or workflow changes this iteration (STATUS.md sync only). Doc-only PR will exercise the `fast` typecheck + lint + unit-test + build path and skip the sharded `e2e` matrix per ADR 0016's `dorny/paths-filter` config — expected wallclock <2 minutes on PR-gate.

## Last PR sweep
- Iter-843 start: 3 open PRs (#473, #471, #463). All three GREEN on their last `check` but BEHIND post-#475 main. Ran `gh pr update-branch` on all three (each rebased successfully and now picks up the new chromium-only PR gate). Auto-merge already enabled (SQUASH) on each from iter-842 sweep. **PR sweep: updated 3 (#473, #471, #463), no merges this tick (CI re-run in progress on all 3 after rebase).** No PRs blocked beyond the in-flight CI re-runs.

## Known issues / blockers
- None for rubric/walk advancement. `phase:15` backlog narrows: #452 CI-velocity epic with step 3 (#469) the last child; #454 ADR cap-raise unblocks after #469 lands; #470 in-flight board sync handled by #471 (rebased + auto-merge armed).

## Open phase:15 issues at iter-843 close
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI (closeable once #469 also lands)
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap (unblock after #469)
- #469 (p1, type:chore, status:ready, area:cross-cutting) — **CI step 3**: enable GitHub merge queue on `main`
- #470 (p2, type:chore, status:in-progress, area:cross-cutting) — Sync in-flight claim board (PR #471 rebased; auto-merge armed)

## Decisions log

**Iter-808..iter-840 entries preserved in earlier commits.**

- **Iter-829 — walk-20:** Filed #446 (SysML round-trip broken on default project name). Dim 14: 0 → 1.
- **Iter-830/831 — #448 quoted-ident emission/parse lands.** A.12 #2 transiently satisfied.
- **Iter-832 — walk-21:** Filed #449 (SysML round-trip dropped diagrams). Dim 14: 1 → 2.
- **Iter-833 — #451 lands** (serializer view-block emit + parser recovery; six unit tests).
- **Iter-834 — walk-22:** All pass-criteria green. **Rubric dim 14: 2 → 3.** Convergence chain A.12 #3 restarts at chain[1]. PR #456 merged.
- **Iter-835 — `vphase-15.6` / `v1.5.0` release tagged + Pages deployed.** SemVer minor bump per A.8 outward-facing rationale.
- **Iter-836 — walk-23 Pages-side regression:** Dim 14 holds at 3. **Convergence chain A.12 #3: 1 → 2.**
- **Iter-837..840 (compressed):** A.8 cap unblock via rebase-all; walk-23 close-out merged; walk-9 / walk-16 docs-only close-outs merged; ADR 0016 doc-only e2e-skip path filter shipped via #466 (closing #453 by implementation); PR #465 explorer diagram-tab fix; PR #464 IBD enclosing-frame seed; CI-velocity epic #452 decomposed into 3 step-issues (#467 / #468 / #469); walk-24 dispatched (#463); in-flight board sync dispatched (#471); visual baseline thresholds raised on known-flake screens (#460).
- **Iter-841 — CI step 1 shipped (PR #472 → squash `6d15ca9`).** Split monolithic `check` → `fast` + 4-way sharded `e2e` + `merge-reports` + umbrella `check`. PR-gate wallclock 5m 46s vs prior ~30-40min = ~6× speedup. Branch protection's `check` context preserved. STATUS sync for iter-841 landed as #474 (squash `3325b64`) during iter-842's tick.
- **Iter-842 — CI step 2 PR opened (#475 → closes #468).** `ci.yml` PR-gate trimmed to chromium projects only (chromium browser install + `--project=chromium --project=chromium-visual` flags); `push: branches: [main]` trigger removed. New `ci-full-matrix.yml` runs all four projects on push-to-main + daily 09:00-UTC cron + workflow_dispatch. Branch-protection-required `check` context unchanged. Manual escalation for full-matrix red runs documented in the new workflow's header + `docs/CONTEXT.md` (deferred automation per #468's "or document the manual escalation expectation" out). PR sweep this iteration rebased #471 + #463 onto post-#472 main; #474 (iter-841 STATUS sync) merged during the tick → #475 rebased onto post-#474 main to resolve STATUS conflict.
- **Iter-843 — CI step 2 merged (PR #475 → squash `0ea8f52`).** Measured PR-gate wallclock on #475's own run: **4m 10s** (kick-off 12:21:01Z → required `check` SUCCESS 12:25:11Z) vs iter-841 step-1 baseline 5m 46s = **~28% additional cut**; cumulative vs pre-restructure monolithic ~30-40min ≈ **~7-9× speedup**. First push-to-main `ci-full-matrix` run kicked off 12:25:18Z on SHA `0ea8f52` — observational webkit signal in flight at iter-843 close (its conclusion gates iter-844's CI step 3 pickup decision per iter-842's documented exit criterion). Issue #468 closed. PR sweep: rebased all 3 open PRs (#473, #471, #463) onto post-#475 main; auto-merge already armed on each from iter-842. Open `phase:15` backlog narrows to 2 design + 1 chore + 1 in-progress chore.

## Session checkpoint summary

This session (iter-793 → iter-843) executed **51 iterations** spanning bootstrap, **12 architect walks** (6-10 FBW + 14-23 viewpoints + round-trip ×4) plus walk-24 in flight, **~22 engineer batches**, **6 release tags**, **3 ADRs** (0014/0015/0016), and CI-velocity restructure steps 1 (#472) + 2 (#475, merged iter-843 12:25Z). Cumulative delivery:

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 | Palette show-all-kinds + label consistency |
| vphase-15.4 / v1.3.0 | 2026-05-17 | IBD palette, usage hints, implicit-owner Package row, bus-dispatched diagrams, ADR 0014/0015 step 1 |
| vphase-15.5 / v1.4.0 | 2026-05-18 | ADR 0015 steps 2/3/4 (empty-state click-shortcut, inspector contextual, toolbar `+` retires) |
| vphase-15.6 / v1.5.0 | 2026-05-18 | #448 quoted-ident + #451 SysML view-block round-trip → dim 14 to 3 |

Rubric: **2 × score-3** (dim 5 BDD, dim 14 Round-trip integrity; Pages-side dim 14 confirmed iter-836) + 20 × score-2 + 2 × score-1 + 4 × score-0.

## Next action

**Iter-844 — recommended pickup: check first push-to-main `ci-full-matrix` run conclusion (SHA `0ea8f52`); if SUCCESS → CI step 3 (#469, merge queue); if FAILURE → file `p0/type:bug` per the manual-escalation expectation in `ci-full-matrix.yml`'s header.** Rationale: the full-matrix run is the inaugural webkit signal on the post-restructure architecture; its conclusion is the gating data point for both (a) CI step 3 readiness (per iter-842's "AND at least one full-matrix push-to-main run reports clean" criterion) and (b) detection of any chromium/webkit-only divergence introduced by the PR-gate trim. Iter-844 should also re-sweep the 3 PRs rebased this iteration — at least one will likely have merged by then on the new chromium-only PR-gate.

**CI step 3 (#469, merge queue):** ready to pick once the iter-843 full-matrix run conclusion is green.

**ADR for raising A.8 cap (#454):** still gated on step 3 landing.

**Walk-25 (dim-13 follow-up):** still gated on walk-24 close-out (#463) merging so its `#461 / #462` finding set is committed to the walk log + `docs/architect/` before the next walk's plan is written.

**FBW example (A.12 #4):** engineering-unblocked at dim-14 = 3. Architect authoring throughput against A.6 coverage thresholds remains the bottleneck.

**In-flight at iter-843 close (4/5 of A.8 cap):** #463 (walk-24, rebased onto post-#475 main), #471 (in-flight board sync, rebased), #473 (README Pages-URL link, rebased), and this iteration's STATUS-sync PR. All non-overlapping touched-file sets.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 51, well under the 300 churn ceiling.
