# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-804 engineer batch: #385 closed — IBD canvas now has a draggable in-canvas Part chip, mirroring the Activity / StateMachine / UseCase / Parametric pattern.**

The IBD canvas previously exposed no on-canvas element-creation affordance — an architect surveying the IBD had to know (from external context) that PartUsages are added by dragging from the project-tree palette on the left. The fix wires a new `IbdPalette` component with a "Drag onto canvas" hint label, a draggable "Part" chip routed through the existing PartDefinition-typing popover, plus an inline hint clarifying that Connections / Item Flows are created via port-handle drag rather than chips. Port creation continues to live on the inspector — intentionally not promoted to a chip because it requires a parent context.

Three chromium @visual baselines for ibd-parts.spec.ts plus one for ibd-connection.spec.ts re-baked from CI test-results artifacts via the standard lift-from-trace procedure (docs/CONTEXT.md 2026-05-12); the layout shift caused by the ~36 px palette strip crossed maxDiffPixelRatio=0.01 on those four screens. Webkit-visual variants and the ibd-empty / itemflow chromium variants stayed under threshold across two rebake CI runs.

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | 0 of 28 at 3; 20 at 2, 4 at 1, 4 at 0 |
| A.12 #2 | Zero open phase:15 issues | 6 open (1 p1, 4 p2, 1 p3) |
| **A.12 #3** | **Three consecutive convergence walks** | **✓ SATISFIED (walks 3, 4, 5)** |
| A.12 #4 | FBW example shipped + loadable | not started |

## Current iteration
- Iteration #: 804 (close-out)
- Started: 2026-05-17
- Branch: `phase-15/iter-804-closeout`
- Working on: STATUS update for the iter-804 engineer batch

## Last test run
- Main green at `1eae22a` (PR #407 — IBD canvas palette).
- No new release tag — the change is a viewpoint affordance that benefits the next architect walk but does not by itself warrant a `vphase-15.4`. Bundle with the next batch (likely the discoverability batch closing #368/#369/#370/#371) and tag then.

## Known issues / blockers
- (none)

## Open phase:15 issues at iter-804 close

| Severity | Count | Issues |
|----------|-------|--------|
| p1 | 1 | #376 (4-way Block creation — design) |
| p2 | 4 | #368/#369/#370/#371 (discoverability — Activity / State Machine / Parametric / IBD not on "Create representation…" submenu) |
| p3 | 1 | #373 (usage no `+`) |

## Decisions log

Iter-792..iter-803 entries preserved in commit history. Iter-804:

- 2026-05-17 (iter-804): Picked #385 as the iter-804 batch — best-defined acceptance criteria, mirrored an established viewpoint pattern (Activity / StateMachine / UseCase / Parametric all already expose an in-canvas chip palette), and tightened rubric dim 6 (IBD) + dim 15 (palette affordances) without ADR friction. Two CI rebake cycles needed: 3 chromium-visual ibd-parts baselines drifted on cycle 1, then 1 chromium-visual ibd-connection baseline drifted on cycle 2 (sat just under threshold on cycle 1, crossed over on cycle 2 — palette-shift sat right at the boundary for that screen). No rubric score change — dim 6 and dim 15 both stay at 2; the IBD palette is one fix in a larger score-3 picture. Issue #385 closed via PR #407. Six phase:15 issues remain (1 p1, 4 p2, 1 p3).

## Session checkpoint summary

This session (iter-793 → iter-804) executed 12 iterations spanning bootstrap, 3 architect walks (with 1 buggy probe self-corrected via errata), 6 engineer batches, 3 release tags. Cumulative delivery:

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 17:02Z | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 07:13Z | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 10:56Z | Palette show-all-kinds + label consistency |

Rubric: 0 → 20 × score-2 + 4 × score-1; 0 dims at 3 yet.

## Next action

Iter-805: pick the next engineer batch. Remaining candidates (ordered by A.8 grouping heuristic):

1. **#368/#369/#370/#371 — discoverability batch** (per-viewpoint correctness; needs a research subagent first to settle whether the "Create representation…" submenu on the Package row should auto-spawn the owning Definition (ActionDefinition / StateDefinition / ConstraintDefinition) or prompt the user to pick one — this may resolve via ADR rather than a single batch).
2. **#373 — usage categories `+` button** (palette polish; no ADR; quickest close).
3. **#376 — 4-way Block creation** (cross-cutting design issue; ADR-driven, slowest; aligns with #368-371's "single canonical creation surface" theme — may absorb that batch's design once both are scoped together).

Recommendation: open the design ADR for #368-371 first (the discoverability batch is the largest unblocked p2 cluster; resolving it advances rubric dims 8 / 9 / 11 / 6 / 28 simultaneously), then close #373 in parallel while the ADR is in review.
