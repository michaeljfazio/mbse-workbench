# Walk 18 — Parametric viewpoint validated

**Iteration:** 830 | **Date:** 2026-05-18 | **Walk type:** Deep dive (Parametric)

## Execution

`artifacts/phase-15/walk-18/walk-18-exec.py`. Bootstrap: `Parametrics` package + `ControlSurface` PartDefinition + Parametric diagram.

Dropped 1 Constraint chip + 2 Value chips via `parametric-palette-constraint` / `-value` (note: testid format uses lowercase shorthand, NOT element-kind names — errata for future walks).

**Result:** 1 ConstraintUsage + 2 ValueProperty nodes rendered ✓. Page errors: 0. Console errors: 0. **No workbench issues filed.**

## Probe-side errata

Initial run used `parametric-palette-ConstraintUsage` / `-ValueProperty` testids — these don't exist. The actual testids are lowercase aliases (`-constraint` / `-value`) per `src/workspace/ParametricPalette.tsx:39-41`. **Errata: each viewpoint's palette uses a different testid convention. Don't assume `palette-{kindName}` is universal.**

## Rubric score deltas

| Dim # | Old | New | Rationale |
|-------|-----|-----|-----------|
| 1 | 2 | 2 | Parametric subset (ConstraintUsage rounded rectangle, ValueProperty pill) added to dim 1 cross-coverage. Stays 2 pending Requirement node + Package node visual checks (walk-19). |
| 11 | 2 | 2 | Constraint + Value nodes creatable. Score 3 still needs parameter bindings (edges) + value property bound to parameter. |

## Convergence chain (A.12 #3)

Walk-18 zero issues. **Chain at 5 consecutive zero-issue walks (14, 15, 16, 17, 18) — strongest stretch in Phase 15.**

## Decide next

**Walk-19:** Requirements + Package viewpoints — final visual subset coverage for dim 1. If both render correctly, dim 1 can advance to 3 (cumulative cross-viewpoint evidence).