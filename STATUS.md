# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-849: ADR 0016 actual fix — positive enumeration of code-bearing paths (#490).** Iter-848's empirical falsification of the iter-847 picomatch-depth-0 hypothesis (CI run [26038639703](https://github.com/michaeljfazio/mbse-workbench/actions/runs/26038639703) on PR #487 logged `code = true` on a depth-1 `.md`-only diff) traced the real root cause to `dorny/paths-filter@v3` `src/filter.ts` — `patterns.some(aPredicate)` short-circuits on the `'**'` catch-all and makes every bang rule a no-op. ADR 0016's filter has therefore **never excluded anything in practice since #466 shipped**. Iter-849 ships option 3 of three viable corrections (per #490 issue body): drop the `'**'` catch-all and enumerate code-bearing paths positively. PR #485 (iter-847 sibling-rule attempt, known no-op) closed at iter-849 open as the prerequisite for the contested `ci.yml` edit. Touched files this PR: `.github/workflows/ci.yml`, `docs/adr/0016-ci-doc-only-skip-e2e.md`, `STATUS.md`, `docs/architect/in-flight.md`. The PR's own CI is the regression self-test (`.github/workflows/**` matches the new filter → `code = true` → full e2e runs); empirical validation of the doc-only-skip path is the next STATUS-only PR after this merges (predicted: ~3 min wallclock vs current ~10 min).

🎯 **Iter-848: CONTEXT.md correction merged via PR #489 (closes #488).** PR #487 (merged iter-847) recorded a picomatch-depth-0 hypothesis as the doc-only-skip landmine. Iter-848 ran the exact experiment PR #487's body framed — a depth-1 `.md`-only diff (`docs/CONTEXT.md` edit) — and the empirical CI evidence falsified the hypothesis: the depth-1 file still classified as `code = true`. Iter-848 traced the actual root cause via local picomatch replica of `dorny/src/filter.ts` and filed follow-up issue **#490** with three viable fix directions. Posted a comment on PR #485 explaining the no-op nature of its `'!*.md'` addition.

