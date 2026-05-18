# Walk 17 — Use Case viewpoint validated

**Iteration:** 829
**Date:** 2026-05-18
**Walk type:** Deep dive (Use Case)

## Plan / Execution

Drop 2 Actors + 2 UseCases via UseCasePalette chips. Draw an edge between two use cases (expecting include/extend/generalization edge-kind popover).

| Step | Outcome |
|------|---------|
| Bootstrap UC diagram on a Package | ✓ |
| 2 Actor + 2 UseCase chips dropped | **All 4 rendered ✓** |
| Edge drag between use cases | **`use-case-edge-kind-popover` surfaced ✓** — confirms include/extend/generalization kind selection is wired |

Page errors: 0. Console errors: 0. **No workbench issues filed.**

## Rubric score deltas

| Dim # | Old | New | Rationale |
|-------|-----|-----|-----------|
| 1 | 2 | 2 | UC subset (Actor stick figures, UseCase ellipses) verified — cumulating with BDD / Activity / SM subsets. Stays 2 pending full cross-coverage. |
| 10 | 2 | 2 | Actor + UseCase render + edge-kind popover surfaces. Score 3 still needs include/extend/generalization edge rendering verified visually + actor-to-actor generalization + system boundary rectangle. |

## Convergence chain (A.12 #3)

Walk-17 zero issues. Chain extends to **4 consecutive** (walks 14, 15, 16, 17).

## Decide next

**Walk-18:** Parametric viewpoint. Drop ConstraintUsage + ValueProperty chips; verify binding capability. Targets dim 11.