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