🎯 **Iter-847: paths-filter top-level `*.md` PR opened (#485) on the falsified hypothesis.** Iter-847 had filed issue #483 attributing #482's full-e2e run on a STATUS-only diff to a picomatch depth-0 quirk and proposed adding `'!*.md'` to the existing exclusion list. PR #485 opened with the change + ADR 0016 "Correction (iter-847)" + an empirical-validation framing. The change shipped to the branch but iter-848's reproduction work overtook the framing — closed iter-849 as no-op under dorny's `some` default.

🎯 **Iter-846: STATUS sync merged via PR #482; iter-845 board re-sync (PR #480) merged earlier.** No rubric movement; doc-only iterations.

🎯 **Iter-844: CI restructure step 3 BLOCKED — merge queue not available on user-owned public repos.** PR #477 shipped the `merge_group:` workflow trigger to `main` (dormant; activation requires repo transfer to a GitHub org). Issue #469 relabeled `status:needs-human`. The 7-9× speedup from steps 1+2 (#472 + #475) already delivers the bulk of #452's intent.

🎯 **Iter-826: walks 14 + 19 merged → rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451).**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **2 of 28** at 3 (dim 5 BDD, dim 14 Round-trip integrity); 20 at 2, 2 at 1 (dim 17 edge editing; dim 22 import/export), 4 at 0 (incl. dim 13, dim 23) |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **2 open `type:design`** (#452 CI-velocity epic — step 3 status:needs-human; #454 ADR raise A.8 cap — blocked on #469). **2 open `type:bug`** in flight: #483 (CI doc-only-skip symptom; will close on merge of this PR), #490 (this PR's fix; will close on merge). **1 open `type:chore` `status:needs-human`**: #469. |
| A.12 #3 | Three consecutive convergence walks | **chain at 2** (walk-22, walk-23). Walk-25 (dim-13 follow-up) deferred since iter-847; iter-846/847/848/849 were CI-velocity hygiene, not architect walks. |
| A.12 #4 | FBW example shipped + loadable | partial — engineering-unblocked at dim-14 = 3; bottleneck is architect authoring throughput vs A.6 coverage thresholds. |

## Current iteration
- Iteration #: 849
- Started: 2026-05-18
- Branch: `issue/490-positive-enumeration`
- Working on: **#490 — ADR 0016 actual fix.** Drops dorny `some`-predicate-defeated `'**' + '!*.md'` filter; enumerates code-bearing paths positively. Touched files: `.github/workflows/ci.yml`, `docs/adr/0016-ci-doc-only-skip-e2e.md`, `STATUS.md`, `docs/architect/in-flight.md`.

## Last test run
- Local: YAML sanity-parse on `.github/workflows/ci.yml` passes.
- CI self-test: this PR touches `.github/workflows/**` → new filter classifies as `code = true` → full e2e shard matrix MUST run on this PR. If e2e is skipped on this PR, the new enumeration is wrong and accidentally excluded `.github/workflows/**`; the umbrella `check` aggregator would fail at `if [ "$code" = "true" ]; then ... if [ "$e2e" != "success" ] ... fi` and reject the merge.
- Empirical post-merge validation: the next STATUS-only PR (iter-850 or beyond) should classify as `code = false`, skip all four e2e shards, and report `check` green in ~3 min.

## Last PR sweep
- Iter-849 open: 1 open PR (#485, BEHIND on stale `phase-15/iter-847-paths-filter-toplevel-md`, all checks green but the diff is a known no-op per iter-848 finding).
- **Iter-849 sweep action: closed #485** with a comment citing iter-848's evidence + supersession by #490. No `gh pr update-branch` rebase — closing is the correct action when the diff doesn't change behaviour.
- This PR opens as the only in-flight PR (1/5 of A.8 cap).

## Known issues / blockers
- **#469 (CI step 3, merge queue) BLOCKED:** GitHub feature-gates merge queue to org-owned repos. `status:needs-human` pending operator decision (transfer to org / close as wontfix / accept current 7-9× speedup as sufficient).
- All other rubric/walk advancement unblocked.

## Open phase:15 issues at iter-849 open
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Steps 1+2 done; step 3 (#469) blocked.
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap. Blocked behind #469.
- #483 (p2, type:bug, status:in-progress, area:cross-cutting) — ADR 0016 path-filter misses top-level `*.md`. **Iter-849 — will close on merge of this PR** (#490's fix supersedes the symptom).
- #490 (p2, type:bug, status:in-progress, area:cross-cutting) — **ADR 0016 actual fix (this PR's issue).** Will close on merge.

## Decisions log

**Iter-808..iter-846 entries preserved in earlier commits.**

- **Iter-847 — paths-filter top-level `*.md` PR opened (#485).** Hypothesised picomatch depth-0 quirk; added `'!*.md'` as a sibling exclusion. Shipped to branch but not merged before iter-848 falsified the hypothesis.
- **Iter-848 — CONTEXT.md correction merged via PR #489.** Empirical reproduction on a depth-1 `.md`-only PR (#487) showed the file still classified as `code = true`. Root cause traced to `dorny/paths-filter@v3` `patterns.some(aPredicate)` default semantics — every bang rule is a no-op alongside the `'**'` catch-all. Filed #490 with three viable corrections.
- **Iter-849 — ADR 0016 actual fix opened (this PR, closes #490).** Closed PR #485 as no-op-under-`some`-semantics. Implemented option 3 of #490: drop `'**'` catch-all + enumerate code-bearing paths positively. Updated ADR 0016 with a "Correction (iter-849)" section preserving the original decision text and documenting the dorny landmine, the three considered alternatives, the trade-off (new top-level code-bearing files default to doc-only and require updating the filter), and the self-test approach. Auto-merge SQUASH armed.

## Session checkpoint summary

This session (iter-793 → iter-849) executed **57 iterations** spanning bootstrap, **12 architect walks** + walk-24 merged, **~23 engineer batches**, **6 release tags**, **3 ADRs** (0014/0015/0016), and CI-velocity steps 1+2 shipped (#472, #475) + step 3 blocked (#469) + iter-847..849 ADR 0016 path-filter correction trail. Iter-847..849 = CI-velocity hygiene; no rubric or feature movement.

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

**Iter-850 — recommended pickup: walk-25 dim-13 follow-up** (the work iter-846 STATUS recommended for iter-847, before the CI-velocity trail consumed iter-847/848/849). Rationale: rubric advancement is again the front; ADR 0016 correction ships in this PR; #469 / #452 / #454 remain operator-blocked. Walk-25 targets dim 13 (cross-diagram coherence — same element across viewpoints stays in sync, cross-diagram navigation, rename reflection, registry integrity) toward score 2 → 3. Write the walk plan at `docs/architect/walks/walk-25.md` *before* opening the browser per A.5.

**Empirical validation of #490 fix:** the first doc-only PR after this merges (likely iter-850's STATUS sync, or the walk-25 close-out PR) should classify as `code = false` in the `fast` job log and skip all four `e2e (shard X/4)` jobs. The umbrella `check` job aggregator handles the doc-only branch of its `if/else` and reports success.

**#469 (CI step 3, merge queue):** No further loop work. `status:needs-human` until operator decides.

**ADR for raising A.8 cap (#454):** indefinitely blocked behind #469.

**FBW example (A.12 #4):** engineering-unblocked at dim-14 = 3. Architect authoring throughput against A.6 coverage thresholds remains the bottleneck.

**In-flight at iter-849 open (1/5 of A.8 cap):** this PR (`issue/490-positive-enumeration`).

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 57, well under the 300 churn ceiling.
