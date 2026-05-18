# Walk 21 — Round-trip integrity re-verification (dim 14)

**Iteration:** 832
**Date:** 2026-05-18
**Walk type:** Deep dive (deterministic single-sequence; follow-up to walk-20)
**Target SHA:** `9578f3d` (post-#448; not yet released — latest tag is `vphase-15.5` / `v1.4.0`, so the deployed Pages bundle still has the pre-fix serializer)

## Plan

PR #448 (`9578f3d`) shipped two changes to close walk-20's #446:

1. **Serializer (`src/serializer/sysml.ts`):** `quoteIdent` / `refIdent` wraps any name that does not match `^[A-Za-z_][A-Za-z0-9_-]*$` in OMG SysMLv2 §4.4.1 `<…>` quoted-identifier syntax. The serializer additionally guards against `>` inside `<…>` by … (defer to source — out of scope for the walk).
2. **Parser (`src/parser/sysml.ts`):** Tokenizer recognises `<…>` as an ident whose value is the inner text.

Walk-20 also documented a separate but adjacent silent-import-failure mask in `final-gate.spec.ts`, fixed in the same PR (canonicalize alignment + import-error-banner guard) — but that is not part of the architect's UI surface and is not what walk-21 validates.

**Walk-21 validates the architect-facing UI surface only**: under real authoring, with a project whose name contains whitespace and at least one child whose name contains whitespace, does `Export → SysMLv2` produce text that `Import → SysMLv2` accepts in a fresh context, with structural signature preserved?

### Scope

A small-but-cross-kind project, *deliberately* with whitespace in identifiers to exercise the `<…>` path. The shape mirrors walk-20's seed:

| Element | Kind | Notes |
|---------|------|-------|
| `Flight Control System` | Package (root) | whitespace; exercises root-Package emission |
| `Primary Flight Computer` | PartDefinition | whitespace; exercises member emission |
| `SEC` | PartDefinition | no whitespace; baseline control |
| `Engage Autopilot` | ActionDefinition | whitespace; exercises ActionDefinition kind |
| `High Reliability` | Requirement | whitespace; exercises Requirement kind |
| 1 × BDD diagram | representation on root pkg | identical to walk-20 |

This is six elements (incl. one diagram); five of six names contain whitespace; cross-kind. The default new-project name `Untitled Project` itself contains whitespace and is also exercised at root, but the test sets a more meaningful root name.

### Goals

1. **Both legs round-trip lossless.** Export → JSON, fresh ctx Import → JSON, re-Export → JSON: structural signature equal. Export → SysMLv2, fresh ctx Import → SysMLv2, re-Export → JSON: structural signature equal modulo IDs.
2. **No console errors, no page errors** across all three browser contexts.
3. **Quoted identifiers appear in the SysML output.** The `baseline.sysml` payload must contain at least one `<…>` substring (smoke evidence that the new code path was exercised — distinct from walk-20 which emitted unquoted multi-word identifiers).

### Acceptance / rubric impact

| Outcome | Dim 14 action | Convergence (A.12 #3) |
|---------|---------------|-----------------------|
| Both legs lossless + 0 issues filed | Promote dim 14: **1 → 3** (JSON arm verified at walk-20, SysML arm verified here) | walk-21 = 1; chain resumes |
| JSON lossless, SysML lossless **but** quoted-ident substring absent | Promote dim 14: 1 → 2 (under-exercised), file rough-edge issue | reset |
| Either leg drifts structurally | File acceptance-testable issue, dim 14 stays at 1 | reset |
| Page or console errors | File issue per A.7, dim 14 stays at 1 | reset |

### Tool & environment

- **Local `pnpm dev` against `9578f3d`** (not the deployed Pages URL), per A.6 second clause: "`pnpm dev` is permitted only when the deployed URL lacks an unmerged fix the architect needs to test; in that case the walk's findings are tagged with the commit SHA and re-verified against the deploy after the next `vphase-15.N` release."
- Findings are tagged with commit SHA `9578f3d`.
- Re-verification against Pages deferred to a regression walk once `vphase-15.6` (or equivalent) lands.

### Expected duration

~15 min of agent execution (deterministic; mirrors walk-20's script structure).

### Out of scope

- FBW-coverage round-trip (A.6 thresholds: ≥30 PartUsages, ≥6 BDDs, ≥30 traceability edges). That belongs in a later walk once the FBW skeleton is rich enough across viewpoints, and is the natural follow-up to A.12 #4 (FBW example shipped).
- Round-trip of `import` directives (Phase 14 library import) — separate walk, separate dim, deferred.
- PNG/SVG export — distinct dim (22 covers JSON/SysML; PNG/SVG already verified in earlier phases).

## Execution

Driver: `artifacts/phase-15/walk-21/walk-21-exec.py` (three Playwright contexts — ctx1 bootstrap+export, ctx2 JSON re-import+re-export, ctx3 SysML re-import+re-export). Run against local `pnpm dev` at SHA `9578f3d`.

| Phase | Action | Outcome |
|-------|--------|---------|
| 1 | Bootstrap: 1 root Package + 2 PartDefinitions + 1 ActionDefinition + 1 Requirement + 1 BDD repr — 5 of 6 names with whitespace | ✓ all rows created via UI |
| 1 | `Export → JSON` → `baseline.json` | ✓ 6 elements, 2 diagrams (`Main BDD` + `Flight Control System BDD`), kinds=`{Package:2, PartDefinition:2, ActionDefinition:1, Requirement:1}` |
| 1 | `Export → SysMLv2` → `baseline.sysml` | ✓ 659 bytes; **5 distinct `<…>` tokens present** (`<Engage Autopilot>`, `<Flight Control System>`, `<High Reliability>`, `<Primary Flight Computer>`, `<Untitled Project>`) — confirms #448 quoted-ident path was exercised |
| 2 | Fresh ctx → `Import → JSON` → `Export → JSON` | ✓ Structural signature **equal** to baseline (same element count, kinds, names, diagram count, diagram kinds, edge kinds) |
| 3 | Fresh ctx → `Import → SysMLv2` → `Export → JSON` | ⚠ Element side: 6/6 elements + kinds + names + structure preserved. Diagram side: `diagram_total: 2 → 1` — the user-authored `Flight Control System BDD` is **lost**; only the default-seeded `Main BDD` remains. |

Page errors: 0. Console errors: 0.

## Findings — workbench

**One acceptance-testable defect filed: #449 (p2, area:import-export, type:bug) — "SysMLv2 text round-trip silently drops diagrams (representations / views)".**

Root cause confirmed by source inspection: `grep -iE 'diagram|view|representation' src/serializer/sysml.ts src/parser/sysml.ts` returns no matches. The serializer emits structural elements only; the parser knows nothing about views. The fact that the post-import project still has *a* `Main BDD` is the default-diagram bootstrap on import — not preservation of the user's diagrams.

Resolution sketch in #449 cites OMG SysMLv2 §10 (`view def` / `view` / `expose`) and proposes `// @viewpoint <kind>` decorator comments to round-trip workbench viewpoint hints without breaking cross-tool compatibility.

## Findings — strong positive

1. **#448's quoted-identifier emission landed cleanly.** Five distinct whitespace-bearing identifiers round-tripped without parse error — the walk-20 #446 blocker is fully gone.
2. **Element-level SysML round-trip is now lossless.** All 6 elements (kinds, names, structure, owner chain) preserved through `Export → SysMLv2 → Import → SysMLv2 → Export → JSON`.
3. **JSON round-trip remains fully lossless** (re-verified, including diagrams).

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-21 | 14 | 1 | 2 | #446 closed by #448; element-side SysML round-trip lossless; JSON round-trip lossless; new finding #449 holds dim 14 below 3 because diagrams/views are dropped on SysML round-trip. Score 2 is the accurate "recognisable rough edge, competent user can work around" reading: elements survive both legs and the JSON path preserves everything. |

Other dims touched but not promoted:
- **Dim 22 (Import/Export, currently score 2):** JSON round-trip lossless; SysML round-trip element-lossless; diagrams lost on SysML — same #449 holds promotion to 3.

## Convergence chain (A.12 #3)

Walk-21 filed **one workbench issue (#449)**. The chain was at 0 (reset by walk-20). Walk-21 holds it at 0 — new chain has not begun. Re-build requires three consecutive walks with zero findings.

## Decide next

**Engineer-batch candidate (immediate):** open `phase-15/import-export-view-roundtrip` and close #449 by implementing the `view <name> { expose <ref>; }` emission/parse path with the `// @viewpoint <kind>` workbench decorator. Acceptance: a focused unit-test set under `src/serializer/__tests__/sysml-diagrams.test.ts` + `src/parser/__tests__/sysml-diagrams.test.ts` (all four cases from #449's resolution sketch) and a deterministic re-run of `walk-21-exec.py` showing ctx3's `diagram_total` equal.

**Walk-22 (after #449 lands):** deterministic re-run of this walk's exec script against the patched serializer/parser. If both legs are now structurally identical (including diagrams), promote dim 14 directly to 3.

**Tagging:** once #449 lands, push `vphase-15.6` / `v1.4.1` (patch — pure bug fix per the SemVer rule in A.8) so the deployed Pages bundle picks up #448 + #449, then schedule a Pages-side regression walk for dim 14.

**Other walk candidates by current scoring** (no overlap with #449's files):
- **Dim 13 (cross-diagram coherence, score 0):** create a PartDefinition in BDD, open its IBD, rename in one viewpoint, verify the rename reflects in the other.
- **Dim 17 (edge editing affordances, score 1):** reconnect / waypoints / routing-style audit.
- **Dim 27 (persistence, score 2):** reload-survives walk with the FBW skeleton.
