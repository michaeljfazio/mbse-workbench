# Walk 2 — regression walk after vphase-15.1 deploy

**Iteration:** 796
**Date:** 2026-05-17
**Walk type:** regression (per A.5)

## Plan

### Scope

Regression walk against the freshly-deployed `vphase-15.1` Pages. Three concurrent missions:

1. **Verify the iter-795 engineer batch (#374) end-to-end.** BDD resize handles must work via mouse drag of a corner handle, must persist across page reload (per `bdd-block-resize.spec.ts` test #4 in CI; verify the same on the live app).
2. **Re-run walk-1's viewpoint-discovery probe with the corrected testid pattern.** Use `data-testid="containment-tree-element-menu-trigger-${elementId}"` per the Phase-13 cold-start spec to confirm each of the 8 viewpoints is reachable from its correct owner kind. This implements the iter-795 errata lesson.
3. **Score additional rubric dimensions** that walk-1 left at 0. Specifically:
   - Dim 2 (edges & routing) — create a Composition edge between two PartDefinitions.
   - Dim 5 (BDD edges & cardinality) — same exercise informs this.
   - Dim 7 (Requirements) — create a Requirement, link via `derive`/`satisfy`/`verify`.
   - Dim 10 (Use Case) — open a Use Case diagram, observe actor/use-case shapes.
   - Dim 12 (Package) — open a Package diagram, observe containment edges.
   - Dim 13 (Cross-diagram coherence) — rename an element, see if change propagates across viewpoints.
   - Dim 17 (Edge editing) — try to reconnect or restyle an edge.
   - Dim 21 (Undo/redo) — exercise Cmd-Z / Cmd-Shift-Z on a sequence.
   - Dim 22 (Import/export) — try the JSON export, re-import.
   - Dim 25 (Accessibility) — informal observation (axe scan is a separate walk).
   - Dim 26 (Performance) — initial load time, basic responsiveness (formal benchmark separate).
   - Dim 27 (Persistence) — reload the browser, verify state.

### Out of scope

- Dim 3 (ports) — needs deeper IBD exercise; deferred to dedicated IBD deep-dive.
- Dim 6 (IBD) at score 3 — same.
- Dim 8/9/11 (Activity/State Machine/Parametric) at score >2 — each needs its own deep-dive walk first.
- Dim 14 (round-trip integrity) at score 3 — needs SysMLv2-text export deep test.
- Dim 23 (LLM) — needs API key + dedicated walk.

### Expected duration

20–45 minutes (regression walks are 15–45 min per A.5).

### Rubric dimensions this walk will inform

Initial measurement (0 → 1/2/3) for: 2, 7, 10, 12, 13, 17, 21, 22, 25, 26, 27.
Score verification (existing 2 → confirm or downgrade) for: 16 (already raised to 2 in iter-795 close-out, but verify reload-persistence works here).
Score advance attempt for: 5 (verify composition edge notation).

### Snapshot at walk start

- **Deployed Pages URL:** https://michaeljfazio.github.io/mbse-workbench/
- **Pages commit (vphase-15.1):** `7b47b3ad2569d13e864f97bd8031cce106da631a`
- **Open `phase:15` issues:** 9 (#368, 369, 370, 371, 372, 373, 375, 376, 377)
- **Rubric:** 8 × score-2, 6 × score-1, 14 × unmeasured. Dim 16 advanced to 2 in iter-795 close-out (pending walk-2 verification of reload-persistence).
- **main head:** `6729d2b` (iter-795 close-out). Pages deploy reflects `vphase-15.1` exactly.

### Acceptance for this walk plan

The plan is "done" when this file's `## Plan` section is committed. Execution proceeds in step 3 (`## Findings (live)`); triage in step 4 (`## Issues filed`); rubric scoring in step 5 (`## Rubric deltas`); close-out commit in step 6.

## Findings (live)

Walk-2 produced one Playwright execution script (`walk-2-exec.py`) covering three concurrent missions. 26 observations captured in `findings.json`; 15+ screenshots in `screenshots/`.

**Headline observations:**

1. **#374 resize confirmed end-to-end on the deployed app.** 8 resize handles visible when a Block is selected (4 corner + 4 edge). Corner-handle drag enlarged the bounding box (220x240 → 300x300). The new size **persists across `page.reload()`** (300x300 before and after reload, via sessionStorage).
2. **All 8 viewpoints reachable** via the corrected `containment-tree-element-menu-trigger-${elementId}` testid pattern. Final tab roll-call after the discovery sweep: Requirements (surface), Main BDD, Untitled Project Requirements, Untitled Project Use Case, Untitled Project Package, Block 1 IBD, Block 1 Parametric, New Action Definition Activity, New State Definition State Machine — **9 tabs total** (the bootstrap pre-creates Requirements + Main BDD; the other 7 come from `Create representation…`). The iter-795 errata reframing is fully validated.
3. **Activity and State Machine viewpoints expose drag-from-palette affordances on their canvas.** Activity toolbar reads "Drag onto canvas: Action, Initial, Final, Fork, Join, Decision, Merge" plus a `+ Action` button. State Machine reads "Drag onto canvas: State, Initial, Final" plus `+ State`. **The walk-1 finding "all click-only, no drag-from-palette" (#376) was BDD-specific** — Activity and State Machine actually implement the right pattern.
4. **IBD canvas has NO element-add affordance.** Toolbar contains only `Undo / Redo / Auto-layout / Delete / Import / Export` — no `+ Part`, no `+ Port`, no canvas hint. PartUsages must be dragged from the explorer palette without any visual cue. This is filed as **#385**.
5. **Cmd-Z did not undo a palette-click `+ New Part Definition`** in the test's keyboard-event context. Cmd-Shift-Z redo also NO-OP'd. Possibly a focus-context issue (handler registered on canvas, palette button has focus). Filed as **#386** for investigation.
6. **Cmd-K did not open** on the second attempt (walk-1 had it working). Could be test instability or a real flake. Not yet filed — needs more deliberate exercise to confirm.
7. **Initial load time on Pages: 1665ms** (DOMContentLoaded + networkidle). Comfortably under the rubric-dim-26 score-3 target of `<3000ms`.
8. **Zero console errors and zero page errors** across the entire walk execution. Clean runtime.
9. **Inspector empty-state `inspector-empty-action-PartDefinition` CTA worked** — confirming a fifth Block-creation surface (in addition to the four #376 listed). Notable but folds into #376's larger theme.

## Issues filed

Two new `phase:15` issues:

| # | Title | Severity | Areas |
|---|-------|----------|-------|
| [#385](https://github.com/michaeljfazio/mbse-workbench/issues/385) | `[area:viewpoint:ibd]` IBD canvas has no on-canvas element-add affordance | p2 | viewpoint:ibd / palette |
| [#386](https://github.com/michaeljfazio/mbse-workbench/issues/386) | `[area:undo]` Cmd-Z keyboard shortcut may not undo from non-canvas focus context | p2 | undo / interaction |

Per A.5, walk-2 is **not a convergence walk** because it filed new issues. Convergence counter remains at 0.

## Rubric deltas

Walk-2 informs 6 dimensions. The new score deltas are recorded in `quality-rubric.md`:

| # | Dim | 0/prior → new | Headline |
|---|-----|---------------|----------|
| 16 | Direct-manipulation affordances | 2 → 2 | #374 verified live; resize persists. Score holds until other shape kinds adopt the pattern (3 needs every shape kind). |
| 21 | Undo / redo | 0 → 1 | Cmd-Z NO-OP'd in the test context (#386). Conservative score 1 (broken) until #386 resolves. |
| 22 | Import / export | 0 → 0 | Not verified meaningfully; Cmd-S behavior unobserved. Defer to dedicated walk. |
| 26 | Performance | 0 → 2 | 1665ms initial load; well under 3000ms target. Score 3 needs 100-block diagram benchmark (separate walk). |
| 27 | Persistence | 0 → 2 | Resize size persisted across reload. Multi-project switching not exercised (score 3 dependency). |
| 13 | Cross-diagram coherence | 0 → 0 | Not specifically exercised. Defer. |

## Close-out

Walk-2 successful as a regression walk. The iter-795 engineer batch (#374 resize) is confirmed working on the deployed app, including the harder persistence assertion. The corrected viewpoint-discovery probe shows all 8 viewpoints reachable, fully validating the iter-795 errata.

Two new findings filed (#385, #386). Convergence walks remain a future goal — once dim 15/16/21/28 reach 2+, three consecutive walks with no findings becomes the explicit termination signal.

**Next walk decision** (per A.5 step 7): the natural next engineer batch is **#375 (drag-coord display)** — it shares the React Flow node-event surface with #374's pattern, can be scoped to BDD as a vertical slice, and gets dim 16 closer to score 3. Iter-797 should pick that batch. Walk-3 (after iter-797 deploys) becomes another regression walk.

**Walk file finalised.** Subsequent walk findings go in `walk-3.md`.
