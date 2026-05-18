# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-879: engineer hat → #528 fix shipped.** Use-case viewpoint switched to `ConnectionMode.Loose` (the same pattern IBD adopted in #499). The validator `isValidUseCaseConnection` is already the single source of truth for handle-pair validity (post-#519 it accepts Actor↔UseCase in both element orderings), so promoting connection mode from Strict to Loose unblocks drags that *start* from a `type="target"` handle — including the previously-broken `actor.left → usecase.left` direction surfaced by walk-33. The fix is **+11 / −1 LOC in `CanvasPane.tsx`** (a single line in the `connectionMode` ternary plus an updated comment) and **+41 LOC in `tests/e2e/use-case-edges.spec.ts`** (two new handle helpers + one new test for the previously-broken direction). No DOM changes; no new handles; no visual baseline drift. Existing 10 use-case-edges tests pass unchanged on chromium AND webkit; new test passes on both projects.

🎯 **Iter-878: walk-33 EXECUTED → 22/24 PASS + 1 PARTIAL (use-case V-B primary-only) + 1 INFO; #528 filed; chain stays 0/3; dim-10 holds at 2.** Walk-33 was the chain[1] convergence candidate AND the dim-10 score-3 gate; PARTIAL was the second-row anticipated path in `walk-33.md § Plan § Acceptance / rubric impact`. Filed **#528** (`p2`, `type:bug`, `area:viewpoint:uc`) with full A.7 body, OMG UML 2.5.1 § 11.5.4 citation, proposed-resolution sketch (add paired `type="source"` Handles on ActorNode). Iter-879 chose a smaller-blast-radius fix (Loose connection mode) instead — same end behaviour, identical-by-contract to IBD's solved instance of the same problem class.

🎯 **Iter-877: walk-33 plan sealed; chain[1] candidate, dim-10 score-3 gate.** `docs/architect/walks/walk-33.md § Plan` + `§ Snapshot` authored; § Plan explicitly anticipated the primary-only / secondary-FAIL outcome that iter-878 then observed.

🎯 **Iter-876: `vphase-15.9` / `v1.6.0` released — Actor↔UseCase Association live; A.12 #2 fully satisfied (subsequently re-broken at iter-878 by #528, then re-satisfied at iter-879 by this PR's merge + #528 close).**

🎯 **Iter-872..875: #517 Actor↔UseCase association implementation + baseline lifts.** PR #519 (iter-872) shipped the validator-layer change. Iter-873 lifted Chromium baseline; iter-874 closed design-issue backlog (#452/#454); iter-875 lifted WebKit baseline.

🎯 **Iter-871: walk-32 EXECUTED → 22/24 PCs PASS; #517 filed (Actor↔UseCase association deferral).**
🎯 **Iter-870: #513 disambiguated → both halves driver artefacts; #513 closed wontfix.**
🎯 **Iter-869: walk-31 EXECUTED → 19/24 PCs PASS; #513 filed; chain RESETS 1 → 0 / 3.**
🎯 **Iter-867: walk-30 EXECUTED** — 8/8 PCs PASS, dim 6 IBD → score 3 (THIRD score-3 dimension), chain 0 → 1 / 3.
🎯 **Iter-861: `vphase-15.8` / `v1.5.2` released.** PR #502 (squash `95fb6c2`) closed #499 + #500.

🎯 **Iter-826: rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451) = SECOND score-3 dimension.**
🎯 **Iter-867: rubric dim 6 (IBD) → score 3 via walk-30 clean regression on `vphase-15.8` Pages = THIRD score-3 dimension.**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **3 of 28** at 3 (dim 5 BDD, dim 14 Round-trip, dim 6 IBD); **22** at 2; 0 at 1; 3 at 0. Dim 10 (Use Case SysML conformance) **promotion candidate post-iter-879 fix**, but requires walk-34 regression verifying both directions against the released bundle (`vphase-15.10` / `v1.6.1`). |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **Will re-satisfy on PR-merge** — iter-879's PR closes #528 (the only open `type:bug`). No `type:feature` or `type:design` are open. |
| A.12 #3 | Three consecutive convergence walks | **chain[0 / 3]** — walk-33 filed #528 → no chain advance. Chain[1] retry candidate is walk-34 against the released bundle that ships #528's fix (`vphase-15.10` / `v1.6.1`). |
| A.12 #4 | FBW example shipped + loadable | **Un-gates on walk-34 chain[1] PASS + dim-10 promotion to score-3.** |

## Current iteration
- Iteration #: 879
- Started: 2026-05-19 (UTC)
- Branch: `phase-15/iter-879-actor-source-handles` (off main `1015a75`, not stacked)
- Working on: #528 — engineer fix: use-case viewpoint → ConnectionMode.Loose

