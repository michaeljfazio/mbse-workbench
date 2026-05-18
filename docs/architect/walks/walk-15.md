# Walk 15 — Activity viewpoint: all 7 action-node kinds + ControlFlow edge

**Iteration:** 827
**Date:** 2026-05-18
**Walk type:** Deep dive (Activity viewpoint, walk-12 probe-fixed)

## Plan (executed)

Drop all 7 Activity action-node kinds (action, initial, final, fork, join, decision, merge) onto the Activity canvas. Verify each renders. Draw a ControlFlow edge between two nodes. Targets rubric dim 1 (node shapes — Activity subset) + dim 8 (Activity conformance — node kinds + control flow).

## Execution

`artifacts/phase-15/walk-15/walk-15-exec.py`.

Bootstrap: `Behaviour` package + `NormalLawTransition` ActionDefinition + Activity diagram opened with `activity-palette` visible.

| Step | Action | Outcome |
|------|--------|---------|
| A | Drop 7 chip kinds at x=400, y={100, 200, 320, 440, 560, 680, 800} | **All 7 rendered ✓** |
| B | Auto-layout + drag handle-bottom of node 0 → handle-top of node 1 | **ControlFlow edge rendered ✓** |

Page errors: 0. Console errors: 0.

## Findings — probe-side lesson (worth recording)

Walks 12 + 15 first attempts both reported "only 1 of 7 nodes rendered". **Root cause: the probe locator `[data-testid^="activity-action-"]` matches ONLY action-type nodes, NOT initial / final / fork / join / decision / merge** — those use `activity-{nodeType}-{id}` per `src/viewpoints/activity/ActionUsageNode.tsx:206`. The drops were working from drop #2 onwards; the count was wrong, not the workbench.

**Corrected locator:** `[data-element-id][data-testid^="activity-"]:not([data-testid*="-label-"]):not([data-testid*="-input-"]):not([data-testid*="-edge-"])`. Errata note for walks 16-18: when counting nodes, sieve by `data-element-id` and exclude `-label-` / `-input-` / `-edge-` testid fragments rather than by a specific kind prefix.

## Workbench-side findings

**Strong positive evidence — no issues filed:**

1. All 7 ActivityPalette chips (`activity-palette-{action,initial,final,fork,join,decision,merge}`) are draggable and produce nodes on drop.
2. ControlFlow edge creation via handle-to-handle drag works.

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-15 | 1 | 2 | 2 | All 7 Activity node kinds render (action rounded rect, initial filled disc, final bullseye, fork/join bar, decision diamond, merge inverted-diamond). **Activity subset of dim 1 now solidly score-3-equivalent.** Stays 2 overall because dim 1 also requires use-case ellipses + state-machine pseudostates + parametric constraint blocks visual verification — walks 16-18 will accumulate. |
| 2026-05-18 | walk-15 | 8 | 2 | 2 | All 7 node kinds creatable + ControlFlow edge works. Score 3 still requires object flow with pins, decision/merge **guards**, fork/join semantics tested, swimlanes (partitions). Stays 2 until a dedicated dim-8 walk exercises those. |

## Convergence chain (A.12 #3)

Walk-15 filed **zero workbench issues**. Post-#434 chain:
- Walk-14 (#1): zero issues ✓
- Walk-15 (#2): zero issues ✓
- Walk-16 needed for the 3-consecutive re-satisfy.

## Decide next

**Walk-16:** State Machine viewpoint — drop all state-node kinds (state, initial, final), draw transitions, exercise entry/exit/do actions via inspector. Targets dim 9. Apply the corrected node-counting locator from this walk's errata.