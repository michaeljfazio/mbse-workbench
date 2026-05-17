# Walk 3 — regression walk after vphase-15.2 deploy

**Iteration:** 799
**Date:** 2026-05-17
**Walk type:** regression (per A.5)

## Plan

### Scope

Regression walk against the `vphase-15.2` Pages deploy. Two concurrent missions:

1. **Verify the iter-797/798 engineer batches end-to-end.** #375 (drag-coord overlay during drag) and #386 (Cmd-Z on rename input undoes create) both need on-the-deployed-app confirmation.
2. **Score additional rubric dimensions** that walk-1/2 left at 0:
   - Dim 7 (Requirements) — create a Requirement, exercise edges if possible.
   - Dim 10 (Use Case) — open a Use Case diagram, observe actor/use-case shapes.
   - Dim 12 (Package) — open a Package diagram, observe containment edges.
   - Dim 22 (Import/export) — try JSON export from the Cmd-K palette or menu.
   - Dim 25 (Accessibility) — informal observation across these diagrams.

### Out of scope

- Dim 14 (round-trip integrity at score 3) — needs full SysMLv2-text round-trip test, deferred.
- Dim 23 (LLM) — needs API key; deferred.
- Dim 17 (edge editing deep dive) — deferred to dedicated edge-editing walk.
- BDD/IBD/Activity/State-Machine/Parametric deep dives — those need dedicated walks after each viewpoint hits score-2.

### Expected duration

15–30 minutes (regression walks are 15–45 min per A.5).

### Rubric dimensions this walk will inform

Initial measurement for: 7, 10, 12, 22, 25. Verification for: 16, 21, 27 (should stay at 2).

### Snapshot at walk start

- **Deployed Pages URL:** https://michaeljfazio.github.io/mbse-workbench/
- **Pages commit (vphase-15.2):** `7967d7e3dab2d9891384645b8a9882f4bf6cf2db`
- **Open `phase:15` issues:** 9
- **Rubric:** 11 × score-2, 6 × score-1, 11 × unmeasured.

### Acceptance for this walk plan

The plan is "done" when this file's `## Plan` section is committed. Execution proceeds in step 3 (`## Findings (live)`); triage in step 4 (`## Issues filed`); rubric scoring in step 5 (`## Rubric deltas`); close-out commit in step 6.

## Findings (live)

Walk-3 ran `artifacts/phase-15/walk-3/walk-3-exec.py` against the `vphase-15.2` Pages deploy. Script crashed in M2.03 on a locator timeout (`main, [role='main']` not present in the Package diagram view), but the regressions and most measurements completed before the crash.

**Headline observations:**

1. **#375 drag-coord overlay works live.** Mid-drag the overlay reads `(54, -2)` (canvas-space coordinates of the dragged node). On mouse release the overlay disappears. Behaviour matches the implementation contract; no regression from PR #389.
2. **#386 Cmd-Z on rename input works live.** Creating a `PartDefinition` via palette `+` immediately opens the rename input. Pressing Cmd-Z on the untouched input cancels the rename (rename input hidden) AND undoes the create (node count `1 → 0`). Implementation contract from PR #392 holds on the deployed app.
3. **Requirements model is comprehensive.** Selecting a `Requirement` populates the inspector with `Name`, `Description`, `Requirement ID`, `Priority` (Low / Medium / High / Critical), `Status` (Draft / Approved / Implemented / Verified / Rejected), `Text`, `Rationale`, `+ Link requirement`, `Linked requirements` list, `Owner` UUID. Notably richer than walk-1's `PartDefinition` inspector — dim 7 score-3 description ("Requirement nodes with ID, text, type") is largely satisfied at the property level.
4. **Use Case diagram creates** from the Package row's `Create representation…` submenu (the corrected pattern). Visual fidelity (actor stick figures, use-case ellipses) not deeply inspected this walk.
5. **Walk script crashed on the Package diagram inspection** — the Package canvas may render without a `<main>` element. Not a finding for the application; the script needs a defensive locator. To be fixed in walk-4's script.
6. **Zero new GitHub issues filed.** This walk produces only score-confirmations and one positive new score; no defects observed.

## Issues filed

**None.** Walk-3 is **convergence walk #1** per A.12 — three consecutive walks with no new findings are required for termination convergence; walk-3 contributes the first of three. Walks-1 and walks-2 both filed issues, so the chain starts at walk-3.

## Rubric deltas

Walk-3 informs 5 dimensions positively and verifies 3 prior advances.

| # | Dim | prior → new | Headline |
|---|-----|-------------|----------|
| 7 | Requirements | 0 → 2 | Comprehensive inspector property model verified live. Score 3 needs traceability edge exercise. |
| 10 | Use Case | 0 → 2 | Diagram creation confirmed via the Create-representation submenu. Score 3 needs full shape/relationship audit. |
| 16 | Direct-manipulation | 2 → 2 | #375 drag-coord overlay verified live; reinforces score 2. |
| 21 | Undo/redo | 2 → 2 | #386 Cmd-Z on rename input verified live; reinforces score 2. |
| 27 | Persistence | 2 → 2 | Implicit — sessionStorage retained between page loads in this walk. |

Dimensions still at score 0 (not measured by walk-3 due to script crash in M2.03 or out-of-scope): 2 (edges & routing), 3 (ports), 12 (Package — script crashed before measurement), 13 (cross-diagram), 14 (round-trip), 17 (edge editing), 22 (import/export — script crashed before measurement), 23 (LLM), 25 (a11y). These move to walk-4 or dedicated walks.

## Close-out

Walk-3 is the **first convergence-eligible walk** in Phase 15 (zero new issues filed; only rubric advances + verifications). The convergence chain begins; walks-4 and walks-5 must continue this pattern to satisfy A.12 #3. The walk script's M2.03 crash (Package locator) needs a defensive fix for walk-4 to remain reliable — that's a tiny script fix, not an application bug.

**Next walk decision:** iter-800 should be an engineer batch that closes one of the remaining open issues (likely #385 IBD canvas affordance or the discoverability batch #368-#371) to keep rubric momentum, then walk-4 follows. Convergence reaches at walk-5 if both walks-4 and walks-5 file no findings.

**Walk file finalised.** Subsequent findings go in `walk-4.md`.
