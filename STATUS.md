# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-875: WebKit baseline `use-case-with-association-edge` lifted from `ci-full-matrix.yml` run 26060460694; A.12 #2 termination axis fully satisfied for the first time in Phase 15.** Per iter-874's Next-action item: PR #519's post-merge `ci-full-matrix.yml` run failed (as expected) on shard 4/4 with exactly one `A snapshot doesn't exist at … use-case-with-association-edge-webkit.png, writing actual.` error. Downloaded `playwright-test-results-shard-4` artefact, copied `use-case-with-association-edge-actual.png` (1280×720, 115024 bytes) over `tests/e2e/__screenshots__/use-case-edges.spec.ts/use-case-with-association-edge-webkit.png`. Visually verified: webkit baseline shows the same Use Case + Actor + Association edge layout as the chromium baseline (Customer ↔ Authenticate association edge rendered as a plain solid line per UML use-case convention). With #517 closed (iter-872), #452 + #454 closed (iter-874), and zero open `type:bug/feature/design` issues at iter-875 close, A.12 #2 flips to fully satisfied — the remaining termination axes are A.12 #1 (rubric saturation, 3 / 28) and A.12 #3 (convergence walks, 0 / 3).

🎯 **Iter-874: design-issue backlog cleared.** #452 closed `completed` (3-step CI velocity epic — steps 1+2 shipped earlier; step 3 deferred via #469's iter-844 escalation, operator chose close-wontfix path). #454 closed `not planned` (cap-pressure measurement window showed in-flight at 1-2 / 5 across 30+ iterations — per the issue's own decisive question, cap not binding). JOURNAL entry for both dispositions in #520.

