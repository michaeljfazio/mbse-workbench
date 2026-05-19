# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-894: architect hat → walk-36 PLAN-SEAL.** Walk-36 plan authored at `docs/architect/walks/walk-36.md` — dedicated **dim-17 (edge editing affordances) deep-dive** against the byte-identical `vphase-15.10` / `v1.6.1` Pages bundle (chain[2] candidate). Plan-seal PR also appends `## 2026-05-19 — Dim-17 edge-editing affordance conventions (walk-36 prereq)` research section to `docs/architect/visual-standards.md` (primary-source-cited per A.9 generalised to cross-cutting dims). Per the **pre-plan-seal code scan** recorded in walk-36.md § Pre-plan-seal code scan, the workbench source today wires **none** of the five dim-17 score-3 sub-criteria for end-user control (`reconnectable` not set; no waypoint API; routing hard-coded per edge kind; labels `pointerEvents:'none'`; no per-edge style picker) — so the **expected outcome is 3–6 PCs FAIL** with 3–5 `p1`/`p2` `type:feature` issues filed, **chain resetting 1 → 0 / 3**. The honest deep-dive is the correct deliverable per A.10 score-honesty + A.16 cosmetic-only-fixes risk entry. Closes `#560`. **Walk-36 EXECUTE lands in iter-895+.**

🎯 **Iter-893: architect close-out for walk-35 — chain advance 0 → 1 / 3 committed + dim 10 (Use Case SysML conformance) promoted 2 → 3 (FOURTH score-3 dim) + JOURNAL `event: design-decision` entry per A.14 broader-interpretation precedent.** Small docs-only PR bundles iter-892's walk-35 execute commit (`d5627b5`) with iter-893's rubric/JOURNAL/STATUS edits. Closes `#556`. All six dim-10 score-3 criteria now satisfied with cited evidence per walk-35.md § Acceptance / rubric impact row 1 + § Close-out (ellipses, actor stick figures, Association bidirectional on Actor↔UseCase, `include`, `extend`, generalization between use cases, generalization between actors; system-boundary chrome explicitly deferred per ADR 0007 § 5). Walk-36 plan-seal landed at iter-894 (this row above).

🎯 **Iter-892: architect hat → walk-35 EXECUTED CLEAN against `vphase-15.10` / `v1.6.1` Pages.** 23/24 PASS + 1 INFO (X-7) — lands on row 1 of walk-35.md § Acceptance / rubric impact (expected outcome). Use-case V-B PASSES bidirectional (`edge_kind=association-bidirectional`) with both PRIMARY (`usecase.right → actor.left`) and SECONDARY (`actor.right → usecase.left`) drags opening the kind popover, committing via `use-case-edge-kind-Association` click, and producing a new `g[data-association-edge="true"]` element. Walk-34's PARTIAL is now fully disambiguated as a driver artefact: PRIMARY was a false positive (loose `[data-testid^="use-case-edge-"]` prefix matched the un-committed popover testids); SECONDARY was a false negative (popover testids from PRIMARY's un-committed popover were already in the pre-drag snapshot). Zero issues filed; zero rubric demotion.

