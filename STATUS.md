# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-857: walk-27 plan SEALED (IBD deep-dive — chain[3] candidate + dim-6 score-3 promote candidate).** Per A.5 the walk plan is sealed before any browser opens. This PR commits two things: (a) per A.9, the research-populated `docs/architect/diagram-types/ibd.md` § "2026-05-19 — Deep-dive conventions (walk-27 prereq)" — 98 lines of port-square / connection-line-no-arrowhead / item-flow-solid-triangle / proxy-vs-full conventions all cited to OMG SysML v2 + 1.5 + Cameo/SysON vendor docs; (b) the walk-27 plan with 8 PCs targeting every dim-6 score-3 requirement plus opportunistic dim 3 (Ports) and dim 17 (Edge editing) coverage. Target = deployed `vphase-15.7` Pages (`4c5cc41`, `last-modified: 2026-05-18T16:17:04Z`). Expected execution duration 1–3 h per A.5.

🎯 **Iter-856: walk-26 executed clean on `vphase-15.7` Pages (4/4 PCs PASS, 0 issues filed)** — chain[1] → chain[2] / 3. Squash-merged via PR #497 at 2026-05-18T16:33:45Z (`a257094`).

🎯 **Iter-855: `vphase-15.7` / `v1.5.1` released.** Tags pushed on `main` at `4c5cc41`; Pages deployed (HTTP 200 at 16:17:04Z); doc-only release sync PR #496 merged at 16:23:00Z.

🎯 **Iter-853: walk-25 executed → CLEAN REGRESSION on local dev.** Rubric: dim 6 (IBD) 1 → 2 (restore) + dim 13 (Cross-diagram coherence) 0 → 2 (FIRST measurement).

