# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-871: walk-32 EXECUTED → 22/24 PCs PASS; iter-870 disambiguation half-falsified; #517 filed for Actor↔UseCase association (ADR 0007 § 5 deferral never landed); chain HOLDS at 0 / 3.** Walk-32 ran the four mechanical driver corrections from iter-870 disambiguation against unchanged `vphase-15.8` Pages (`95fb6c2`, `last-modified: 18:32:43 GMT` re-verified at launch). **3 of 4 corrections worked** — BDD/Requirements/Package V-B PASS clean (PascalCase fix on `drag_tree_group_to_canvas` calls confirmed iter-870's "lowercase typo" half of the disambiguation). **The fourth correction (UC association drag direction reversal) did NOT clear use-case/V-B PARTIAL** — `edge_kind='association-drag-no-edge'` persists. Root cause traced to `src/viewpoints/useCase/isValidConnection.ts:19-23`: cross-kind Actor↔UseCase pairs are silently rejected per ADR 0007 § 5 ("Phase 12 polish deferral") which never landed in Phase 12. Iter-870 inspected the handle declarations but missed the second-stage validator rejection; both drag directions fail the same way. **#517 filed** (`type:feature`, `p2`, `area:viewpoint:uc`) — implement Actor↔UseCase association edge as the explicit dim-10 score-3 blocker. **New heuristic in `docs/CONTEXT.md`:** React Flow drag pipeline has two rejection stages (handle hit-test + isValidConnection); triage must trace both.

🎯 **Iter-870: #513 DISAMBIGUATED → BOTH halves declared driver artefacts; #513 closed wontfix; chain stood at 0/3.** Pure code-reading triage. Half-correct in retrospect: V-B drag-tree-group lowercase typos WERE driver artefacts (walk-32 confirmed); UC handle direction was inspected at handle layer only (walk-32 falsified — the real cause is ADR 0007 § 5 deferral, not direction).

🎯 **Iter-869: walk-31 EXECUTED → 19/24 PCs PASS; #513 filed; chain RESETS 1 → 0 / 3.** V-A 8/8 PASS; V-B 3/8 PASS, 1/8 PARTIAL, 3/8 FAIL (root causes now fully diagnosed across walks 31 + iter-870 + 32).

🎯 **Iter-868: walk-31 plan SEALED** — 24-PC structure.

🎯 **Iter-867: walk-30 EXECUTED** — 8/8 PCs PASS, dim 6 IBD at 3 (THIRD score-3 dimension), chain 0 → 1 / 3.

🎯 **Iter-861: `vphase-15.8` / `v1.5.2` released.** PR #502 (squash `95fb6c2`) closed #499 + #500.

