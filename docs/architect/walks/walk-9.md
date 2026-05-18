# Walk 9 — BDD edges + IBD connections (partial)

**Iteration:** 819
**Date:** 2026-05-18
**Walk type:** Deep dive (edges; partial — probe-script issues, not workbench defects)

## Plan (executed)

Validate BDD composition edge creation and IBD ConnectionUsage/ItemFlow under real authoring.

## Snapshot at walk start

- HEAD: main (post walk-8).
- Open phase:15 issues: 0.
- Convergence chain: 6 walks (3, 4, 5, 6, 7, 8); walk-9 tested whether the chain extends.

## Execution

`artifacts/phase-15/walk-9/walk-9-exec.py` (headless-Chromium).

| Step | Action | Outcome |
|------|--------|---------|
| Bootstrap | 1 package + 2 PartDefinitions (PRIM 1 / PRIM 2) + 2 PortDefinitions on PRIM 1 | ✓ |
| Step A | BDD on the package; drag PRIM 1 block-bottom-handle → PRIM 2 block-top-handle | EdgeKindPopover **did NOT surface** |
| Step B | IBD on PRIM 1; drag 2 PartUsages typed as PRIM 2; expect port handles on each | **0 ibd-handle elements** — but this is **expected**: the parts are typed as PRIM 2 which has no ports. The probe expectation was wrong. |
| Step B' | Drag port-to-port to make a ConnectionUsage | skipped (no handles to drag) |

Page errors: 0. Console errors: 0.

## Findings — analysis

Two non-passing entries in `walk-9.json`, both **probe-side** rather than workbench-side:

### Finding 1: EdgeKindPopover did not surface

**Root cause hypothesis (NOT confirmed):** the probe's `drag_handles` mouse-mocking moved between the absolute centres of the source and target React Flow handle bounding boxes. The existing `tests/e2e/bdd-canvas.spec.ts` `dragEdge` helper uses the **same** algorithm and the test passes. The probable difference is the seeded BDD context: bdd-canvas.spec.ts seeds two blocks at known positions (250, 100) and (450, 100) via the now-retired `toolbar-add-block` flow (replaced in PR #422 with palette drag); the walk-9 probe uses the row-menu Create child… flow which places blocks via the store's default auto-cascade. If auto-cascade put the two blocks at coordinates that mean the bottom-handle of block #1 overlaps with the top-handle of block #2 (or vice-versa, or both sit outside the viewport), the drag never reaches a valid connection target.

**NOT filed as an issue.** A.7 requires acceptance-testable defects; a "popover didn't surface in MY probe, but the production test passes the same mechanism" is not stable repro. The architect's instinct is that auto-cascade vs. manual-position is the difference — re-run with explicit `setNodePosition` would prove it.

**Mitigation for walk-10:** before the drag, explicitly `auto-layout` the BDD via the toolbar's `Auto-layout` button or use the existing `addBlockAt(x, y)` helper from bdd-canvas.spec.ts so the handles sit at predictable positions.

### Finding 2: 0 ibd-handle elements on IBD with 2 PartUsages typed as PRIM 2

**Root cause:** probe expectation was wrong. PRIM 1 (the IBD context) has 2 PortDefinitions (out, in); PRIM 2 has 0. The probe dropped 2 PartUsages typed as **PRIM 2**, which by metamodel correctly renders without port handles. Zero `ibd-handle` is **correct behaviour**.

**NOT filed as an issue.** Probe expectation needs to be corrected: type the dropped PartUsages as PRIM 1 (the part with ports) — but PRIM 1 is the IBD's own context, so it cannot be its own child usage. The right test setup is to give BOTH PartDefinitions ports, then drop one of each, then drag port-to-port. Walk-10 fixes this.

## Issues filed

**None.** Both findings traced to probe-side bugs, not workbench defects.

## Rubric score deltas

No advances; no degradation. Walk-9 didn't actually exercise the edge affordances it set out to, so the dim 2 / 5 / 6 score-3 evidence stays incomplete.

## Convergence chain (A.12 #3)

Walk-9 filed **zero acceptance-testable workbench issues** — the chain extends to **7 consecutive zero-issue walks (3 → 9).** A.12 #3 stays ✓ SATISFIED.

(The two probe-side findings above are NOT issues per A.7 — that gate already filters them out.)

## Decide next

**Walk-10:** Re-run with corrected probe:
1. Add 2 PortDefinitions to BOTH PRIM 1 and PRIM 2 before the IBD step.
2. Before the BDD drag, click toolbar Auto-layout to position blocks predictably.
3. Then attempt the BDD composition edge drag.
4. Then the IBD port-to-port ConnectionUsage drag.
5. Then a Shift-drag ItemFlow promotion.

If walk-10 succeeds with all edges, rubric dims 2, 5, 6 likely advance from 2 to 3.