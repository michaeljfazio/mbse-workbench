# Walk 22 — Round-trip integrity regression (dim 14, post-#451)

**Iteration:** 834
**Date:** 2026-05-18
**Walk type:** Regression (deterministic re-run of walk-21 against the patched serializer/parser)
**Target SHA:** `d99d298` (post-#451 squash on main; not yet released — latest tag is `vphase-15.5` / `v1.4.0`, so the deployed Pages bundle still has the pre-fix serializer/parser; `vphase-15.6` / `v1.4.1` will tag once dim 14 lands)

## Plan

PR #451 (`d99d298`) implemented the iter-832 walk-21 resolution sketch for #449:

1. **Serializer (`src/serializer/sysml.ts`):** emits one `view <name> { expose <ownerPath>; }` block per `Diagram` whose context element is reachable, preceded by a `// @viewpoint <bdd|ibd|req|act|stm|uc|par|pkg>` workbench decorator and trailed by `// id: <diagramId>` for round-trip ID stability.
2. **Parser (`src/parser/sysml.ts`):** tolerates `view <name> { expose <ref>; }` blocks and recovers them onto a new optional `ParsedProject.diagrams: Diagram[]` field. Missing `@viewpoint` defaults to `bdd`. Orphaned context names raise structured `ParseError`s.
3. **Store import path (`src/state/store.ts`):** no longer silently seeds a default `Main BDD` when imported SysML already carries view blocks — fixes the iter-832 "extra Main BDD" symptom.

Walk-22 is the architect-side regression that promotes rubric dim 14 from 2 to 3 if and only if the four pass criteria below all hold under real authoring through the production UI.

### Scope

The same fixture as walk-21 (deterministic re-run is the entire point of a regression walk):

| Element | Kind | Notes |
|---------|------|-------|
| `Flight Control System` | Package (root) | whitespace; exercises root-Package emission |
| `Primary Flight Computer` | PartDefinition | whitespace |
| `SEC` | PartDefinition | no whitespace; control |
| `Engage Autopilot` | ActionDefinition | whitespace |
| `High Reliability` | Requirement | whitespace |
| 1 × BDD diagram | representation on root pkg | the diagram preserved on round-trip is the new behaviour |

### Goals

1. **JSON round-trip lossless** (already gold per walk-21 — verify no regression).
2. **SysML round-trip lossless** *including diagrams*: post-import workspace must have `diagram_total` equal to baseline, with the same diagram kinds (one `bdd`) and same diagram names (`Flight Control System BDD` plus whatever the default seed contributes — see #451 acceptance: the default `Main BDD` seed is suppressed when the imported SysML already carries view blocks).
3. **`baseline.sysml` contains the new view-block emission**: at least one `// @viewpoint bdd` decorator line and one `view <…>` (or `view bareIdent`) opening line, plus an `expose` line referencing the root package's qualified path.
4. **No console errors, no page errors** across all three browser contexts.

### Acceptance / rubric impact (A.10 four-pass-criteria)

The four pass-criteria from STATUS.md iter-833 Next Action, restated for evidence-binding:

| # | Criterion | Walk-22 check |
|---|-----------|---------------|
| 1 | JSON round-trip structural signature equal | `diff_signatures(baseline_sig, after_json_sig)` returns `[]` |
| 2 | SysML round-trip structural signature equal **including** `diagram_total`, diagram names, viewpoint kinds | `diff_signatures(baseline_sig, after_sysml_sig)` returns `[]` |
| 3 | `baseline.sysml` carries the new viewpoint-decorated view block | `re.search(r'^// @viewpoint bdd', baseline_text, re.M)` + `re.search(r'^\s*view\b.*\{', baseline_text, re.M)` |
| 4 | No extra default-seeded `Main BDD` post-import | `after_sysml_sig.diagram_kinds.bdd == baseline_sig.diagram_kinds.bdd` and `after_sysml_sig.diagram_total == baseline_sig.diagram_total` |

| Outcome | Dim 14 action | Convergence (A.12 #3) |
|---------|---------------|-----------------------|
| All 4 criteria pass + 0 issues filed | Promote dim 14: **2 → 3** | walk-22 = chain[1]; restart at this walk |
| Criterion fails | File acceptance-testable issue; dim 14 stays at 2 | chain stays at 0 |
| Page or console errors | File issue per A.7; dim 14 stays at 2 | chain stays at 0 |

### Tool & environment

- **Local `pnpm dev` against `d99d298`** (not Pages), per A.6 second clause: `pnpm dev` is permitted only when the deployed URL lacks an unmerged fix; `vphase-15.6` / `v1.4.1` has not been tagged yet so the deployed Pages bundle still has the pre-#451 serializer/parser. Findings are tagged with SHA `d99d298` and will be re-verified against Pages once `vphase-15.6` lands (walk-23 candidate).
- Driver: `artifacts/phase-15/walk-22/walk-22-exec.py`, derived from walk-21's script with target SHA bumped and the three new pass-criteria checks bolted onto the existing structural-signature comparison.

### Expected duration

~10 min of agent execution (deterministic regression; identical to walk-21).

### Out of scope

- FBW-coverage round-trip (A.6 thresholds). Belongs in a later walk once the FBW skeleton is rich.
- Round-trip of `import` directives (Phase 14 library import) — separate walk, separate dim, deferred.
- Pages-side regression — deferred to walk-23 after `vphase-15.6` tags.

## Execution

Driver: `artifacts/phase-15/walk-22/walk-22-exec.py` (three Playwright contexts — ctx1 bootstrap+export, ctx2 JSON re-import+re-export, ctx3 SysML re-import+re-export). Run against local `pnpm dev` at SHA `d99d298` (post-#451 squash on main).

| Phase | Action | Outcome |
|-------|--------|---------|
| 1 | Bootstrap: 1 root Package + 2 PartDefinitions + 1 ActionDefinition + 1 Requirement + 1 BDD repr — 5 of 6 names with whitespace; identical fixture to walk-21 | ✓ all rows created via UI |
| 1 | `Export → JSON` → `baseline.json` | ✓ 6 elements, 2 diagrams (`Main BDD` + `Flight Control System BDD`), kinds=`{Package:2, PartDefinition:2, ActionDefinition:1, Requirement:1}` |
| 1 | `Export → SysMLv2` → `baseline.sysml` | ✓ 925 bytes; **10 distinct `<…>` quoted-ident tokens** (incl. both diagram names, root + nested package names, whitespace-bearing element names — confirms #448 path holds); **two `// @viewpoint bdd` decorators**; **two `view <name> { expose <path>; }` blocks** with `// id:` trailer; nested context emits fully qualified `<Untitled Project>::<Flight Control System>` path |
| 2 | Fresh ctx → `Import → JSON` → `Export → JSON` | ✓ Structural signature **equal** to baseline (element count, kinds, names, diagram count, diagram kinds, diagram names, edge kinds) |
| 3 | Fresh ctx → `Import → SysMLv2` → `Export → JSON` | ✓ Structural signature **equal** to baseline **INCLUDING DIAGRAMS** — `diagram_total: 2 → 2`, `diagram_names: ['Flight Control System BDD','Main BDD'] → ['Flight Control System BDD','Main BDD']`, `diagram_kinds: {bdd: 2} → {bdd: 2}`. **The walk-21 #449 regression is gone.** |

Page errors: 0. Console errors: 0. Three browser contexts, ~7s wall-time.

Exit code: 0. `all_pass: True` in `walk-22.json`.

### Four pass-criteria verdict (from `Plan` section)

| # | Criterion | Result |
|---|-----------|--------|
| 1 | JSON round-trip structural signature equal | **PASS** |
| 2 | SysML round-trip structural signature equal including `diagram_total`, diagram names, viewpoint kinds | **PASS** |
| 3 | `baseline.sysml` carries the new `// @viewpoint bdd` + `view <…> { … }` + `expose` emission | **PASS** |
| 4 | No extra default-seeded `Main BDD` post-import (no duplication) | **PASS** (`Main BDD` count: baseline 1 → post-SysML-import 1) |

## Findings — workbench

**Zero acceptance-testable defects filed.** The #451 implementation lands the resolution sketch from #449 cleanly: the serializer emits the `// @viewpoint <kind>` decorator above each `view <name> { expose <path>; }` block, with qualified-path emission for nested contexts; the parser recovers both diagrams; the import path no longer seeds an additional default `Main BDD`. The element-level fidelity from walk-21 (#448) is preserved unchanged.

## Findings — strong positive

1. **#449 fully closed.** SysML text round-trip is now lossless on diagrams as well as elements; previously the user-authored `Flight Control System BDD` was dropped, now both diagrams survive with kinds and names intact.
2. **Qualified-path context emission is correct.** The nested `Flight Control System` package's diagram emits `expose <Untitled Project>::<Flight Control System>;` — exercises the parser's qualified-path resolution and matches OMG SysMLv2 §10 expose-clause semantics.
3. **Cross-leg consistency.** `Export → JSON → Import → JSON → Export → JSON` and `Export → SysMLv2 → Import → SysMLv2 → Export → JSON` now produce structurally identical projects (modulo IDs).
4. **No page errors, no console errors.** Three independent browser contexts, three navigations to the dev server, no leaked listeners or unhandled rejections.

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-22 | 14 | 2 | **3** | All four pass-criteria from STATUS.md iter-833 Next Action hold under real authoring through production UI: JSON round-trip lossless; SysML round-trip lossless including diagrams; `// @viewpoint`/`view`/`expose` emission verified by regex on `baseline.sysml`; no diagram duplication post-import. The walk-21 #449 rough edge is gone. |

Other dims touched (no promotion this walk):
- **Dim 22 (Import/Export, score 2):** improves alongside dim 14 — JSON and SysML round-trips are now both element- and diagram-lossless. Promotion to 3 still requires the PNG/SVG export arms to be re-verified under real authoring (separate walk; out of scope here).

## Convergence chain (A.12 #3)

Walk-22 filed **zero workbench issues** and recorded zero console/page errors. The chain restarts at **1**: walk-22 = chain[1]. Three consecutive zero-issue walks are required for A.12 #3.

## Decide next

**Release tag (next iteration, parallel to the close-out PR merge).** With dim 14 → 3 landed AND #448 + #451 since `vphase-15.5`, A.8 cadence is satisfied: tag `vphase-15.6` / `v1.4.1` (patch — pure bug-fix accumulation: #448 quoted-ident + #451 view-block round-trip). Let the release workflow deploy. Then schedule a Pages-side regression walk (walk-23) at the new URL — that walk is the chain[2] convergence candidate.

**Engineer-batch candidates** (no overlap with serializer/parser):
- **Dim 13** (cross-diagram coherence, score 0): create a PartDefinition in BDD, open its IBD, rename in one viewpoint, verify the rename reflects in the other. Highest-impact unscored dim.
- **Dim 17** (edge editing affordances, score 1): reconnect / waypoints / routing-style audit.
- **Dim 23** (LLM integration, score 0) and **dim 27** (persistence, score 0 in some sub-aspects): both have outstanding unscored sub-criteria.

**FBW example (A.12 #4):** with both round-trip arms now fully lossless, the example commit is no longer blocked at the engineering layer — remaining bottleneck is purely the architect's authoring throughput against A.6 coverage thresholds.

