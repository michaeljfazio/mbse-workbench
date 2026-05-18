# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-869: walk-31 EXECUTED → 19/24 PCs PASS automated + visually; #513 filed; convergence chain RESETS 1 → 0 / 3.** Walk-31 ran against `vphase-15.8` Pages (`95fb6c2`, `last-modified: 18:32:43 GMT` re-verified at iter-869 launch). V-A 8/8 PASS across every viewpoint; V-B 3/8 PASS (IBD, Activity, State Machine), 1/8 PARTIAL (Use Case Actor→UseCase handle-drag no edge), 3/8 FAIL (BDD/Requirements/Package — second drag-from-tree-group-header inert). Cross-cutting X-1/X-2/X-3/X-4/X-5/X-6/X-8 PASS; X-7 INFO. **#513 filed** (`area:palette` + `area:viewpoint:uc`, p2 type:bug) — V-B failures need driver-vs-app disambiguation in iter-870. **No rubric dim demotions** per A.10 score-2 (rough edge with workaround, not blocker). Three driver fixes applied mid-iteration and documented in walk-31.md § Execution (PascalCase group-kind test-ids, `.react-flow__handle-*` CSS selectors, SVG-aware fill probe).

🎯 **Iter-868: walk-31 plan SEALED** — 24-PC structure (8 × 2 per-viewpoint + 8 cross-cutting) across every viewpoint on the unchanged `vphase-15.8` bundle.

🎯 **Iter-867: walk-30 EXECUTED** — 8/8 PCs PASS, dim 6 IBD at 3 (THIRD score-3 dimension), chain 0 → 1 / 3.

🎯 **Iter-866: walk-30 plan SEALED + #508 closed via PR #510 (`518be4c1`).**

🎯 **Iter-865: walk-29 EXECUTED** — 7/8 PCs PASS automated; 8/8 visually; #508 filed.

🎯 **Iter-861: `vphase-15.8` / `v1.5.2` released.** PR #502 (squash `95fb6c2`) closed #499 + #500.