🎯 **Iter-891: architect hat → walk-35 PLAN-SEAL.** Walk-35 plan authored at `docs/architect/walks/walk-35.md` with corrected use-case V-B driver consuming the iter-890 popover-prefix-collision gotcha. Closed `#554`; merged at `4eff517` (PR #555).

🎯 **Iter-890: engineer hat → #548 closed as walk-driver artefact (NOT an application bug).** Investigation traced walk-34's `use-case_v_b_secondary: FAIL` to a testid-prefix collision in the walk driver: `[data-testid^="use-case-edge-"]` matches both real edge testids (`use-case-edge-{id}`) AND popover testids (`use-case-edge-kind-popover`, `use-case-edge-kind-Association`, ...). PRIMARY's PASS was a false positive (popover testids appearing as "new" edges); SECONDARY's FAIL was a false negative (popover testids already in the `before` snapshot from PRIMARY's still-open popover). New e2e test `tests/e2e/use-case-edges.spec.ts § 'drag Actor.right → UseCase.left also opens popover for Association (phase-15 #548)'` exercises the exact handle pair and PASSES — application is correct. CONTEXT.md gotcha appended for walk-35's driver fix.

🎯 **Iter-889: walk-34 architect close-out — JOURNAL escalation entry + STATUS sync (#552 merged at `8b00915`).** No source code changes that iteration; doc-only PR.

🎯 **Iter-888: walk-34 EXECUTED → 22/24 PASS + 1 PARTIAL (use-case/V-B) + 1 INFO (X-7); #548 filed.** Walk-34's PARTIAL finding now traced to driver artefact in iter-890.

🎯 **Iter-887: walk-34 plan-seal merged at `a8651bb` (PR #547).**

🎯 **Iter-886: `vphase-15.10` / `v1.6.1` released — FIRST agent-cut release under ADR 0017.**

🎯 **Iter-885: `#542` filed + resolved via ADR 0017 in the same iteration.**

🎯 **Iter-879: engineer hat → #528 fix shipped (PR #531).** Actor source handles on `Position.Right` and `Position.Bottom`. **iter-890 confirmed this fix is COMPLETE and correct — the walk-34 finding was a driver artefact, not an incomplete fix.**

🎯 **Iter-878: walk-33 EXECUTED → 22/24 PASS + 1 PARTIAL + 1 INFO; #528 filed.**
🎯 **Iter-876: `vphase-15.9` / `v1.6.0` released — Actor↔UseCase Association live.**

🎯 **Iter-826: rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451) = SECOND score-3 dimension.**
🎯 **Iter-867: rubric dim 6 (IBD) → score 3 via walk-30 clean regression on `vphase-15.8` Pages = THIRD score-3 dimension.**
🎯 **Iter-893: rubric dim 10 (Use Case SysML conformance) → score 3 via walk-35 clean regression on `vphase-15.10` Pages with corrected non-artefactual driver = FOURTH score-3 dimension.**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **4 of 28** at 3 (dim 5 BDD, dim 14 Round-trip, dim 6 IBD, **dim 10 Use Case SysML — promoted at iter-893**); 21 at 2; 0 at 1; 3 at 0. |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **Satisfied** at iter-894 launch and at iter-894 close (only `#560` open, `type:chore`, label-scope-excluded; closes with this PR's merge). Iter-895 walk-36 execute is expected to file 3–5 `type:feature` issues — A.12 #2 will go un-satisfied at that point until the engineer-batch sequence closes them. |
| A.12 #3 | Three consecutive convergence walks | **chain[1 / 3]** committed at iter-893 — walk-35 EXECUTED CLEAN. Walk-36 (plan-seal this iteration; execute iter-895+) is the chain[2] candidate. **Expected outcome resets the chain to 0** per walk-36.md § Acceptance / rubric impact row 3 (the honest-deep-dive trade for explicit dim-17 measurement). |
| A.12 #4 | FBW example shipped + loadable | **Un-gates on chain saturation + rubric saturation.** |

## Current iteration
- Iteration #: 894
- Started: 2026-05-19 (UTC, post-#558 merge at `24b5f6e`)
- Branch: `phase-15/walk-36-plan-seal` (off main `24b5f6e`, not stacked)
- Working on: #560 — walk-36 plan-seal (architect hat)

## Last test run
- `pnpm typecheck` not run this iteration — plan-seal is docs-only at the commit layer (touched: `docs/architect/visual-standards.md`, `docs/architect/walks/walk-36.md` (new), `docs/architect/in-flight.md`, `STATUS.md`). No source changes; no test additions.
- Full CI gate runs on the PR via the doc-only paths-filter from ADR 0016 (CI skips e2e for doc-only PRs that touch only `docs/**`, `JOURNAL.md`, and `STATUS.md`).
- **Pre-plan-seal code scan recorded in walk-36.md § Pre-plan-seal code scan** verified the five dim-17 score-3 sub-criteria against `src/workspace/CanvasPane.tsx`, `src/workspace/SecondaryCanvasPane.tsx`, `src/viewpoints/*/`: `reconnectable` not wired on main pane; `edgesReconnectable={false}` on split pane; no waypoint API anywhere; routing hard-coded per edge kind (bezier for IBD/Activity/State Machine; smooth-step for BDD/Requirements/UseCase/Package); labels render with `pointerEvents: 'none'`; no per-edge style picker. **Walk-36 expected to land row 3 of § Acceptance / rubric impact (3–6 PCs FAIL).**

## Last health check

Per AGENT.md directive #13, **iter-880** ran the periodic health check — **all four checks PASS**. Next health check is **iter-900** (iter-890 deferral now compounds to iter-900 to keep the every-10th cadence on round multiples).

Iter-894 incidentally re-verified the "Pages deploy reachable" check (HTTP 200 + byte-identical headers to walks 34, 35, 35-execute anchors — `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"`) — passes — but this does not advance the formal health-check cadence.

## Last PR sweep
- Iter-894 launch: `gh pr list --state open` returned `[#558]` then `[]` immediately after #558 auto-merged at `24b5f6e`. This iteration opens one new PR (the walk-36 plan-seal docs PR). **In-flight 1 / 5 of A.8 cap** at iter-894 close.

## Known issues / blockers
- None. Walk-36 plan-seal is a clean docs-only PR. The expected outcome at iter-895 (walk-36 execute) is **3–6 PCs FAIL with 3–5 issues filed**, but that is *expected* per walk-36.md § Acceptance / rubric impact row 3 — not a blocker for the plan-seal iteration.

## Open phase:15 issues at iter-894 close (after this PR's merge)
- **Zero** `type:bug/feature/design` open. A.12 #2 fully satisfied. Only `#560` (`type:chore`) was open at iter-894 launch and closes with this PR.

## Decisions log

**Iter-808..iter-893 entries preserved in earlier commits.**

- **Iter-894 — walk-36 plan-seal merged + dim-17 conventions research appended to `visual-standards.md`.** Per iter-876's post-dim-10 plan and walk-35.md § Decide next, walk-36 is a dedicated dim-17 (edge editing affordances) deep-dive against the byte-identical `vphase-15.10` / `v1.6.1` Pages bundle. The plan-seal PR ships three deliverables: (1) primary-source-cited research section in `docs/architect/visual-standards.md` (§A reconnect / §B waypoints / §C routing styles / §D label drag / §E edge style selection / §F cross-viewpoint variability) per A.9 generalised to cross-cutting dims; (2) walk-36 plan + snapshot + pre-plan-seal code scan at `docs/architect/walks/walk-36.md` documenting eight pass criteria across BDD + IBD + Activity viewpoints; (3) STATUS + in-flight sync. The walk adopts the **STRICT reading** of PC6 (edge style selection requires a user-facing picker, not just kind-determined defaults), on the precedent of dim 15 score-3 ("Every palette item behaves the same — all draggable").

- **Iter-894 — honesty-over-throughput tradeoff for walk-36 made explicit.** The pre-plan-seal code scan confirms the workbench wires none of the five dim-17 score-3 sub-criteria as user-facing affordances today. Walk-36 EXECUTE is therefore expected to land row 3 of § Acceptance / rubric impact (3–6 PCs FAIL, 3–5 `p1`/`p2` `type:feature` issues filed, chain resets 1 → 0 / 3). The rubric-measurement value (concrete file-able findings on dim 17 → engineer-batch backlog) is the load-bearing deliverable per A.10 + A.16. Per A.5 + A.16 "Cosmetic-only fixes — rubric scored 3 on visuals but app still unusable", the deep-dive that exposes the gap is the correct deliverable even at the cost of chain reset.

- **Iter-893 — chain advance 0 → 1 / 3 committed.** Walk-35's execute outcome (23/24 PASS + 1 INFO, zero issues filed at iter-892 execute) advances the A.12 #3 convergence chain by exactly 1. Per walk-35.md § Decide next, walk-36 becomes the chain[2] candidate (plan-seal iter-894+).

- **Iter-893 — dim 10 (Use Case SysML conformance) promoted 2 → 3 in `docs/architect/quality-rubric.md`.** All six A.10 score-3 criteria for dim 10 satisfied with cited evidence: ellipses (V-A every walk since walk-3), actor stick figures (walk-32+), Association bidirectional on Actor↔UseCase (walk-35), `include` / `extend` (walk-32), generalization between use cases (walk-32), generalization between actors (walk-32). System-boundary chrome explicitly deferred per ADR 0007 § 5 and not required for dim 10 score-3 per walk-35.md § Acceptance / rubric impact row 1. This is the **FOURTH** score-3 dimension (after dim 5 BDD at iter-826, dim 14 Round-trip at iter-834, dim 6 IBD at iter-867); A.12 #1 advances to 4 × score-3 + 21 × score-2 + 3 × score-0.

- **Iter-893 — JOURNAL `event: design-decision` entry appended per A.14 broader-interpretation precedent.** A.14's literal trigger is "First rubric dimension at 3" (already fired at iter-826 / dim 5); the broader interpretation used at iter-834 (dim 14) and iter-867 (dim 6) treats each subsequent dim promotion as a notable moment. Iter-893 follows the same precedent for dim 10.

- **Iter-893 — Walk-36 (chain[2] candidate) provisionally a dedicated dim-17 walk** per iter-876's post-dim-10 plan. Dim 17 (edge editing affordances — reconnect endpoints, waypoints, label placement, edge style selection) holds at 2; a focused walk against the deployed `vphase-15.10` bundle is the lightest path to chain[2]. Plan-seal lands in iter-894+.

## Session checkpoint summary

This session (iter-793 → iter-894) has executed **102 iterations** spanning bootstrap, **20 broad/regression walks against deployed Pages** (walks 1 + 26..35; walk-36 plan-seal landed this iteration, execute pending), **~29 engineer batches**, **10 release tags** (`vphase-15.1` → `vphase-15.10`), **4 ADRs** (0014/0015/0016/0017).

Most recent arc: iter-879 #528 fix shipped → iter-880 health check PASS → iter-881..884 four blocked-tick STATUS syncs → iter-885 ADR 0017 (agent-cut tags) → iter-886 vphase-15.10 / v1.6.1 first agent-cut release → iter-887 walk-34 plan-seal (PR #547) → iter-888 walk-34 execute (22 PASS + 1 PARTIAL + 1 INFO; #548 filed) → iter-889 walk-34 architect close-out (PR #552) → iter-890 engineer hat → #548 closed as walk-driver artefact + lock-in test (PR #553) → iter-891 walk-35 plan-seal with corrected driver (PR #555 merged at `4eff517`) → iter-892 walk-35 EXECUTE → CLEAN row 1 (23/24 PASS + 1 INFO) → iter-893 walk-35 close-out → chain 0 → 1 / 3 + dim 10 → 3 (FOURTH score-3 dim) + JOURNAL entry committed (PR #558 merged at `24b5f6e`) → **iter-894 walk-36 plan-seal — dedicated dim-17 deep-dive against `vphase-15.10` Pages with primary-source-cited convention research + STRICT-reading PC6 + pre-plan-seal code scan documenting 5/5 sub-criteria not wired (expected outcome: 3–6 PCs FAIL, chain 1 → 0 / 3)**.

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
| vphase-15.9 / v1.6.0 | 2026-05-18 | #517 Actor↔UseCase Association + ADR 0007 § 5/§ 7 deferral closure |
| vphase-15.10 / v1.6.1 | 2026-05-19 | #528 use-case bidirectional-drag fix (#531) + ADR 0017 agent-cut tag cadence (#543). Iter-890 confirms the #531 fix is complete; walk-34's contrary finding was a driver artefact. Walk-35 (iter-892) deployed-bundle confirms bidirectional Actor↔UseCase Association → dim 10 promotion at iter-893. |

Rubric: **4 × score-3** (dim 5 BDD, dim 14 Round-trip integrity, dim 6 IBD, **dim 10 Use Case SysML conformance**) + **21 × score-2** + **0 × score-1** + **3 × score-0** (dims 3, 11, 23).

## Next action

**Iter-895 — walk-36 EXECUTE.** Wear architect hat per A.5 step 3. Drive the deployed `vphase-15.10` / `v1.6.1` Pages bundle (re-verify `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"` before launching the driver — abort if drift). Execute the eight pass criteria in `docs/architect/walks/walk-36.md § Pass criteria` across BDD + IBD + Activity viewpoints. Capture screenshots under `artifacts/phase-15/walk-36/screenshots/` (one per affordance × viewpoint = 18 + 2 cross-cutting). Write structured outcome to `artifacts/phase-15/walk-36/walk-36.json`. Per walk-36.md § Pre-plan-seal code scan, the **expected outcome is row 3** (3–6 PCs FAIL → chain 1 → 0 / 3 → 3–5 `p1`/`p2` `type:feature` issues filed per A.7 one-issue-per-defect rule). After execute, append § Execution to the walk file and file the issues. Iter-896 wears the engineer hat to begin closing the dim-17 backlog in themed `area:routing` / `area:cross-cutting` batches per A.8.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 102, well under the 300 churn ceiling.

**In-flight at iter-894 close (1 / 5 of A.8 cap until PR merges, then 0 / 5):**
- PR for iter-894's walk-36 plan-seal (#560 — docs-only) — opens this iteration.
