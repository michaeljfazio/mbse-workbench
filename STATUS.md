# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-806 + iter-807: ADR 0014 + implementation landed — Package row "Create representation…" submenu now offers Activity / State Machine / IBD / Parametric with implicit-owner creation. Five issues closed in one batch (#368/#369/#370/#371/#411).**

The four walk-1 discoverability findings (Activity / State Machine / Parametric / IBD not on the Package row menu) shared one design question. ADR 0014 resolved it by adopting the long-standing Cameo / MagicDraw auto-create-the-context pattern for the three diagrams whose owner kind is unambiguous, and prompting once for Parametric (where `PartDefinition` vs `ConstraintDefinition` is semantically loaded enough to warrant the extra click). PR #412 committed the ADR + appended SysML v2 ownership-rule research to `docs/architect/diagram-types/{act,stm,par,ibd}.md`. PR #414 shipped the implementation with 6 new e2e tests, 3 updated unit tests, and 2 updated assertions in `selectionScopedCommands` for the Cmd-K palette path.

Known partial-undo limitation: `createDiagram` mutates Zustand state directly rather than dispatching a bus command, so Cmd-Z reverses only the implicit-owner `create-element` and the diagram outlives the owner as an orphan. Tracked in **#413** (`type:chore`, p3) which proposes promoting diagram lifecycle to the command bus for atomic compound undo.

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | 0 of 28 at 3; 21 at 2 (+1 from dim 28), 3 at 1, 4 at 0 |
| A.12 #2 | Zero open phase:15 issues | 2 open (1 p1, 1 p3) |
| **A.12 #3** | **Three consecutive convergence walks** | **✓ SATISFIED (walks 3, 4, 5)** — needs revalidation if a fresh walk files any new issues |
| A.12 #4 | FBW example shipped + loadable | not started |

## Current iteration
- Iteration #: 807 (close-out)
- Started: 2026-05-17
- Branch: `phase-15/iter-807-closeout`
- Working on: STATUS + rubric for iter-806 + iter-807 engineer batches

## Last test run
- Main green at `4db485d` (PR #414 — discoverability implementation).
- Release cadence (per A.8): 4 of 5 batches merged since `vphase-15.3` — one more meaningful batch and the next `vphase-15.4` tag bundles them.

## Known issues / blockers
- (none)

## Open phase:15 issues at iter-807 close

| Severity | Count | Issues |
|----------|-------|--------|
| p1 | 1 | #376 (4-way Block creation — design) |
| p3 | 1 | #413 (createDiagram should be bus-dispatched for compound undo) |

## Decisions log

Iter-792..iter-805 entries preserved in commit history. Iter-806 + iter-807:

- 2026-05-17 (iter-806): Filed design issue #411 reframing #368/#369/#370/#371 as one design question (implicit-owner creation on the Package row), dispatched a research subagent to populate `docs/architect/diagram-types/{act,stm,par,ibd}.md` with the SysML v2 spec + comparable-tool findings (Cameo / SysON / Eclipse Papyrus), and committed ADR 0014 via PR #412. The ADR adopts Cameo's auto-create-the-context pattern for Activity / State Machine / IBD (unambiguous owner kind) and a one-click popover prompt for Parametric (semantically loaded `PartDefinition` vs `ConstraintDefinition` choice).

- 2026-05-17 (iter-807): Implemented the ADR. Extended `RepresentationOption` with `implicitOwnerKind` (auto-pick) and `implicitOwnerPromptKinds` (popover prompt). Added the four new entries to `PACKAGE_REPRESENTATIONS`. New `CreateParametricOwnerPopover` mirrors `PartUsageTypePopover`'s shape. Threaded click coordinates through `onCreateRepresentation` so the popover can anchor at the cursor. Cmd-K's palette handler also gained the implicit-owner branch (defaults to first prompt kind there, since Cmd-K has no popover affordance). One CI rebake cycle: a webkit-visual baseline (`state-machine-with-transition`) crossed the 0.01 ratio threshold at 13908 px / ratio 0.02 — unrelated to this PR's code; lifted from the trace per the documented procedure. Discovered + filed #413 because `createDiagram` is Zustand-side, not bus-dispatched, so Cmd-Z reverses only the owner half of the compound flow. Closed #368/#369/#370/#371/#411 in one PR. Rubric dim 28 (Help / discoverability) advances **1 → 2**: the four discoverability blockers are gone; full score-3 awaits first-run guidance + Cmd-shortcut surface + "Load example" entry.

## Session checkpoint summary

This session (iter-793 → iter-807) executed 15 iterations spanning bootstrap, 3 architect walks (with 1 buggy probe self-corrected via errata), 9 engineer batches, 3 release tags, 1 ADR. Cumulative delivery:

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 17:02Z | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 07:13Z | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 10:56Z | Palette show-all-kinds + label consistency |

Rubric: 0 → 21 × score-2 + 3 × score-1 + 4 × score-0; 0 dims at 3 yet (dim 28 advanced this iteration).

## Next action

Iter-808: queue is down to two issues — both require non-trivial work:

1. **#376 — 4-way Block creation** (`p1`, `type:design`). The architect's walk-1 finding that "Block creation is exposed via four distinct UI surfaces" needs an ADR (likely 0015) deciding which surfaces stay, which retire, and what the single canonical drag-from-palette contract looks like. Aligned with rubric dim 15 — fully resolving #376 should advance dim 15 from 2 toward 3. Research subagent first (per A.9), then design issue, then ADR, then implementation. Multi-iteration.

2. **#413 — createDiagram bus-dispatched** (`p3`, `type:chore`). Promotes `CreateDiagramCommand` / `DeleteDiagramCommand` to the command bus so the implicit-owner flow gets atomic compound undo, and so future commands (rename diagram, set context, etc.) can also be undoable. Schema-level work that other future PRs would build on. Per A.8 grouping heuristic #1 ("foundational/schema work first"), this could sequence ahead of #376.

If neither is started, the immediate alternative is the **FBW example model build** (A.6 / A.12 #4): the workbench is now feature-complete enough that an architect can probably start authoring real content. The first FBW deep-dive walk would tell whether the missing 4-way-Block-creation rationalisation actually blocks a real architect's flow — if it doesn't, #376 can land later. Recommendation: start the FBW model on the **00 — Context** package (per A.6 skeleton) as the next iteration; the build itself surfaces fresh walk findings that re-validate the convergence chain.