## Last test run
- Iter-879 commits on this branch: **code change** (`src/workspace/CanvasPane.tsx`, +11/-1) + **e2e test** (`tests/e2e/use-case-edges.spec.ts`, +41 LOC).
- `pnpm run typecheck` — PASS.
- `pnpm run lint` — PASS (3 pre-existing react-refresh warnings; zero errors).
- `pnpm run test:unit` — PASS (1486 tests across 136 files).
- `pnpm run build` — PASS (922 kB → 254 kB gzip, expected size-warning unchanged).
- `pnpm exec playwright test --project=chromium` — **306 / 306 PASS**, including new `phase-15 #528` test.
- `pnpm exec playwright test tests/e2e/use-case-edges.spec.ts --project=webkit` — **11 / 11 PASS** (visual baselines unchanged — connectionMode is purely behavioral, no DOM diff).
- Full webkit matrix deferred to CI per project convention.

## Last health check

Per AGENT.md directive #13, iter-870 ran the periodic health check (divisible by 10) — all four checks PASS. Next health check is iter-880.

## Last PR sweep
- Iter-879 launch `gh pr list --state open` returned PR #530 (iter-878 close-out, BLOCKED on IN_PROGRESS CI) — IN_PROGRESS not actionable, leave for next iteration to catch. Confirmed at iter-879 close that PR #530 auto-merged at commit `1015a75` (main fast-forwarded before this branch was created). This iteration opens one new PR. **In-flight 1 / 5 of A.8 cap.**

## Known issues / blockers
- None new. **#528** closes on this PR's merge. **#529** closed when PR #530 merged.

## Open phase:15 issues at iter-879 close (expected post-merge)
- (none) — all open `type:bug` / `type:feature` / `type:design` issues closed post-merge.

## Decisions log

**Iter-808..iter-878 entries preserved in earlier commits.**

- **Iter-879 — `ConnectionMode.Loose` chosen over duplicating Handle elements.** Issue #528's proposed-resolution sketch suggested adding paired `type="source"` Handles on `ActorNode` (and possibly `UseCaseNode`) at the four cardinal positions. That approach lands ~16 new Handle elements across the two files and forces test selectors that previously used `.react-flow__handle-{position}` to disambiguate by handle id (because two handles would now share each position). The Loose approach is **one line** (`viewpoint.id === USE_CASE_VIEWPOINT_ID` added to the existing IBD OR in `CanvasPane.tsx`'s `connectionMode` ternary) with **zero DOM change** — same end behaviour, identical pattern to how IBD solved the same problem class in #499. The validator `isValidUseCaseConnection` is already the single source of truth for handle-pair validity (post-#519), so promoting from Strict to Loose simply stops React Flow from pre-rejecting drags that start at a `type="target"` handle. Per AGENT.md "Don't add features, refactor, or introduce abstractions beyond what the task requires" — the Loose fix is genuinely smaller, not a refactor. ADR-worthiness check: there is precedent for this pattern (IBD #499) so this is not a novel architectural call — no ADR needed.

- **Iter-879 — no JOURNAL entry this iteration.** A.14 + AGENT.md JOURNAL triggers do not include "routine bug fix". The dim-10 score-3 promotion at iter-880+ post-walk-34 will be the next JOURNAL-worthy event (event: design-decision per A.14 "First rubric dimension at 3 of category").

## Session checkpoint summary

This session (iter-793 → iter-879) executed **87 iterations** spanning bootstrap, **18 broad/regression walks against deployed Pages** (walks 1 + 26 + 27 + 28 + 29 + 30 + 31 + 32 + 33), **~29 engineer batches**, **9 release tags** (`vphase-15.1` → `vphase-15.9`), **3 ADRs** (0014/0015/0016). Most recent arc: iter-871 walk-32 (22/24 + #517) → iter-872 #517 implementation → iter-876 vphase-15.9 / v1.6.0 release → iter-877 walk-33 plan-seal → iter-878 walk-33 execute (#528 surfaces post-#519 bidirectionality gap) → **iter-879 engineer fix: use-case → ConnectionMode.Loose; new e2e test exercises previously-broken `actor.left → usecase.left` direction; ready for `vphase-15.10` release + walk-34 chain[1] retry**.

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

Rubric: **3 × score-3** (dim 5 BDD, dim 14 Round-trip integrity, dim 6 IBD) + **22 × score-2** + **0 × score-1** + **3 × score-0**. Dim-10 promotion candidate post-walk-34 chain[1] PASS on the `vphase-15.10` / `v1.6.1` released bundle.

## Next action

**Iter-880 — operator release + walk-34.** Sequence (operator-cut tags are notable moments per A.14 — agent does not cut tags directly):

1. PR for this iteration auto-merges on green CI.
2. Operator (or release workflow trigger) cuts `vphase-15.10` / `v1.6.1` on the post-merge main commit. Pages deploys via existing release workflow.
3. Iter-880 architect-hat → walk-34 chain[1] retry against the released bundle. Plan: re-execute walk-33's PC set (broad sweep, 24 PCs across 8 viewpoints) with explicit verification that **both** Actor↔UseCase drag directions PASS. If clean: chain advances 0 → 1, dim-10 promotes to score-3 (FOURTH score-3 dimension), JOURNAL entry for the dimension promotion (event: design-decision).
4. Iter-880 will also run the periodic health check (iter divisible by 10) per AGENT.md directive #13.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 87, well under the 300 churn ceiling.

**In-flight at iter-879 close (1 / 5 of A.8 cap):**
- PR for iter-879 #528 engineer fix — pending CI / auto-merge.