🎯 **Iter-826: walks 14 + 19 merged → rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451).**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **2 of 28** at 3 (dim 5 BDD, dim 14 Round-trip integrity); **22** at 2; 1 at 1 (dim 17 edge editing); 3 at 0 (dim 23 LLM + others). Walk-27 (planned this iter) targets dim 6 → 3 as the third score-3 candidate. |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **2 open `type:design`** (#452 CI-velocity epic — step 3 status:needs-human; #454 ADR raise A.8 cap — blocked on #469). **0 open `type:bug`**. **1 open `type:chore` `status:needs-human`**: #469. |
| A.12 #3 | Three consecutive convergence walks | **chain[2] / 3** — walk-26 (Pages regression) was chain[2]. **Walk-27 is the chain[3] candidate AND the dim-6 score-3 candidate.** A clean walk-27 simultaneously triggers A.12 #3 and promotes dim 6 to 3. |
| A.12 #4 | FBW example shipped + loadable | further unblocked — IBD viewpoint Pages-confirmed end-to-end usable through enclosing-frame seed + BDD↔IBD coherence. Authoring throughput against A.6 coverage thresholds remains the bottleneck. |

## Current iteration
- Iteration #: 857
- Started: 2026-05-19
- Branch: `phase-15/iter-857-walk-27-plan`
- Working on: iter-857 walk-27 plan-seal. Two commits: (1) research-populate `docs/architect/diagram-types/ibd.md` with the 2026-05-19 deep-dive conventions section (A.9 prereq); (2) seal walk-27.md plan with 8 PCs, acceptance/rubric impact table, scope, and out-of-scope. Plan sealed before any browser opens per A.5. Execution iteration is the next iter after this PR merges.

## Last test run
- Local: this PR touches only `docs/architect/diagram-types/ibd.md`, `docs/architect/walks/walk-27.md`, `STATUS.md`, and `docs/architect/in-flight.md` — no code, no tests. CI-self-test: should classify `code = false`, skip all e2e shards, aggregate doc-only-branch `check` SUCCESS in ~1m 30s. Seventh consecutive doc-only-skip observation since the ADR 0016 path-filter correction (#491) shipped.

## Last PR sweep
- Iter-857 open: 0 open PRs (iter-856's #497 squash-merged at 16:33:45Z as `a257094`; main now at `a257094`).
- This iter-857 PR opens as the only in-flight PR (1/5 of A.8 cap).

## Known issues / blockers
- **#469 (CI step 3, merge queue) BLOCKED:** GitHub feature-gates merge queue to org-owned repos. `status:needs-human` pending operator decision (transfer to org / close as wontfix / accept current 6× speedup as sufficient).
- All other rubric/walk advancement unblocked.

## Open phase:15 issues at iter-857 open
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Steps 1+2 done; step 3 (#469) blocked.
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap. Blocked behind #469.

## Decisions log

**Iter-808..iter-856 entries preserved in earlier commits.**

- **Iter-857 — walk-27 = IBD deep-dive sealed.** Per walk-26's decide-next, IBD deep-dive is the highest-aggregate-value walk-27 candidate: a clean run delivers chain[3] (A.12 #3 trigger) AND dim-6 score-3 (the third score-3 dim after BDD + round-trip). The risk-balance noted in walk-26 stands: deep-dives "exercise rare relationships and edge cases" per A.5, so finding issues is the walk's *job*, not a failure. If walk-27 finds issues, chain resets to 0 but rubric still gains useful measurement data on dim 3, dim 6, and dim 17. Per A.9 the IBD diagram-types doc was research-populated **in the same iter-857 PR** ahead of the walk — primary-source citations from OMG SysML v2.0 spec, SysML 1.5 spec, and Cameo/SysON vendor docs cover port shape/placement/direction, conjugate-port `~TypeName` v2 form, connection-line-no-arrowhead default, item-flow solid-triangle decoration on connection, and proxy-vs-full distinction (v1 keywords vs v2 plain `port`).

## Session checkpoint summary

This session (iter-793 → iter-857) executed **65 iterations** spanning bootstrap, **14 architect walks** + **walk-26 executed clean against deployed Pages** + **walk-27 plan-seal**, **~23 engineer batches**, **7 release tags**, **3 ADRs** (0014/0015/0016), CI-velocity steps 1+2 (#472, #475) shipped + step 3 (#469) blocked, and the iter-847..851 ADR 0016 path-filter correction trail.

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 | Palette show-all-kinds + label consistency |
| vphase-15.4 / v1.3.0 | 2026-05-17 | IBD palette, usage hints, implicit-owner Package row, bus-dispatched diagrams, ADR 0014/0015 step 1 |
| vphase-15.5 / v1.4.0 | 2026-05-17 | ADR 0015 steps 2/3/4 (empty-state click-shortcut, inspector contextual, toolbar `+` retires) |
| vphase-15.6 / v1.5.0 | 2026-05-18 | #448 quoted-ident + #451 SysML view-block round-trip → dim 14 to 3 |
| vphase-15.7 / v1.5.1 | 2026-05-18 | #464 IBD enclosing-frame seed (closes #461) + #465 tree-row activates diagram tab (closes #462) → dim 6 → 2, dim 13 → 2 |

Rubric: **2 × score-3** (dim 5 BDD, dim 14 Round-trip integrity) + **22 × score-2** (incl. dim 6 + dim 13 Pages-confirmed) + **1 × score-1** (dim 17) + **3 × score-0** (incl. dim 23).

## Next action

**Iter-858 — execute walk-27 (IBD deep-dive).** Drive `artifacts/phase-15/walk-27/walk-27-exec.py` against the deployed `vphase-15.7` Pages bundle. Eight PCs covering parts-as-nested-blocks, port-shape-square, connection-no-arrowhead-default, direction-arrow-on-port, item-flow-solid-triangle, proxy-vs-full distinction, persistence round-trip, and zero-errors. Per A.5 a deep-dive that hits a blocking defect stops early — partial walk-27 is a useful outcome (rubric measurement on dim 3 / dim 6 / dim 17 even if not score-3 promote).

**Aggregate-value outcome targets:**
- **Best case** — 8/8 PCs PASS: dim 6 → 3 (third score-3 dim); chain[3] / 3 → A.12 #3 trigger fires; phase-15 score-3 count 2 → 3.
- **Mixed case** — partial PCs PASS: file issues per failed PC (likely candidates: missing UX path to add PartUsage to PartDefinition IBD, missing UX path to add ItemFlow on connection, missing proxy/full distinction in v1 mode); dim 6 holds at 2; chain resets to 0; rubric gains measurement data on dim 3 (ports) and dim 17 (edge editing).
- **Worst case** — affordance blocker on PC 1: walk stops early per A.5; file `p1` `area:viewpoint:ibd` issue for the missing affordance; no dim promotion this walk; chain resets to 0.

**#469 (CI step 3, merge queue):** No further loop work. `status:needs-human` until operator decides.

**ADR for raising A.8 cap (#454):** indefinitely blocked behind #469.

**FBW example (A.12 #4):** further unblocked once walk-27 lands (clean or otherwise) — IBD viewpoint deep-dive measurement is the gating evidence for how authoring an A.6-coverage-grade FBW model would actually feel. Architect authoring throughput against A.6 coverage thresholds remains the bottleneck.

**In-flight at iter-857 open (1/5 of A.8 cap):** this PR (`phase-15/iter-857-walk-27-plan`).

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 65, well under the 300 churn ceiling.
