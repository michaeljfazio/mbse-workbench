# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-805 engineer batch: #373 closed — usage categories now carry an explanatory "?" hint pointing the architect at the actual creation surface.**

Project-tree palette categories previously fell into two visually identical groups: definitions had a `+` button, usages had nothing. The asymmetry was real (usages live inside a parent diagram / owning element), but it read as a missing feature. The fix renders a small non-interactive `?` in the slot where the `+` would otherwise appear, with a per-kind `title` that points at the actual creation surface ("Created inside an Internal Block Diagram by dragging from the IBD palette onto the canvas", etc.). The `?` is keyed off `USAGE_CREATION_HINTS` in `src/workspace/tree/ProjectTree.tsx` and covers all nine usage kinds the project tree can surface — not only the five categories the original walk-1 finding called out.

No visual baselines drifted across threshold this iteration: the extra `?` glyph adds ≈16 px to the right side of 5 always-visible usage-category headers, well inside the 0.01 ratio budget.

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | 0 of 28 at 3; 20 at 2, 4 at 1, 4 at 0 |
| A.12 #2 | Zero open phase:15 issues | 5 open (1 p1, 4 p2) |
| **A.12 #3** | **Three consecutive convergence walks** | **✓ SATISFIED (walks 3, 4, 5)** |
| A.12 #4 | FBW example shipped + loadable | not started |

## Current iteration
- Iteration #: 805 (close-out)
- Started: 2026-05-17
- Branch: `phase-15/iter-805-closeout`
- Working on: STATUS update for the iter-805 engineer batch

## Last test run
- Main green at `548cbc0` (PR #409 — usage-category `?` hints).
- No new release tag — still only 2 of the 5 batches required since `vphase-15.3` (per A.8 cadence). Next tag bundles the discoverability batch (#368-371) and any sibling polish landed in iter-806+.

## Known issues / blockers
- (none)

## Open phase:15 issues at iter-805 close

| Severity | Count | Issues |
|----------|-------|--------|
| p1 | 1 | #376 (4-way Block creation — design) |
| p2 | 4 | #368/#369/#370/#371 (discoverability — Activity / State Machine / Parametric / IBD not on Package row's "Create representation…" submenu) |

## Decisions log

Iter-792..iter-804 entries preserved in commit history. Iter-805:

- 2026-05-17 (iter-805): Picked #373 ahead of the discoverability batch because it was the only remaining single-PR-with-no-ADR ticket — the discoverability cluster needs a `type:design` issue to settle implicit-owner creation semantics, and #376 is also design-flavoured. Resolution chose option (b) from the issue body's sketch: explanatory tooltip + accessible aria-label, rendered as a "?" indicator in the affordance slot. Options (a) "hide unpopulated usage categories" was rejected — it would worsen discoverability (the architect would not know the category exists). Option (c) "generic context-prompting usage creation flow" was deferred to a future design ADR — it overlaps with #376's "single canonical creation surface" theme. No rubric score change — dim 15 is still 2; full score-3 requires drag-from-palette + viewpoint-applicability grouping + drag-preview, none of which #373 addresses. Issue #373 closed via PR #409. Five phase:15 issues remain (1 p1, 4 p2).

## Session checkpoint summary

This session (iter-793 → iter-805) executed 13 iterations spanning bootstrap, 3 architect walks (with 1 buggy probe self-corrected via errata), 7 engineer batches, 3 release tags. Cumulative delivery:

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 17:02Z | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 07:13Z | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 10:56Z | Palette show-all-kinds + label consistency |

Rubric: 0 → 20 × score-2 + 4 × score-1; 0 dims at 3 yet.

## Next action

Iter-806: open the design ADR for the discoverability batch (#368-371). The four issues all share one design question: when the architect picks "Create representation… > Activity Diagram" (or StateMachine / Parametric / IBD) from a Package's row menu, does the system (a) auto-create the owning Definition under the Package and the diagram under that, (b) prompt for an existing Definition or "create one", or (c) decline and direct the architect to first create the Definition manually?

Workflow per A.9:

1. Dispatch research subagent(s) to populate `docs/architect/diagram-types/{act,stm,par,ibd}.md` with the SysML v2 ownership conventions (which kinds can own which diagrams) and the conventions of comparable tools (Cameo, Capella, MagicDraw, Eclipse Papyrus).
2. Open a `type:design`, `phase:15`, `area:cross-cutting` issue summarising the question + the three options + the research findings.
3. Resolve via ADR — `docs/adr/00NN-package-row-create-representation.md`. The ADR's PR also implements the chosen flow and closes #368/#369/#370/#371 (and #371 already has the IBD inspector entry as a partial workaround — the ADR sets whether to keep that or replace).

If the ADR turns out to be quick (chosen option doesn't fan out), it can land as a single batch closing all four issues + bumping rubric dims 6 / 8 / 9 / 11 / 28 simultaneously. If it fans out (e.g., requires schema changes for implicit owners), the discoverability fix may land first as a temporary "Create representation… > Activity" entry that prompts the user, with the implicit-owner branch following.