🎯 **Iter-873: Chromium `use-case-with-association-edge` baseline lifted from CI run 26059828566 (PR #519).** Standard iter-25 procedure.

🎯 **Iter-872: #517 Actor↔UseCase association implemented (engineer batch); ADR 0007 § 5 / § 7 deferral closed.** Single-PR scope: validator accepts cross-kind Actor↔UseCase pairs in both directions; store's `linkUseCaseEdge` dispatches an `AssociationEdge` when `kind === 'Association'` and endpoints are cross-kind; the use-case viewpoint registers a new `USE_CASE_ASSOCIATION_EDGE_TYPE` rendered by `src/viewpoints/useCase/AssociationEdge.tsx`; the stereotype picker popover gains a fourth `Association` button enabled only for cross-kind drops. ADR 0007 amended with a "§ 5 / § 7 deferral closed by phase-15 #517" section.

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
| A.12 #1 | Every rubric dim at 3 | **3 of 28** at 3 (dim 5 BDD, dim 14 Round-trip, dim 6 IBD); **22** at 2; 0 at 1; 3 at 0. Dim 10 (Use Case SysML conformance) — promotion gated on walk-33 post-deploy confirmation. Next score-3 candidates: dim 10 (after walk-33 verifies #517 on a `vphase-15.N` Pages bundle), dim 17 (dedicated Edge-editing walk). |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **✓ FULLY SATISFIED.** 0 open `type:bug` (since #499/#500 closed in iter-861). 0 open `type:feature` (since #517 merged in iter-872). 0 open `type:design` (since #452 + #454 closed in iter-874). |
| A.12 #3 | Three consecutive convergence walks | **chain[0 / 3]** — iter-872..875 are engineer + chore + design-disposition work, not walks; chain unchanged. Next chain[1] candidate is walk-33 (regression of walk-32 after #517 ships on a `vphase-15.N` Pages bundle). |
| A.12 #4 | FBW example shipped + loadable | **Unblocked.** Authoring can proceed in parallel with walk-33 verification. |

## Current iteration
- Iteration #: 875
- Started: 2026-05-19 (UTC)
- Branch: `phase-15/iter-875-webkit-baseline-lift` (off main, not stacked)
- Working on: #521 — lift WebKit baseline + STATUS sync (PR pending)

## Last test run
- `ci-full-matrix.yml` run **26060460694** on push `feat(use-case): implement Actor↔UseCase association (closes #517) (#519)`: fast PASS, e2e shards 1/2/3 PASS, shard **4/4 FAILED** on exactly one expected error: `A snapshot doesn't exist at … use-case-with-association-edge-webkit.png, writing actual.` No other regressions. No sibling baseline drift.
- Iter-875 commit on this branch adds only `use-case-with-association-edge-webkit.png` (1280×720, 115024 bytes); pairs with the STATUS sync.
- Expected CI: PR-gate fast + chromium-only e2e PASS (no webkit at PR gate per ADR 0015 step 4 / `ci.yml`). Auto-merge fires. The next `ci-full-matrix.yml` push-to-main run resolves green; release tag eligible.

## Last health check

Per AGENT.md directive #13, iter-870 ran the periodic health check (divisible by 10) — all four checks PASS. Next health check is iter-880.

## Last PR sweep
- Iter-875 launch `gh pr list --state open` returned `[]` (PR #519 + PR #520 both merged in iter-873/874 windows). This iteration opens one new PR (webkit baseline lift). **In-flight 1/5 of A.8 cap.**

## Known issues / blockers
- **None at iter-875 close.** A.12 #2 fully satisfied; no `status:needs-human` or `status:blocked` issues; no in-progress branches outside this one.

## Open phase:15 issues at iter-875 close
- (none — A.12 #2 fully satisfied)

## Decisions log

**Iter-808..iter-872 entries preserved in earlier commits.**

- **Iter-874 — #452 closed `completed`, #454 closed `not planned`.** Both `type:design` issues had drifted into effectively-moot status: #452's three-step plan saw steps 1+2 ship (#472, #475) and step 3 deferred via the iter-844 merge-queue feature-gate escalation; #454's "raise A.8 cap 5 → 10" question carried its own decisive criterion ("if the data says no, keep at 5 and close"), and the data — 30+ iterations of `STATUS.md` "Last PR sweep" tracking in-flight at 1-2 / 5 — said no. Closing with substantive disposition comments is cheaper than carrying them across iterations.

- **Iter-875 — webkit baseline lift in a fresh, focused iteration, not bundled with the iter-874 design-disposition PR #520.** Considered: bundle the webkit baseline lift into #520 (smaller PR count). Declined because (i) the chromium baseline lift (#519) had been its own commit in PR #519 (cleaner blame), so the webkit lift mirrors that pattern; (ii) PR #520 was a doc-only JOURNAL entry that benefits from the ADR 0016 doc-only-skip fast path; bundling the webkit PNG would push #520 into the full e2e shard matrix and obviate the fast-path savings; (iii) the iter-874 disposition narrative is self-contained — adding the baseline lift would dilute the journal entry.

- **Iter-875 — no release tag pushed in this iteration.** Per A.8 release cadence: rubric must advance ≥1 dim *and* ≥5 batches merged. Since iter-861 / `vphase-15.8`, **≥5 batches have merged** (PRs #511, #510, #509, #507, #506, #515, #518, #519, #520 — 9 chore/feat PRs counting #519's outward-facing feature), but the **rubric has not advanced** (no walk has confirmed dim-10 promotion yet — walk-33 is the gate). Both conditions are required by A.8; this iteration is the prerequisite (clean full-matrix CI) for the next walk-33 plan-seal + execute pair to land cleanly. Release tag (likely `vphase-15.9` / `v1.6.0` for the outward-facing Association feature per A.8 SemVer rule) fires after walk-33 PASSes and promotes dim-10 → 3.

## Session checkpoint summary

This session (iter-793 → iter-875) executed **83 iterations** spanning bootstrap, **17 broad/regression walks against deployed Pages** (walks 1 + 26 + 27 + 28 + 29 + 30 + 31 + 32), **~28 engineer batches**, **8 release tags** (`vphase-15.1` → `vphase-15.8`), **3 ADRs** (0014/0015/0016). Most recent arc: iter-869 walk-31 (19/24, #513) → iter-870 #513 wontfix triage → iter-871 walk-32 with corrected driver (22/24, #517 filed) → iter-872 #517 implementation → iter-873 chromium baseline lift → iter-874 #452/#454 design-disposition (A.12 #2 nearly satisfied) → **iter-875 webkit baseline lift (A.12 #2 fully satisfied; clean full-matrix CI achieved)**.

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

Rubric: **3 × score-3** (dim 5 BDD, dim 14 Round-trip integrity, dim 6 IBD) + **22 × score-2** + **0 × score-1** + **3 × score-0**. Dim-10 promotion staged behind walk-33 post-deploy verification.

## Next action

**Iter-876 — seal walk-33 plan + open issue.** Walk-33 is the regression of walk-32 (24 PCs, broad sweep across every viewpoint) against the post-merge Pages bundle. Two pathways:

- **Pathway A (preferred under A.6):** wait for the next intermediate release tag (`vphase-15.9` / `v1.6.0`) to deploy first, then seal walk-33's plan against the deployed bundle. Release tag fires after walk-33 PASSes per the A.8 chicken-and-egg — so iter-876 instead does a release-first cut (tag `vphase-15.9` / `v1.6.0` on `main` head `4e474ee`+, since iter-875's baseline-lift merge is doc-only and does not change runtime behaviour). Pre-condition: this iteration's webkit-baseline PR merged and the next `ci-full-matrix.yml` push-to-main run green.
- **Pathway B (A.6 permitted exception):** walk-33 against `pnpm dev` with explicit commit-SHA tagging (`4e474ee` or later). Findings re-verified on the next Pages deploy. This is the documented A.3 #6 exception path when the deployed URL lacks an unmerged fix the architect needs to test.

Recommended: **Pathway A.** Cut `vphase-15.9` / `v1.6.0` immediately after iter-875's PR merges (since the runtime artefact is identical to the current `main` head and the Association feature is the only outward-facing change in the release window). Then iter-877 = walk-33 plan-seal, iter-878 = walk-33 execute.

**Walk-33 expected outcome:** 23 / 24 PASS + 1 INFO (X-7 stayed INFO in walk-32 — Actor↔Actor generalization edge — that remains unchanged). If holds:
- Convergence chain advances 0 → 1 / 3.
- Rubric dim 10 (Use Case SysML conformance) promotes 2 → 3 (FOURTH score-3 dimension).

**After dim-10 promotion:**
- Dedicated **dim-17 walk** (reconnect-by-endpoint-drag + waypoint add/remove + per-edge routing-style) — schedulable.
- **FBW example authoring (A.12 #4)** — still unblocked; can begin in parallel with the dim-17 work.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 83, well under the 300 churn ceiling.

**In-flight at iter-875 close (1/5 of A.8 cap):**
- PR for iter-875 webkit baseline lift + STATUS sync — pending.
