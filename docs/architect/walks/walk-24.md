# Walk 24 — Cross-diagram coherence: BDD ↔ IBD rename propagation (dim 13)

**Iteration:** 838
**Date:** 2026-05-18
**Walk type:** Deep dive (single-dimension)
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — deployed Pages bundle at tag `vphase-15.6` / `v1.5.0` (deploy SHA `9136ae8`)

## Plan

Dim 13 (cross-diagram coherence, A.10 row 13) is the first-class Phase-15 invariant that a single element instance appears in multiple diagrams *without duplication* and that edits to it in one viewpoint reflect everywhere it is shown. ADR 0011 (Explorer foundation: ownerId single source of truth + required DiagramContext) explicitly establishes the metamodel guarantee; walk-24 verifies the **architect-facing UX** honours it across the BDD↔IBD canonical pair.

Dim 13 is currently unmeasured (score 0) per `docs/architect/quality-rubric.md`. Walks 22 and 23 closed dim 14 (round-trip integrity) and lifted the convergence chain to **2 / 3**. Walk-24 is the recommended chain[3] candidate per walk-23's "Decide next" — three consecutive zero-issue walks completes A.12 #3 for the first time in Phase 15.

### Scope

| Element | Kind | Notes |
|---------|------|-------|
| `FCS Pkg` | Package | container; carries the BDD representation |
| `FCS` | PartDefinition (member of `FCS Pkg`) | the element with two representations |
| 1 × BDD diagram | representation on `FCS Pkg` | shows `FCS` as a block node |
| 1 × IBD diagram | representation on `FCS` | shows `FCS` as the enclosing frame context |

### Pass criteria (four)

| # | Criterion |
|---|-----------|
| 1 | After inline-renaming `FCS` → `Flight Control System` from the **BDD canvas** (double-click `bdd-block-label-…`, type, Enter), the **project tree** row for the PartDefinition reads `Flight Control System` AND the **IBD enclosing-frame name** (`ibd-enclosing-frame-name-…`) reads `Flight Control System` after switching to the IBD tab. |
| 2 | After renaming `Flight Control System` → `FCS Final` from the **Inspector** `inspector-name` field (with `FCS` selected on the BDD canvas, edit + blur), switching to the **IBD** shows `FCS Final` as the enclosing-frame name AND switching back to the **BDD** shows `FCS Final` as the block label. |
| 3 | The project tree carries **exactly one** `PartDefinition` row with `data-element-id` equal to `FCS`'s id throughout the walk (no duplication, no orphans). |
| 4 | Zero page errors and zero console errors across all phases. |

### Acceptance / rubric impact

