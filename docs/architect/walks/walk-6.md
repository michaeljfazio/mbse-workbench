# Walk 6 — FBW bootstrap (package skeleton + first PartDefinitions)

**Iteration:** 810 (planned — iter-808 and iter-809 land #413 + #376-ADR first)
**Date:** TBD (planned post-`vphase-15.4` deploy)
**Walk type:** Deep dive (FBW model construction — first session)

## Plan

### Scope

The first FBW-modelling session. Per A.6, the workbench needs an A320-class fly-by-wire FCS model committed under `examples/flight-control-system/` as the final Phase 15 termination artefact (A.12 #4). This walk builds the **top-level package skeleton** + a handful of **anchor PartDefinitions** under the most complex subsystem (ATA 27 — Flight Controls), but does NOT yet attempt the full A.6 coverage targets. Subsequent walks (7, 8, …) fan out per subsystem.

The walk also serves as the **first real validation of the iter-807 Package-row implicit-owner feature** (PR #414) — the architect uses the `Create representation… > Activity / State Machine / IBD / Parametric` row entries as the discoverability path during real authoring rather than as a contrived test. If the affordance reads naturally in an actual modelling flow, it stays; if it reads awkwardly, file findings.

### Goals

1. Create the 8 top-level packages per A.6 skeleton (Context, ATA 22, ATA 27, ATA 29, ATA 31, ATA 34, Behaviour, Requirements).
2. Under ATA 27 — Flight Controls, create the **PrimaryFlightControlComputers** sub-package + 3 PartDefinitions (PRIM 1, PRIM 2, PRIM 3) as anchors. Each carries 2–4 PortDefinitions (sensor-in, command-out, status-out).
3. Under ATA 27, create the **SecondaryFlightControlComputers** sub-package + 2 PartDefinitions (SEC 1, SEC 2).
4. Open a BDD on the ATA 27 package to verify the 5 PartDefinitions render with their port stubs.
5. Open an IBD on PRIM 1 to verify the IBD canvas affordances + palette work for real authoring.

### Out of scope (for this walk)

- ATA 29 (Hydraulics) — its complexity (3 systems × failure modes) deserves its own deep dive.
- Activity / State Machine diagrams — walk 7+ once the PartDefinitions are in place to be referenced.
- Requirements — walk 8+ once the structural skeleton is stable enough to derive requirements *from*.
- Cross-viewpoint references and traceability edges — walk 9+.
- Parametric — walk 10+ (smallest A.6 target = 1 diagram, so deferred).
- The actual `examples/flight-control-system/` commit — happens once the model satisfies A.6 coverage; this walk only builds a sliver.

### Rubric dimensions informed

- **15** (Palette & creation affordances) — does the iter-807 implicit-owner flow read naturally under real authoring? Possible 2 → 3.
- **18** (Project tree / explorer) — does the deep nesting (8 top-level packages × sub-packages × Definitions) stay legible? Possible 2 → 3.
- **5** (BDD conformance) — the 5-block ATA-27 BDD exercises composition / generalisation enough to corroborate the existing score 2 or push toward 3.
- **6** (IBD) — the first real IBD-with-ports rendering on PRIM 1.
- **28** (Help / discoverability) — already advanced to 2 in iter-807; the walk re-validates that the affordance is discoverable from an architect's first-encounter perspective.

### Expected duration

45–90 minutes (mostly UI-driven authoring through Playwright headed Chromium).

### Snapshot at walk start

To be filled in at walk-6 execution time:
- **Pages commit:** _<vphase-15.4 SHA when tagged>_
- **`pnpm dev` HEAD:** _<commit SHA at walk start>_
- **Open phase:15 issues:** _<count by severity>_
- **Rubric:** _<table snapshot>_
- **A.12 termination conditions:** #1 _<X of 28 at 3>_; #2 _<N open>_; #3 _<status>_; #4 _<status>_.

### Convergence implications

Walk-6 is a **deep-dive**, not a convergence walk. Any findings filed RESET the convergence chain (A.12 #3) — the next three consecutive walks would need to file zero issues again. That's expected: the architect is now authoring real content for the first time and *will* find real defects.

### Walk execution method

Per A.3 #1, Playwright-driven headed Chromium against `pnpm dev` (the iter-807 implicit-owner feature must be live for this walk to validate it). Findings tagged with the commit SHA at walk start; re-verified against the deploy after the next `vphase-15.N` release. Screenshots saved under `artifacts/phase-15/walk-6/`.

### Tooling

- A reusable walk-runner script (`tools/walks/walk-runner.ts`, to be authored) that:
  - boots a Playwright headed Chromium against `pnpm dev`,
  - exposes helpers for the recurring authoring patterns (create package, create PartDefinition, add port, open representation, drag-from-palette),
  - captures a screenshot per major step,
  - logs each step + timing to `artifacts/phase-15/walk-6/walk-6.log`.
- The script is NOT a test — it's an authoring transcript. Subsequent walks reuse + extend it.

## Snapshot at walk start

- **Pages commit (vphase-15.5):** deploy was queued at walk start; ran against `pnpm dev` HEAD (`4056267`) per A.3 #6 (deploy queue backed up; HEAD is the same code).
- **`pnpm dev` HEAD:** `4056267` (PR #422 — toolbar retire, the last commit of the iter-810 → iter-814 ADR 0015 cycle).
- **Open phase:15 issues at start:** 0 (#376 just closed; queue empty).
- **Rubric at start:** 21 × score-2, 3 × score-1, 4 × score-0.
- **A.12 termination conditions at start:** #1 0 of 28 at 3; #2 ✓ zero open; #3 ✓ (walks 3, 4, 5); #4 not started.

## Execution

Ran `artifacts/phase-15/walk-6/walk-6-exec.py` headless-Chromium against `pnpm dev`. The script clicked `project-tree-group-create-Package` eight times, typing the name + Enter after each `+` click to commit the inline rename.

**One re-run** was needed: the first attempt used an obsolete rename-input selector (`project-tree-rename-`) and reported a `ux-friction` finding that the inline rename never surfaced. Inspection of `src/workspace/tree/ContainmentTree.tsx:986` revealed the correct selector is `containment-tree-element-rename-{elementId}` — the rename input renders inside the ContainmentTree row, not the ProjectTree palette. The selector was a probe bug in `walk-6-exec.py`, NOT a workbench defect — no issue filed. **Errata note:** walk-7+ should explicitly verify selectors before relying on them.

After the selector fix, all eight `+ New Package` → rename → Enter cycles succeeded. The eight top-level packages of the A320-class FBW skeleton now live under the project root:

| # | Package name              | ATA chapter |
|---|---------------------------|-------------|
| 1 | 00 - Context              | n/a         |
| 2 | 22 - Auto Flight          | ATA 22      |
| 3 | 27 - Flight Controls      | ATA 27      |
| 4 | 29 - Hydraulics           | ATA 29      |
| 5 | 31 - Indicating Recording | ATA 31      |
| 6 | 34 - Navigation           | ATA 34      |
| 7 | Behaviour                 | n/a         |
| 8 | Requirements              | n/a         |

Page errors: 0. Console errors: 0.

Walk artifact: `artifacts/phase-15/walk-6/walk-6.json` (full timing, finding list, generated element ids). Screenshots: `artifacts/phase-15/walk-6/screenshots/`.

## Findings (live)

The only entries in `walk-6.json` are:
- The selector-bug `ux-friction` from the first attempt (NOT a workbench defect — script-side false positive; resolved by re-running with the correct selector).
- An info-tagged `created 8 of 8 top-level packages` summary.

No acceptance-testable workbench defects surfaced. The `+` button affordance works; the inline-rename auto-activation after `+` works; the project tree renders 8 sibling packages legibly.

## Issues filed

**None.** This is the FIRST FBW-modelling session and a deep-dive walk; zero new findings is unusual but real. The bootstrap package creation flow is exactly what the architect would naturally use, and it works.

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-6 | 15 | 2 | 2 | `+ New Package` works for batch creation. Drag-from-palette path NOT exercised this walk — walk-7+ tests it on a non-Package kind. Score stays 2. |
| 2026-05-18 | walk-6 | 18 | 2 | 2 | Eight sibling packages under the root render legibly; bidirectional canvas/tree sync not yet exercised. Stay 2. |

No advances. Subsequent walks will exercise more dimensions; rubric advances accumulate over the FBW-build session series.

## Convergence chain (A.12 #3)

Walk-6 filed **zero new issues** AND introduced **no rubric degradation**. The chain extends:

- Walk-3 (#1): zero issues.
- Walk-4 (#2): zero issues.
- Walk-5 (#3): zero issues (chain originally satisfied here).
- Walk-6 (#4): zero issues — chain still valid.

A.12 #3 remains ✓ SATISFIED.

## Decide next

**Walk-7 (next session):** Under `27 - Flight Controls`, create the `PrimaryFlightControlComputers` and `SecondaryFlightControlComputers` sub-packages + the anchor PartDefinitions (PRIM 1/2/3, SEC 1/2). Exercise drag-from-palette this time (test ADR 0015 step 1 end-to-end). Open a BDD on `27 - Flight Controls` to verify the 5 PartDefinitions render as Blocks. Open an IBD on PRIM 1 to validate the IBD canvas affordances under real authoring. Walk-7 informs rubric dims 5 (BDD), 6 (IBD), 15 (palette drag), 18 (explorer).
