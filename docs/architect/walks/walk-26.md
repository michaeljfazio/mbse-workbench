# Walk 26 — Pages-deploy regression of walk-25 (dim 13 + dim 6 confirm on `vphase-15.7`)

**Iteration:** 856
**Date:** 2026-05-19
**Walk type:** Regression walk (re-run of walk-25 against deployed `vphase-15.7` Pages bundle)
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — the deployed `vphase-15.7` / `v1.5.1` artifact. Both tags point at `4c5cc41` on `main` (the iter-853 squash-merge that contains `#464` IBD enclosing-frame seed + `#465` tree-row activates diagram tab). Pages `last-modified: Mon, 18 May 2026 16:17:04 GMT` confirms the `vphase-15.7` deploy is live. Per A.6 ("the Pages deploy is the source of truth"), walk-26 is the canonical confirmation of walk-25's findings on the deployed bundle.

## Plan

Walk-26 re-runs the walk-25 scenario verbatim against the deployed Pages bundle. Walk-25 ran against `pnpm dev` at functional-SHA `be050e0` (per A.6 the Pages deploy at that time lacked the two load-bearing fixes); walk-26 closes the loop by re-verifying the same four pass-criteria against the production artifact.

If all four pass-criteria hold and zero issues are filed, walk-26:

1. Confirms **dim 6 (IBD)** restoration to score **2** holds on Pages (walk-25 measured against local dev).
2. Confirms **dim 13 (Cross-diagram coherence)** first-measurement at score **2** holds on Pages.
3. Advances the convergence chain (A.12 #3) from **chain[1] → chain[2] / 3**.

### Scope

| Element | Kind | Notes |
|---------|------|-------|
| `FCS Pkg` | Package | container; carries the BDD representation |
| `FCS` | PartDefinition (member of `FCS Pkg`) | the element with two representations |
| 1 × BDD diagram | representation on `FCS Pkg` | shows `FCS` as a block node |
| 1 × IBD diagram | representation on `FCS` | shows `FCS` as the enclosing frame context |

Scope is identical to walk-25 (which was identical to walk-24) — a regression walk's value is in being byte-for-byte the same scenario against a different bundle.

### Pass criteria (four — identical to walk-25)

| # | Criterion |
|---|-----------|
| 1 | After inline-renaming `FCS` → `Flight Control System` from the **BDD canvas** (double-click `bdd-block-label-…`, type, Enter), the **project tree** row for the PartDefinition reads `Flight Control System` AND the **IBD enclosing-frame name** (`ibd-enclosing-frame-name-…`) reads `Flight Control System` after switching to the IBD tab. |
| 2 | After renaming `Flight Control System` → `FCS Final` from the **Inspector** `inspector-name` field (with `FCS` selected on the BDD canvas, edit + blur), switching to the **IBD** shows `FCS Final` as the enclosing-frame name AND switching back to the **BDD** shows `FCS Final` as the block label. |
| 3 | The project tree carries **exactly one** `PartDefinition` row with `data-element-id` equal to `FCS`'s id throughout the walk (no duplication, no orphans). |
| 4 | Zero page errors and zero console errors across all phases. |

### Acceptance / rubric impact

| Outcome | Dim-13 action | Dim-6 action | Convergence (A.12 #3) |
|---------|---------------|--------------|-----------------------|
| All four pass-criteria hold + 0 issues filed | **stays at 2** (Pages-confirm; score 3 still deferred to dedicated dim-13 walk) | **stays at 2** (Pages-confirm; score 3 still deferred to IBD deep-dive) | chain advances to **2 / 3** |
| Any PC fails on Pages but passed on local dev (walk-25) | demote back to walk-24 levels per which PC failed; file `area:cross-cutting` Pages-vs-dev divergence issue | as above | chain resets to **0** |
| Any PC fails on both Pages and local dev (regression after walk-25 close-out) | demote per PC; file `area:cross-cutting` regression issue | as above | chain resets to **0** |

Walk-26 is a **confirmation** walk — it does not promote any dimension past 2. Score-3 work for dim 6 and dim 13 is intentionally deferred to dedicated future walks (per walk-25's "decide next" section: walk-27 candidates are IBD deep-dive [dim 6 → 3] or dim-13 score-3 walk [right-click `Show in X`, N>2 representations, bidirectional navigation]).

### Tool & environment

- **Deployed Pages bundle** at `https://michaeljfazio.github.io/mbse-workbench/`. Per A.6 this is the source of truth for Phase-15 walks. Confirmed `last-modified: Mon, 18 May 2026 16:17:04 GMT` corresponds to the `vphase-15.7` deploy (functional SHA `4c5cc41`).
- Driver: `artifacts/phase-15/walk-26/walk-26-exec.py` — adapted from `walk-25-exec.py`. Only differences: `BASE_URL` and bumped `app_load` timeout (Pages cold-start over network vs local Vite).
- Single Playwright context, headless Chromium, sequential rename-and-verify loop.
- Screenshots: `artifacts/phase-15/walk-26/screenshots/`.
- Structured outcome: `artifacts/phase-15/walk-26/walk-26.json`.

### Expected duration

~20–30 s of agent execution. Network-load over `pnpm dev`'s local-loopback adds a few seconds on initial page load and reload; the per-step interaction loop is otherwise identical to walk-25's ~12 s.

### Out of scope (unchanged from walk-25)

- Right-click "Show in X" cross-diagram navigation — dedicated dim-13 score-3 walk.
- N>2 representations on the same PartDefinition — dedicated dim-13 score-3 walk.
- Renaming via the project tree inline-rename — covered by walks 21–23.
- Cross-viewpoint paste / duplicate workflows — not dim-13 core invariant.
- IBD parts + ports + ConnectionUsage + ItemFlow — dim-6 score-3 dedicated walk.

### Rubric snapshot at walk open

- Dim 6: **2** (walk-25 restore)
- Dim 13: **2** (walk-25 first measurement)
- Convergence chain: **1 / 3** (walk-25 chain[1])

### Open-issue snapshot at walk open

- 2 open `phase:15` `type:design` issues (#452 CI velocity step 3, #454 raise A.8 cap — both blocked on `#469`).
- 0 open `phase:15` `type:bug` issues.
- 0 open `phase:15` `type:feature` issues.

### Plan vs execute boundary

This file is the **Plan** per A.5. The Plan is sealed before the browser opens — any deviation during execution is captured as a finding, not as a plan amendment.

## Execution

**Iteration:** 856
**Date:** 2026-05-18
**Run:** deployed Pages bundle at `https://michaeljfazio.github.io/mbse-workbench/`. Pages `last-modified: Mon, 18 May 2026 16:17:04 GMT` → built from `4c5cc41` (= `vphase-15.7` / `v1.5.1` tag commits). The plan-seal commit (`2044124`) on the walk-26 branch is doc-only and does not affect the bundle being tested.
**Driver:** `artifacts/phase-15/walk-26/walk-26-exec.py` (single Playwright context, headless Chromium, six screenshots, structured `walk-26.json`). Wall-clock: ~16 s end-to-end (`app_load: 1422 ms` over network); per-step interaction loop matches walk-25's local-dev cadence. Six screenshots saved under `artifacts/phase-15/walk-26/screenshots/`.

The plan was followed verbatim — zero deviations, zero plan amendments needed.

| Phase | Action | Outcome |
|-------|--------|---------|
| 1 | Bootstrap: clear browser storage, find root project Package (depth=0 row), open its ⋯ menu → Create child → Package → auto-rename → "FCS Pkg" | ✓ FCS Pkg created via tree-menu UX on Pages |
| 1 | Open FCS Pkg ⋯ menu → Create child → Part Definition → auto-rename → "FCS" | ✓ FCS PartDefinition created |
| 1 | Open FCS Pkg ⋯ menu → Create representation… → BDD | ✓ BDD diagram created on FCS Pkg |
| 1 | Open FCS ⋯ menu → Create representation… → IBD | ✓ IBD diagram created on FCS |
| 2a | Activate BDD by clicking the diagram row in the tree | ✓ `#465` Pages-confirmed: tree-row click activates the BDD tab atomically (`aria-selected=true`) |
| 2a | Probe `bdd-block-<fcs>` + `bdd-block-label-<fcs>` | ✓ block + label rendered with text `FCS` |
| 2b | Double-click `bdd-block-label-<fcs>` → fill `Flight Control System` → Enter | ✓ inline-rename committed; BDD label updates atomically |
| 2b | Read project-tree row text for `<fcs>` | ✓ tree row reads `Flight Control System` |
| 2c | Activate IBD by clicking the diagram row in the tree | ✓ `#465` Pages-confirmed a second time |
| 2d | Probe `ibd-enclosing-frame-<fcs>` + `ibd-enclosing-frame-name-<fcs>` | ✓ `#464` Pages-confirmed: enclosing-frame node renders; name reads `Flight Control System` |
| 3a | Switch back to BDD, click `bdd-block-<fcs>` → assert `inspector-single` + `inspector-name` populated | ✓ inspector shows single-element pane with name input |
| 3b | Inspector: fill `FCS Final` → Enter → blur | ✓ inspector commits; BDD label updates to `FCS Final` |
| 3c | Activate IBD again via tree-row click → probe enclosing-frame | ✓ enclosing-frame name updates to `FCS Final` |
| 4 | PC3 final probe: count `[data-testid="containment-tree-element-<fcs>"]` rows | ✓ exactly 1 throughout |
| 4 | PC4 final probe: page error count + console error count | ✓ 0 + 0 |

Page errors: 0. Console errors: 0.

### Four pass-criteria verdict

| # | Criterion | Result |
|---|-----------|--------|
| 1 | BDD inline-rename → tree row + IBD enclosing-frame both reflect `Flight Control System` | **PASS** (tree ✓, ibd_frame ✓, ibd_name `'Flight Control System'`) |
| 2 | Inspector rename → BDD label + IBD enclosing-frame both reflect `FCS Final` | **PASS** (bdd_label ✓, ibd_name `'FCS Final'`) |
| 3 | Exactly one project-tree row carrying the FCS element id throughout | **PASS** (rows_with_fcs_id=1) |
| 4 | Zero page errors, zero console errors | **PASS** (page_errors=0, console_errors=0) |

**4 / 4 PASS. Zero issues filed.**

## Findings — workbench

**Zero findings.** The two load-bearing walk-24 issues (#461 IBD empty canvas, #462 tree-row click does not activate diagram tab) are confirmed CLOSED on the deployed `vphase-15.7` Pages bundle:

- **#461 (closed via #464):** The canonical `Create representation… → IBD` flow on Pages seeds an `ibd-enclosing-frame-<contextId>` node for the context PartDefinition. Identical behaviour to walk-25's local-dev run.
- **#462 (closed via #465):** Clicking a diagram row in the project tree on Pages atomically activates that diagram's tab. Verified twice in walk-26 (BDD and IBD), no workaround required.

## Findings — strong positive

1. **No dev-vs-Pages divergence.** Every single behaviour walk-25 measured at `pnpm dev` reproduces byte-for-byte on the deployed bundle. Same BDD↔IBD↔Tree↔Inspector coherence; same element-registry-integrity invariant (PC3); same console-cleanliness (PC4); same atomic tree-row diagram activation.
2. **`app_load: 1422 ms` over network** (cold start, fresh storage, full bundle download + `applyStandardLibrary()` bootstrap) — well under the dim-26 score-3 threshold of "< 3s on Pages". No A.10 dim-26 measurement is being made here (walk-26 is scoped to dim 6 + dim 13), but the data is consistent with the deployed bundle being healthy.
3. **Cold-start `localStorage.clear()` + reload** brings the deployed bundle back to `newEmptyProject()` + `applyStandardLibrary()` shape without any console error — confirming the persistence + bootstrap pipeline is robust on the artifact, not just the dev server.

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-26 | 6 | 2 | 2 | Pages-confirm of walk-25's restoration. Score 2 holds; score 3 still deferred to IBD deep-dive. |
| 2026-05-18 | walk-26 | 13 | 2 | 2 | Pages-confirm of walk-25's first measurement. Score 2 holds; score 3 still deferred to dedicated walk (right-click `Show in X`, N>2 representations, bidirectional nav). |

No new score-3 dimensions. Phase-15 score-3 count remains at 2 (dim 5 BDD, dim 14 Round-trip integrity). The value of walk-26 is **confirmation on the source of truth** + **convergence chain advance**, not score promotion.

## Convergence chain (A.12 #3)

Walk-26 filed **zero workbench issues**. Per A.12 #3 the chain advances by one.

| Walk | Issues filed | Chain |
|------|-------------:|------:|
| walk-22 | 0 | (pre-reset 1) |
| walk-23 | 0 | (pre-reset 2) |
| walk-24 | 2 | 0 (RESET) |
| walk-25 | 0 | 1 |
| walk-26 | 0 | **2** |

A.12 #3 requires **three consecutive zero-issue walks**. The chain is now at **chain[2] / 3**. One more zero-issue walk completes the convergence trigger.

## Decide next

**Walk-27 = chain[3] candidate.** The choice has two strong options, both compatible with the convergence rule (each is zero-issue-eligible if executed against the deployed bundle and finds nothing actionable):

1. **IBD deep-dive** — parts + ports + `ConnectionUsage` + `ItemFlow` + proxy-vs-full port distinction inside the IBD. Aggregate value: chain[3] candidate AND dim 6 promote (2 → 3). Highest aggregate value.
2. **Dim-13 score-3 walk** — right-click `Show in X` cross-diagram navigation from both ends, N>2 representations on one PartDefinition, bidirectional navigation. Promotes dim 13 (2 → 3) but does not double-promote dim 6.

Recommended: **IBD deep-dive** for walk-27. A clean walk-27 simultaneously delivers (a) the third consecutive zero-issue walk satisfying A.12 #3 and (b) dim-6 score-3, taking the Phase-15 score-3 count from 2 → 3.

Alternative for risk-balance: if walk-27 = IBD deep-dive finds issues (likely on a deep-dive — see A.5 "deep dives push a single viewpoint hard, exercising rare relationships and edge cases"), the chain resets to 0 but the rubric still gains useful measurement data. The dim-13 score-3 walk could then be slotted as a chain-rebuild candidate.

**FBW example (A.12 #4):** further unblocked — Pages-confirm means the FBW BDD↔IBD authoring loop is now verified on the artifact that any external reviewer would see.

**Iter-counter:** Phase-15 iter-count at **64** of the 300 churn ceiling; well under.

**ADR for raising A.8 cap (#454):** still blocked behind #469 (`status:needs-human`). Walk-26 used 1/5 of the A.8 in-flight cap; no contention this iteration.