🎯 **Iter-826: rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451) = SECOND score-3 dimension.**
🎯 **Iter-867: rubric dim 6 (IBD) → score 3 via walk-30 clean regression on `vphase-15.8` Pages = THIRD score-3 dimension.**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **3 of 28** at 3 (dim 5 BDD, dim 14 Round-trip, dim 6 IBD); **22** at 2; 0 at 1; 3 at 0. Walk-32 reinforced dims 1/4/13/15/16/18/19/24/27/28 at 2 (broad-coverage evidence) without promoting any. Dim 10 (Use Case SysML conformance) score-3 promotion now has an explicit blocker (#517 Actor↔UseCase association). Next score-3 candidates: dim 10 after #517, dim 17 (Edge editing dedicated walk). |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **0 open `type:bug`**. **1 open `type:feature`** (#517, p2, status:ready, area:viewpoint:uc). **2 open `type:design`**: #452 (status:ready, no longer blocked behind #469), #454 (label says `status:blocked` but #469 cleared — needs relabel). |
| A.12 #3 | Three consecutive convergence walks | **chain[0 / 3]** — walk-32 filed #517 → chain holds at reset. Next chain[1] candidate is walk-33 (regression of walk-32 after #517 ships). |
| A.12 #4 | FBW example shipped + loadable | **Unblocked.** Dim 6 at 3 was the gating prerequisite. Authoring can proceed in parallel with #517 work. |

## Current iteration
- Iteration #: 871
- Started: 2026-05-19 (UTC)
- Branch: `phase-15/iter-871-walk-32-execute` (off main, not stacked)
- Working on: #516 — walk-32 execution with corrected driver (PR pending)

## Last test run
- Walk-32 driver run: `python3 artifacts/phase-15/walk-32/walk-32-exec.py` against `https://michaeljfazio.github.io/mbse-workbench/` (`vphase-15.8`, `last-modified: Mon, 18 May 2026 18:32:43 GMT`). **22/24 PASS, 1 PARTIAL (use-case/V-B), 1 INFO (X-7).** Page errors 0, console errors 0. Outcome at `artifacts/phase-15/walk-32/walk-32.json`; per-viewpoint screenshots under `artifacts/phase-15/walk-32/screenshots/` (gitignored per Phase-0 .gitignore rule).
- Iter-871 PR touches: `artifacts/phase-15/walk-32/walk-32-exec.py` (new — copy of walk-31 driver with 4 amendments), `artifacts/phase-15/walk-32/walk-32.json` (new), `docs/architect/walks/walk-32.md` (new), `docs/architect/in-flight.md`, `docs/architect/quality-rubric.md`, `docs/CONTEXT.md` (new heuristic), `STATUS.md`. Pure doc-only + new test-driver script; ADR 0016 fast-lane expected.
- PR #515 (iter-870 disambiguation) merged at `33d705e`. PR #514 (iter-869 walk-31-execute) merged at `5c32dfb`.

## Last health check

Per AGENT.md directive #13, iter-870 ran the periodic health check (divisible by 10) — all four checks PASS. Next health check is iter-880.

## Last PR sweep
- Iter-871 open: PR for this iteration (iter-871-walk-32-execute) — pending. **In-flight 1/5 of A.8 cap** (down from 2/5 at iter-870 close after #514/#515 both merged).
- At iter-871 launch `gh pr list --state open` returned `[]` — no inherited open PRs.

## Known issues / blockers
- **#517 OPEN (iter-871, `type:feature`, p2, status:ready, area:viewpoint:uc)** — implement Actor↔UseCase association (ADR 0007 § 5/§ 7 deferral never landed). Acceptance criteria + proposed resolution sketch in the issue body. Schedulable now; dim 10 score-3 promotion is the prize.
- **#516 OPEN (iter-871, `type:chore`, p1)** — meta-issue for iter-871 walk-32 execute (will close on this PR's merge).
- **#469 (status unclear)** — STATUS at iter-870 noted #469 closed 2026-05-18T13:17:34Z but did not inspect the closure rationale. Iter-872 should run `gh issue view 469` before deciding next moves on #452/#454.
- **#452 (CI velocity step 3, p1, type:design, status:ready):** open, status:ready, no longer blocked. Not a Phase-15 termination blocker.
- **#454 (raise A.8 cap, p2, type:design, status:blocked label):** open, label stale. Relabel to `status:ready` if/when picked up.

## Open phase:15 issues at iter-871 close
- #517 (p2, type:feature, status:ready, area:viewpoint:uc) — Implement Actor↔UseCase association. Dim 10 score-3 blocker.
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Step-3 dependency on #469 mechanically cleared.
- #454 (p2, type:design, status:blocked label, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap 5 → 10. Label stale.

## Decisions log

**Iter-808..iter-870 entries preserved in earlier commits.**

- **Iter-871 — iter-870 use-case disambiguation falsified by walk-32, but #513 NOT retroactively reopened.** Walk-32 proved the "reversed direction" half of iter-870's disambiguation was incorrect (both directions get rejected by `isValidUseCaseConnection`; the real cause is ADR 0007 § 5 deferral). Considered: (a) reopen #513; (b) file a fresh `type:feature` issue. Chose (b) because the underlying work (implement Actor↔UseCase association) is a distinct concern from #513's original "V-B drag mechanics" framing. #513 stays closed as the historical investigation that produced two findings; iter-871 tracks one of them (the deferral) as #517 with proper `type:feature` acceptance criteria.

- **Iter-871 — combined engineer + architect hat in single iteration, justified per iter-870 STATUS.** Per iter-870's Next Action: "Iter-871 scope is engineering + walk in the same iteration. Justified because the driver amendment is trivial (3 string changes + 1 selector reversal in a non-production test driver file) and the walk re-execute is the same broad-sweep — no design work, no new code paths." This held in execution: the driver edits took ~5 minutes; walk-32 driver ran headless in ~3 minutes; analysis + write-up took the remainder. No two-hat violation because the engineer work was entirely in test-driver code (no production change). iter-872 onward returns to one-hat-per-iteration.

- **Iter-871 — chain remains at 0 / 3, not advanced.** Walk-32 filed #517 → chain reset persists per A.12 #3 acceptance rule ("A single issue filed or any rubric demotion resets the chain to 0"). Walk-32 was nominally chain[1] candidate; it filed a real issue, so the chain holds. Next chain[1] candidate is walk-33 = a regression of walk-32 after #517 ships. Expected: 23/24 PASS + 1 INFO, no PARTIAL.

- **Iter-871 — no rubric demotion despite the use-case/V-B PARTIAL persisting.** Per A.10 score-2 description: "no blocking defects; recognisable rough edges; a competent user can work around them." UseCase↔UseCase Include/Extend/Generalization and Actor↔Actor Generalization all work; the missing Actor↔UseCase association is a recognised rough edge with workaround (use a different edge kind, or model the relationship in BDD). Dim 10 was already at 2; #517 is now the explicit promotion-to-3 blocker recorded in the rubric's "Last informed" column. Demoting to 1 would silently degrade the rubric (A.3 #3) without new evidence.

- **Iter-871 — walk-32 is NOT named "walk-31 re-run."** Per A.5 each walk gets a fresh ordinal and its own log file. Walk-31's log records the original 19/24 outcome; walk-32's log records the regression with corrected driver. The two are distinct walks even though they share a driver lineage. iter-870's disambiguation appended a "## Iter-870 disambiguation" section to walk-31.md; walk-32.md amends that disambiguation in its "## Iter-870 disambiguation amendment" section, NOT by editing walk-31.md retroactively.

## Session checkpoint summary

This session (iter-793 → iter-871) executed **79 iterations** spanning bootstrap, **17 broad/regression walks against deployed Pages** (walks 1 + 26 + 27 + 28 + 29 + 30 + 31 + 32), **~26 engineer batches**, **8 release tags**, **3 ADRs** (0014/0015/0016). Most recent arc: iter-868 walk-31 plan-seal → iter-869 walk-31 execute (19/24, #513) → iter-870 #513 wontfix triage (half-correct) → iter-871 walk-32 with corrected driver (22/24, #517 filed, iter-870 disambiguation half-falsified, new pipeline-stages heuristic in CONTEXT.md).

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 | Palette show-all-kinds + label consistency |
| vphase-15.4 / v1.3.0 | 2026-05-17 | IBD palette, usage hints, implicit-owner Package row, bus-dispatched diagrams |
| vphase-15.5 / v1.4.0 | 2026-05-17 | ADR 0015 steps 2/3/4 |
| vphase-15.6 / v1.5.0 | 2026-05-18 | #448 quoted-ident + #451 SysML view-block round-trip → dim 14 to 3 |
| vphase-15.7 / v1.5.1 | 2026-05-18 | #464 IBD enclosing-frame seed + #465 tree-row activates diagram tab |
| vphase-15.8 / v1.5.2 | 2026-05-18 | #499 IBD `ConnectionMode.Loose` for inout↔inout drag + #500 acronym auto-name |

Rubric: **3 × score-3** (dim 5 BDD, dim 14 Round-trip integrity, dim 6 IBD) + **22 × score-2** + **0 × score-1** + **3 × score-0** (incl. dim 23).

## Next action

**Iter-872 — pick up #517 (Actor↔UseCase association) as an engineer batch.** This is the dim-10 score-3 promotion blocker explicitly identified by walk-32. Concrete scope per the issue body:

1. Lift the silent `return false` in `src/viewpoints/useCase/isValidConnection.ts:19-23` for cross-kind Actor↔UseCase pairs.
2. Introduce an `Association` edge kind for use-case viewpoint (check if metamodel already has it; if not, add to `src/model/edges.ts` per the discriminated-union pattern from ADR 0002).
3. Update `allowedUseCaseEdgeKindsFor` to include `'Association'` for `(Actor, UseCase)` and `(UseCase, Actor)` pairs.
4. Update the stereotype picker popover (ADR 0007 § 7) to offer `Association` for cross-kind drops as the default.
5. Add `AssociationEdge.tsx` under `src/viewpoints/useCase/` (mirrors the existing `IncludeEdge.tsx` / `ExtendEdge.tsx` / `GeneralizationEdge.tsx` pattern).
6. Write tests: unit (validator accepts cross-kind pairs); e2e (drag from UseCase to Actor handle creates an Association edge); visual baseline (Chromium + WebKit) for the new edge.
7. After ship, regression walk-33 against the new bundle. If 23/24 PASS + 1 INFO (no PARTIAL), advance chain 0 → 1 / 3 and dim 10 → 3.

System-boundary chrome (ADR 0007 § 6) is a separate concern; #517 explicitly scopes only the association edge, not the boundary rectangle.

**Iter-872 budget consideration:** #517 is a multi-iteration effort (edge type + validator + picker + renderer + tests + visual baselines). Likely 3-5 iterations to ship. A release tag is likely warranted: `v1.6.0` (minor bump, since Association is an outward-facing feature visible to the architect).

**#469 inspection:** iter-872 should run `gh issue view 469` to read the closure rationale and decide whether #452 step 3 is unblocked-and-ready or moot.

**Dedicated dim-17 walk** (reconnect-by-endpoint-drag + waypoint add/remove + per-edge routing-style) — unblocked, schedulable after #517 lands.

**FBW example (A.12 #4):** still unblocked. Authoring can begin in parallel with #517 work.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 79, well under the 300 churn ceiling.

**In-flight at iter-871 close (1/5 of A.8 cap):**
- PR for this iter-871 walk-32-execute — pending.
