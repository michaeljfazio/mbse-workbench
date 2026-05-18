# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-850: PR #491 merged at 14:38:22Z → ADR 0016 actual fix landed; this PR empirically validates it.** Iter-849's PR #491 (positive enumeration of code-bearing paths) merged green: `fast` correctly classified the workflow edit as `code = true`, all four e2e shards ran (~3 min each in parallel), umbrella `check` aggregated, auto-merge SQUASH fired. Closed #490 (this PR's fix) and #483 (the symptom issue). The merge unblocks rubric work — but the **predicted behaviour of the new filter on a doc-only diff has not yet been observed**. This iter-850 PR is the empirical test: it touches only `STATUS.md` and `docs/architect/in-flight.md`, neither of which appears in the positive enumeration. **Prediction:** the `fast` job logs `code = false` and `e2e = false`; all four `e2e (shard X/4)` jobs are SKIPPED (not run); the umbrella `check` job takes the doc-only branch of its `if/else` aggregator and reports success in ~2-3 min wallclock total (vs ~8-10 min when full e2e runs). If `fast` instead classifies as `code = true`, something in the positive enumeration accidentally matches STATUS.md or in-flight.md, and the iter-849 fix is incomplete — escalate.

🎯 **Iter-849: ADR 0016 actual fix shipped via PR #491.** Iter-848's empirical falsification of the iter-847 picomatch-depth-0 hypothesis traced the real root cause to `dorny/paths-filter@v3` `src/filter.ts` — `patterns.some(aPredicate)` short-circuits on the `'**'` catch-all and makes every bang rule a no-op. Iter-849 shipped option 3 of three viable corrections: drop the `'**'` catch-all and enumerate code-bearing paths positively (`src/**`, `tests/**`, `scripts/**`, `.github/workflows/**`, root config files). PR #491 merge SHA `23e3d71`. ADR 0016 updated with a "Correction (iter-849)" section.

🎯 **Iter-848: CONTEXT.md correction merged via PR #489 (closes #488).** Recorded the dorny `some`-predicate landmine and filed #490 with three viable fix directions.

