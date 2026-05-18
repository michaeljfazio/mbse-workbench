# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-844: CI restructure step 3 BLOCKED — merge queue not available on user-owned public repos.** PR #477 merged the `merge_group:` workflow trigger to `main` (`ci.yml` header documents that the trigger is dormant pending repo transfer to an organization). Subsequent attempt to activate the queue via `POST /repos/michaeljfazio/mbse-workbench/rulesets` with a `merge_queue` rule returned **`422 Validation Failed: "Invalid rule 'merge_queue': "`** across every parameter variation (minimum body, full body with `bypass_actors: []`, with/without companion `required_status_checks` rule, `enforcement: active` vs `evaluate`). The 422 is consistent and the empty-colon suffix is a feature-gate sentinel — other rule types (e.g. `deletion`) POST fine on this repo. GraphQL `Repository.mergeQueue` returns `null`; no `enableMergeQueue` mutation exists; only `enqueuePullRequest` / `dequeuePullRequest` exist (both require an already-enabled queue). **Root cause: `gh api /repos/michaeljfazio/mbse-workbench --jq '.owner.type'` returns `User` (not `Organization`)** — GitHub gates the merge queue feature to org-owned repositories regardless of plan/visibility. **#469 relabeled `status:needs-human`** with a comment summarising the diagnosis; the operator decides (a) transfer the repo to a GitHub org → queue unblocks via the documented Rulesets POST, (b) close #469 as `wontfix` and accept the existing **~7-9× CI speedup** from steps 1+2 (#472 + #475) which already satisfies the bulk of #452's "speed up PR-gate CI" intent, or (c) explore non-queue batching strategies (none currently exist in the GitHub feature set). No further loop work on #469 until the operator decides. Workflow trigger left in place so an eventual org transfer doesn't need a workflow change.

🎯 **Iter-843: STATUS sync + PR sweep + observe first full-matrix run.** PR #476 (iter-843 STATUS sync) opened against post-#475 main; CI green but BEHIND after #477 merged → still open at iter-844 start, **superseded by this iter-844 STATUS PR** (closing #476 as subsumed). First push-to-main `ci-full-matrix` run on SHA `0ea8f52` completed **conclusion: success** — inaugural webkit-side signal on the post-restructure architecture is GREEN. PR sweep rebased all 3 then-open PRs (#473, #471, #463) onto post-#475 main; auto-merge already armed (SQUASH) on each. #473 (README Pages-URL link) merged as squash `07ce95e` during iter-843. Iter-844 began with #476/#471/#463 BEHIND post-#477 main.

🎯 **Iter-842: CI restructure step 2 SHIPPED — PR #475 merged at 12:25Z (squash `0ea8f52`).** `.github/workflows/ci.yml` PR gate trimmed to chromium projects only and its `push: branches: [main]` trigger removed; new `.github/workflows/ci-full-matrix.yml` runs all four projects (chromium + chromium-visual + webkit + webkit-visual) on push-to-main + daily 09:00-UTC cron + `workflow_dispatch`. Measured PR-gate wallclock on #475's own run: **4m 10s** vs iter-841 step-1 baseline of 5m 46s = **~28% additional cut** (cumulative vs pre-restructure monolithic ~30-40min ≈ **~7-9× speedup**). All 7 jobs green; auto-merge fired ~3 s after `check` turned SUCCESS. Branch-protection preserved. Issue #468 closed.

🎯 **Iter-841: CI restructure step 1 SHIPPED — PR #472 merged at 12:05:31Z.** `.github/workflows/ci.yml` split from monolithic `check` → `fast` + 4-way sharded `e2e` matrix + `merge-reports` + umbrella `check`. PR-gate wallclock 5m 46s vs prior ~30-40min baseline = **~6× speedup**. Branch-protection-required `check` context preserved. Issue #467 closed.

