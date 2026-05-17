# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

Iter-797 closed. Second Phase-15 engineer batch shipped: BDD
drag-coord overlay (closes #375). Pattern mirrors iter-795 #374
(BDD vertical slice; new viewpoint-agnostic component
`DragCoordOverlay` + `dragCoord.ts` helper). Pre-PR review
caught three minor issues (ARIA conflict, missing mid-drag axe,
lint warning) — all addressed before merge. CI required two
fixup cycles (type error `NodeDragHandler` vs `OnNodeDrag` not
caught by local `tsc --noEmit`; visual baseline rebaseline from
CI artifact per JOURNAL iter-786 playbook).

No release tag this iteration — only 3 batches merged since
`vphase-15.1` (#388, #389, and this close-out); A.8 requires ≥5.
Next release tag (`vphase-15.2`) will fire when threshold met.

Rubric unchanged: dim 16 stays at 2. Score 3 needs every-shape-
kind resize + snap-to-grid + alignment guides + rubber-band
multi-select + keyboard nudge (5 outstanding sub-requirements).

## Current iteration
- Iteration #: 797 (close-out)
- Started: 2026-05-17
- Branch: `chore/iter-797-closeout`
- Working on: this close-out PR

## Last test run
- Main green at `529e98e` (#389 merge).
- Close-out PR: doc-only, `pnpm run check` expected to pass.

## Known issues / blockers
- (none)

## Open phase:15 issues — distribution at iter-797 close

| Severity | Count | Issues |
|----------|-------|--------|
| p1 | 1 | #376 (4-way Block creation — design) |
| p2 | 7 | #368/#369/#370/#371 (discoverability), #372 (palette dynamic growth), #385 (IBD canvas), #386 (Cmd-Z focus) |
| p3 | 2 | #373 (usage no `+`), #377 (palette labels) |

10 open `phase:15` issues. Closed in iter-797: #375 (drag-coord).

## Decisions log

Carrying forward iter-792..iter-796 (preserved in commit history).
Iter-797 entries:

- 2026-05-17 (iter-797 a): Engineer batch on #375. BDD vertical slice
  mirroring #374's pattern. Pre-PR review caught 3 minor issues —
  ARIA conflict (`role="status"` + `aria-live="off"` → `aria-hidden`),
  missing mid-drag axe scan, and a `react-refresh/only-export-
  components` warning resolved by moving `formatDragCoord` to a
  `.ts` sibling.
- 2026-05-17 (iter-797 b): CI failure on first push — `NodeDragHandler`
  not exported from `@xyflow/react` (caught by `tsc -b` but not local
  `tsc --noEmit`; the implementer's working tree had `OnNodeDrag`
  uncommitted). Fixed via 3 in-place substitutions.
- 2026-05-17 (iter-797 c): CI failure on second push — 2 visual
  baselines diffed at 0.02 ratio (macOS-vs-Linux font rendering).
  Lifted from CI artifact per JOURNAL iter-786 playbook.

## Next action

Iter-798: pick the next engineer batch. Candidates ranked:
1. **#386 — Cmd-Z focus-context investigation** (small, focused;
   likely a one-line listener-promotion to document level).
2. **#368/#369/#370/#371 — discoverability batch** (surface
   IBD/Activity/State Machine/Parametric on the Package row's
   submenu — moderate; may need ADR for implicit owner creation).
3. **#385 — IBD canvas element-add affordance** (medium; needs
   palette wiring on IBD canvas mirroring the Activity/State
   Machine pattern).
4. **#376 — 4-way Block creation** (design issue requiring ADR;
   slow but right; defers further engineering until decided).

Default: iter-798 picks **#386** for a quick win, then iter-799 is a
walk-3 regression walk over the cumulative changes since walk-2.
