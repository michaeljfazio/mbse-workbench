# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-870: #513 DISAMBIGUATED → BOTH halves are driver artefacts; #513 closed wontfix; chain stands at 0/3.** Pure code-reading triage (no browser, no subagent dispatch, ~30 min): (a) **Use Case handle-drag PARTIAL** — `ActorNode.tsx:51-62` declares ONLY `Position.Top` and `Position.Left` `type="target"` handles. The walk-31 driver dragged `actor.right → usecase.left`, but the actor has no right handle and no source handles at all. Canonical direction per code: `usecase.right` (source) → `actor.top|left` (target). Driver direction was reversed. (b) **BDD/Requirements/Package V-B FAIL** — walk-31 driver V-A drags used PascalCase kind strings (`"PartDefinition"`, `"Requirement"`, `"Package"`); V-B drags used lowercase first-letter typos (`"partDefinition"`, `"requirement"`, `"package"`). CSS attribute selectors are case-sensitive on values; the V-B locators didn't match the live DOM and Playwright timed out. The mid-iter-869 PascalCase casing fix patched V-A drags but did not propagate to V-B's drag invocations. **Cross-check eliminates app-side hypotheses:** every V-B that used a dedicated viewpoint palette chip (IBD/Activity/State-Machine/Use-Case/Parametric) PASSED; failures correlate 1:1 with `drag_tree_group_to_canvas()` + lowercase kind arg. Disambiguation log appended to `docs/architect/walks/walk-31.md § Iter-870 disambiguation`. Walk-finding triage heuristic added to `docs/CONTEXT.md`. **No rubric movement** (no new evidence; existing walk-31 evidence re-interpreted).

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
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **0 open `type:bug`** (iter-870 closed #513 wontfix — driver artefact, both halves). **0 open `type:feature`**. **2 open `type:design`**: #452 (`status:needs-human` via #469), #454 (blocked behind #469). **1 open `type:chore` `status:needs-human`**: #469. |
| A.12 #3 | Three consecutive convergence walks | **chain[0 / 3]** — walk-31 filed #513 → chain reset stands. iter-870's wontfix close does NOT retroactively un-reset (a walk that found a driver artefact is a walk that found something; chain restarts at the next clean walk). Next chain[1] candidate is walk-32 (iter-871 work: amend driver V-B kind casing + reverse UC association direction + re-execute against unchanged `vphase-15.8`). |
| A.12 #4 | FBW example shipped + loadable | **Unblocked.** Dim 6 at 3 was the sole gating prerequisite per A.10. Authoring can proceed in parallel with iter-871's walk-32 re-run. |

## Current iteration
- Iteration #: 870
- Started: 2026-05-19 (UTC)
- Branch: `phase-15/iter-870-disambiguate-513` (stacked on `phase-15/iter-869-walk-31-execute` which has PR #514 in flight)
- Working on: #513 disambiguation — code-only triage concluded BOTH halves are driver artefacts; #513 closed wontfix; walk-31 stands as-is; iter-871 is the driver amendment + walk-32 re-run.

## Last test run
- iter-870 PR (this iteration) touches `docs/architect/walks/walk-31.md` (`## Iter-870 disambiguation` section appended), `docs/CONTEXT.md` (walk-finding triage heuristic appended), `docs/architect/in-flight.md` (row added — stacked branch), `STATUS.md`. Pure doc-only; ADR 0016 fast-lane expected.
- iter-869 walk-31-execute PR #514 OPEN with CI IN_PROGRESS at iter-870 entry — left alone per AGENT.md PR-sweep protocol ("`IN_PROGRESS` or `QUEUED` → leave it; next iteration will catch it").
- iter-868 walk-31-plan-seal PR #512 merged at `13b4dcbd` after fast-lane green.
- iter-867 walk-30-execute PR #511 merged at `c23bbd3` after fast-lane green.

## Last PR sweep
- Iter-870 open: PR #514 (iter-869 walk-31-execute) still OPEN with CI IN_PROGRESS — left alone per protocol. This iter-870 disambiguation PR stacks on top (off iter-869 branch HEAD, not main, because walk-31.md doesn't exist on main yet). **In-flight 2/5 of A.8 cap.**
- Per AGENT.md PR-sweep protocol at iter-870 start: PR #514 (iter-869) status = OPEN, MERGEABLE, CI IN_PROGRESS — `gh pr list` confirms. No action taken; the loop will pick it up when CI completes.
- Prior sweeps: PR #512 (iter-868 walk-31-plan-seal) merged at `13b4dcbd`. PR #511 (iter-867 walk-30-execute) merged at `c23bbd3`.

## Known issues / blockers
- **#513 CLOSED (iter-870, wontfix — driver artefact)** — both halves were driver-side: lowercase V-B kind strings and reversed UC association direction. iter-871 amends driver + re-runs walk-31 as walk-32.
- **#469 (CI step 3, merge queue) BLOCKED:** `status:needs-human` pending operator decision.
- **#452 (CI velocity epic step 3):** blocked behind #469.
- **#454 (raise A.8 cap):** blocked behind #469.

## Open phase:15 issues at iter-870 close
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Steps 1+2 done; step 3 (#469) blocked.
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap. Blocked behind #469.

## Decisions log

**Iter-808..iter-868 entries preserved in earlier commits.**

- **Iter-870 — code-only disambiguation chosen over non-headless reproduction.** STATUS at iter-869 close specified "Reproduce the V-B failures non-headless (real Chromium, not Playwright headless)." Iter-870 elected a cheaper alternative: pure code reading of (1) the walk-31 driver `walk-31-exec.py` lines 442-473 (V-A) vs 656/679-681/700-703 (V-B), and (2) the use-case node handle declarations in `ActorNode.tsx:51-62` and `UseCaseNode.tsx:69-119, 113-124`. Both findings were decisive without a browser: the V-A/V-B casing asymmetry is mechanically visible in the source, and the actor-has-no-source-handles is a structural code property. Total time: ~30 minutes. Reproduction in a real browser would have produced the same conclusion at much higher iteration cost. Future iterations: when a walk-finding has a partition-aligned failure pattern, check the driver code BEFORE booting a browser — this saves a full iteration of reproduction work. Heuristic recorded in `docs/CONTEXT.md`.

- **Iter-870 — close #513 wontfix rather than split or amend.** Considered alternatives: (a) split #513 into separate issues per half (UC + tree-group), (b) close UC half wontfix and leave tree-group half open for the iter-871 amendment, (c) amend the walk-31 driver in iter-870 and re-run immediately. All three were rejected. (a) creates issue noise for findings that collapse to identical root cause (driver discipline). (b) leaves stale state in the tracker for an issue whose fix is a docs comment, not code. (c) violates the two-hat discipline (A.3 #2): iter-870 is wearing the architect hat for triage; driver amendment + walk re-execute is a separate engineer-hat scope and belongs in iter-871 with its own evidence record. Closing wontfix with a public comment is the cleanest record.

- **Iter-870 — chain stands at 0/3, not promoted.** The plan's acceptance table specified "A single issue filed OR any rubric demotion resets the chain to 0." Filing #513 in iter-869 reset the chain. Closing #513 in iter-870 as wontfix does NOT un-reset — the chain measures empirical convergence (three consecutive walks finding nothing). A walk that found a driver artefact is a walk that found something; the artefact-vs-bug distinction is irrelevant to the chain. The next chain[1] candidate is walk-32 (iter-871's re-run with amended driver), expected to reach 24/24 PASS and file no issues.

- **Iter-869 — accept 19/24 + file ONE consolidated `p2 type:bug` issue rather than per-viewpoint issues.** The 5 V-B failures share a structural property (V-A succeeded everywhere; only second-drag-of-same-affordance or non-canonical handle direction fails). Triage as one investigation — driver vs app disambiguation — keeps iter-870's scope tight and avoids a fan-out of issues that may all collapse to a single root cause. The honest measurement is recorded; the bug-vs-driver decision is held to iter-870 with non-headless reproduction.

- **Iter-869 — no rubric dim demotions despite chain reset.** Per A.10 score-2 description: "no blocking defects; recognisable rough edges; a competent user can work around them." The V-B gap is exactly that — users can still author multi-element diagrams via tree-menu `create_child` rather than tree-group-header drag. Demoting dim 15 / dim 17 / dim 10 prematurely on a possibly-driver-side artefact would be silent rubric degradation (A.3 #3) without evidence. The walk file records the symptom; the rubric stays honest at 2 pending iter-870 disambiguation.

- **Iter-869 — chain reset 1 → 0 per plan acceptance table, NOT a demotion.** The plan explicitly states "A single issue filed or any rubric demotion resets the chain to 0." Filing #513 triggers the reset cleanly; this is not a punitive action, it is the rubric working as designed. Walk-30's chain[1] still counts as evidence that the IBD-deep-dive arc converged; walk-31 ADDED broad-coverage evidence and surfaced a new finding — both are progress, the chain just needs to restart now that a new investigation is open.

- **Iter-869 — three driver-discipline fixes documented in walk-31.md § Execution.** PascalCase group-kind test-ids; `.react-flow__handle-*` CSS classes for handle drags; SVG-aware fill probe for ellipse/path-rendered nodes. Future broad-sweep walks inherit these. Not promoted to a stable `walk-driver.ts` helper yet (per the iter-865 contingency-clause threshold the copy-paste cost is below the rewrite cost), but they should be captured in any future walk file's § Tool & environment.

## Session checkpoint summary

This session (iter-793 → iter-870) executed **78 iterations** spanning bootstrap, **16 architect walks plus walk-31 executed + iter-870 disambiguation** + **walks 26 + 27 + 28 + 29 + 30 + 31 against deployed Pages**, **~25 engineer batches**, **8 release tags**, **3 ADRs** (0014/0015/0016), and the iter-859 → iter-867 IBD ConnectionMode arc (walk-27 → #499/#500 batch → `vphase-15.8` ship → walks 28/29/30 verify + dim 6 to 3) plus the iter-868 → iter-870 broad-sweep arc (walk-31 plan-seal → execute → #513 filed → iter-870 code-only disambiguation → #513 wontfix → iter-871 will re-run as walk-32).

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

**Iter-871 — amend the walk-31 driver + execute walk-32 (re-run with corrections).** Concrete amendments:
1. **PascalCase the three V-B `drag_tree_group_to_canvas` calls** in `artifacts/phase-15/walk-31/walk-31-exec.py`:
   - line 656: `"package"` → `"Package"`
   - line 680: `"partDefinition"` → `"PartDefinition"`
   - line 702: `"requirement"` → `"Requirement"`
2. **Reverse the use-case association drag direction** at lines ~786-794: drag from `use-case-usecase-{id}` `.react-flow__handle-right` (source) → `use-case-actor-{id}` `.react-flow__handle-top` OR `.react-flow__handle-left` (target). Drop the `.react-flow__handle-right` selector on the actor entirely — actor has no right handle.
3. **Re-execute** against unchanged `vphase-15.8` Pages (`95fb6c2`, `last-modified: 18:32:43 GMT` — confirm via HEAD before re-run). Expected: **24/24 PCs PASS automated and visually**.
4. **If 24/24:** walk-32 becomes the chain[1] candidate (advance chain 0 → 1/3). No new issues filed.
5. **If <24/24:** treat any remaining failure as a real app bug, file an issue per A.7, document in `walk-32.md`, accept chain still at 0.
6. Produce `walk-32.md` as a new walk log (broad-sweep regression style, per A.5), NOT another append to walk-31.md.

**Iter-871 scope is engineering + walk in the same iteration.** Justified because the driver amendment is trivial (3 string changes + 1 selector reversal in a non-production test driver file) and the walk re-execute is the same broad-sweep — no design work, no new code paths. The two-hat discipline applies cleanly: engineer hat for the driver edits; architect hat for the walk-32 execution.

**FBW example (A.12 #4):** still unblocked. Authoring can begin in parallel with iter-871 walk-32. Per A.11 the FBW model must be authored through the production application's UI (no fixture imports). Multi-iteration effort given A.6 coverage targets (≥50 PartDefinitions, ≥100 PartUsages, ≥60 ConnectionUsages, etc.).

**Dedicated dim-17 walk** (reconnect-by-endpoint-drag + waypoint add/remove + per-edge routing-style) — unblocked, schedulable after walk-32 lands as chain[1].

**#469 (CI step 3, merge queue):** no further loop work. `status:needs-human` until operator decides.

**ADR for raising A.8 cap (#454):** indefinitely blocked behind #469.

**In-flight at iter-870 close (2/5 of A.8 cap):**
- PR #514 (iter-869 walk-31-execute) — CI IN_PROGRESS.
- iter-870 disambiguation PR (this iteration) — stacked on iter-869 branch.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 78, well under the 300 churn ceiling.
