# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

Iter-795 closed. The first Phase-15 engineer batch shipped: BDD
`NodeResizer` vertical slice (closes #374). Tagged `v1.1.0` (minor
SemVer; first outward-facing feature since v1.0.0) and `vphase-15.1`
(Phase-15 release marker). Both release workflows succeeded and
deployed to Pages at https://michaeljfazio.github.io/mbse-workbench/.
Smoke probe confirms 8 resize handles (4 corner + 4 edge) on a
selected BDD block.

Rubric advanced this iteration: dim 16 (Direct-manipulation
affordances) from 1 → 2. Remaining at score 1: dims 15 (Palette &
creation), 28 (Help / discoverability). Eight dimensions at score 2;
fourteen still unmeasured.

## Current iteration
- Iteration #: 795 (close-out)
- Started: 2026-05-17
- Branch: `chore/iter-795-closeout`
- Working on: this close-out PR

## Last test run
- Main green at `7b47b3a` (#382 BDD resize merge).
- Release workflow `vphase-15.1` (run 25967763436): SUCCESS.
- Release workflow `v1.1.0` (run 25967763482): SUCCESS.
- Pages reachability: HTTP 200, last-modified 2026-05-16T17:01:59Z.
- Smoke probe: 8 resize handles visible on a selected BDD block.

## Known issues / blockers
- (none)

## Open phase:15 issues — distribution at iter-795 close

| Severity | Count | Issues |
|----------|-------|--------|
| p1 | 2 | #375 (drag-coord display), #376 (4-way Block creation — design) |
| p2 | 5 | #368 / #369 / #370 / #371 (discoverability), #372 (palette dynamic growth) |
| p3 | 2 | #373 (usage no `+`), #377 (palette labels) |

Nine open `phase:15` issues. Closed this iteration: #364 (bootstrap),
#366 (JOURNAL append), #378 (walk-1 close-out), #374 (resize), #380
(errata).

## Decisions log

Carrying forward iter-792..iter-794 entries (preserved in commit
history). Iter-795 entries:

- 2026-05-17 (iter-795 a): walk-1 self-correction. Three p0 reframed to p2 after Explore subagent surfaced the `containment-tree-element-menu-trigger-${elementId}` testid pattern and the buggy `open_row_menu_for` ancestor check in the original walk-1 script. Rubric dims 6/8/9/11 raised 1 → 2.
- 2026-05-17 (iter-795 b): Pivoted engineer batch from missing-viewpoint to interaction. Closed #374 via BDD-only vertical slice (`NodeResizer` + `setNodeSize` store action + `width?/height?` on `NodePosition`). Other viewpoints adopt the same pattern in follow-up PRs.
- 2026-05-17 (iter-795 c): Three CI visual baselines lifted from the failed-run artifact per JOURNAL iter-786's playbook. Two were macOS-vs-Linux subpixel font diffs on the new baseline; one was the pre-existing `bdd-two-blocks-linked` baseline reflecting a deselected end-state-of-drag-edge change introduced by NodeResizer DOM presence. Functional assertions in `bdd-canvas.spec.ts:189` still pass.
- 2026-05-17 (iter-795 d): Tagged `v1.1.0` (SemVer minor; outward-facing resize feature shipped) and `vphase-15.1` (Phase-15 release N=1; conditions per A.8 met — rubric advanced + 6 batches since vphase-14).

## Next action

Iter-796: **walk-2 — regression walk on the vphase-15.1 deploy**, focused on:
1. Verifying BDD resize works end-to-end on the live Pages (smoke already passed; walk does a fuller exercise including persistence across reload).
2. Re-running the corrected discoverability probe to verify viewpoint reachability per `representationAcceptance.ts`'s map, exercising one diagram per viewpoint (BDD, IBD, Requirements, Activity, State Machine, Use Case, Parametric, Package).
3. Filing additional rubric-advancing findings (likely on dim 2 edges, dim 3 ports, dim 5 BDD edges, dim 17 edge editing).

After the walk: pick the next engineer batch — strong candidates are #375 (drag-coord display, shares React Flow node-event surface with #374's pattern) or #368/#369/#370/#371 as a "discoverability" batch (surface IBD/Activity/State Machine/Parametric on the Package row menu with implicit owner creation).
