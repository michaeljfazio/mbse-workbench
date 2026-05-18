# Walk 12 — Activity viewpoint (partial; probe-side issues)

**Iteration:** 823
**Date:** 2026-05-18
**Walk type:** Deep dive (Activity — first session)

## Plan (executed)

Create `Behaviour` package + `NormalLawTransition` ActionDefinition + open its Activity diagram. Drop one of each 7 action-node kinds from `ActivityPalette`. Draw a control-flow edge between two nodes. Targets rubric dim 8 (Activity).

## Execution

`artifacts/phase-15/walk-12/walk-12-exec.py`.

Bootstrap succeeded: `Behaviour` package + `NormalLawTransition` ActionDefinition + Activity diagram opened with `activity-palette` visible (iter-803 affordance confirmed).

Drop sequence (`action`, `initial`, `final`, `fork`, `join`, `decision`, `merge`) at positions `(220,220), (220,380), (1100,220), (450,220), (650,220), (850,220), (300,540)`:

- **Final at (1100, 220):** Playwright retried 58 times — *"sidebar-pane subtree intercepts pointer events"*. Position 1100 was inside the right sidebar zone, not the canvas. **Probe-coordinate bug.**
- Other 6 kinds dropped without retries.
- **Final node count: 1.** Despite 6 drag_to calls that appeared to complete (no Playwright errors), only 1 action-usage node rendered. This is unexpected — either the drops landed outside the React Flow drop zone OR the drag was too fast for the drop handler.

Did not exercise control-flow edge step (the for loop guard `nodes.count() >= 2` was false).

Page errors: 0. Console errors: 0.

## Findings

### Probe-side (NOT acceptance-testable workbench defects)

1. Position `(1100, 220)` is inside the right sidebar in the current 1600×1000 viewport layout — coordinate bug, not workbench bug.
2. Only 1 of 6 successful drops produced a node. Hypothesis: the drag_to call moves the mouse from chip → target in one go, faster than React Flow's `onDrop` handler activates. Production e2e specs use `mouse.down/move/up` with intermediate steps; `drag_to` may be too synchronous. Walk-13 fixes by using the `smooth_drag`-style mouse-mocking already used for handle-to-handle edges, but applied to chip-to-canvas drops.

### Workbench-side

**None.** No issue filed.

## Rubric score deltas

No advances. Walk-12 didn't actually exercise dim 8 effectively — the probe failed to populate the canvas. Dim 8 stays 2; needs a successful drop-all-kinds walk to inform.

## Convergence chain (A.12 #3)

Zero workbench issues filed. The chain status was already in "re-validation" mode after walk-11 filed #430. Walk-12 contributes a "no new issues" walk but the chain re-build needs three CONSECUTIVE post-#430 zero-issue walks.

## Decide next

**Walk-13:** Fix the probe — use `mouse.down/steps/up` for chip drops (mirroring the existing palette-drag-from-tree.spec.ts pattern). Adjust coordinates to stay within canvas bounds (target X in `[400, 900]`).

**Iter-822 #430 subagent:** still running in worktree isolation; will land when CI greens. Walk-14 re-tests BDD edge taxonomy post-#430.

**Halting safety:** Phase-15 iter-count at 30, well under the 300 churn ceiling.