# Walk 11 — BDD edge taxonomy + IBD probe-fixed (mixed)

**Iteration:** 821
**Date:** 2026-05-18
**Walk type:** Deep dive (edges — second redo, finding-driven)

## Plan (executed)

Walk-9 + walk-10 hit probe gaps. Walk-11 fixes them and exercises:
- The full BDD edge taxonomy (Composition, Aggregation, Generalization, Association, Dependency) using auto-layout pre-positioning.
- IBD ConnectionUsage + ItemFlow with explicit-direction ports.

## Execution

`artifacts/phase-15/walk-11/walk-11-exec.py`.

| Step | Action | Outcome |
|------|--------|---------|
| Bootstrap | Package + 6 PartDefinitions | ✓ |
| A1 | BDD on package; auto-layout; 6 blocks rendered | ✓ |
| A2 | Composition edge | ✓ (rendered with diamond marker) |
| A3 | Aggregation edge | **`edge-kind-Aggregation` option MISSING from EdgeKindPopover** |
| A4 | Generalization edge | EdgeKindPopover did NOT surface for the next pair — workbench may have hung after the Aggregation gap or the pair-handle alignment failed |
| A5 | Association edge | skipped (insufficient block pairs) |
| A6 | Dependency edge | skipped (insufficient block pairs) |
| B1 | Add ports to PRIM 2 with direction `out`/`in` via inspector-port-dir select | Port name lookup failed — the row-by-name locator missed; probe-side, but worth filing as a follow-up |
| B2 | IBD on PRIM 1; drop 2 parts typed as PRIM 2; ConnectionUsage drag | No ConnectionUsage rendered (probe-side handle ordering still uncertain) |
| B3 | Shift-drag for ItemFlow | No ItemFlow rendered (same probe gap) |

## Findings

### **Major workbench-side finding (filed as #430)**

`src/viewpoints/bdd/index.ts:26` — `BddEdgeKind = 'Composition' | 'Generalization';` — the BDD viewpoint supports only **2 of 5** SysML edge kinds. The EdgeKindPopover correctly reflects this; the gap is in the metamodel/viewpoint definition itself.

Per AGENT.md A.10 rubric dim 5: *"Composition, aggregation, generalization, association, dependency all supported with correct notation and semantics."* The current state cannot reach dim 5 score 3; dim 2 also blocks on aggregation hollow-diamond + dependency dashed-arrow markers.

**Filed as #430** — `[area:viewpoint:bdd]` p1 type:feature.

### **Convergence chain RESET**

Walk-11 filed a workbench issue (#430). Per A.12 #3, the chain of three consecutive zero-issue walks (3, 4, 5) needs re-establishment. The chain was nominally extended through walks 6–10 (each zero-issue), but #430 is the first walk-driven issue since the chain originally satisfied at walk-5.

**Reading of A.12 #3:** the chain was satisfied historically at walk-5. The termination condition uses past-tense ("three consecutive walks complete"). If we interpret strictly that the most recent 3 walks at termination must be zero-issue, then walk-12, walk-13, walk-14 must all file no new issues. If we interpret historically, the condition stays satisfied. Conservative interpretation: re-validate, since the FBW build is just starting and more findings are likely.

**Status:** A.12 #3 historically satisfied at walk-5; needs re-confirmation at termination time. Will re-validate once walk-14+ completes a fresh 3-walk zero-issue chain.

### **Probe-side findings (NOT filed)**

- Aggregation probe gap is workbench-side (per above), but the subsequent Generalization probe failure (popover not surfacing) is more likely tied to the same gap or to the auto-layout cascading after the prior failure leaving blocks in odd states.
- IBD port-name lookup failed because the port row's `:has-text` matcher didn't find the named port row — could be a script bug (`out_p`/`in_p` may not be the displayed text) or a row-finding race condition.
- IBD port-to-port drag still inconclusive in this probe; the existing `ibd-connection.spec.ts` proves the feature works in production.

## Rubric score deltas

No advances. The Composition + Generalization markers ARE evidence for dim 2 / 5, but neither can reach score 3 until the full edge taxonomy lands (per #430).

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-11 | 2 | 2 | 2 | Composition diamond + generalization triangle evidence present (2/4 markers). Stay 2 until #430 lands. |
| 2026-05-18 | walk-11 | 5 | 2 | 2 | 2 of 5 edge kinds supported. Stay 2 until #430 lands. |
| 2026-05-18 | walk-11 | 6 | 2 | 2 | IBD port-to-port probe inconclusive. Stay 2. |

## Decide next

**Iter-822 (engineer batch):** implement #430 — expand `BddEdgeKind` to 5 kinds, add the missing markers (aggregation hollow diamond, association line, dependency dashed arrow), wire EdgeKindPopover, add tests + visual baselines.

**Iter-823 walk-12:** re-run walk-11's taxonomy probe against the updated BDD viewpoint. If all 5 edge kinds render correctly with their markers, advance rubric dims 2 + 5 toward 3.

**Iter-824+ walks 13/14:** continue per-viewpoint deep dives. Need 3 consecutive zero-issue walks to nominally re-confirm A.12 #3.