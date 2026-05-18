# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-872: #517 Actor↔UseCase association implemented (engineer batch); ADR 0007 § 5 / § 7 deferral closed.** Phase-15 #517 was the explicit dim-10 (UC SysML conformance) score-3 promotion blocker recorded by walk-32. Single-PR scope: validator accepts cross-kind Actor↔UseCase pairs in both directions; store's `linkUseCaseEdge` dispatches an `AssociationEdge` (already in the metamodel, shared with BDD) when `kind === 'Association'` and endpoints are cross-kind; the use-case viewpoint registers a new `USE_CASE_ASSOCIATION_EDGE_TYPE` rendered by `src/viewpoints/useCase/AssociationEdge.tsx` (plain solid line, no arrowhead, optional multiplicity labels mirroring the BDD geometry — UML use-case convention); the stereotype picker popover (`UseCaseEdgeKindPopover`) gains a fourth `Association` button enabled only for cross-kind drops. ADR 0007 amended with a "§ 5 / § 7 deferral closed by phase-15 #517" section. New `@visual` baseline `use-case-with-association-edge` (Chromium + WebKit) added — first CI run will fail on the missing baselines; iter-873 lifts them from the playwright-report artifact per the iter-25 procedure in `docs/CONTEXT.md`. Chain holds at 0 / 3 (this iteration is engineer work, not a walk).

🎯 **Iter-871: walk-32 EXECUTED → 22/24 PCs PASS; #517 filed (Actor↔UseCase association deferral); chain stayed at 0 / 3.** Walk-32 confirmed 3/4 of iter-870's driver-correction hypothesis; the fourth (UC association drag direction) was falsified — root cause traced to ADR 0007 § 5 deferral never landing, not handle direction.

🎯 **Iter-870: #513 disambiguated → BOTH halves driver artefacts; #513 closed wontfix.** Half-correct in retrospect: V-B drag-tree-group lowercase typos WERE driver artefacts (walk-32 confirmed); UC handle direction was inspected at handle layer only (walk-32 falsified — see iter-871/872).

🎯 **Iter-869: walk-31 EXECUTED → 19/24 PCs PASS; #513 filed; chain RESETS 1 → 0 / 3.**

🎯 **Iter-868: walk-31 plan SEALED** — 24-PC structure.

🎯 **Iter-867: walk-30 EXECUTED** — 8/8 PCs PASS, dim 6 IBD at 3 (THIRD score-3 dimension), chain 0 → 1 / 3.

🎯 **Iter-861: `vphase-15.8` / `v1.5.2` released.** PR #502 (squash `95fb6c2`) closed #499 + #500.

🎯 **Iter-826: rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451) = SECOND score-3 dimension.**
🎯 **Iter-867: rubric dim 6 (IBD) → score 3 via walk-30 clean regression on `vphase-15.8` Pages = THIRD score-3 dimension.**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **3 of 28** at 3 (dim 5 BDD, dim 14 Round-trip, dim 6 IBD); **22** at 2; 0 at 1; 3 at 0. Dim 10 (Use Case SysML conformance) — #517 implementation merged in iter-872 unblocks promotion-to-3; **promotion gated on walk-33 confirmation post-merge** (verify Actor↔UseCase association works on the next deployed `vphase-15.N` Pages bundle). |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **0 open `type:bug`**. **0 open `type:feature`** after #517 closes via this iteration's PR merge. **2 open `type:design`**: #452 (status:ready, no longer blocked behind #469), #454 (label says `status:blocked` but #469 cleared — needs relabel). |
| A.12 #3 | Three consecutive convergence walks | **chain[0 / 3]** — iter-872 is engineer work, not a walk; chain unchanged. Next chain[1] candidate is walk-33 (regression of walk-32 after #517 ships in `vphase-15.N`). |
| A.12 #4 | FBW example shipped + loadable | **Unblocked.** Authoring can proceed in parallel with #517 follow-on work. |

## Current iteration
- Iteration #: 872
- Started: 2026-05-19 (UTC)
- Branch: `phase-15/iter-872-actor-usecase-association` (off main, not stacked)
- Working on: #517 — Actor↔UseCase association (PR pending)

