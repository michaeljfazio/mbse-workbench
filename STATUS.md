# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

Iter-796 walk-2 closed. Regression walk against `vphase-15.1`
confirmed the #374 resize fix works end-to-end on the live app
(8 handles, drag enlarges, size persists across reload). All 8
viewpoints reachable via the corrected testid pattern — iter-795
errata fully validated. Activity and State Machine diagrams expose
drag-from-palette affordances (Walk-1's "all click-only" claim
was BDD-specific).

Rubric advanced: dim 21 (undo/redo) 0 → 1, dim 26 (performance)
0 → 2, dim 27 (persistence) 0 → 2. Now 10 × score-2, 7 × score-1,
11 × unmeasured.

Two new issues filed: #385 (IBD canvas has no element-add
affordance), #386 (Cmd-Z may not undo from non-canvas focus
context).

## Current iteration
- Iteration #: 796 (close-out)
- Started: 2026-05-17
- Branch: `phase-15/walk-2-log`
- Working on: walk-2 close-out PR

## Last test run
- Main green at `6729d2b`.
- Walk-2 doc-only PR: `pnpm run check` expected pass.

## Known issues / blockers
- (none)

## Open phase:15 issues — distribution at iter-796 close

| Severity | Count | Issues |
|----------|-------|--------|
| p1 | 2 | #375 (drag-coord display), #376 (4-way Block creation — design) |
| p2 | 7 | #368/#369/#370/#371 (discoverability), #372 (palette dynamic growth), #385 (IBD canvas), #386 (Cmd-Z focus) |
| p3 | 2 | #373 (usage no `+`), #377 (palette labels) |

11 open `phase:15` issues.

## Decisions log

- 2026-05-17 (iter-796): Walk-2 regression walk confirms #374 resize
  works end-to-end on vphase-15.1 (including reload-persistence).
  All 8 viewpoints reachable via the corrected
  `containment-tree-element-menu-trigger-${elementId}` testid pattern.
  Activity and State Machine diagrams have drag-from-palette;
  walk-1's "all click-only" claim was BDD-specific. Two new findings:
  IBD canvas has no element-add affordance (#385); Cmd-Z may not
  undo from non-canvas focus (#386).

## Next action

Iter-797: **engineer batch on #375 (drag-coord display)**. BDD
vertical slice mirroring #374's pattern — render an `(x, y)`
indicator near the dragged block via React Flow's `onNodeDrag`.
Tests + visual baselines + pre-PR review per the established
iter-795 playbook. Open a chore close-out for the rubric+STATUS
afterward.
