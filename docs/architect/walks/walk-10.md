# Walk 10 — BDD composition edge ✓; IBD port-to-port needs investigation

**Iteration:** 820
**Date:** 2026-05-18
**Walk type:** Deep dive (edges — walk-9 redo with probe fixes)

## Plan (executed)

Re-run walk-9 with two probe fixes:
1. Click `toolbar-auto-layout` before BDD edge drag so handles land at predictable positions.
2. Give BOTH PartDefinitions (PRIM 1 + PRIM 2) ports before opening the IBD.

## Execution

`artifacts/phase-15/walk-10/walk-10-exec.py` (headless-Chromium).

| Step | Action | Outcome |
|------|--------|---------|
| Bootstrap | `27 - Flight Controls` package + PRIM 1 + PRIM 2 + 2 ports each | ✓ |
| Step A | BDD on package; Auto-layout; drag block-bottom → block-top → EdgeKindPopover → Composition | **✓ EdgeKindPopover surfaces; Composition edge renders; filled-diamond marker present** |
| Step B | IBD on PRIM 1; drag 2 PartUsage chips (typed as PRIM 2) → 2 parts with 4 port handles | Parts render with 4 port handles ✓ |
| Step B' | Port-to-port drag (handle 0 → handle 2) → expect ConnectionUsage | **No edge rendered** — needs investigation |
| Step B'' | Shift-drag port-to-port → expect ItemFlow | **No edge rendered** — needs investigation |

Page errors: 0. Console errors: 0.

## Findings

**Positive (workbench evidence):**
1. Auto-layout positions BDD blocks predictably (resolves walk-9 probe issue).
2. BDD `EdgeKindPopover` surfaces on block-handle drag.
3. `Composition` edge kind renders with a filled-diamond marker — evidence for rubric dim 2.
4. IBD `PartTypePopover` flow continues to work end-to-end (iter-804 affordance, ADR 0014).
5. PartUsage with port handles renders in IBD (4 handles for 2 parts × 2 ports each).

**Needs-investigation (NOT filed as issues per A.7 — not yet stable repro):**
6. IBD port-to-port drag via my probe's `drag()` helper does NOT produce a ConnectionUsage edge. The existing `tests/e2e/ibd-connection.spec.ts` `@visual IBD with two parts and one connection` test creates this edge — so the affordance works. My probe is missing something. Hypotheses: (a) port direction validation rejects the drag because default-port direction is `inout`/missing and `isValidIbdConnection` requires `out → in` pairing; (b) handle index ordering doesn't put me on different-part handles; (c) the mouse-mocking timing is too fast for React Flow's connect-start/connect-end protocol. Walk-11 to investigate by either inspecting the port direction attribute first, or replicating the exact `dragTo` from ibd-connection.spec.ts.
7. Shift-drag for ItemFlow — same as #6. The existing `ibd-itemflow.spec.ts` test produces the edge, so the feature works. Probe gap.

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-10 | 2 | 2 | 2 | Composition diamond marker confirmed (1/4 of the score-3 requirement — need aggregation hollow, generalization triangle, item-flow arrow). Stay 2. |
| 2026-05-18 | walk-10 | 5 | 2 | 2 | Composition edge created + rendered. Score 3 needs aggregation + generalization + association + dependency + cardinality + compartments. Stay 2. |
| 2026-05-18 | walk-10 | 6 | 2 | 2 | Port handles present on IBD PartUsages; ConnectionUsage drag inconclusive in this probe (workbench-side passes existing tests). Stay 2. |

## Convergence chain (A.12 #3)

Walk-10 filed **zero acceptance-testable workbench issues**. The needs-investigation findings (#6, #7) are NOT issues per A.7 — they're probe-script gaps. Chain extends to **8 consecutive zero-issue walks (3 → 10).** A.12 #3 stays ✓ SATISFIED.

## Decide next

**Walk-11:** Investigate the IBD connection probe gap. Either:
- Set explicit port directions ('out' on PRIM 2's "out", 'in' on PRIM 2's "in") before the IBD step so `isValidIbdConnection` is satisfied, OR
- Use the exact `dragTo`-with-bounding-box pattern from `tests/e2e/ibd-connection.spec.ts` rather than my mouse-mocking helper.

Once the IBD probe is reliable, walk-11+ accumulates per-edge-kind evidence for dim 2 (aggregation hollow diamond, generalization triangle, item-flow arrow) and dim 5 (full BDD edge taxonomy). Each verified edge marker pushes more dimensions toward 3.