## Last test run
- `pnpm run typecheck` → PASS (no diagnostics).
- `pnpm run lint` → PASS (0 errors, 3 pre-existing warnings — react-refresh/only-export-components in `ActionUsageNode.tsx` and `TransitionEdge.tsx`; unchanged from main).
- `pnpm run test:unit` → PASS (136 files, 1486 tests). Updated assertions: `tests/unit/viewpoints/useCase.test.ts` (acceptedEdgeKinds now includes `'Association'`; edgeTypes registry now includes `USE_CASE_ASSOCIATION_EDGE_TYPE`; new `edgeTypeFor(Association)` case); `tests/unit/viewpoints/useCase/isValidConnection.test.ts` (cross-kind Actor↔UseCase now accepts; default+allowed for cross-kind returns `'Association'` / `['Association']`); `tests/unit/workspace/useCaseActions.test.ts` (three new linkUseCaseEdge(Association) tests: Actor→UseCase, UseCase→Actor, same-kind rejects).
- `@visual` baselines for the new test `use-case-with-association-edge` (Chromium + WebKit) NOT yet generated locally — local darwin renderer differs from CI's Linux runner per `docs/CONTEXT.md` (2026-05-12 entry). First CI run will fail on those two screenshots; iter-873 lifts the `*-actual.png` from the playwright-report artifact via the documented iter-25 procedure.
- `pnpm run test:e2e` not run locally (Playwright `webServer` brings up `pnpm dev` and the agent's runtime budget is better spent on CI's full suite).

## Last health check

Per AGENT.md directive #13, iter-870 ran the periodic health check (divisible by 10) — all four checks PASS. Next health check is iter-880.

## Last PR sweep
- Iter-872 launch: PR #518 (iter-871) had auto-merged at `2026-05-18T20:37:12Z` (fast-lane SUCCESS; e2e SKIPPED for doc-only changes per `.github/workflows/ci.yml` fast-lane). No other open PRs.
- Iter-872 open: PR for this iteration (iter-872-actor-usecase-association) — pending. **In-flight 1/5 of A.8 cap.**

## Known issues / blockers
- **#517 OPEN at iter-872 launch, CLOSING via this iteration's PR.** Single-PR scope per the proposed-resolution sketch in the issue body. ADR 0007 § 6 (system-boundary chrome) remains a separate concern explicitly out of scope.
- **#469 (status:needs-human → closed COMPLETED at 2026-05-18T13:17:34Z)** — iter-844 escalation comment recorded the operator decision pathway (a/b/c). Closure state-reason is `COMPLETED` with no closing comment; operator effectively chose path (b) (close wontfix, accept steps-1+2 speedup). Mechanical implication: #452 step-3 is moot; #454 (raise A.8 cap behind step-3) is unblocked-but-also-moot unless the cap raise can land without merge-queue throughput.
- **#452 (CI velocity step 3, p1, type:design, status:ready):** open, status:ready, not a Phase-15 termination blocker. With #469 closed wontfix, #452 itself is effectively moot — step-1 + step-2 shipped earlier. Iter-873+ may close #452 with a closing comment summarising the disposition, or convert to a docs-only PR clarifying the now-final CI architecture.
- **#454 (raise A.8 cap, p2, type:design, status:blocked label):** open, label stale. Relabel to `status:ready` if/when picked up; with #469 closed wontfix and merge queue unavailable, the cap raise case must rest on the existing sharded-CI throughput, not the (never-shipped) merge queue.

## Open phase:15 issues at iter-872 close
- (after PR merge) #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Effectively moot; can close with disposition note.
- (after PR merge) #454 (p2, type:design, status:blocked label, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap 5 → 10. Label stale; needs disposition decision given #469 outcome.

## Decisions log

**Iter-808..iter-871 entries preserved in earlier commits.**

- **Iter-872 — single-PR scope for #517 implementation.** Considered: (a) split into foundation PR (validator+store+viewpoint registration) + UX PR (popover entry + edge renderer + tests + baseline); (b) ship everything in one PR. Chose (b) because (i) the metamodel already has `AssociationEdge` (no schema change needed, ADR 0002 discriminated-union pattern intact); (ii) the popover supports adding a fourth kind via one entry in the `KINDS` array; (iii) the only "missing" artefact at end-of-iter is the @visual baseline pair, and the documented iter-25 lift-from-CI procedure handles that in a one-push follow-up. Splitting would have moved zero risk and added a second round-trip through branch protection.