🎯 **Iter-826: rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451) = SECOND score-3 dimension.**
🎯 **Iter-867: rubric dim 6 (IBD) → score 3 via walk-30 clean regression on `vphase-15.8` Pages = THIRD score-3 dimension.**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **3 of 28** at 3 (dim 5 BDD, dim 14 Round-trip integrity, dim 6 IBD); **22** at 2; 0 at 1; 3 at 0. Walk-31's broad-sweep evidence reinforced dims 1/4/15/16/18/19/24/27/28 at 2 but did NOT promote any (per A.10 score-3 descriptions require deep-dive evidence not in scope for a broad sweep). Next score-3 candidates: dim 17 (Edge editing — dedicated walk unblocked by dim 6 at 3) and dims 8/9/11 (Activity / State Machine / Parametric SysML conformance — deep-dive candidates informed by walk-31's broad coverage). |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **1 open `type:bug`** (#513 walk-31 V-B failures, p2, status:ready). **0 open `type:feature`**. **2 open `type:design`**: #452 (`status:needs-human` via #469), #454 (blocked behind #469). **1 open `type:chore` `status:needs-human`**: #469. |
| A.12 #3 | Three consecutive convergence walks | **chain[0 / 3]** — walk-31 filed #513 → chain reset per plan acceptance. Next walk's chain[1] candidacy is the iter-870 follow-up after #513 disambiguation. |
| A.12 #4 | FBW example shipped + loadable | **Unblocked.** Dim 6 at 3 was the sole gating prerequisite per A.10. Authoring can proceed in parallel with #513 disambiguation — decision held to iter-870 open. |

## Current iteration
- Iteration #: 869
- Started: 2026-05-19 (UTC)
- Branch: `phase-15/iter-869-walk-31-execute`
- Working on: walk-31 execute (broad-sweep on `vphase-15.8` Pages, 19/24 PCs PASS, #513 filed, chain reset).

## Last test run
- iter-869 PR touches `artifacts/phase-15/walk-31/walk-31-exec.py` (new — driver), `artifacts/phase-15/walk-31/walk-31.json` (new — outcome), `docs/architect/walks/walk-31.md` (Execution+Findings+Rubric deltas+Convergence+Decide next sections appended), `docs/architect/in-flight.md` (one-row swap), `docs/architect/quality-rubric.md` (one walk-31 row in score delta log), `STATUS.md`. Per ADR 0016 the doc-only paths-filter MAY skip e2e on this PR; if `artifacts/phase-15/**` triggers a non-doc-only classification, the full pipeline runs.
- iter-868 walk-31-plan-seal PR #512 merged at `13b4dcbd` after fast-lane green.
- iter-867 walk-30-execute PR #511 merged at `c23bbd3` after fast-lane green.

## Last PR sweep
- Iter-869 open: this walk-31-execute PR. **In-flight 1/5 of A.8 cap.**
- Per AGENT.md PR-sweep protocol at iter-869 start: PR #512 (iter-868 walk-31-plan-seal) was IN_PROGRESS at iteration entry → CI completed green → auto-merged at `13b4dcbd` before this iteration's branch work began. No other PRs open.

## Known issues / blockers
- **#513 (walk-31 V-B failures) NEW:** `p2`, `type:bug`, `area:palette` + `area:viewpoint:uc`, `status:ready`. Iter-870 disambiguates driver-vs-app via non-headless reproduction.
- **#469 (CI step 3, merge queue) BLOCKED:** `status:needs-human` pending operator decision.
- **#452 (CI velocity epic step 3):** blocked behind #469.
- **#454 (raise A.8 cap):** blocked behind #469.

## Open phase:15 issues at iter-869 close
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Steps 1+2 done; step 3 (#469) blocked.
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap. Blocked behind #469.
- **#513 (p2, type:bug, status:ready, area:palette + area:viewpoint:uc) — Walk-31 V-B failures: subsequent drag-from-tree-group-header inert; Actor→UseCase handle drag no-edge. NEW from iter-869.**

## Decisions log

**Iter-808..iter-868 entries preserved in earlier commits.**

- **Iter-869 — accept 19/24 + file ONE consolidated `p2 type:bug` issue rather than per-viewpoint issues.** The 5 V-B failures share a structural property (V-A succeeded everywhere; only second-drag-of-same-affordance or non-canonical handle direction fails). Triage as one investigation — driver vs app disambiguation — keeps iter-870's scope tight and avoids a fan-out of issues that may all collapse to a single root cause. The honest measurement is recorded; the bug-vs-driver decision is held to iter-870 with non-headless reproduction.

- **Iter-869 — no rubric dim demotions despite chain reset.** Per A.10 score-2 description: "no blocking defects; recognisable rough edges; a competent user can work around them." The V-B gap is exactly that — users can still author multi-element diagrams via tree-menu `create_child` rather than tree-group-header drag. Demoting dim 15 / dim 17 / dim 10 prematurely on a possibly-driver-side artefact would be silent rubric degradation (A.3 #3) without evidence. The walk file records the symptom; the rubric stays honest at 2 pending iter-870 disambiguation.

- **Iter-869 — chain reset 1 → 0 per plan acceptance table, NOT a demotion.** The plan explicitly states "A single issue filed or any rubric demotion resets the chain to 0." Filing #513 triggers the reset cleanly; this is not a punitive action, it is the rubric working as designed. Walk-30's chain[1] still counts as evidence that the IBD-deep-dive arc converged; walk-31 ADDED broad-coverage evidence and surfaced a new finding — both are progress, the chain just needs to restart now that a new investigation is open.

- **Iter-869 — three driver-discipline fixes documented in walk-31.md § Execution.** PascalCase group-kind test-ids; `.react-flow__handle-*` CSS classes for handle drags; SVG-aware fill probe for ellipse/path-rendered nodes. Future broad-sweep walks inherit these. Not promoted to a stable `walk-driver.ts` helper yet (per the iter-865 contingency-clause threshold the copy-paste cost is below the rewrite cost), but they should be captured in any future walk file's § Tool & environment.

## Session checkpoint summary

This session (iter-793 → iter-869) executed **77 iterations** spanning bootstrap, **16 architect walks plus walk-31 executed** + **walks 26 + 27 + 28 + 29 + 30 + 31 against deployed Pages**, **~25 engineer batches**, **8 release tags**, **3 ADRs** (0014/0015/0016), and the iter-859 → iter-867 IBD ConnectionMode arc (walk-27 → #499/#500 batch → `vphase-15.8` ship → walks 28/29/30 verify + dim 6 to 3) plus the iter-868 → iter-869 broad-sweep arc (walk-31 plan-seal → execute → #513 filed → chain reset).

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

Rubric: **3 × score-3** (dim 5 BDD, dim 14 Round-trip integrity, dim 6 IBD) + **22 × score-2** + **0 × score-1** + **3 × score-0** (incl. dim 23).

## Next action

**Iter-870 — disambiguate #513.** Reproduce the V-B failures non-headless (real Chromium, not Playwright headless). Specifically:
- Manually drag `project-tree-group-PartDefinition` twice consecutively on a fresh BDD canvas. Does the second drag deliver the drop event? Watch DevTools network/console.
- Watch the Use Case Actor → UseCase handle drag manually. Per `UseCaseNode.tsx:69-119` and `ActorNode.tsx:51-62` the actor has only `type="target"` handles and the usecase has `type="source"` on Right; so the canonical association-drag direction is **usecase.right → actor.{top,left}**, NOT actor.right → usecase.left. The walk-31 driver had the direction reversed.

If iter-870 confirms the use-case finding is driver-direction-only and the tree-group-header double-drag is a real app bug: close #513 with the use-case half scoped out, file a smaller-scope follow-up (likely `area:explorer` rather than `area:palette`) for the tree-group-header issue, batch-fix in iter-871.

If iter-870 confirms BOTH are driver artefacts: close #513 as "wontfix — driver artefact"; amend walk-31 driver; walk-31 re-run becomes the chain[1] candidate.

**FBW example (A.12 #4):** still unblocked. Authoring can begin in parallel with #513 disambiguation. Per A.11 the FBW model must be authored through the production application's UI (no fixture imports). Multi-iteration effort given A.6 coverage targets (≥50 PartDefinitions, ≥100 PartUsages, ≥60 ConnectionUsages, etc.) and the new constraint that walk-31's `create_child`-via-tree-menu path is the proven multi-element creation flow regardless of #513's outcome.

**Dedicated dim-17 walk** (reconnect-by-endpoint-drag + waypoint add/remove + per-edge routing-style) — unblocked, schedulable after #513 resolves and walk-31's clean re-run becomes the new chain[1].

**#469 (CI step 3, merge queue):** no further loop work. `status:needs-human` until operator decides.

**ADR for raising A.8 cap (#454):** indefinitely blocked behind #469.

**In-flight at iter-869 close (1/5 of A.8 cap):** this walk-31-execute PR.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 77, well under the 300 churn ceiling.
