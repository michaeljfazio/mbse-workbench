# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-808 + iter-809 closed two foundational items in parallel: #413 (createDiagram bus-dispatched) and ADR 0015 (canonical creation affordance for #376).** Both PRs ran simultaneously on different files; auto-merge sequenced them cleanly via the BEHIND-then-update-branch dance.

PR #417 (#413) promoted `CreateDiagramCommand` / `DeleteDiagramCommand` to the command bus, introduced a `DiagramStore` port mirroring the existing `DiagramPositionStore` abstraction, refactored `useWorkspaceStore.createDiagram` / `deleteDiagram` to dispatch via the bus, and wired a new `createRepresentationWithImplicitOwner` store action that wraps owner-create + diagram-create in a single compound command. The compound atomic undo proof landed as a new e2e test under `tests/e2e/package-row-implicit-owner.spec.ts` — Cmd-Z now reverses BOTH the implicit owner and the new diagram (the ADR 0014 commitment that iter-807 deferred to this PR).

PR #416 (ADR 0015) ran in parallel — research-only doc PR that maps the four current Block-creation surfaces (palette `+`, empty-state card, diagram-toolbar `+ Block`, inspector `+ New Block`), researches the SysML v2 / Cameo / SysON / Capella / Papyrus conventions, and lands ADR 0015 prescribing a 4-step migration to drag-from-palette canonical with the other three as redundant click-shortcuts dispatching the same `CreateElementCommand`.

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | 0 of 28 at 3; 21 at 2, 3 at 1, 4 at 0 |
| A.12 #2 | Zero open phase:15 issues | 1 open (1 p1 type:design — #376, awaiting the 4-PR ADR 0015 implementation) |
| **A.12 #3** | **Three consecutive convergence walks** | **✓ SATISFIED (walks 3, 4, 5)** — chain will need re-validation after the first new walk |
| A.12 #4 | FBW example shipped + loadable | not started (walk-6 plan drafted, queued for post-`vphase-15.4`) |

## Current iteration
- Iteration #: 808 + 809 (close-out, rolling)
- Started: 2026-05-17
- Branch: `phase-15/iter-808-809-closeout`
- Working on: STATUS for the two parallel iterations

## Last test run
- Main green at `49e3b6e` (PR #417 — bus-dispatched diagrams).
- Release cadence (per A.8): **5 of 5 batches merged since `vphase-15.3`** — `#385 IBD palette`, `#373 usage hints`, `#368-371 implicit owner`, `#413 bus diagrams`, `ADR 0015`. The cadence rule fires on rubric advance + 5 merges; dim 28 advanced in iter-807, so the next iteration tags `vphase-15.4`.

## Known issues / blockers
- (none)

## Open phase:15 issues at iter-809 close

| Severity | Count | Issues |
|----------|-------|--------|
| p1 | 1 | #376 (4-way Block creation — ADR 0015 sets the resolution; 4 implementation PRs follow) |

## Decisions log

Iter-792..iter-807 entries preserved in commit history. Iter-808 + iter-809:

- 2026-05-17 (iter-808): Dispatched a parallel subagent for #413 implementation while iter-807 close-out CI ran. The subagent extended `Command` with `CreateDiagramCommand` / `DeleteDiagramCommand`, ported a clean `DiagramStore` abstraction (mirroring the existing `DiagramPositionStore` boundary), bus-dispatched `createDiagram` / `deleteDiagram` from the store, and refactored the ADR-0014 implicit-owner flow to use a single compound command. The proof test (Cmd-Z atomically reverses both creates) landed and passed locally + on CI. `renameDiagram` deliberately deferred — not in #413's scope; a one-line code comment notes the gap. Closes #413 via PR #417.

- 2026-05-17 (iter-809): Parallel research + ADR subagent on #376. The four creation surfaces confirmed at the cited line numbers (palette `ProjectTree.tsx:418-432`, empty-state `EmptyState.tsx:109-115`, toolbar `CanvasPane.tsx:1282-1290`, inspector `Inspector.tsx:194-212`). ADR 0015 records the canonical decision (drag-from-palette is primary; the other three become click-shortcuts dispatching the same `CreateElementCommand`) plus the 4-step migration sequence. Vendor citations: SysON user manual, Cameo MagicDraw 2024x, Capella, Eclipse Papyrus — all four major SysML/UML tools converge on drag-from-palette as primary creation gesture. Lands via PR #416. #376 stays open until the 4 implementation PRs (step 1 → step 4) all merge.

- **Parallel-subagent coordination lesson:** the two subagents shared this checkout. The #376 subagent observed "its checkouts repeatedly switched my local HEAD between bash calls" but recovered by stashing the #413 stray work (`stray-from-issue-413-branch`) when its `git checkout -b` would have carried foreign content. Both PRs landed cleanly without merge conflicts. **For future parallel dispatches with overlapping files, prefer `isolation: "worktree"`** so each subagent gets its own git worktree and they cannot trip over each other's HEAD.

## Session checkpoint summary

This session (iter-793 → iter-809) executed 17 iterations spanning bootstrap, 3 architect walks (with 1 buggy probe self-corrected via errata), 11 engineer batches (10 feature/bugfix + 1 design), 3 release tags, 2 ADRs. Cumulative delivery:

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 17:02Z | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 07:13Z | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 10:56Z | Palette show-all-kinds + label consistency |

Rubric: 0 → 21 × score-2 + 3 × score-1 + 4 × score-0; 0 dims at 3 yet (dim 28 advanced 1 → 2 in iter-807).

## Next action

**Iter-810 (engineer batch):** implement ADR 0015 step 1 — make every palette item `draggable` with a unified `onDragStart` that sets `PROJECT_TREE_DRAG_TYPE` to the element kind. The existing ContainmentTree drop handler at `CanvasPane.tsx` already accepts the kind via `PROJECT_TREE_DRAG_TYPE` for several viewpoints, so step 1 is largely additive — augment the click-creates-at-root `+` button with drag-creates-at-cursor without removing the click. Foundational, low-risk; sets up steps 2–4. Closes nothing on its own (#376 stays open until step 4).

**Iter-811 (release):** tag `vphase-15.4` once iter-810 lands. Five batches merged + rubric advance + step 1 of #376 = the cadence trigger.

**Iter-812 (architect walk):** walk-6 against the new `vphase-15.4` deploy — kick off the FBW example model build per A.6 (plan already drafted at `/tmp/walk-6-plan.md`, to be re-added to the repo under `docs/architect/walks/walk-6.md` as part of iter-812). This walk also re-validates the convergence chain (A.12 #3) — any new finding resets it.