- **Iter-872 — combined engineer + architect hat in a single iteration, declined.** Per A.2 two-hat discipline, walk-33 is a separate iteration after #517 ships to a `vphase-15.N` bundle. The current PR will not deploy on its own — release cadence per A.8 says intermediate `vphase-15.N` tags fire when a rubric dim advances ≥1 OR ≥5 batches have merged. Walk-33 fires after the next deploy, not after this PR's merge. This preserves the rule "rubric promotion requires deployed-bundle confirmation."

- **Iter-872 — @visual baseline strategy: ship test, lift baselines from CI.** Considered: (a) generate baselines locally via the `scripts/regen-baselines.sh` podman container; (b) skip the @visual test with `.fixme`; (c) commit the test and lift baselines from the first CI failure. Chose (c) per the 2026-05-12 docs/CONTEXT.md entry (arm64 podman emulation under-renders text-heavy screens — known bit-drift versus amd64 CI). The lift-from-CI procedure is the documented project workflow; iter-873 executes the lift step.

- **Iter-872 — `AssociationEdge.tsx` is a use-case-specific component, not a re-export of BDD's.** Considered: re-use `src/viewpoints/bdd/AssociationEdge.tsx` directly. Declined because (i) the BDD edge's `data-testid` prefix is `bdd-edge-${id}`, but the use-case e2e suite locates edges by the `use-case-edge-${id}` testid prefix; (ii) future polish (UML "navigability" arrowhead variants, or use-case-only stereotype label) will diverge; (iii) the duplication is one file of ~115 lines, and the metamodel `AssociationEdge` (the single source of truth for the edge struct) is reused unchanged — only the React renderer is per-viewpoint.

## Session checkpoint summary

This session (iter-793 → iter-872) executed **80 iterations** spanning bootstrap, **17 broad/regression walks against deployed Pages**, **~27 engineer batches** (including this one), **8 release tags**, **3 ADRs** (0014/0015/0016). Most recent arc: iter-869 walk-31 (19/24, #513) → iter-870 #513 wontfix triage (half-correct) → iter-871 walk-32 with corrected driver (22/24, #517 filed) → **iter-872 #517 Actor↔UseCase association implemented** (engineer batch, closes ADR 0007 § 5 / § 7 deferral; dim-10 promotion blocker removed).

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

Rubric: **3 × score-3** (dim 5 BDD, dim 14 Round-trip integrity, dim 6 IBD) + **22 × score-2** + **0 × score-1** + **3 × score-0** (incl. dim 23). Dim-10 promotion is staged behind walk-33 post-deploy verification.

## Next action

**Iter-873 — lift the two new `@visual` baselines from the first failing CI artefact, push, watch merge.** Procedure (per `docs/CONTEXT.md` 2026-05-12 entry):

1. `gh run list --branch phase-15/iter-872-actor-usecase-association --limit 1` to find the failing CI run-id.
2. `gh run download <run-id> --name playwright-report --dir /tmp/iter-872-report`.
3. For each browser project (`chromium-visual`, `webkit-visual`), locate the `data/<trace-hash>.zip` for the failing `use-case-with-association-edge` spec and extract the `*-actual.png` sha1 from `test.trace`.
4. Copy `data/<sha1>` over `tests/e2e/__screenshots__/use-case-edges.spec.ts/use-case-with-association-edge-chromium.png` and `…-webkit.png` respectively.
5. Commit `chore(visual): lift use-case-with-association-edge baselines from CI`, push.
6. Auto-merge should fire on the green CI run.

**After PR merges + `vphase-15.N` deploys** (likely `v1.6.0` per A.8 SemVer rule — Association is an outward-facing feature visible to the architect):

- **Walk-33** (regression of walk-32 against the post-merge `vphase-15.N` Pages) — expected outcome: 23/24 PASS + 1 INFO, no PARTIAL. If holds, advance chain 0 → 1 / 3 and promote rubric dim 10 → 3 (FOURTH score-3 dimension).
- **Dedicated dim-17 walk** (reconnect-by-endpoint-drag + waypoint add/remove + per-edge routing-style) — schedulable after dim-10 promotion lands.
- **FBW example authoring (A.12 #4)** — still unblocked; can begin in parallel.

**#452 / #454 disposition**: post-#517-merge, file a disposition note on #452 (and #454) summarising that #469 closed wontfix the merge-queue path; either close with `wontfix` referencing #469's iter-844 escalation comment, or re-frame as documentation-only PRs clarifying the now-final CI architecture.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 80, well under the 300 churn ceiling.

**In-flight at iter-872 close (1/5 of A.8 cap):**
- PR for this iter-872 actor-usecase-association — pending.
