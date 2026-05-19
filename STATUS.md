# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-896: engineer hat → #562 (PC1 endpoint reconnect) shipped via #568 + code-review fix-ups via #570 — FIRST dim-17 PC-level unlock landed.** Single-iteration engineer batch on `phase-15/dim17-edge-reconnect` (Sonnet impl + Sonnet pre-PR review per A.8): wires React Flow v12 `edgesReconnectable` + `onReconnect{Start,End}` on the primary `<ReactFlow>` in `src/workspace/CanvasPane.tsx`; adds a typed `reconnectEdge` store action covering both `ModelEdge`-backed flow edges (`Composition`/`Aggregation`/`Generalization`/`Association`/`Dependency`/`RequirementTrace`/`PackageImport`) and element-as-edge kinds (`ConnectionUsage`/`ItemFlow`/`ControlFlow`/`ObjectFlow`/`Transition`/`ParameterBinding`/`UseCaseEdge`); all viewpoint validators (`isValidBddConnection`/`isValidIbdConnection`/`isValidActivityConnection`/`isValidStateMachineConnection`/`isValidUseCaseConnection`/`isValidParametricConnection`/`isValidPackageConnection`) gate the new endpoint pair; `invert` restores both endpoints atomically for Cmd-Z. 9 unit tests + 4 Playwright e2e tests in #568. **Pre-PR review caught 2 blockers post-merge** (auto-merge fired on green CI before review report landed): (B1) `Generalization`/`Association` ModelEdges in #568 routed unconditionally to `isValidBddConnection`, silently rejecting valid UseCase Actor↔Actor reconnects — fixed by branching on active-diagram viewpoint id in `reconnectEdge`; (B2) `newHandleId == null` on `ConnectionUsage`/`ItemFlow` bypassed the validator — fixed to no-op with `false`; (I1) `end`-detection mis-classified same-node IBD handle swaps — fixed to compare both node id AND handle id; (I-extra) transposed `sourceHandle`/`targetHandle` in the IBD synthetic-connection builder discovered while writing tests — fixed; 9 new unit tests added for the IBD ConnectionUsage/ItemFlow paths + same-node handle swap regression test. Fix-ups landed as **#570** (auto-merge SQUASH pending CI) on `phase-15/dim17-edge-reconnect-fixups` (cherry-picked off main, not on the original branch — the merged squash of #568 made the original branch DIRTY for stacked work). PR #569 closed as stale (the same-branch attempt that hit the DIRTY state). In-flight 1 / 5 of A.8 cap.

🎯 **Iter-895: architect hat → walk-36 EXECUTED → row 3 (3–6 PCs FAIL — expected outcome).** Walk-36's dedicated dim-17 (edge editing affordances) deep-dive ran against the byte-identical `vphase-15.10` / `v1.6.1` Pages bundle (re-verified `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"` at driver launch). Driver: `artifacts/phase-15/walk-36/walk-36-exec.py` (gitignored). Outcome: **2/20 PASS (PC7 zero-errors cross-cutting + PC8 persistence cross-cutting), 18/20 FAIL (BDD + IBD + Activity × 6 affordances)**. 100% pre-plan-seal prediction accuracy — zero surprises; the walk was measurement, not discovery. **Five `type:feature` issues filed** per A.7 one-issue-per-defect (with cross-viewpoint workbench-wide misses captured as `area:cross-cutting` rather than per-viewpoint duplicates): `#562` (PC1 reconnect, p1, `area:cross-cutting`+`area:interaction`), `#563` (PC2/PC3 waypoint editing, p2, `area:routing`+`area:interaction`), `#564` (PC4 routing-style picker, p2, `area:routing`+`area:inspector`), `#565` (PC5 label drag, p2, `area:routing`+`area:interaction`), `#566` (PC6 stroke/color picker STRICT, p2, `area:cross-cutting`+`area:inspector`). **Chain resets 1 → 0 / 3** per walk-36.md § Decide next; **dim 17 stays at 2** with PC-level evidence now appended to `docs/architect/quality-rubric.md` row 17 + five filed issues as explicit promote pre-requisites. JOURNAL entry appended (`event: escalation`, precedent: iter-889 walk-34 chain reset). Closes the architect-walk lifecycle; engineer batches begin iter-896+.

