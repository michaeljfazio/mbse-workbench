# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-890: engineer hat → #548 closed as walk-driver artefact (NOT an application bug).** Investigation traced walk-34's `use-case_v_b_secondary: FAIL` to a testid-prefix collision in the walk driver: `[data-testid^="use-case-edge-"]` matches both real edge testids (`use-case-edge-{id}`) AND popover testids (`use-case-edge-kind-popover`, `use-case-edge-kind-Association`, ...). PRIMARY's PASS was a false positive (popover testids appearing as "new" edges); SECONDARY's FAIL was a false negative (popover testids already in the `before` snapshot from PRIMARY's still-open popover). New e2e test `tests/e2e/use-case-edges.spec.ts` exercises `actor.right → usecase.left` with the popover pick — PASSES locally. CONTEXT.md gotcha appended for walk-35's driver fix. **Dim 10 (Use Case SysML conformance) stays at 2 pending walk-35 with a corrected driver.** Convergence chain stays at 0 / 3 per the iter-889 decisions-log strict read of A.12 #3.

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

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **3 of 28** at 3 (dim 5 BDD, dim 14 Round-trip, dim 6 IBD); **22** at 2; 0 at 1; 3 at 0. Dim 10 (Use Case SysML conformance) **holds at 2** — application bidirectional Actor↔UseCase Association confirmed correct via the iter-890 lock-in test; promotion to 3 stages behind walk-35 (corrected driver) demonstrating a clean bidirectional pass. |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **NOT satisfied** at iter-890 launch; **expected to be satisfied** at iter-890 close once #548 is closed by this PR's `Closes #548`. |
| A.12 #3 | Three consecutive convergence walks | **chain[0 / 3]** — iter-889 decisions-log strict read holds: walk-34 filed a `type:bug` (even if that bug was later closed as driver artefact in iter-890), the chain remains reset. Walk-35 is the chain[1] candidate post-release. |
| A.12 #4 | FBW example shipped + loadable | **Un-gates on chain saturation + rubric saturation.** |

