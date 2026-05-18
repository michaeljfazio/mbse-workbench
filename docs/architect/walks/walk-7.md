# Walk 7 — FBW anchors under ATA 27 + first BDD/IBD opens

**Iteration:** 817
**Date:** 2026-05-18
**Walk type:** Deep dive (continuation of FBW build — anchor PartDefinitions + first viewpoint opens)

## Plan (executed)

Build on walk-6's package skeleton by creating the first concrete PartDefinitions under `27 - Flight Controls`, then open the first BDD and IBD diagrams to validate that the iter-804 in-canvas IBD palette + the ADR 0015 row-menu Create representation… flow hold under real authoring.

### Scope
- Re-create the 8 top-level packages from walk-6 (each Playwright context starts fresh; no sessionStorage seeding per A.3 #1).
- Under `27 - Flight Controls`, create 3 PartDefinitions via row menu `Create child… > Part Definition`: **PRIM 1**, **PRIM 2**, **PRIM 3**.
- Open a BDD on `27 - Flight Controls` via row menu `Create representation… > BDD`. Verify the 3 PRIMs render as blocks.
- Open an IBD on `PRIM 1` via row menu `Create representation… > IBD`. Verify the IBD canvas opens with the iter-804 `ibd-palette` affordance visible.

### Out of scope
- Drag-from-palette (deferred to walk-8 to focus this walk on the row-menu path).
- Port definitions on the PRIMs (walk-8+).
- Connection authoring in the IBD (walk-8+).
- Secondary computers + sub-package (walk-8).

### Rubric dimensions informed
- **5** (BDD): the 3-block render is observed; full score-3 needs edges + compartments + cardinality.
- **6** (IBD): empty IBD canvas opens; palette visible; score-3 needs parts + ports + connections.
- **18** (Project tree): nested element creation via row menus works.

## Snapshot at walk start

- **`pnpm dev` HEAD:** `4056267` (PR #422 — toolbar retire).
- **Open phase:15 issues at start:** 0.
- **Convergence chain:** 4 consecutive zero-issue walks (3, 4, 5, 6); walk-7 attempts to extend to 5.

## Execution

`artifacts/phase-15/walk-7/walk-7-exec.py` (headless-Chromium, `pnpm dev`). Single clean run; no script-side defects (walk-6's selector errata helped).

Sequence:

| Step | Action | Surface | Outcome |
|------|--------|---------|---------|
| 1 | Open localhost:5173 | n/a | initial state captured |
| 2 | Click `+ New Package` × 8 with inline rename | project-tree palette | 8/8 packages created (00 Context, 22 Auto Flight, 27 Flight Controls, 29 Hydraulics, 31 Indicating Recording, 34 Navigation, Behaviour, Requirements) |
| 3 | `27 - Flight Controls` row menu → Create child… > Part Definition × 3 with inline rename | row menu | 3/3 PartDefinitions created (PRIM 1, PRIM 2, PRIM 3) |
| 4 | `27 - Flight Controls` row menu → Create representation… > BDD | row menu | New BDD diagram opens; canvas-toolbar visible |
| 5 | Inspect BDD canvas for child blocks | canvas | **3 of 3 PRIMs render as Blocks** ✓ |
| 6 | `PRIM 1` row menu → Create representation… > IBD | row menu | New IBD diagram opens; canvas-toolbar visible |
| 7 | Inspect IBD canvas for `ibd-palette` | canvas | **`ibd-palette` visible** (iter-804 affordance holds) ✓ |

Page errors: 0. Console errors: 0.

Walk artifact: `artifacts/phase-15/walk-7/walk-7.json`. Screenshots: `artifacts/phase-15/walk-7/screenshots/` (01-initial.png, 02-after-top-packages.png, 03-after-prims.png, 04-bdd-on-27.png, 05-ibd-on-prim1.png).

## Findings (live)

All entries in `walk-7.json` are observations/info — **no acceptance-testable workbench defects**:

1. `info create-child`: created 3 of 3 PRIM PartDefinitions under 27 - Flight Controls.
2. `observation bdd`: BDD on `27 - Flight Controls` renders 3 blocks (expected: 3 PRIMs) — matches.
3. `observation ibd`: IBD palette visible on PRIM 1's IBD canvas (iter-804 affordance holds).

## Issues filed

**None.** Every flow this walk exercised worked first-try.

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-7 | 5 | 2 | 2 | 3-block render observed but no edges/compartments/cardinality. Stay 2. |
| 2026-05-18 | walk-7 | 6 | 2 | 2 | Empty IBD opens with palette. No parts/ports/connections this walk. Stay 2. |
| 2026-05-18 | walk-7 | 18 | 2 | 2 | Nested row-menu Create child… works. Stay 2 (bidirectional sync not yet exercised). |

No advances. Subsequent walks add edges, ports, drag-from-palette, item flows — each pushes more dimensions toward 3.

## Convergence chain (A.12 #3)

Walk-7 filed **zero new issues** and introduced **no rubric degradation**. The chain extends to **5 consecutive zero-issue walks (3, 4, 5, 6, 7).** A.12 #3 stays ✓ SATISFIED.

## Decide next

**Walk-8:** Under PRIM 1, add 3 PortDefinitions via the inspector's `+ Add port` button (sensor-in, command-out, status-out). Open the BDD on 27 - Flight Controls and verify the PRIM 1 block compartments now show ports. Open the IBD on PRIM 1 — drag the Part chip onto the canvas → PartTypePopover → pick PRIM 2 → verify the PartUsage renders with PRIM 1's port handles. Exercises rubric dims 3 (ports), 5 (BDD compartments), 6 (IBD part + ports). Walk-8 also exercises ADR 0015 step 1 drag-from-palette on a non-Package kind for the first time.