🎯 **Iter-894: architect hat → walk-36 PLAN-SEAL.** Walk-36 plan authored at `docs/architect/walks/walk-36.md` — dedicated **dim-17 (edge editing affordances) deep-dive** against `vphase-15.10` / `v1.6.1` Pages (chain[2] candidate). Plan-seal PR also appended `## 2026-05-19 — Dim-17 edge-editing affordance conventions (walk-36 prereq)` research section to `docs/architect/visual-standards.md` (primary-source-cited per A.9 generalised to cross-cutting dims). Closes `#560` (merged at `5392a6c`, PR #561).

🎯 **Iter-893: architect close-out for walk-35 — chain advance 0 → 1 / 3 + dim 10 (Use Case SysML conformance) promoted 2 → 3 (FOURTH score-3 dim) + JOURNAL `event: design-decision` entry per A.14 broader-interpretation precedent.** Closes `#556` (PR #558 merged at `24b5f6e`).

🎯 **Iter-892: walk-35 EXECUTED CLEAN against `vphase-15.10` / `v1.6.1` Pages.** 23/24 PASS + 1 INFO — row 1 of walk-35.md § Acceptance / rubric impact.

🎯 **Iter-891: walk-35 PLAN-SEAL with corrected use-case V-B driver.** Closed `#554`; merged at `4eff517` (PR #555).

🎯 **Iter-890: engineer hat → #548 closed as walk-driver artefact (NOT an application bug).** PR #553 lock-in e2e at `tests/e2e/use-case-edges.spec.ts`.

🎯 **Iter-889: walk-34 architect close-out — JOURNAL escalation entry + STATUS sync (#552 merged at `8b00915`).**

🎯 **Iter-888: walk-34 EXECUTED → 22/24 PASS + 1 PARTIAL (use-case/V-B) + 1 INFO (X-7); #548 filed (later resolved as driver artefact at iter-890).**

🎯 **Iter-887: walk-34 plan-seal merged at `a8651bb` (PR #547).**

🎯 **Iter-886: `vphase-15.10` / `v1.6.1` released — FIRST agent-cut release under ADR 0017.**

🎯 **Iter-885: `#542` filed + resolved via ADR 0017 in the same iteration.**

🎯 **Iter-879: engineer hat → #528 fix shipped (PR #531).** Actor source handles on `Position.Right` and `Position.Bottom`.

🎯 **Iter-826: rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451) = SECOND score-3 dimension.**
🎯 **Iter-867: rubric dim 6 (IBD) → score 3 via walk-30 clean regression on `vphase-15.8` Pages = THIRD score-3 dimension.**
🎯 **Iter-893: rubric dim 10 (Use Case SysML conformance) → score 3 via walk-35 clean regression on `vphase-15.10` Pages with corrected non-artefactual driver = FOURTH score-3 dimension.**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **4 of 28** at 3 (dim 5 BDD, dim 14 Round-trip, dim 6 IBD, dim 10 Use Case SysML); 21 at 2; 0 at 1; 3 at 0. Unchanged at iter-895. |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **Un-satisfied at iter-896 close** — 4 open (#563/#564/#565/#566). #562 closed by #568 merge. Iter-897+ continues the engineer-batch sequence. |
| A.12 #3 | Three consecutive convergence walks | **chain[0 / 3]** at iter-895 close, unchanged at iter-896 — engineer batches don't advance the chain (walks do). chain[1] candidate is the post-issue-closure regression walk on a future `vphase-15.N` bundle once all five dim-17 fixes have shipped. |
| A.12 #4 | FBW example shipped + loadable | **Un-gates on chain saturation + rubric saturation.** |

## Current iteration
- Iteration #: 896
- Started: 2026-05-19 (UTC, post-#568 merge at `f4683ce`)
- Branch: `phase-15/dim17-edge-reconnect-fixups` (off main `f4683ce`, not stacked) — fix-up PR #570 pending CI auto-merge
- Working on: code-review fix-ups for the merged #568 (`reconnectEdge` for #562)

## Last test run
- Implementing subagent ran `pnpm run check` on the original branch — typecheck PASS, lint PASS (3 pre-existing warnings), unit 1504/1504 PASS, build PASS, e2e 621 PASS + 1 pre-existing webkit a11y color-contrast flake on the toolbar undo button (not caused by this PR).
- Fix-up subagent re-ran `pnpm run check` after the B1/B2/I1 fixes + new tests — same outcome (no regressions, 9 new unit tests in `reconnectEdge.test.ts` all green).
- CI on PR #570 IN_PROGRESS as STATUS.md is being written; auto-merge SQUASH enabled.

## Last health check

Per AGENT.md directive #13, **iter-880** ran the periodic health check — all four checks PASS. Next health check is **iter-900**. Iter-895 incidentally re-verified Pages reachability + byte-identical headers — passes — but does not advance the formal cadence.

## Last PR sweep
- Iter-896 launch: `gh pr list --state open` returned `[#567 (BLOCKED + MERGEABLE, CI IN_PROGRESS, auto-merge SQUASH enabled)]` — left per AGENT.md "CI IN_PROGRESS → leave it." #567 auto-merged to `bb38736` during iter-896 execution. This iteration opened two PRs: #568 (`feat(canvas): wire React Flow v12 edge reconnect…`, auto-merged to `f4683ce`), #569 (fix-ups on stale same-branch — closed as superseded), #570 (fix-ups on clean fixups branch — auto-merge SQUASH pending). **In-flight 1 / 5 of A.8 cap** at iter-896 close (#570 only).

## Known issues / blockers
- None. The 4 remaining dim-17 issues (#563/#564/#565/#566) are the *expected* iter-897+ engineer-batch backlog. The pre-existing webkit a11y color-contrast flake on the toolbar undo button persists across iters and is not caused by this iteration's changes; it is its own dim-25 finding and will be addressed when dim-25 is the active focus.

## Open phase:15 issues at iter-896 close (after #570 merges)
- **4 `type:feature` (`status:ready`):** #563 (p2, waypoint editing), #564 (p2, routing-style picker), #565 (p2, label drag), #566 (p2, stroke/color picker STRICT).
- **0 `type:bug` / `type:design` open.**

## Decisions log

**Iter-808..iter-895 entries preserved in earlier commits.**

- **Iter-896 — #562 (PC1 reconnect) shipped via #568 + fix-ups via #570.** First dim-17 PC-level unlock landed. Implementation by Sonnet engineer subagent (single-shot, TDD: 9 unit + 4 e2e tests); pre-PR review by Sonnet code-review subagent caught 2 blockers + 4 importants AFTER #568's auto-merge had already fired on green CI. Fix-ups landed on a clean `phase-15/dim17-edge-reconnect-fixups` branch cherry-picked off main (`f4683ce`), not on the original branch (the merged squash made it DIRTY for stacked work). PR #569 (the stale same-branch attempt) closed as superseded; PR #570 is the live fix-up PR.

- **Iter-896 — A.5/A.8 pre-PR-review discipline saved a correctness bug.** B1 (`Generalization`/`Association` validator routing for UseCase Actor↔Actor reconnects) would have been a real silent rejection of valid user gestures had it not been caught by the review subagent. Lesson for the loop: dispatch the pre-PR review subagent *before* opening the PR (or before enabling auto-merge), not in parallel with CI — auto-merge can fire faster than the reviewer reports. For future iter-N engineer batches, the main agent should run the pre-PR review BEFORE `gh pr merge --auto`. Recorded for future iters; do not edit AGENT.md to add this — it's already implicit in A.5 "main agent reviews the diff via a pre-PR code-review subagent before opening the PR."

- **Iter-896 — engineer-batch next-up: #564 + #566 (Inspector edge-style pickers).** Per iter-895 § Decisions log sketch, the second batch groups the per-edge stroke/color picker (#566) and the routing-style picker (#564) on shared Inspector + per-edge `data` extension infrastructure. Branch name: `phase-15/dim17-inspector-edge-style-pickers`. Cap status remains 1/5 (only #570 in-flight) so iter-897 can dispatch the second batch immediately without queueing.

## Session checkpoint summary

This session (iter-793 → iter-895) has executed **103 iterations** spanning bootstrap, **21 broad/regression walks against deployed Pages** (walks 1 + 26..36), **~29 engineer batches**, **10 release tags** (`vphase-15.1` → `vphase-15.10`), **4 ADRs** (0014/0015/0016/0017).

Most recent arc: iter-879 #528 fix shipped → iter-880 health check PASS → iter-881..884 four blocked-tick STATUS syncs → iter-885 ADR 0017 (agent-cut tags) → iter-886 vphase-15.10 / v1.6.1 first agent-cut release → iter-887 walk-34 plan-seal (PR #547) → iter-888 walk-34 execute (22 PASS + 1 PARTIAL + 1 INFO; #548 filed) → iter-889 walk-34 architect close-out (PR #552) → iter-890 engineer hat → #548 closed as walk-driver artefact + lock-in test (PR #553) → iter-891 walk-35 plan-seal with corrected driver (PR #555) → iter-892 walk-35 EXECUTE → CLEAN row 1 (23/24 PASS + 1 INFO) → iter-893 walk-35 close-out → chain 0 → 1 / 3 + dim 10 → 3 (FOURTH score-3 dim) + JOURNAL entry committed (PR #558) → iter-894 walk-36 plan-seal — dedicated dim-17 deep-dive against `vphase-15.10` Pages with primary-source-cited convention research + STRICT-reading PC6 + pre-plan-seal code scan documenting 5/5 sub-criteria not wired (PR #561) → iter-895 walk-36 EXECUTED → row 3 (2 PASS + 18 FAIL); chain resets 1 → 0; five `type:feature` issues filed #562–#566 (PR #567) → **iter-896 engineer hat → #562 (PC1 reconnect) shipped via #568 + fix-ups via #570 — FIRST dim-17 PC-level unlock; 4 dim-17 issues remain open for iter-897+ batches**.

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
| vphase-15.10 / v1.6.1 | 2026-05-19 | #528 use-case bidirectional-drag fix (#531) + ADR 0017 agent-cut tag cadence (#543). Walk-35 (iter-892) → dim 10 to 3 at iter-893. Walk-36 (iter-895) → 5 dim-17 issues filed #562–#566. |

Rubric: **4 × score-3** (dim 5 BDD, dim 14 Round-trip integrity, dim 6 IBD, dim 10 Use Case SysML conformance) + **21 × score-2** + **0 × score-1** + **3 × score-0** (dims 3, 11, 23). Unchanged from iter-894 close.

## Next action

**Iter-897 — engineer hat → dispatch the second dim-17 engineer batch grouping #564 (PC4 routing-style picker) + #566 (PC6 stroke/color picker STRICT) on `phase-15/dim17-inspector-edge-style-pickers`.** Per iter-895 § Decisions log + iter-896 § Decisions log, this batch lands second because both features share the Inspector "edge selected" panel plumbing + a per-edge `data` extension on the React Flow `Edge` row (`data.routingStyle: 'orthogonal' | 'straight' | 'spline'`, `data.strokeColor: string | null`). The third batch (`phase-15/dim17-edge-data-extensions`) groups #565 (label drag) + #563 (waypoint editing) on the same `data` extension. Per A.8 soft cap (5), iter-897's dispatch is permitted in parallel with #570's CI tail.

**Iter-897 process discipline reminder (from iter-896 retro):** Dispatch the pre-PR review subagent BEFORE `gh pr merge --auto` — auto-merge can fire faster than the reviewer reports if CI is short. A.5's "main agent reviews the diff via a pre-PR code-review subagent before opening the PR" is the binding form; if a green-CI auto-merge has already happened, the review's findings must go into a fix-up PR on a cherry-pick branch off main (the original branch is DIRTY post-squash).

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 104, well under the 300 churn ceiling.

**In-flight at iter-896 close (1 / 5 of A.8 cap until PR #570 merges, then 0 / 5):**
- `phase-15/dim17-edge-reconnect-fixups` (PR #570) — auto-merge SQUASH pending CI.