| Outcome | Dim 13 action | Convergence (A.12 #3) |
|---------|---------------|-----------------------|
| All four pass-criteria hold + 0 issues filed | Promote dim 13 from **0 → 2** (acceptable baseline established: cross-diagram propagation works through two distinct rename surfaces; no blocking defects). Score 3 deferred to a later walk that also verifies right-click `Show in X` navigation, cross-diagram navigation both directions, and N>2 representations (e.g. BDD + IBD + Activity all referencing the same context). | walk-24 = **chain[3]** → **A.12 #3 first-time-met** |
| Pass-criterion 1 fails (BDD inline-rename does not propagate) | File `area:cross-cutting` + `area:viewpoint:bdd` issue per A.7; dim 13 stays at 0; chain resets to 0 | chain 0 |
| Pass-criterion 2 fails (Inspector rename does not propagate to IBD or BDD) | File `area:inspector` + `area:cross-cutting` issue; dim 13 → 1 if BDD inline-rename DID propagate (partial) or 0 if neither did; chain resets | chain 0 |
| Pass-criterion 3 fails (element duplication) | File `area:cross-cutting` issue citing ADR 0011 violation; dim 13 → 0; chain resets | chain 0 |
| Pass-criterion 4 fails (console / page errors) | File per A.7 with stack; dim 13 score depends on which other criteria passed; chain resets | chain 0 |

### Tool & environment

- **Live deployed Pages URL** per A.6 "Pages deploy is the source of truth".
- Driver: `artifacts/phase-15/walk-24/walk-24-exec.py`. Single Playwright context (the walk is a sequential rename-and-verify loop; no multi-context re-import needed).
- Browser: headless Chromium. Screenshots saved to `artifacts/phase-15/walk-24/screenshots/`.

### Expected duration

~15–20 s of agent execution (single context, ~10 UI actions, three diagram-tab switches).

### Out of scope

- **Right-click "Show in X" cross-diagram navigation** — separate dim-13 sub-aspect, deferred to a later walk. Walk-24 covers same-instance reflection, not navigation.
- **N>2 representations on the same PartDefinition** (e.g. BDD + IBD + Activity all bound to one context). Deferred. Walk-24's BDD↔IBD pair is the canonical minimum.
- **Renaming via the project tree inline-rename** — already exercised in walks 21–23 round-trip fixtures, presumed working. Walk-24 specifically exercises the two *canvas-side* rename surfaces (BDD double-click + Inspector).
- **Cross-viewpoint paste / duplicate workflows** — out of scope for dim 13's core invariant.

## Execution

Driver: `artifacts/phase-15/walk-24/walk-24-exec.py` (single Playwright context; six screenshots; structured `walk-24.json`). Run against `https://michaeljfazio.github.io/mbse-workbench/` at deploy SHA `9136ae8`. Wall-clock: ~11 s.

| Phase | Action | Outcome |
|-------|--------|---------|
| 1 | Bootstrap: `FCS Pkg` Package + `FCS` PartDefinition + BDD repr on Pkg + IBD repr on FCS | ✓ all four created via UI |
| 2a | Open BDD tab via tree row → assert `bdd-block-<fcs>` + label reads `FCS` | ✓ block + label rendered |
| 2b | Double-click `bdd-block-label-<fcs>` → fill `Flight Control System` → Enter | ✓ inline-rename committed; **tree row updates to `Flight Control System`** |
| 2c | Activate IBD tab (tree-row click) → probe enclosing-frame | ✗ **tree-row click did NOT activate IBD tab** (`aria-selected=false`); falling back to direct `diagram-tab-<ibd>` click activates correctly |
| 2d | After IBD activates: probe `ibd-enclosing-frame-<fcs>` and broader `ibd-enclosing-frame-*` | ✗ **IBD canvas is EMPTY**: zero `ibd-enclosing-frame-*` nodes, zero `ibd-part-usage-*` nodes, `rf-nodes=[]` |
| 3a | Switch back to BDD, click `bdd-block-<fcs>` → assert `inspector-single` + `inspector-name` populated | ✓ inspector shows single-element pane with name input |
| 3b | Inspector: fill `FCS Final` → Enter (blur) | ✓ inspector commits; **BDD label updates to `FCS Final`** |
| 3c | Activate IBD again → probe enclosing-frame | ✗ same as 2d — IBD canvas remains empty |
| 4 | PC3 (exactly one tree row for FCS throughout) + PC4 (no console/page errors) | ✓ both pass |

Page errors: 0. Console errors: 0. Six screenshots saved.

### Four pass-criteria verdict

| # | Criterion | Result |
|---|-----------|--------|
| 1 | BDD inline-rename → tree row + IBD enclosing-frame both reflect "Flight Control System" | **FAIL** — tree-row ✓, IBD ✗ (frame never renders) |
| 2 | Inspector rename → BDD label + IBD enclosing-frame both reflect "FCS Final" | **FAIL** — BDD label ✓, IBD ✗ (frame never renders) |
| 3 | Exactly one project-tree row carrying the FCS element id throughout | **PASS** (no duplication; ADR 0011 invariant holds) |
| 4 | Zero page errors, zero console errors | **PASS** |

PC1 and PC2 fail for the *same root cause* — the IBD enclosing-frame node is never created — not because of any rename-propagation gap. The rename path itself (BDD inline-rename, Inspector rename) propagates correctly to every surface that has a representation of the element (tree row, BDD canvas block label). The BDD↔Inspector↔Tree triangle is coherent.

## Findings — workbench

Two p1 issues filed per A.7. Each is independently acceptance-testable:

| # | Issue | Area | Severity | Summary |
|---|-------|------|----------|---------|
| 1 | **#461** | `area:viewpoint:ibd` + `area:cross-cutting` | p1 | New IBD representation renders with an EMPTY canvas — the enclosing frame node for the context PartDefinition is never created. Blocks dim-13 verification through the canonical BDD↔IBD pair. |
| 2 | **#462** | `area:explorer` + `area:cross-cutting` | p1 | Clicking a diagram row in the project tree does not activate that diagram tab (when the tab already exists in the tablist). The direct tab-click affordance works as workaround. UX inconsistency vs element-row clicks which DO update inspector selection. |

These are root-cause findings, not just observations. #461 explains why PC1 and PC2 fail; #462 is a separate but compounding defect that surfaced during the walk's navigation steps.

## Findings — strong positive

1. **BDD inline-rename works end-to-end.** Double-click on `bdd-block-label-*` enters the inline-rename input; Enter commits; the rename propagates atomically to the project-tree row.
2. **Inspector rename works end-to-end.** Selecting a BDD block surfaces `inspector-single` with the `inspector-name` input populated; editing + Enter (blur) commits and propagates to the BDD canvas label.
3. **No element duplication across the walk.** Throughout four surface-traversals (Package creation, PartDefinition creation, two rename surfaces, two diagram-tab navigations), the project tree always contains exactly one PartDefinition row carrying `data-element-id` equal to `fcs_id`. ADR 0011's single-source-of-truth invariant holds for the element registry.
4. **No console or page errors.** Three logical phases (bootstrap, BDD-rename, Inspector-rename) executed against the deployed Pages bundle without a single console error or unhandled rejection.
5. **Direct tab-click navigation is robust.** When the tree-row click failed to activate the IBD, the fallback `diagram-tab-<id>` click activated correctly, and the `diagram-panel` swapped its `data-viewpoint-id` and tablist `aria-selected` attributes atomically.

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-24 | 13 | 0 | 0 | Cannot promote: the canonical BDD↔IBD cross-diagram pair cannot be exercised because the IBD canvas renders empty (#461). Tree↔BDD↔Inspector triangle DOES exhibit cross-surface coherence (rename propagates atomically) — that's worth noting but not sufficient for dim-13 score ≥ 1 because dim 13 explicitly names "same element across viewpoints" as the invariant, and only one viewpoint (BDD) is reachable for the test PartDefinition. Re-walk after #461 closes. |
| 2026-05-18 | walk-24 | 6 | 2 | 1 | **Demote: IBD viewpoint creates an empty canvas on the canonical entry path (`Create representation… → IBD`)**. Score-3 description requires "Parts as nested blocks within an enclosing block context" — but no enclosing frame appears at all. Walk-1 (errata) earlier scored dim 6 = 2 based on parts-and-ports working when the IBD was set up manually; this walk shows the canonical creation path produces a non-functional IBD. The remaining score-2 evidence (ports, ConnectionUsage, ItemFlow when manually populated) survives, hence 1 (not 0). |
| 2026-05-18 | walk-24 | 18 | 2 | 2 | No change. Tree-row click for *element* rows works (inspector updates). Tree-row click for *diagram* rows does NOT activate the tab (#462). One-half of "bidirectional selection sync" is broken. Could justify demote to 1, but the walkthrough does not establish whether the tree-row click ever activated diagrams (it may have always required the tab-click workaround). Defer demote to a dedicated dim-18 walk that includes a regression check; leave at 2 with the #462 caveat noted. |

## Convergence chain (A.12 #3)

Walk-24 filed **two workbench issues** (`#461`, `#462`). Per A.12 #3 the chain **resets to 0**:

| Walk | Issues filed | Chain |
|------|-------------:|------:|
| walk-22 | 0 | 1 |
| walk-23 | 0 | 2 |
| walk-24 | 2 | **0 (RESET)** |

A.12 #3 (three consecutive zero-issue walks) is not yet met. The chain rebuilds from the next zero-issue walk.

## Decide next

**Engineer batch first.** The IBD empty-canvas defect (#461) is the load-bearing dim-13/dim-6 blocker. Closing it unblocks both:
- dim 6 (IBD viewpoint conformance) — can be promoted back to 2 once an enclosing frame seeds on `createRepresentation('ibd')` (and to 3 once parts/ports/connections continue to work).
- dim 13 (cross-diagram coherence) — can be measured for the first time.

Recommended batch: **`phase-15/empty-ibd-seed-frame`** — closes #461. Smallest acceptable scope: in the diagram-init pipeline for `viewpointId === 'ibd'`, seed one `IbdEnclosingFrameNode` bound to the context PartDefinition at canvas origin, sized to the defaults from `src/viewpoints/ibd/enclosingFrame.ts`. New unit test in `src/state/store.test.ts` (or similar) asserting that creating an IBD representation produces a diagram whose initial node set contains exactly one `ibd-enclosing-frame` node. New `@visual` baseline of the empty-IBD-just-after-creation state.

**Tree-row activation (#462) is a separate batch** — narrower, debugging-style fix. Can run in parallel as long as the touched files don't overlap (Explorer code is in `src/workspace/tree/`; IBD viewpoint init likely in `src/state/store.ts` or `src/viewpoints/ibd/`). Use the claim board to deconflict.

**After both close: walk-25 = re-run of walk-24** as a regression walk; if zero issues filed, chain[1] re-establishes and dim 13 measures for the first time.

**Pages-side regression first.** Both #461 and #462 surfaced against deployed `vphase-15.6` (`9136ae8`). The fixes will need a release tag (`vphase-15.7` / `v1.5.1` patch) before walk-25 can re-verify on Pages.

**FBW example (A.12 #4):** unblocked at the engineering layer for the round-trip dimension (per walk-23), but dim-6 demotion + dim-13 incompleteness mean the example commit should still wait for the IBD fix — the FBW model needs working IBDs for ATA-27 / Flight Controls and other subsystem internals.
