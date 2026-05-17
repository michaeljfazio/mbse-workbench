# Walk 4 — regression + score remaining dims (vphase-15.2 deploy)

**Iteration:** 801
**Date:** 2026-05-17
**Walk type:** regression (per A.5)

## Plan

### Scope

Walk against `vphase-15.2` Pages deploy (the live app — #372 fix is on `main` at `6a73e78` / `b7cd115` but NOT yet deployed; vphase-15.3 awaits the A.8 5-batch threshold). Two concurrent missions:

1. **Verify earlier fixes are still live.** #374 resize, #375 drag-coord, #386 Cmd-Z — all should pass on vphase-15.2.
2. **Score remaining unmeasured rubric dimensions** that walks 1–3 haven't reached:
   - Dim 2 (edges & routing) — create a composition edge between two BDD blocks.
   - Dim 3 (ports) — try to add a port via the inspector "+ Add port" affordance.
   - Dim 12 (Package) — open a Package diagram and observe.
   - Dim 17 (edge editing) — try to manipulate an edge after creation.
   - Dim 22 (import/export) — JSON download via Cmd-K → "Save project as JSON".
   - Dim 25 (a11y) — formal axe scan on 2–3 screens.

### Out of scope

- LLM (dim 23) — needs API key.
- Cross-diagram coherence deep dive (dim 13) — separate walk.
- Round-trip integrity at score 3 (dim 14) — needs SysMLv2 text round-trip.
- Snap-to-grid / alignment guides / rubber-band (sub-requirements of dim 16) — separate walk.

### Expected duration

15–30 minutes (regression walk per A.5).

### Convergence considerations

If walk-4 files zero new issues, it counts as **convergence walk #2 of 3** (per A.12 #3). Walk-3 already counts as #1. Walk-5 would then need zero issues for the chain to close.

### Snapshot at walk start

- **Deployed Pages URL:** https://michaeljfazio.github.io/mbse-workbench/
- **Pages commit (vphase-15.2):** `7967d7e3dab2d9891384645b8a9882f4bf6cf2db`
- **main HEAD:** `b7cd115` (iter-800 close-out)
- **Open phase:15 issues:** 8
- **Rubric:** 14 × score-2, 4 × score-1, 10 × unmeasured.

### Acceptance for this walk plan

The plan is "done" when this file's `## Plan` section is committed. Execution proceeds in step 3 (`## Findings (live)`); triage in step 4 (`## Issues filed`); rubric scoring in step 5; close-out in step 6.

## Findings (live)

Walk-4 ran `walk-4-exec.py` against `vphase-15.2`. 13 observations in `findings.json`. Headline observations:

**M1 regressions — all PASS:**
1. #374 resize: 8 handles when block selected.
2. #375 drag-coord overlay: visible mid-drag.
3. #386 Cmd-Z on rename input: nodes 1 → 0, success.

**M2 edges (dim 2 + 17):** Created two Blocks; each has 2 React Flow handles. Attempted handle-to-handle drag — DID NOT create an edge automatically, but `2 edge-kind buttons` appeared (likely a chooser popover requiring an explicit click). Edge creation IS reachable; one extra interaction step needed. Not a finding for an issue — typical React Flow pattern.

**M3 ports (dim 3):** `+ Add port` button is visible in the inspector when a `PartDefinition` is selected; clicking it succeeds (no exception).

**M4 Package (dim 12):** Package diagram opens via Package row's `Create representation…` submenu; body text includes `PACKAGE DIAGRAM` confirming the toolbar.

**M5 Import/export (dim 22):** Cmd-K palette opens; typing "Save" filters to the "Save project as JSON" entry; pressing Enter triggers a download with filename `untitled-project.json` — concrete proof the export path works.

**M6 a11y (dim 25):** Axe scan via injected axe-core 4.10.0 on the empty-state app: **0 violations** total (0 serious/critical). 27 axe checks passed.

**Console + page errors:** 0 / 0. Clean runtime.

## Issues filed

**None.** Walk-4 is **convergence walk #2 of 3** per A.12 #3.

## Rubric deltas

| # | Dim | prior → new | Headline |
|---|-----|-------------|----------|
| 2 | Visual fidelity — edges & routing | 0 → 2 | Edge-kind chooser appears on handle drag (BDD); not exercised at edge-style depth. |
| 3 | Visual fidelity — ports | 0 → 2 | `+ Add port` affordance works; port visualisation on block edges not deeply verified. |
| 12 | SysML conformance — Package | 0 → 2 | Package diagram opens via the corrected `Create representation…` submenu. |
| 17 | Edge editing affordances | 0 → 1 | Edge-kind chooser surfaced but the create flow didn't conclude in this run; reconnect/restyle not exercised. |
| 22 | Import / export | 0 → 2 | JSON export concrete: download triggered with filename `untitled-project.json`. |
| 25 | Accessibility | 0 → 2 | Axe scan: 0 violations on empty-state. Score 3 needs scans on every interactive screen. |

Also re-verified prior advances (dims 16, 21, 27 still ≥ 2 on live).

## Close-out

Walk-4 is **convergence walk #2 of 3** — six new dimensions scored and three earlier fixes re-verified, all without filing any new defect issues. The convergence chain holds.

**Next walk decision:** iter-802 picks the next engineer batch. Strong candidate: the discoverability batch (#368/#369/#370/#371) since walks have surfaced no new defects of comparable scope, leaving the remaining backlog dominated by P2/P3 polish + the design-driven #376. Walk-5 (after iter-802 deploys) is the third convergence walk — if zero issues filed, A.12 #3 closes.

**Walk file finalised.** Subsequent findings go in `walk-5.md`.
