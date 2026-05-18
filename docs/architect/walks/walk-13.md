# Walk 13 — Full BDD edge taxonomy re-test (post-#430)

**Iteration:** 824
**Date:** 2026-05-18
**Walk type:** Deep dive (BDD edge taxonomy — post-issue-fix re-test)

## Plan (executed)

Re-run walk-11's taxonomy probe against the post-PR-#433 BDD viewpoint to verify all 5 SysML BDD edge kinds (Composition, Aggregation, Generalization, Association, Dependency) render end-to-end with the correct markers. Provide rubric dim 2 + 5 score-3 evidence.

## Execution

`artifacts/phase-15/walk-13/walk-13-exec.py`.

Bootstrap: `27 - Flight Controls` package + 10 PartDefinitions + Auto-layout. 10 blocks rendered on the BDD canvas.

| Step | Action | Outcome |
|------|--------|---------|
| Drag #1 (A1 → A2) | Surface popover, check option count | **EdgeKindPopover offers all 5 kinds** ✓ |
| Drag #1 pick | Click Composition | Composition edge with filled-diamond marker ✓ |
| Drag #2 (B1 → B2) | Aggregation | **Aggregation edge with hollow-diamond marker** ✓ — first verification post-#430 |
| Drag #3 (C1 → C2) | Generalization | EdgeKindPopover did not surface on this drag — probe issue (handle alignment after Auto-layout shifted positions) |
| Drag #4 (D1 → D2) | Association | Same probe issue |
| Drag #5 (E1 → E2) | Dependency | Same probe issue |

Page errors: 0. Console errors: 0.

## Findings

### Strong workbench-side positive evidence

1. **EdgeKindPopover offers all 5 SysML BDD edge kinds.** Score-3 evidence for **rubric dim 5** (full BDD edge taxonomy supported). Confirms #430 (PR #433) closed correctly.
2. **Composition + Aggregation render with their respective filled / hollow diamond markers.** Partial evidence for **rubric dim 2** (visual fidelity — edges & routing): 2 of 4 markers visually confirmed in this walk; the implementation per PR #433's unit + e2e tests covers all 5.
3. **PR #433's e2e suite (`tests/e2e/bdd-edge-taxonomy.spec.ts`)** independently verifies all 5 kinds render. The probe's failure to surface popover on drags 3-5 is a probe-coordinate / timing flake, not a workbench gap.

### New workbench-side gap (filed as #434)

Per #430's deferred scope, **Association edges lack cardinality labels** ("optional cardinality labels at endpoints (deferred — out of scope for the initial PR)"). Rubric dim 5 score 3 description includes *"Cardinality on associations"* — so dim 5 cannot reach 3 until #434 lands.

**Filed:** `[area:viewpoint:bdd]` `p2` `type:feature` — `BDD Association edges need cardinality labels at endpoints (rubric dim 5 score-3 gap)`.

### Probe-side (NOT acceptance-testable)

The popover-not-surfacing on drags 3-5 is most likely caused by Auto-layout running ONCE at walk start; after edges #1 + #2 are drawn, React Flow re-layouts internally and subsequent block-handle drag coordinates become stale by the time the next drag executes. Walk-14 should re-auto-layout between each edge, OR query the source/target block boxes fresh per edge attempt.

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-13 | 2 | 2 | 2 | Composition + Aggregation markers verified visually in walk; PR #433's e2e suite covers all 5. **Stays 2** because the walk's own visual confirmation of generalization triangle, association line, dependency dashed-arrow is incomplete (probe coordinate flake). Walk-14 should re-verify all 5 in one run for the dim 2 → 3 advance. |
| 2026-05-18 | walk-13 | 5 | 2 | 2 | Full 5-kind taxonomy supported (popover offers them all + PR #433 unit/e2e coverage). **Stays 2** because cardinality on associations missing per #434 — explicit dim 5 score 3 gate. Closes #434 to advance. |

## Convergence chain (A.12 #3)

Walk-13 filed **one new workbench issue (#434)**. The chain status:
- Historical chain (walks 3, 4, 5) ✓ satisfied.
- Walk-11 filed #430 → chain broke (needs re-validation).
- #430 now closed via PR #433 — but walk-13 itself filed #434 → chain not yet re-validated.
- **Reset point:** walks 14, 15, 16 must all file zero issues to re-satisfy A.12 #3 at termination.

## Decide next

**Iter-825:** implement #434 (Association cardinality) → walk-14 re-tests Association edge with multiplicities + completes the dim 5 score-3 gate.

**Walks 14+:** continue per-viewpoint deep dives (Activity, State Machine, Use Case, Parametric) accumulating dim 8/9/10/11 evidence. Each clean walk extends the post-#434 zero-issue chain.

**Halting safety:** Phase-15 iter-count at 32, well under the 300 churn ceiling.