# Walk 20 — Round-trip integrity (dim 14)

**Iteration:** 829
**Date:** 2026-05-18
**Walk type:** Deep dive (single-sequence; deterministic acceptance)

## Plan (executed)

Single sequence: bootstrap a small structured project via UI; export to JSON + SysMLv2 text; in fresh contexts re-import each and re-export JSON; structurally diff. Targets rubric dim 14 (round-trip integrity); the constitution (A.12 #1) requires *both* JSON and SysML legs to be lossless for score 3.

Author-side scope kept minimal but cross-kind: 1 Package + 2 PartDefinition + 1 ActionDefinition + 1 Requirement + 1 BDD representation. Enough to exercise multiple `kind`s through both pipelines without bloating the walk into an FBW build.

## Execution

`artifacts/phase-15/walk-20/walk-20-exec.py` (three Playwright contexts: ctx1 bootstrap+export, ctx2 JSON re-import+re-export, ctx3 SysML re-import+re-export).

| Phase | Action | Outcome |
|-------|--------|---------|
| 1 | Bootstrap + `Export → JSON` | `baseline.json` saved (6 elements, 2 diagrams, kinds: Package×2, PartDefinition×2, ActionDefinition×1, Requirement×1) ✓ |
| 1 | `Export → SysMLv2` | `baseline.sysml` saved (606 bytes) ✓ |
| 2 | Fresh ctx → `Import → JSON` → `Export → JSON` | Structural signature **equal** to baseline (kinds, counts, names, diagrams, edges) ✓ |
| 3 | Fresh ctx → `Import → SysMLv2` → `Export → JSON` | **BLOCKED** by import-error: `Import failed at line 3, column 18: expected '{'` |

Page errors: 0. Console errors: 0.

## Findings — workbench

**One acceptance-testable defect filed: #446 (p1, area:import-export, type:bug).**

The serializer emits the root Package's `name` literally as `package Untitled Project { ... }` — unquoted multi-word identifier. The parser rejects it at the space. Because the default new-project name is *literally* `"Untitled Project"`, **every fresh project hits this on text round-trip**. JSON path is unaffected.

Diagnosis pinned via a focused probe (`artifacts/phase-15/walk-20/sysml-probe.py`):

```
Containment tree rows after SysML import: 1
  row 0: kind=Package text='▾Untitled ProjectPackage⋯'
IMPORT-ERROR-BANNER visible: "Import failed at line 3, column 18: expected '{'"
Console errors: 0
Page errors: 0
```

Two reasonable fixes (#446 body details them): emit OMG SysMLv2-conformant `<...>` quoted-identifier syntax, or sanitize whitespace. Preference: option 1 (standard-conformant).

## Findings — strong positive

**JSON round-trip preserves structural signature exactly** under real UI authoring. This is the canonical persistence pipeline; the JSON path is the one users will hit through the in-app `Save` / `Load example` flows. The score-2-equivalent JSON evidence stands independent of #446.

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-20 | 14 | 0 | 1 | JSON round-trip preserves structural signature exactly (lossless). SysML round-trip BROKEN by #446 for any project with whitespace in `name` — which is the default. Score 1 ("broken; major defects; the dimension blocks normal flow") is the accurate reading: half the dim works, half is fully broken on the default project. Will advance to 3 in a single follow-up walk once #446 lands. |

Other dims touched but not promoted:
- **Dim 22 (Import/Export, currently score 2):** JSON round-trip succeeded; SysML round-trip broken at the import step. No movement until #446.

## Convergence chain (A.12 #3)

Walk-20 filed **one workbench issue (#446)**. The convergence chain at iter-828 was 6 (walks 14-19). **This walk resets the chain to 0.** Re-build requires three consecutive walks with zero findings.

A.12 #2 (zero open phase:15 issues) currently violated by #444 (PR #445 in flight) + this walk's #446 (no PR yet). Both expected to drain naturally: #445 auto-merges on green CI; #446 picks up the next engineer batch.

## Decide next

**Engineer-batch candidate (immediate):** open `phase-15/import-export-quoted-identifiers` and close #446 by implementing OMG SysMLv2 §4.4.1 `<...>` quoted-identifier emission in the serializer and reciprocal parser tolerance. Acceptance: a focused round-trip unit test under `src/sysml/__tests__/` plus a deterministic re-run of `walk-20-exec.py` showing the ctx3 phase succeeds.

**Walk-21 (after #446 lands):** deterministic re-run of this walk's exec script against the patched serializer. If both legs pass and FBW-coverage content (≥30 PartUsages, ≥6 BDDs, ≥30 traceability edges) round-trips losslessly, promote dim 14 directly to 3.

**Walk-22 candidates** (parallel-eligible):
- **Dim 13 (cross-diagram coherence, score 0):** create a PartDefinition in BDD, open its IBD, rename in one viewpoint, verify the rename reflects in the other.
- **Dim 17 (edge editing affordances, score 1):** reconnect / waypoints / routing-style audit.
- **Dim 27 (persistence, score 2):** reload-survives walk with the FBW skeleton.
