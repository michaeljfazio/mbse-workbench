# Walk 25 — Cross-diagram coherence regression: BDD ↔ IBD rename propagation (dim 13)

**Iteration:** 852
**Date:** 2026-05-18
**Walk type:** Regression walk (re-run of walk-24 after #461 + #462 fixes shipped)
**Target:** `pnpm dev` at `main` HEAD `be050e0` — per A.6 the `vphase-15.6` / `v1.5.0` deploy (`9136ae8`) does NOT contain the two load-bearing fixes (`#464` for #461 merged at `47e90bd`, `#465` for #462 merged at `1116cad`). Findings tagged with HEAD SHA; a regression re-walk on Pages follows the next `vphase-15.7` release tag.

## Plan

Walk-25 re-runs the walk-24 scenario verbatim. Walk-24 filed two issues (#461 IBD empty canvas, #462 tree-row click not activating diagram tab) that together blocked dim-13 measurement: only one viewpoint (BDD) was reachable for the test PartDefinition. Both issues are now closed at `main` HEAD; walk-25 verifies that:

1. The canonical BDD↔IBD cross-diagram pair is now fully reachable through architect-facing UX (no test-only hooks, no manual frame seeding).
2. The four walk-24 pass-criteria all hold against the post-fix bundle.
3. No regression was introduced in the BDD↔Inspector↔Tree triangle that walk-24 already verified is coherent.

If all four pass-criteria hold and zero issues are filed, walk-25 promotes **dim 13 from 0 → 2** (first measurement; acceptable baseline established) and **dim 6 from 1 → 2** (canonical IBD creation path no longer broken). The convergence chain (A.12 #3) re-enters at chain[1] — walk-24's reset stands; walks 22 and 23 cannot be re-counted because the chain rule requires *consecutive* zero-issue walks.

### Scope

| Element | Kind | Notes |
|---------|------|-------|
| `FCS Pkg` | Package | container; carries the BDD representation |
| `FCS` | PartDefinition (member of `FCS Pkg`) | the element with two representations |
| 1 × BDD diagram | representation on `FCS Pkg` | shows `FCS` as a block node |
| 1 × IBD diagram | representation on `FCS` | shows `FCS` as the enclosing frame context |

Scope is identical to walk-24 by design — a regression walk's value is in being byte-for-byte the same scenario.

### Pass criteria (four — identical to walk-24)

| # | Criterion |
|---|-----------|
| 1 | After inline-renaming `FCS` → `Flight Control System` from the **BDD canvas** (double-click `bdd-block-label-…`, type, Enter), the **project tree** row for the PartDefinition reads `Flight Control System` AND the **IBD enclosing-frame name** (`ibd-enclosing-frame-name-…`) reads `Flight Control System` after switching to the IBD tab. |
| 2 | After renaming `Flight Control System` → `FCS Final` from the **Inspector** `inspector-name` field (with `FCS` selected on the BDD canvas, edit + blur), switching to the **IBD** shows `FCS Final` as the enclosing-frame name AND switching back to the **BDD** shows `FCS Final` as the block label. |
| 3 | The project tree carries **exactly one** `PartDefinition` row with `data-element-id` equal to `FCS`'s id throughout the walk (no duplication, no orphans). |
| 4 | Zero page errors and zero console errors across all phases. |

### Acceptance / rubric impact

| Outcome | Dim-13 action | Dim-6 action | Convergence (A.12 #3) |
|---------|---------------|--------------|-----------------------|
| All four pass-criteria hold + 0 issues filed | 0 → **2** (acceptable baseline; score 3 deferred to a later walk covering right-click `Show in X`, N>2 representations, cross-diagram nav both directions) | 1 → **2** (canonical IBD entry path restored; ports/connections still need a dedicated walk for score 3) | chain restarts at **1** (walk-22/23's chain[1..2] is sealed by walk-24's reset; the rule requires three *consecutive*) |
| PC1 fails (BDD inline-rename does not propagate to IBD) | stays at 0 | depends on whether the IBD enclosing-frame renders at all — if yes, dim 6 → 2 with caveat; if no, file a new #461-style issue and stay at 1 | chain stays at 0 |
| PC2 fails (Inspector rename does not propagate) | stays at 0 (or 1 if PC1 passed — partial cross-surface coherence) | as above | chain stays at 0 |
| PC3 fails (element duplication) | stays at 0; file area:cross-cutting issue citing ADR 0011 violation | stays at 1 | chain stays at 0 |
| PC4 fails (console / page errors) | depends on which other PCs passed | depends | chain stays at 0 |

Walk-25 is **deliberately conservative** on the score-3 path: even a clean pass only promotes to 2. Score 3 for dim 13 is gated on a later walk that covers (a) right-click → "Show in X" navigation from both ends, (b) N>2 representations on one PartDefinition, (c) bidirectional cross-diagram navigation. Score 3 for dim 6 is gated on a later walk that covers parts + ports + ConnectionUsage + ItemFlow + proxy-vs-full port distinction inside the IBD.

### Tool & environment

- **Local `pnpm dev` server** at HEAD `be050e0`. Per A.6: deploy lacks an unmerged fix (#464 + #465 post-date `9136ae8`). Findings tagged with HEAD SHA. A regression re-walk on `vphase-15.7` Pages follows.
- Driver: `artifacts/phase-15/walk-25/walk-25-exec.py`. Same shape as `walk-24-exec.py` — single Playwright context, headless Chromium, sequential rename-and-verify loop.
- Screenshots: `artifacts/phase-15/walk-25/screenshots/`.
- Structured outcome: `artifacts/phase-15/walk-25/walk-25.json`.

### Expected duration

~15–20 s of agent execution, same as walk-24. The walk is a deterministic UI script; no exploratory branching.

### Out of scope (unchanged from walk-24)

- Right-click "Show in X" cross-diagram navigation — separate dim-13 sub-aspect; later walk.
- N>2 representations on the same PartDefinition (e.g. BDD + IBD + Activity all bound to one context) — later walk.
- Renaming via the project tree inline-rename — exercised in walks 21–23 round-trip fixtures, presumed working.
- Cross-viewpoint paste / duplicate workflows — not dim-13 core invariant.
- IBD parts + ports + ConnectionUsage + ItemFlow — dim-6-score-3 territory; later dedicated walk.

### Rubric snapshot at walk open

- Dim 6: **1** (walk-24 demote)
- Dim 13: **0** (walk-24 unable to measure)
- Convergence chain: **0** (walk-24 reset)

### Plan vs execute boundary

This file is the **Plan** per A.5. The **Execute** + **Triage** + **Score** + **Close out** phases happen in iter-853 against `pnpm dev` at `be050e0`. Per A.5, the plan is sealed before the browser opens — any deviation during execution is captured as a finding, not as a plan amendment.

## Execution

**Iteration:** 853
**Date:** 2026-05-18
**Run:** local `pnpm dev` (Vite 5.4.21) at `localhost:5173`. Functional code SHA == `be050e0` (the iter-852 commit `17861b0` on top is doc-only — modifies only `docs/architect/walks/walk-25.md`, `STATUS.md`, `docs/architect/in-flight.md`). HEAD at execution: `e634979`.
**Driver:** `artifacts/phase-15/walk-25/walk-25-exec.py` (single Playwright context, headless Chromium, six screenshots, structured `walk-25.json`). Wall-clock: ~12 s. Six screenshots saved under `artifacts/phase-15/walk-25/screenshots/`.

The plan was followed verbatim — zero deviations, zero plan amendments needed.

| Phase | Action | Outcome |
|-------|--------|---------|
| 1 | Bootstrap: clear browser storage, find root project Package (depth=0 row), open its ⋯ menu → Create child → Package → auto-rename → "FCS Pkg" | ✓ FCS Pkg created via tree-menu UX |
| 1 | Open FCS Pkg ⋯ menu → Create child → Part Definition → auto-rename → "FCS" | ✓ FCS PartDefinition created |
| 1 | Open FCS Pkg ⋯ menu → Create representation… → BDD | ✓ BDD diagram created on FCS Pkg |
| 1 | Open FCS ⋯ menu → Create representation… → IBD | ✓ IBD diagram created on FCS |
| 2a | Activate BDD by clicking the diagram row in the tree | ✓ **`#465` regression confirmed CLOSED** — tree-row click activates the BDD tab atomically (`aria-selected=true`) |
| 2a | Probe `bdd-block-<fcs>` + `bdd-block-label-<fcs>` | ✓ block + label rendered with text `FCS` |
| 2b | Double-click `bdd-block-label-<fcs>` → fill `Flight Control System` → Enter | ✓ inline-rename committed; BDD label updates atomically |
| 2b | Read project-tree row text for `<fcs>` | ✓ tree row reads `Flight Control System` |
| 2c | Activate IBD by clicking the diagram row in the tree | ✓ **`#465` regression confirmed CLOSED a second time** — tree-row click activates the IBD tab |
| 2d | Probe `ibd-enclosing-frame-<fcs>` + `ibd-enclosing-frame-name-<fcs>` | ✓ **`#464` regression confirmed CLOSED** — enclosing-frame node renders; name reads `Flight Control System` |
| 3a | Switch back to BDD, click `bdd-block-<fcs>` → assert `inspector-single` + `inspector-name` populated | ✓ inspector shows single-element pane with name input |
| 3b | Inspector: fill `FCS Final` → Enter → blur | ✓ inspector commits; BDD label updates to `FCS Final` |
| 3c | Activate IBD again via tree-row click → probe enclosing-frame | ✓ enclosing-frame name updates to `FCS Final` |
| 4 | PC3 final probe: count `[data-testid="containment-tree-element-<fcs>"]` rows | ✓ exactly 1 throughout |
| 4 | PC4 final probe: page error count + console error count | ✓ 0 + 0 |

Page errors: 0. Console errors: 0.

### Four pass-criteria verdict

| # | Criterion | Result |
|---|-----------|--------|
| 1 | BDD inline-rename → tree row + IBD enclosing-frame both reflect `Flight Control System` | **PASS** (tree ✓, ibd_frame ✓, ibd_name `'Flight Control System'`) |
| 2 | Inspector rename → BDD label + IBD enclosing-frame both reflect `FCS Final` | **PASS** (bdd_label ✓, ibd_name `'FCS Final'`) |
| 3 | Exactly one project-tree row carrying the FCS element id throughout | **PASS** (rows_with_fcs_id=1) |
| 4 | Zero page errors, zero console errors | **PASS** (page_errors=0, console_errors=0) |

**4 / 4 PASS. Zero issues filed.**

## Findings — workbench

**Zero findings.** Both load-bearing walk-24 issues (#461 IBD empty canvas, #462 tree-row click does not activate diagram tab) are confirmed CLOSED end-to-end through the architect-facing UX:

- **#461 (closes via #464):** The canonical `Create representation… → IBD` flow now seeds an `ibd-enclosing-frame-<contextId>` node for the context PartDefinition. Immediately after creating the IBD, the canvas renders the enclosing frame with the PartDefinition's current name. No manual seeding, no test-only API, no fixture import — verified through the architect's tree-menu path only.
- **#462 (closes via #465):** Clicking a diagram row in the project tree atomically activates that diagram's tab (`aria-selected=true`). Verified twice in walk-25 (BDD and IBD), no workaround required.

## Findings — strong positive

1. **BDD ↔ IBD ↔ Tree ↔ Inspector — all four cross-surface coherence paths are atomic.** Two rename surfaces (BDD inline-rename + Inspector `inspector-name`) × three reflection surfaces (project-tree row + BDD block label + IBD enclosing-frame name) = six propagation edges. All six observed working with zero observable lag.
2. **Tree-row diagram navigation works in both directions.** Walk-25 navigates BDD → IBD → BDD → IBD by tree-row clicks alone. The fallback `diagram-tab-<id>` click that walk-24 had to use is no longer needed.
3. **Element registry integrity (ADR 0011) holds throughout.** PC3 — exactly one `containment-tree-element-<fcs>` row throughout the walk — confirms the single-source-of-truth invariant survives four surface-traversals + two diagram-creation surfaces + two rename surfaces.
4. **Zero console errors across a fresh-storage cold-start + full bootstrap + two rename surfaces.** The local dev bundle exhibits the same console-cleanliness the Pages bundle showed in walk-24.
5. **Container-aware row menu.** The ⋯ menu on `FCS Pkg` correctly offers `Create child → Part Definition` and `Create representation… → BDD`, while the ⋯ menu on `FCS` correctly offers `Create representation… → IBD` (among others). The kind-correctness of the child/representation pickers per containment role is intact.

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-18 | walk-25 | 6 | 1 | 2 | Restore — #464 (closes #461) shipped at `47e90bd`. Canonical `Create representation… → IBD` path seeds the enclosing frame; walk-25 confirms the frame renders end-to-end via UI. Score 2 (not 3) because parts/ports/ConnectionUsage/ItemFlow/proxy-vs-full-port score-3 evidence is deferred to a dedicated IBD deep-dive — same threshold as walk-1-errata. |
| 2026-05-18 | walk-25 | 13 | 0 | 2 | **First measurement.** Clean regression of walk-24; all four pass criteria PASS; zero issues filed; both rename surfaces propagate atomically to all three reflection surfaces. Score 2 (not 3) because right-click `Show in X` cross-diagram navigation, N>2 representations, and bidirectional navigation are out of walk-25's scope (covered by a later dedicated dim-13 walk). |

Dim 13 enters the rubric at score 2 — first scored, not first **at 3**. The Phase-15 score-3 count remains at 2 (dim 5 BDD, dim 14 Round-trip integrity).

## Convergence chain (A.12 #3)

Walk-25 filed **zero workbench issues**. Per A.12 #3 the chain advances by one — but walk-24's reset stands; walks 22 and 23 cannot be re-counted because the rule requires *consecutive* zero-issue walks.

| Walk | Issues filed | Chain |
|------|-------------:|------:|
| walk-22 | 0 | (pre-reset 1) |
| walk-23 | 0 | (pre-reset 2) |
| walk-24 | 2 | 0 (RESET) |
| walk-25 | 0 | **1** |

A.12 #3 requires **three consecutive zero-issue walks**. The chain is now at **chain[1] / 3**. Two more zero-issue walks complete the convergence trigger.

## Decide next

**Release first.** `#464` + `#465` (load-bearing for dim 6 and dim 13) merged to `main` AFTER the `vphase-15.6` / `v1.5.0` deploy. With rubric advancement now confirmed empirically on local-dev at functional-SHA `be050e0`, the A.8 release-cadence trigger is satisfied:

- **rubric advance ≥1 dim**: ✓ dim 6 (1 → 2) + dim 13 (0 → 2).
- **≥5 batches since last tag**: ✓ #464, #465, #475 (CI step 2 was earlier — check), plus the CI-velocity / ADR 0016 / closure PRs (#487, #489–#493) — well over 5.

Recommended cadence:

1. **Iter-854 (this walk's PR merges first).** Merge `phase-15/iter-853-walk-25-execute` (walk-25 close-out, this PR).
2. **Iter-855 — push `vphase-15.7` / `v1.5.1` tag** on `main`. The Phase-15 work since `v1.5.0` is mostly bug-fix + tooling polish — no outward-facing new feature — so `v1.5.1` (patch) is the appropriate SemVer bump per A.8. Release workflow deploys to Pages.
3. **Iter-856 — regression walk-26 against deployed `vphase-15.7` Pages.** Per A.6 ("Pages deploy is the source of truth"), the dim-6 + dim-13 fixes need a regression confirmation on Pages, not just `pnpm dev`. Walk-26 reruns walk-25 verbatim against the deployed bundle. A clean walk-26 keeps the convergence chain at **2 / 3**.
4. **Iter-857+ — walk-27 = next deep-dive,** picking the chain[3] candidate. Strong candidates (in priority order):
   - **IBD deep-dive** (parts + ports + ConnectionUsage + ItemFlow + proxy-vs-full port) — chain candidate AND raises dim 6 from 2 → 3.
   - **Dim-13 score-3 walk** (right-click `Show in X`, N>2 representations, bidirectional nav) — raises dim 13 from 2 → 3.
   - **Dim-17 edge-editing walk** (reconnect endpoints, add/remove waypoints, routing-style selection) — raises dim 17 from 1 to 2 or 3.
   The IBD deep-dive doubles as both a chain[3] candidate and a dim-6 promote, so it has the highest aggregate value.

**FBW example (A.12 #4):** further unblocked — IBD viewpoint is now usable end-to-end via the canonical creation path, removing a prerequisite for the ATA-27 / Flight Controls subsystem internals in the FBW model. The FBW authoring throughput remains the bottleneck.

**Iter-counter:** Phase-15 iter-count at **61** of the 300 churn ceiling; well under.

**ADR for raising A.8 cap (#454):** still blocked behind #469 (`status:needs-human`). Walk-25 used 1/5 of the A.8 in-flight cap; no contention this iteration.