🎯 **Iter-836: walk-23 — Pages-side regression of the dim-14 fixture against the deployed `vphase-15.6` / `v1.5.0` bundle (`9136ae8`).** All four iter-833 pass-criteria GREEN against the live Pages URL. **Rubric dim 14 holds at 3** (promoted at walk-22). **Convergence chain (A.12 #3): 1 → 2** (walk-22 chain[1] → walk-23 chain[2]). Zero workbench issues filed.

🎯 **Iter-826: walks 14 + 19 merged → rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **2 of 28** at 3 (dim 5 BDD at iter-826; dim 14 Round-trip integrity at iter-834, Pages-side confirmed at iter-836); 20 at 2, 2 at 1 (dim 17 edge editing; dim 22 import/export), 4 at 0 (incl. dim 13, dim 23) |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **2 open `type:design`** — #452 (CI-velocity epic; only step 3 remains and that's now `status:needs-human` per iter-844), #454 (raise A.8 cap; status:blocked, gated on #469 which is now itself blocked). **1 open `type:chore` with `status:needs-human`**: #469. |
| A.12 #3 | Three consecutive convergence walks | **chain at 2** (walk-22, walk-23). One more zero-issue walk completes A.12 #3; walk-24 (#463) in flight. |
| A.12 #4 | FBW example shipped + loadable | partial — engineering-unblocked at dim-14 = 3; remaining bottleneck is architect authoring throughput vs A.6 coverage thresholds. |

## Current iteration
- Iteration #: 844
- Started: 2026-05-18
- Branch: `phase-15/iter-844-merge-queue-blocked`
- Working on: **CI step 3 (#469) blocked** — PR #477 (`merge_group:` workflow trigger) shipped to `main` as squash `42c84ed`; post-merge Rulesets POST returned 422 across all attempts due to repo being user-owned (not org-owned). Touched files this PR: `.github/workflows/ci.yml` (header comment correcting "active" → "dormant"), `docs/CONTEXT.md` (correcting the iter-844 entry to document the block), `STATUS.md` (this update). Disjoint touched-file sets vs every other in-flight PR.

## Last test run
- No source-code or workflow-logic changes this iteration (only ci.yml header comment + docs + STATUS). `dorny/paths-filter@v3` classifies `.github/workflows/ci.yml` as `code` so the full e2e shard matrix still runs on this PR's CI; expected wallclock ~4-5 min on the post-#475 PR gate.

## Last PR sweep
- Iter-843 start: 3 open PRs (#473, #471, #463). All three GREEN on their last `check` but BEHIND post-#475 main. Ran `gh pr update-branch` on all three; auto-merge already enabled (SQUASH) on each. #473 merged during iter-843 as squash `07ce95e`.
- Iter-844 start: 4 open PRs (#476, #471, #463, plus #477 just opened). After #477 merged mid-iter as squash `42c84ed`, the other 3 went BEHIND again. `gh pr update-branch` ran on #476/#471/#463 mid-iteration; CI re-running. **iter-844 sweep: rebased 3 (#476, #471, #463), merged 1 (#477), in-progress 1 (this STATUS PR).** #476 will be closed as subsumed by this STATUS PR.

## Known issues / blockers
- **#469 (CI step 3, merge queue) BLOCKED:** GitHub feature-gates merge queue to org-owned repos. Relabeled `status:needs-human`. No further loop work pending operator decision (transfer to org, close as wontfix, or accept current 7-9× speedup as sufficient).
- All other rubric/walk advancement unblocked. `phase:15` backlog narrows further once #469 is resolved one way or another.

## Open phase:15 issues at iter-844 close
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Steps 1+2 done; step 3 (#469) blocked. Closeable when human decides #469 fate; bulk of intent already delivered (7-9× speedup).
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap. Was gated on step 3 landing; now indefinitely blocked unless step 3 resolves.
- #469 (p1, type:chore, **status:needs-human**, area:cross-cutting) — CI step 3 merge queue. Blocked on repo ownership (User vs Organization). Diagnosis comment posted iter-844.
- #470 (p2, type:chore, status:in-progress, area:cross-cutting) — Sync in-flight claim board (PR #471 in flight, rebased iter-844).
- #463 PR open — walk-24 close-out (dim-13 cross-diagram coherence findings #461 / #462), rebased iter-844.

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
- **Iter-842 — CI step 2 PR opened (#475 → closes #468).** `ci.yml` PR-gate trimmed to chromium projects only; `push: branches: [main]` trigger removed. New `ci-full-matrix.yml` runs all four projects on push-to-main + daily 09:00-UTC cron + workflow_dispatch.
- **Iter-843 — CI step 2 merged (PR #475 → squash `0ea8f52`).** Measured PR-gate wallclock 4m 10s vs step-1 5m 46s = ~28% additional cut; cumulative ~7-9× speedup. Issue #468 closed. First push-to-main `ci-full-matrix` run on `0ea8f52` reported **success**. Open backlog narrowed to 2 design + 1 chore + 1 in-progress chore. iter-843 STATUS-sync PR (#476) opened but did not merge before iter-844 began — subsumed by this iter-844 STATUS PR.
- **Iter-844 — CI step 3 BLOCKED on repo-ownership feature gate.** PR #477 shipped the `merge_group:` workflow trigger to `main` (squash `42c84ed`). Post-merge Rulesets POST to enable the queue returned 422 across every parameter variation; root cause confirmed via `.owner.type == "User"` + GraphQL `Repository.mergeQueue == null` + no `enableMergeQueue` mutation. **#469 relabeled `status:needs-human` with diagnosis comment.** Loop will not retry #469 until operator transfers the repo to an organization, closes #469 as `wontfix`, or proposes a non-queue alternative. The 7-9× speedup from steps 1+2 already delivers the bulk of #452's stated intent — step 3 was incremental. Workflow trigger left in place (dormant) so a future org transfer is a one-API-call activation.

## Session checkpoint summary

This session (iter-793 → iter-844) executed **52 iterations** spanning bootstrap, **12 architect walks** (6-10 FBW + 14-23 viewpoints + round-trip ×4) plus walk-24 in flight, **~23 engineer batches**, **6 release tags**, **3 ADRs** (0014/0015/0016), and CI-velocity restructure steps 1 (#472) + 2 (#475) shipped + step 3 (#469) blocked on org-only feature gate. Cumulative delivery:

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

**Iter-845 — recommended pickup: walk-25 dim-13 follow-up after walk-24 close-out (#463) merges.** Rationale: With #469 stuck on a non-engineering decision and #452/#454 transitively blocked behind it, rubric advancement returns to the front. Walk-24's #461/#462 finding set must be on `main` before walk-25's plan is written (per A.5 walk discipline). Walk-25 then targets dim-13 (cross-diagram coherence — same element across viewpoints stays in sync, cross-diagram navigation, rename reflection, registry integrity) toward score 2 → 3.

**Iter-845 PR sweep:** rebase #471 + #463 + (if still open) #476 onto post-iter-844 main. With this STATUS PR aiming for merge, the trio will go BEHIND again — same churn pattern that motivated #469. Without the queue, the cost is unchanged from baseline. The full-matrix workflow ran clean on `0ea8f52` so the chromium-only PR gate is the steady-state PR signal going forward.

**#469 (CI step 3, merge queue):** No further loop work. `status:needs-human` until operator decides (a) org transfer, (b) wontfix close, or (c) propose a non-queue alternative. If wontfix: close #469 and #454, downgrade #452 to "closeable" with steps 1+2 delivered.

**ADR for raising A.8 cap (#454):** indefinitely blocked behind #469.

**FBW example (A.12 #4):** engineering-unblocked at dim-14 = 3. Architect authoring throughput against A.6 coverage thresholds remains the bottleneck.

**In-flight at iter-844 close (4/5 of A.8 cap):** #463 (walk-24, rebased post-#477), #471 (in-flight board sync, rebased post-#477), this iter-844 STATUS PR, and #476 (iter-843 STATUS — will be closed-as-subsumed at the same time this iter-844 STATUS PR is opened). After cleanup, the cap reads 3/5.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 52, well under the 300 churn ceiling. Halting safety for #469 per AGENT.md: relabel to `status:needs-human` is the prescribed move when the work isn't loop-resumable — applied.