## Current iteration
- Iteration #: 890
- Started: 2026-05-19 (UTC, post-#552 merge at `8b00915`)
- Branch: `issue/548-actor-right-secondary-direction-association` (off main `8b00915`, not stacked)
- Working on: #548 — engineer-hat investigation + lock-in test for actor.right→usecase.left Association

## Last test run
- `pnpm typecheck` → clean (no source changes).
- New e2e test `drag Actor.right → UseCase.left also opens popover for Association (phase-15 #548)` run locally: `1 passed (2.2s)` on Chromium.
- Full CI gate runs on the PR.

## Last health check

Per AGENT.md directive #13, **iter-880** ran the periodic health check — **all four checks PASS**. Next health check is **iter-890** (this iteration's close). Deferred to iter-891 since this iteration's main work was the #548 investigation and lock-in test.

## Last PR sweep
- Iter-890 launch: `gh pr list --state open` returned `[]` after #552 auto-merged. This iteration opens one new PR (the #548 fix). **In-flight 1 / 5 of A.8 cap.**

## Known issues / blockers
- None new. #548 closes via this iteration's PR.

## Open phase:15 issues at iter-890 launch
- **#548** — `[area:viewpoint:uc] Actor→UseCase drag from new source handle still produces no edge` (`type:bug`, `p1`, `area:viewpoint:uc`, `status:in-progress`). **Closes via this iteration's PR as a walk-driver artefact, with a lock-in e2e test confirming bidirectional Association works.**

## Decisions log

**Iter-808..iter-889 entries preserved in earlier commits.**

- **Iter-890 — `#548` closed as driver artefact, not application bug.** Three hypotheses in #548's body were investigated in order. (1) Duplicate-edge dedupe: falsified — `onConnect` for use-case has no dedupe path; the only post-validate path is `setPendingUseCaseEdge`. (2) `connectionMode` mismatch: falsified — `CanvasPane.tsx:1324-1329` selects `ConnectionMode.Loose` for `USE_CASE_VIEWPOINT_ID` already (iter-879's #528 fix). (3) `onConnectStart` filtering: falsified — `onConnectStart` at `CanvasPane.tsx:459-470` only sets `isConnectingRef.current` and shift state, no `data-use-case-node-kind` filter. Root cause: walk-34's `wait_for_function` polled `[data-testid^="use-case-edge-"]` which prefix-matches BOTH `use-case-edge-{id}` (real edges) AND `use-case-edge-kind-*` (the popover container and its kind buttons). PRIMARY false-positive PASS came from popover testids appearing in the post-snapshot; SECONDARY false-negative FAIL came from PRIMARY's still-open popover already populating `before_e_s`. Application is correct: existing tests `drag UseCase→Actor` (#517) and `drag Actor.left → UseCase.left` (#528) prove cross-kind both directions work; new iter-890 lock-in test `drag Actor.right → UseCase.left` extends coverage to the exact handle pair walk-34 reported broken. PASSED locally on first run.

- **Iter-890 — convergence chain stays at 0 / 3.** Per A.12 #3 strict read codified in iter-889's decisions-log: "A walk that files a `type:bug` is by construction not a convergence walk, so it does not 'hold' the chain — it resets." The fact that the type:bug was later closed as a driver artefact does not retroactively un-reset the chain — the walk-time finding state is what advances the chain. Walk-35 (post-`vphase-15.11` / `v1.6.2` release if any release is needed; otherwise post-iter-890-PR-merge against the `vphase-15.10` bundle the application correctness is already deployed in) is the new chain[1] candidate with a corrected driver.

- **Iter-890 — dim 10 stays at 2 until walk-35.** Same gate as iter-889: dim-10 promotion to 3 requires a clean walk demonstrating bidirectional Actor↔UseCase Association. The application is bidirectional (locked in by the new e2e test), but per A.3 #3 ("No silent rubric degradation"; the symmetric corollary is no silent promotion without architect-walk evidence on the deployed bundle). Walk-35 against the deployed bundle promotes dim 10.

- **Iter-890 — no new release tag.** This iteration's PR is a test-only + docs-only change (no `src/` modifications). No new functional behaviour to release; the `vphase-15.10` bundle remains the dim-10-promotion-candidate target for walk-35. Per ADR 0017, agent-cut tags fire on functional releases, not test/docs-only PRs.

## Session checkpoint summary

This session (iter-793 → iter-890) has executed **98 iterations** spanning bootstrap, **19 broad/regression walks against deployed Pages** (walks 1 + 26..34), **~29 engineer batches**, **10 release tags** (`vphase-15.1` → `vphase-15.10`), **4 ADRs** (0014/0015/0016/0017).

Most recent arc: iter-879 #528 fix shipped → iter-880 health check PASS → iter-881..884 four blocked-tick STATUS syncs → iter-885 ADR 0017 (agent-cut tags) → iter-886 vphase-15.10 / v1.6.1 first agent-cut release → iter-887 walk-34 plan-seal (PR #547) → iter-888 walk-34 execute (22 PASS + 1 PARTIAL + 1 INFO; #548 filed) → iter-889 walk-34 architect close-out (PR #552 merged at `8b00915`) → **iter-890 engineer hat → #548 closed as walk-driver artefact + lock-in test for `actor.right → usecase.left`**.

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
| vphase-15.10 / v1.6.1 | 2026-05-19 | #528 use-case bidirectional-drag fix (#531) + ADR 0017 agent-cut tag cadence (#543). Iter-890 confirms the #531 fix is complete; walk-34's contrary finding was a driver artefact. |

Rubric: **3 × score-3** (dim 5 BDD, dim 14 Round-trip integrity, dim 6 IBD) + **22 × score-2** + **0 × score-1** + **3 × score-0**. Dim-10 promotion gated on walk-35 (corrected driver).

## Next action

**Iter-891 — walk-35 plan-seal + execute against the deployed `vphase-15.10` / `v1.6.1` bundle.** Walk-35 is the new chain[1] retry candidate after #548 closed. **The walk-35 driver MUST avoid the popover-prefix collision documented in `docs/CONTEXT.md` (iter-890 entry):** use `g[data-association-edge="true"]` (or the analogous `g[data-{kind}-edge="true"]` selectors) to count real edges, OR use `[data-testid^="use-case-edge-"]:not([data-testid^="use-case-edge-kind-"])`. Walk-35's V-B step MUST also explicitly click `use-case-edge-kind-Association` after each drag to commit the popover. Expected outcome: 23/24 PASS + 1 INFO → chain 0 → 1/3 + dim 10 promotion to 3 (FOURTH score-3 dimension).

**Iter-892+ — walk-35 close-out + chain[2] candidate plan-seal.**

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 98, well under the 300 churn ceiling.

**In-flight at iter-890 close (1 / 5 of A.8 cap):**
- PR for iter-890's `#548` close-out (test + CONTEXT.md gotcha) — opens this iteration.