🎯 **Iter-847: paths-filter top-level `*.md` PR opened (#485) on the falsified hypothesis.** Iter-848's reproduction overtook the framing; closed iter-849 as no-op under dorny's `some` default.

🎯 **Iter-844: CI restructure step 3 BLOCKED — merge queue not available on user-owned public repos.** PR #477 shipped the `merge_group:` workflow trigger (dormant). The 7-9× speedup from steps 1+2 (#472 + #475) already delivers the bulk of #452's intent.

🎯 **Iter-826: walks 14 + 19 merged → rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451).**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **2 of 28** at 3 (dim 5 BDD, dim 14 Round-trip integrity); 20 at 2, 2 at 1 (dim 17 edge editing; dim 22 import/export), 4 at 0 (incl. dim 13, dim 23) |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **2 open `type:design`** (#452 CI-velocity epic — step 3 status:needs-human; #454 ADR raise A.8 cap — blocked on #469). **0 open `type:bug`** (iter-849 closed #490 and #483 on merge). **1 open `type:chore` `status:needs-human`**: #469. |
| A.12 #3 | Three consecutive convergence walks | **chain at 2** (walk-22, walk-23). Walk-25 (dim-13 follow-up) deferred since iter-847; iter-846..850 were CI-velocity hygiene + this validation, not architect walks. |
| A.12 #4 | FBW example shipped + loadable | partial — engineering-unblocked at dim-14 = 3; bottleneck is architect authoring throughput vs A.6 coverage thresholds. |

## Current iteration
- Iteration #: 850
- Started: 2026-05-18
- Branch: `phase-15/iter-850-status-validation`
- Working on: STATUS sync at iter-849→iter-850 boundary + empirical validation of the iter-849 ADR 0016 fix. No issue number (no rubric/feature movement; this is a thin observation-PR).

## Last test run
- Local: this PR touches only `STATUS.md` and `docs/architect/in-flight.md` — no code, no tests. The validation is the PR's own CI behaviour.
- CI self-test (this PR): the `fast` job's `paths-filter` step should log `code = false` AND `e2e = false`; all four `e2e (shard X/4)` jobs should report SKIPPED (not run); umbrella `check` should aggregate the doc-only branch and report success in ~2-3 min wallclock total. If `fast` instead logs `code = true`, the new positive-enumeration filter accidentally matches a non-code path — escalate by reopening #490.

## Last PR sweep
- Iter-850 open: 0 open PRs (iter-849's #491 merged at 14:38:22Z).
- This PR opens as the only in-flight PR (1/5 of A.8 cap).

## Known issues / blockers
- **#469 (CI step 3, merge queue) BLOCKED:** GitHub feature-gates merge queue to org-owned repos. `status:needs-human` pending operator decision (transfer to org / close as wontfix / accept current 7-9× speedup as sufficient).
- All other rubric/walk advancement unblocked.

## Open phase:15 issues at iter-850 open
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Steps 1+2 done; step 3 (#469) blocked.
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap. Blocked behind #469.

## Decisions log

**Iter-808..iter-848 entries preserved in earlier commits.**

- **Iter-849 — ADR 0016 actual fix shipped via PR #491 (merge SHA `23e3d71`).** Dropped `'**'` catch-all + enumerated code-bearing paths positively. Closed #490 and #483 on merge. ADR 0016 updated with a "Correction (iter-849)" section preserving the original decision text + documenting the dorny landmine, the three considered alternatives, the trade-off (new top-level code-bearing files default to doc-only and require updating the filter), and the self-test approach (the workflow change itself classified `code = true` per its own filter — full e2e ran as required).
- **Iter-850 — empirical validation PR for iter-849 fix.** Thin STATUS + claim-board sync touching only paths that should NOT match the new positive enumeration. Prediction: `code = false`, e2e SKIPPED, `check` doc-only-branch success in ~2-3 min. If the prediction holds, this is the first observed doc-only e2e skip since ADR 0016 shipped at #466 — the speedup is real and STATUS-only PRs will now run ~3× faster on PR-gate CI.

## Session checkpoint summary

This session (iter-793 → iter-850) executed **58 iterations** spanning bootstrap, **12 architect walks** + walk-24 merged, **~23 engineer batches**, **6 release tags**, **3 ADRs** (0014/0015/0016), CI-velocity steps 1+2 (#472, #475) shipped + step 3 (#469) blocked, and the iter-847..850 ADR 0016 path-filter correction trail (PR #485 closed no-op, PR #487 hypothesis falsified at #488, PR #489 CONTEXT.md correction merged, PR #491 actual fix merged, this PR empirical validation).

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

**Iter-851 — recommended pickup: walk-25 dim-13 follow-up** (deferred since iter-847; the CI-velocity correction trail is now complete). Rationale: rubric advancement is the front again; ADR 0016 fix is shipped and (pending this PR's validation) verified; #469 / #452 / #454 remain operator-blocked. Walk-25 targets dim 13 (cross-diagram coherence — same element across viewpoints stays in sync, cross-diagram navigation, rename reflection, registry integrity) toward score 2 → 3. Write the walk plan at `docs/architect/walks/walk-25.md` *before* opening the browser per A.5.

**Empirical-validation follow-up (post-merge of this PR):** if the prediction holds (`code = false`, e2e SKIPPED, `check` success in ~2-3 min), append a `docs/CONTEXT.md` entry confirming the iter-849 fix is empirically verified working — closing the iter-848 entry's open thread. If the prediction fails (`code = true` on this STATUS-only diff), reopen #490 with the matching path identified, and continue troubleshooting.

**#469 (CI step 3, merge queue):** No further loop work. `status:needs-human` until operator decides.

**ADR for raising A.8 cap (#454):** indefinitely blocked behind #469.

**FBW example (A.12 #4):** engineering-unblocked at dim-14 = 3. Architect authoring throughput against A.6 coverage thresholds remains the bottleneck.

**In-flight at iter-850 open (1/5 of A.8 cap):** this PR (`phase-15/iter-850-status-validation`).

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 58, well under the 300 churn ceiling.
