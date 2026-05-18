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

