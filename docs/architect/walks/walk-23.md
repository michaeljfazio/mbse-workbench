# Walk 23 — Round-trip integrity Pages-side regression (dim 14)

**Iteration:** 836
**Date:** 2026-05-18
**Walk type:** Regression walk (deterministic single-sequence; post-release re-verification)
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — deployed Pages bundle at tag `vphase-15.6` / `v1.5.0` (main tip `9136ae8` at tag time; the tag includes #448 + #451)

## Plan

Walk-22 (`d99d298` on local `pnpm dev`) verified the four pass-criteria for dim 14 round-trip integrity and the rubric promoted 2 → 3. That walk was tagged to a local development build per A.6 second clause; the architect deferred *Pages-side* re-verification to a regression walk after the next release. Tag `vphase-15.6` shipped at iter-835 (`v1.5.0` minor bump, see PR #457 rationale), and the live URL returns HTTP/2 200 with the new bundle.

**Walk-23 re-runs walk-22's deterministic exec script against the deployed URL** to confirm:

1. The Pages-served JS bundle reproduces every round-trip pass-criterion that the local `pnpm dev` build did.
2. No production-only regression (e.g. base-path mishandling under `/mbse-workbench/`, asset-fetch failure, sessionStorage scoping difference, build-time tree-shaking removing the new serializer path) has been introduced by the release pipeline.

This pattern (walk-N validates a fix on `pnpm dev`; walk-N+1 regresses the same scenario against the released Pages bundle) is the explicit follow-up specified in walk-21's "Tagging" section and walk-22's "Next action".

### Scope

Identical fixture to walk-21 and walk-22 — six elements, five with whitespace names, one explicit BDD representation:

| Element | Kind | Notes |
|---------|------|-------|
| `Flight Control System` | Package (root) | whitespace; exercises root-Package emission via `<…>` |
| `Primary Flight Computer` | PartDefinition | whitespace |
| `SEC` | PartDefinition | baseline control (no whitespace) |
| `Engage Autopilot` | ActionDefinition | whitespace |
| `High Reliability` | Requirement | whitespace |
| 1 × BDD diagram | representation on root pkg | exercises #451 `view { expose; }` emission |

Plus the default `Untitled Project` root package (also whitespace) which the test does not delete.

### Goals (four pass-criteria, identical to walk-22)

| # | Criterion |
|---|-----------|
| 1 | JSON round-trip structural signature equal (element counts, kinds, names, diagram set) |
| 2 | SysML round-trip structural signature equal **including** `diagram_total`, diagram names, viewpoint kinds |
| 3 | `baseline.sysml` emitted by the Pages bundle carries `// @viewpoint bdd` decorator + `view <…> { expose <ownerPath>; }` block + at least one `<…>` quoted-ident token |
| 4 | Post-import workspace contains exactly the imported diagrams (no extra default-seeded `Main BDD`) |

### Acceptance / rubric impact

| Outcome | Dim 14 action | Convergence (A.12 #3) |
|---------|---------------|-----------------------|
| All four pass-criteria hold + 0 issues filed + 0 page/console errors | Dim 14 stays at 3 (already promoted at walk-22); walk-23 = **chain[2]** | chain at 2 / 3 |
| Any pass-criterion fails on Pages but passed on dev | File `area:import-export` issue + `area:cross-cutting` (release-pipeline regression); **demote dim 14: 3 → 2**; chain resets to 0 | chain at 0 |
| Page/console errors not seen on dev | File per A.7; chain resets | chain at 0 |

### Tool & environment

- **Live deployed Pages URL** — `https://michaeljfazio.github.io/mbse-workbench/`. Per A.6 "The Pages deploy is the source of truth": this walk is the production-side gate.
- Driver: `artifacts/phase-15/walk-23/walk-23-exec.py` (adapted from walk-22, only the `URL` and `TARGET_SHA` constants change).
- Browser: headless Chromium via Playwright (headed not required for a deterministic regression; the architect inspects screenshots saved by the driver).

### Expected duration

~20–30 s of agent execution on a warm cache; ≤ 60 s cold. Walk-22 took 10 s against `localhost`; the network round-trip + larger asset fetches push Pages-side runtime slightly higher.

### Out of scope

- Re-running every prior viewpoint walk against Pages. The Pages bundle was built from the same `main` tip that all merged engineer batches landed on; the walk-N+1 regression cadence is reserved for dimensions whose fix shipped in the just-released tag (here, dim 14 via #448 + #451).
- FBW coverage (A.6 thresholds). Same deferral as walk-22.
- PNG/SVG export under Pages base path. Adjacent concern (asset URLs, blob downloads); deferred to a separate walk.

## Execution

Driver: `artifacts/phase-15/walk-23/walk-23-exec.py` (three Playwright contexts — ctx1 bootstrap+export, ctx2 JSON re-import+re-export, ctx3 SysML re-import+re-export). Ran against `https://michaeljfazio.github.io/mbse-workbench/` at deploy SHA `9136ae8`. Wall-clock: **10.8 s** (08:44:07–08:44:18 UTC) — comparable to walk-22's ~10 s localhost run.

| Phase | Action | Outcome |
|-------|--------|---------|
| 1 | Bootstrap: 1 root Package + 2 PartDefinitions + 1 ActionDefinition + 1 Requirement + 1 BDD repr — 5 of 6 names with whitespace | ✓ all rows created via UI |
| 1 | `Export → JSON` → `baseline.json` (9307 bytes) | ✓ 6 elements, 2 diagrams (`Main BDD` + `Flight Control System BDD`), kinds=`{Package:2, PartDefinition:2, ActionDefinition:1, Requirement:1}` |
| 1 | `Export → SysMLv2` → `baseline.sysml` (925 bytes — **byte-identical to walk-22 output**) | ✓ 10 `<…>` tokens; `// @viewpoint bdd` decorator present; `view <…> { ... }` block present; `expose` statement present |
| 2 | Fresh ctx → `Import → JSON` → `Export → JSON` | ✓ Structural signature **equal** to baseline |
| 3 | Fresh ctx → `Import → SysMLv2` → `Export → JSON` | ✓ Structural signature **equal** to baseline **including** `diagram_total=2`, diagram names, viewpoint kinds |

Page errors: 0. Console errors: 0. `walk-23.json` `all_pass=True`, exit 0.

### Four pass-criteria verdict

| # | Criterion | Result |
|---|-----------|--------|
| 1 | JSON round-trip structural signature equal | **PASS** |
| 2 | SysML round-trip structural signature equal **including** `diagram_total`, diagram names, viewpoint kinds | **PASS** |
| 3 | `baseline.sysml` from Pages bundle carries `// @viewpoint bdd` + `view <…> { ... }` + `expose` + ≥1 `<…>` quoted-ident | **PASS** (10 `<…>` tokens; all three #451 emission markers present) |
| 4 | No extra default-seeded `Main BDD` post-import | **PASS** (`Main BDD` count: 1 → 1) |

## Findings — workbench

**Zero workbench issues filed.** All four pass-criteria hold against the deployed Pages bundle; the release pipeline preserved every aspect of the dim-14 round-trip behaviour validated locally by walk-22.

## Findings — strong positive

1. **Pages bundle behaviour is byte-identical to local `pnpm dev` for the dim-14 path.** `baseline.sysml` is 925 bytes both on Pages (`9136ae8`) and on dev (`d99d298`) — confirming the `vphase-15.6` release pipeline did not tree-shake or otherwise alter the new serializer/parser code paths shipped by #448 + #451.
2. **#448 quoted-ident emission and #451 view-block emission both live on Pages.** 10 `<…>` tokens + `// @viewpoint bdd` + `view <…> { ... }` + `expose` — every emission marker survives the production build.
3. **JSON round-trip on Pages is lossless.** Element counts, kinds, names, diagram set, edge kinds all match. The smaller post-roundtrip JSON file size (2397 vs 9307 bytes baseline) reflects omitted-by-default optional fields rather than data loss — the structural signature comparison is exact.
4. **No production-only console or page errors.** The deployed bundle is clean across all three browser contexts (initial author, JSON import context, SysML import context).
5. **Pages-side cold runtime is comparable to dev.** Walk-23 took 10.8 s vs walk-22's ~10 s — the CDN-served bundle is fast enough that the regression cadence is cheap to maintain.

## Rubric score deltas

**No rubric change this walk.** Dim 14 was promoted 2 → 3 by walk-22; walk-23 confirms the promotion holds against the deployed bundle. The architect's expectation per the walk plan was confirmation, not promotion (dim 14 is already at the rubric ceiling).

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-23 | 14 | 3 | 3 | Pages-side regression confirms dim 14 production-quality: all four pass-criteria hold against deployed `vphase-15.6` bundle; 0 page/console errors. No change. |

## Convergence chain (A.12 #3)

Walk-23 filed **zero workbench issues** and recorded **zero page/console errors**. The chain was at 1 after walk-22 (per #456's body). **Walk-23 advances the chain to chain[2]** — two more zero-issue walks consecutively would complete A.12 #3.

| Walk | Issues filed | Chain |
|------|-------------:|------:|
| walk-22 | 0 | 1 |
| walk-23 | 0 | **2** |

## Decide next

**Next architect walk** — a third consecutive zero-issue walk completes A.12 #3 (three-walk convergence). Three candidates by current rubric scoring:

1. **Walk-24 — dim 13 walk (cross-diagram coherence, score 0).** Highest-leverage: dim 13 is currently unmeasured. Create a PartDefinition in BDD, open its IBD, rename in one viewpoint, verify rename reflects in the other. If walk-24 files zero issues AND promotes dim 13 ≥ 1 with no other regressions, chain → 3 and A.12 #3 is met. This is the recommended next step.
2. **Walk-24 — dim 17 walk (edge editing affordances, score 1).** Reconnect either endpoint by drag, add/remove waypoints, routing-style controls, label drag. Promotes dim 17 if affordances are present; previously deferred per walk-21's "Other walk candidates".
3. **Walk-24 — dim 27 walk (persistence, score 2).** Reload-survives walk with the FBW skeleton. Could promote dim 27 → 3.

**Recommendation: walk-24 = dim-13 cross-diagram coherence**, because (a) dim 13 is unmeasured (score 0) — promoting it from 0 establishes a baseline that's missing from the rubric, (b) cross-diagram coherence is a Phase-15 first-class invariant (the same element appearing in multiple diagrams without duplication, ADR 0011), and (c) it is the lowest-overlap with the in-flight serializer/parser changes (no file touched by #448 + #451 + #456 + #457).

**No engineer batch is required next** — backlog has zero open `phase:15` issues that are `status:ready` (#452/#453/#454 are all `type:design`, two of which are `status:ready` but bounded by `type:design` ADR flow). Architect-hat work (walk-24) yields more rubric movement per iteration than re-litigating CI-velocity design issues at this stage.

**Tagging:** no new release needed this iteration — `vphase-15.6` / `v1.5.0` already covers the latest source changes. The next tag is gated on a rubric dimension advancing past 2 (or 0 → ≥1 for an unmeasured dim) AND ≥ 5 batches since `vphase-15.6`. Walk-23 is not a batch.
