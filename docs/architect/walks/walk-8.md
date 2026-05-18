# Walk 8 — Ports, drag-from-palette end-to-end, IBD PartUsage with ports

**Iteration:** 818
**Date:** 2026-05-18
**Walk type:** Deep dive (ports + drag-from-palette + IBD parts)

## Plan (executed)

Validate four affordances under real authoring:
1. Inspector `+ Add port` on a `PartDefinition` (rubric dim 3).
2. Drag a project-tree group header onto the BDD canvas to create a `PartDefinition` at the drop site (rubric dim 15 — ADR 0015 step 1 end-to-end).
3. IBD `ibd-palette-PartUsage` chip drag onto the IBD canvas (iter-804 affordance).
4. `PartTypePopover` flow on IBD drop (PartUsage created with its parent's port handles — rubric dim 6).

## Snapshot at walk start

- **HEAD:** main (post walk-7).
- **Open phase:15 issues:** 0.
- **Convergence chain:** 5 walks (3, 4, 5, 6, 7); walk-8 attempts to extend to 6.

## Execution

`artifacts/phase-15/walk-8/walk-8-exec.py` (headless-Chromium, `pnpm dev`). Single clean run.

| Step | Action | Surface | Outcome |
|------|--------|---------|---------|
| A1 | `+ New Package` → "27 - Flight Controls" | palette | ✓ |
| A2 | Row menu → Create child… > PartDefinition × 2 (PRIM 1, PRIM 2) | row menu | ✓ |
| A3 | Select PRIM 1; inspector `+ Add port` × 3 | inspector | 3 PortDefinitions created (default names). No inline-rename auto-fired on `+ Add port`; the architect names them via the tree row's Rename later — non-blocking. |
| B  | Drag `project-tree-group-PartDefinition` → BDD canvas (target 360, 220) | drag-from-palette | **Block count 2 → 3** — ADR 0015 step 1 works for PartDefinition end-to-end ✓ |
| C1 | PRIM 1 row menu → Create representation… > IBD | row menu | New IBD diagram opens; `ibd-palette` visible (iter-804 affordance holds) ✓ |
| C2 | Drag `ibd-palette-PartUsage` chip → IBD canvas (target 400, 220) | iter-804 IBD palette | `PartTypePopover` surfaces ✓ |
| C3 | Click `part-type-option-{prim2}` | popover | **PartUsage rendered** on PRIM 1's IBD typed as PRIM 2 ✓ |

Page errors: 0. Console errors: 0.

Walk artifact: `artifacts/phase-15/walk-8/walk-8.json`. Screenshots: `01-initial.png`, `02-prims.png`, `03-ports-on-prim1.png`, `04-after-drag.png`, `05-ibd-with-part.png`.

## Findings (live)

All observations are positive:
1. `observation ports`: 3 ports created (default names; no inline-rename auto-fire on `+ Add port` — minor UX note, NOT acceptance-testable; the rename via row context menu works). Filed: none.
2. `info ports`: PortDefinition count after Step A: 3 (expected 3).
3. `observation palette-drag`: BDD accepted PartDefinition drag (count 2 → 3).
4. `observation ibd`: PartTypePopover surfaced after Part chip drag.
5. `observation ibd`: PartUsage created on PRIM 1's IBD typed as PRIM 2.

## Issues filed

**None.** Every affordance this walk exercised worked on the first attempt.

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-8 | 3 | 2 | 2 | 3 PortDefinitions rendered as handles on PRIM 1; conjugate-port indication + direction-glyph visibility not yet inspected. Stay 2. |
| 2026-05-18 | walk-8 | 6 | 2 | 2 | PartUsage with port handles rendered on PRIM 1's IBD. But ConnectionUsage / ItemFlow / proxy-vs-full ports not yet exercised. Stay 2. |
| 2026-05-18 | walk-8 | 15 | 2 | 2 | Drag-from-palette end-to-end works on a non-Package kind. But "drag preview during drag" and viewpoint-applicability grouping not yet inspected. Stay 2; conservative. |

No advances. Walk-9 needs to exercise edges (BDD composition, IBD ConnectionUsage, IBD ItemFlow) — those push dims 2 and 6 toward 3.

## Convergence chain (A.12 #3)

Walk-8 filed **zero new issues** and introduced **no rubric degradation**. The chain extends to **6 consecutive zero-issue walks (3, 4, 5, 6, 7, 8).** A.12 #3 stays ✓ SATISFIED.

## Decide next

**Walk-9:** Wire up an IBD ConnectionUsage between PRIM 1's `sensor-in` port and a PRIM 2-instance port. Then promote the connection to an ItemFlow (Shift-drag). Then create a BDD edge (composition) between two PartDefinitions on the BDD canvas. Targets rubric dims 2 (edges & routing), 5 (BDD edges), 6 (IBD ConnectionUsage + ItemFlow).