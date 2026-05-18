# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-841: CI restructure step 1 SHIPPED — PR #472 merged at 12:05:31Z.** `.github/workflows/ci.yml` split from monolithic `check` → `fast` + 4-way sharded `e2e` matrix + `merge-reports` + umbrella `check`. Total PR-gate wallclock measured on #472's own run: **5m 46s** (kick-off 11:59:42Z → required `check` SUCCESS 12:05:28Z) vs prior ~30-40min baseline = **~6× speedup**. All 7 jobs green; auto-merge fired 3 s after `check` turned SUCCESS. Branch-protection preserved (umbrella `check` keeps the exact context name required by `branches/main/protection`). Issue #467 closed. CI-velocity epic #452 advances to step 2 (#468, webkit-out-of-PR-gate) and step 3 (#469, merge queue), both `status:ready`.

🎯 **Iter-836: walk-23 — Pages-side regression of the dim-14 fixture against the deployed `vphase-15.6` / `v1.5.0` bundle (`9136ae8`).** Identical fixture to walk-21/walk-22 (6 elements, 5 whitespace names, 1 explicit BDD repr) driven by `artifacts/phase-15/walk-23/walk-23-exec.py` (3 Playwright contexts, 10.8 s wall-clock). All four iter-833 pass-criteria GREEN against the live Pages URL: JSON round-trip lossless; SysML round-trip lossless **including diagrams** (`diagram_total: 2 → 2`); `baseline.sysml` Pages-emitted is **byte-identical (925 bytes)** to walk-22's dev output — every #448 + #451 emission marker (`// @viewpoint bdd`, `view <…> { expose <path>; }`, 10 × `<…>` quoted-ident tokens) survives the release pipeline. Page errors: 0. Console errors: 0. **Rubric dim 14 holds at 3** (no change — promoted at walk-22). **Convergence chain (A.12 #3): 1 → 2** (walk-22 chain[1] → walk-23 chain[2]). Zero workbench issues filed.

🎯 **Iter-835: `vphase-15.6` / `v1.5.0` release shipped.** SemVer minor bump (overrode STATUS-834's `v1.4.1` patch prescription) — A.8 outward-facing rationale: #433/#436 BDD edge-taxonomy + multiplicity features visible to a user loading the example. Pages deploy live (HTTP 200) at deploy SHA `9136ae8`. JOURNAL entry written per A.14 (event=`release`, PR #457).

🎯 **Iter-834: walk-22 (dim-14 regression against `d99d298` local dev).** All four iter-833 pass-criteria GREEN. **Rubric dim 14: 2 → 3 — SECOND dim at score 3 (first was dim 5 BDD at iter-826).** Convergence chain restarts at chain[1] with walk-22 (zero issues). PR #456 merged.

🎯 **Iter-833: PR #451 merged at 08:11:33Z (squash `d99d298`) — #449 closed.** Serializer emits `view <name> { expose <ownerPath>; }` per diagram (with `// @viewpoint <kind>` decorator + `// id:` trailer); parser recovers them onto `ParsedProject.diagrams`; `store.ts` import no longer seeds a default diagram when SysML already carries view blocks. Six unit tests across `src/{serializer,parser}/sysml-diagrams.test.ts`.

🎯 **Iter-826: walks 14 + 19 merged → rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension. JOURNAL entry written per A.14.**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **2 of 28** at 3 (dim 5 BDD at iter-826; dim 14 Round-trip integrity at iter-834, Pages-side confirmed at iter-836); 20 at 2, 2 at 1 (dim 17 edge editing; dim 22 import/export incremented toward 3 by dim 14 but not yet promoted), 4 at 0 (incl. dim 13, dim 23) |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **3 open `type:design`** — #452 (CI: shard Playwright), #453 (skip e2e for doc-only PRs), #454 (raise A.8 cap; status:blocked). All CI-velocity meta-work; not blockers for architect walks or rubric advance. |
| A.12 #3 | Three consecutive convergence walks | **chain at 2** (walk-22 chain[1], walk-23 chain[2]). One more zero-issue walk completes A.12 #3. |
| A.12 #4 | FBW example shipped + loadable | partial — A320 skeleton + PartDefinitions + ports + BDD composition + round-trip dim 14 = 3 (Pages-side confirmed) unblock the example commit at the engineering layer; remaining bottleneck is architect authoring throughput vs A.6 coverage thresholds |

## Current iteration
- Iteration #: 841
- Started: 2026-05-18
- Branch: `phase-15/iter-841-status-sync-ci-step1-shipped` (STATUS-only edit; non-overlapping with the 3 in-flight PRs — #463 / #471 / #473 each touch disjoint files)
- Working on: iter-841 close-out — record PR #472 (CI step 1) merge + measured wallclock; refresh remaining-PR roster; next-action pointer updated to chain[3] walk pickup post-#463-merge and CI step 2 (#468) for parallel slot use.

## Last test run
- PR #472 CI run `26032119743` (commit `e602682` head, fast-forward squash `6d15ca9` on main): `fast` SUCCESS 1m 42s, all four `e2e (shard N/4)` SUCCESS 3:00–3:54, `merge-reports` SUCCESS, umbrella `check` SUCCESS 2 s. Auto-merge fired at 12:05:31Z. Wallclock-to-required-`check`: **5m 46s** (target ≤ 15min met with 9-min headroom). First post-restructure data point toward the 5-PR median acceptance criterion noted in PR #472 body.
- **PRs in flight at iter-841 close (3/5 of A.8 cap):** #473 (README Pages-URL link, docs-only — should short-circuit e2e via ADR-0016 path filter + auto-merge), #471 (in-flight board sync closing #470, CI running on monolithic `check` — its base pre-dated #472), #463 (walk-24 close-out — title declares it files #461/#462 and demotes dim 6; CI running on monolithic `check` — its base pre-dated #472).
- **Releases tagged historically:** `vphase-15.4` / `v1.3.0` (iter-811), `vphase-15.5` / `v1.4.0` (iter-815), `vphase-15.6` / `v1.5.0` (iter-835). No release this iteration — CI workflow change alone is not user-facing per A.8 SemVer rule; defer next tag until step 2/3 land or a user-facing feature follows.

## Known issues / blockers
- None for rubric/walk advancement. Phase-15 backlog topology has shifted from iter-837: #453 (doc-only path filter) closed via ADR 0016 / PR #466; #452 advanced into its 3 implementation issues (#467 step 1 ✅ via #472, #468 step 2 ready, #469 step 3 ready); #454 (raise A.8 cap) remains blocked until at least step 2 lands.

## Open phase:15 issues at iter-841 start
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI (umbrella for the 3 step-issues; closeable once #468 + #469 land)
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap 5 → 10 (unblock after #468/#469)
- #468 (p1, type:chore, status:ready, area:cross-cutting) — **CI step 2**: move webkit out of PR gate; nightly + push-to-main run full matrix
- #469 (p1, type:chore, status:ready, area:cross-cutting) — **CI step 3**: enable GitHub merge queue on `main`
- #470 (p2, type:chore, status:in-progress, area:cross-cutting) — Sync `docs/architect/in-flight.md` claim board (PR #471 in flight)

## Decisions log

**Iter-808..iter-820 entries preserved in earlier commits.**

- **Iter-821..828 (sweep + flake-fix series):** see #443 (sweep log PR), #445 (flake-threshold-bump PR closing #444), #437/#442 merged (walk-14 / walk-19 → first dim-3 = dim 5 BDD), JOURNAL iter-826 entry.
- **Iter-829 — walk-20:** JSON round-trip lossless; SysML round-trip broken on default project name. Filed #446. Dim 14: 0 → 1.
- **Iter-830 — PR #448 implementation:** OMG-§4.4.1 `<…>` quoted-ident emission/parse + silent-import-mask fix in `final-gate.spec.ts`.
- **Iter-831 — #448 lands:** main fast-forwarded to `9578f3d`; A.12 #2 transiently satisfied.
- **Iter-832 — walk-21 (dim-14 re-verification):** SysML round-trip preserved elements but dropped diagrams. Filed #449 (p2, citation OMG SysMLv2 §10). Dim 14: 1 → 2.
- **Iter-833 — #449 closed via PR #451:** Serializer emits `// @viewpoint <kind>` + `view <name> { expose <ownerPath>; }` per diagram; parser recovers them; store no longer seeds a default `Main BDD` on SysML import. Six unit tests landed. Squash `d99d298` on main.
- **Iter-834 — walk-22 (regression of walk-21 fixture against `d99d298`):** Identical fixture to walk-21. All four iter-833 pass-criteria green. **Rubric dim 14: 2 → 3.** Convergence chain A.12 #3 restarts at chain[1]. PR #456 merged.
- **Iter-835 — `vphase-15.6` / `v1.5.0` release tagged + Pages deployed.** SemVer minor bump (overrode `v1.4.1` patch prescription) per A.8 outward-facing rationale (#433/#436 user-visible BDD features). JOURNAL append via PR #457.
- **Iter-836 — walk-23 (dim-14 Pages-side regression against `9136ae8`):** Identical fixture to walk-22. `baseline.sysml` byte-identical (925 bytes) to walk-22's dev output — every #448 + #451 emission marker survives the release pipeline. JSON + SysML round-trip structural signatures equal **including diagrams**. Dim 14 holds at 3. **Convergence chain A.12 #3: 1 → 2.** PR #458 (auto-merge enabled, CI in-progress).
- **Iter-837 — A.8 cap unblock + STATUS sync.** Discovered 5/5 in-flight PRs (`gh pr list` returned #426, #427, #439, #458, #459) — at the soft cap, blocking walk-24 dispatch. Investigation: all five are docs-only (each touches exactly one distinct file: walk-N.md or STATUS.md), no merge-conflict risk; #426 / #458 had GREEN CI but mergeStateStatus=`BEHIND`; #427 / #439 had FAILURE CI on stale `9136ae8`-or-earlier bases; #459 had IN_PROGRESS CI on stale base. Action: `gh pr update-branch --rebase` on all four older PRs (#426/#427/#439/#458); local rebase of #459 onto `origin/main` (`960ef1f`). All five PRs now re-running CI from fresh main base — auto-merge enabled on all five, so the next CI-green PR fires its merge automatically.
- **Iter-838..840 (compressed):** Walk-23 close-out #458 merged (squash `5a08387`). Walk-9 / walk-16 close-outs merged (#427 `e1f85fe`, #439 `9670316`). ADR 0016 doc-only e2e-skip path filter shipped via #466 / `b749960` (closing #453 by implementation rather than direct close-out). PR #465 explorer diagram-tab fix shipped. PR #464 IBD enclosing-frame seed shipped. CI-velocity epic #452 decomposed into 3 step-issues: #467 / #468 / #469. Walk-24 dispatched (PR #463), in-flight board sync dispatched (PR #471). Visual baseline thresholds raised on known-flake screens (PR #460, `49b1172`).
- **Iter-841 — CI step 1 shipped (PR #472 → squash `6d15ca9`).** Implementation prior to this iteration's tick; this iteration observed the CI run land (5m 46s wallclock, all 7 jobs green, auto-merge fired 3 s after `check` SUCCESS) and recorded the measurement. No release tag (CI workflow change alone is not user-facing per A.8). STATUS sync this iteration is the only on-disk change (this PR).

## Session checkpoint summary

This session (iter-793 → iter-841) executed **49 iterations** spanning bootstrap, **12 architect walks** (6-10 FBW + 14-23 viewpoints + round-trip ×4) plus walk-24 in flight, **~22 engineer batches**, **6 release tags**, **3 ADRs** (0014/0015/0016), and the first CI-velocity restructure landing (PR #472 — PR-gate wallclock cut ~6×). Cumulative delivery:

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 | Palette show-all-kinds + label consistency |
| vphase-15.4 / v1.3.0 | 2026-05-17 | IBD palette, usage hints, implicit-owner Package row, bus-dispatched diagrams, ADR 0014/0015 step 1 |
| vphase-15.5 / v1.4.0 | 2026-05-18 | ADR 0015 steps 2/3/4 (empty-state click-shortcut, inspector contextual, toolbar `+` retires) |
| vphase-15.6 / v1.5.0 | 2026-05-18 | #448 quoted-ident + #451 SysML view-block round-trip → dim 14 to 3 |

Rubric: **2 × score-3** (dim 5 BDD, dim 14 Round-trip integrity; Pages-side dim 14 confirmed iter-836) + 20 × score-2 + 2 × score-1 + 4 × score-0. Two A.12 #1 dimensions crossed (iter-826: dim 5; iter-834: dim 14).

## Next action

**Iter-842 — recommended pickup: CI step 2 (#468), parallel with walk-24 close-out review.** Rationale: (a) #463 (walk-24) is already in-flight and its title flags it files #461 + #462 and demotes dim 6 — convergence chain A.12 #3 resets to 0 on merge; the dim-13 promotion question depends on the issues filed (read #461/#462 before the merge to decide next walk priorities). (b) With CI step 1 landed, step 2 (webkit-out-of-PR-gate) takes the next biggest bite — moving webkit out of the PR gate halves the e2e shard count needed at PR-time (chromium-only) and leaves a nightly cron + push-to-main matrix for cross-browser coverage. Non-overlapping with all current in-flight branches (touches `.github/workflows/ci.yml` + new `nightly.yml`; none of #463/#471/#473 touch workflows).

**CI step 3 (#469, merge queue) sequencing:** wait for step 2 to land first. Merge queue requires stable per-PR CI signal, and step 2 reshapes that signal one more time. Picking step 3 after step 2 avoids a churn-PR.

**ADR for raising A.8 cap (#454):** unblock once step 2 lands (step 2 + step 3 together would justify the cap raise per the conditional in #454's body).

**FBW example (A.12 #4):** still engineering-unblocked at dim-14 = 3. Architect authoring throughput against A.6 coverage thresholds remains the bottleneck. Worth a deep-dive walk dedicated solely to populating coverage once chain[3] question is resolved.

**In-flight at iter-841 close (3/5 of A.8 cap):** #473 (README Pages-URL link, docs-only — auto-merge on CI green), #471 (in-flight board sync closing #470, CI on prior-CI-shape `check`), #463 (walk-24 close-out, CI on prior-CI-shape `check`). All non-overlapping touched-file sets; this STATUS-sync PR becomes a 4th in-flight (well below cap). Expected merge order: this PR (touches STATUS.md only — should fast-track via new `fast` job + 4-shard e2e); #473 + #471 dependent on their respective CI; #463 dependent on its CI plus possibly merge-after-rebase given any visual-baseline changes from walk-24.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 49, well under the 300 churn ceiling.
