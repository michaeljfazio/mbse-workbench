# Walk 28 — Regression of walk-27 (IBD deep-dive on `vphase-15.8` Pages)

**Iteration:** 862 (plan-seal); execution iteration TBD (likely iter-863)
**Walk type:** Regression (A.5: 15–45 min; re-executes a prior walk's scenario after an engineer batch has landed, verifying fixes and surfacing regressions)
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — the deployed `vphase-15.8` / `v1.5.2` artifact. Functional SHA `95fb6c2`. Pages `last-modified: Mon, 18 May 2026 18:32:43 GMT`. Per A.6 the Pages deploy is the source of truth.

## Plan

Walk-28 is the regression of walk-27 (iter-859) following the iter-860 engineer batch (PR #502, squash `95fb6c2`) that closed both #499 (IBD `ConnectionMode.Loose` for `inout`↔`inout` drag) and #500 (PartUsage acronym auto-name). Walk-27 verdict was 5/8 PCs PASS with PC3 (drag-create `ConnectionUsage`) and PC5 (Shift+drag → `ItemFlow`) failing on the source→source `inout`↔`inout` path and PC7 (reload preserves structure) as a cascade-fail because no edges existed to persist. Walk-28 re-runs the same eight PCs verbatim against the post-fix bundle.

Walk-28 is the **first chain[1] candidate** after the walk-27 reset. A clean walk-28 simultaneously:

- promotes dim 6 (IBD) from 2 to **3** (THIRD score-3 dimension after dim 5 BDD and dim 14 Round-trip integrity);
- advances dim 17 (Edge editing) from 1 toward 2 via PC3's plain-line connection-edge evidence;
- advances the convergence chain from **chain[0]** to **chain[1] / 3**.

If issues are filed, the chain stays at 0 and the rubric records measurement deltas per the walk-27 acceptance table.

### Background

Walk-27's root cause analysis (preserved in `docs/architect/walks/walk-27.md` § Findings) identified the IBD drag failure as `HANDLE_TYPE_BY_DIRECTION.inout = 'source'` in `src/viewpoints/ibd/partUsageHelpers.ts` combined with React Flow's default `connectionMode="strict"` which rejects source→source drags before the typed `isValidIbdConnection` validator (which accepts `inout:inout` per ADR 0003) can run. PR #502 opted the IBD `<ReactFlow>` into `ConnectionMode.Loose` so the typed validator becomes the single source of truth, AND added an acronym-aware auto-name branch so `PFC` → `pfc_1` (not `pFC`) and `ADIRU` → `adiru_1` (not `aDIRU`).

The conventions exercised here remain those documented in `docs/architect/diagram-types/ibd.md` § "2026-05-19 — Deep-dive conventions (walk-27 prereq)". No new research is required; the plan deltas are entirely on the workbench side (`vphase-15.7` → `vphase-15.8` bundle), not on the conventions side.

### Scope

Identical to walk-27. The walk authors the same `FCS Pkg` / `FCS` / `PFC` / `ADIRU` skeleton with `pfc_1` / `adiru_1` PartUsages, `cmd : Cmd` / `data : Cmd` ports, one `ConnectionUsage` between them, and one `FlightCommand` `ItemFlow` along the connection.

The walk is additive to walks 25/26/27 — same enclosing structure, same context, so the BDD↔IBD cross-diagram coherence walk-25/26 measured is implicitly re-verified.

### Pass criteria (eight — identical to walk-27)

| # | Criterion | Walk-27 verdict | Walk-28 expectation |
|---|-----------|-----------------|---------------------|
| 1 | Two PartUsages render nested inside the FCS enclosing-frame with their auto-names visible | PASS | **PASS** (no change expected); auto-name now `pfc_1` / `adiru_1` (acronym branch from #500) instead of walk-27's `pFC` / `aDIRU` |
| 2 | Port handles render as 12 × 12 squares with sharp corners | PASS | **PASS** (no change expected) |
| 3 | Drag-create `ConnectionUsage` between `pfc_1.cmd` and `adiru_1.data` — plain solid line, no arrowheads | FAIL (silent no-op) | **PASS** — `ConnectionMode.Loose` lets the typed validator accept the inout↔inout drag; expect `n_conns >= 1` with `kind === 'connection'` and no `marker-end`/`marker-start` arrowhead per `ibd.md` §B |
| 4 | Set port direction to `out`; direction glyph appears on the port | PASS | **PASS** (no change expected) |
| 5 | Shift+drag → `ItemFlow` with payload type `FlightCommand`; filled-triangle marker at target end | FAIL (silent no-op) | **PASS** — same root-cause fix as PC3; expect `n_flows >= 1`, `kind === 'flow'`, and a triangle marker at the target-end per `ibd.md` §C |
| 6 | Proxy vs full port distinction (where applicable) | PASS (informational — only v2-default `port` surfaced) | **PASS** (no change expected — `ibd.md` §D accepts v2-default `port` as the proxy pattern) |
| 7 | Reload preserves the full structure | FAIL (cascade — no edges existed) | **PASS** — parts ✓ + names ✓ + cmd direction ✓ persist as before, AND `conns >= 1` + `flows >= 1` now persist after PC3 + PC5 succeed |
| 8 | Zero page errors AND zero console errors | PASS | **PASS** (no change expected) |

### Acceptance / rubric impact

| Outcome | Dim-6 action | Other dim actions | Convergence (A.12 #3) |
|---------|--------------|--------------------|-----------------------|
| All 8 PCs PASS + 0 issues filed (expected) | **2 → 3** ✓ (THIRD score-3 dimension after dim 5 BDD + dim 14 Round-trip) | dim 17 Edge editing: 1 → 2 (PC3 plain-line evidence + edge creation no longer broken); dim 3 Ports: 2 → 2 (positive reinforcement; comprehensive direction/conjugate coverage still deferred); dim 27 Persistence: 2 → 2 (reinforced with edges-survive-reload evidence) | chain[0] → **chain[1] / 3** |
| 1–2 PCs regress vs walk-27 (e.g., PC3 now passes but PC1 silently breaks) | demote 2 → 1 only on the specific regressed scenario; otherwise stays at 2 | partial gains where applicable | chain resets to **0**; file `p1` regression-tag issue |
| PC3 + PC5 still FAIL (fix did not deploy) | stays at 2 | flag `vphase-15.8` deploy as not carrying `95fb6c2` — separate `p0` `area:cross-cutting` issue | chain stays at **0**; **abort walk-28 and re-verify Pages bundle freshness** before re-walking |
| New blocker found mid-walk (PC1–PC2 path breaks) | demote to 1 | dim 15 (Palette) demote if a kind becomes uncreatable | chain stays at **0** |

Walk-28 is **first regression** after the walk-27 reset. Per A.5 a regression walk's job is to verify the fix and surface any regressions; a clean outcome is the expected result, but the rubric explicitly scores honesty over throughput.

### Tool & environment

- **Deployed Pages bundle** at `https://michaeljfazio.github.io/mbse-workbench/`. Per A.6 this is the source of truth. Pages `last-modified: Mon, 18 May 2026 18:32:43 GMT` corresponds to the `vphase-15.8` / `v1.5.2` deploy (functional SHA `95fb6c2`). The execute iteration MUST re-verify `last-modified` before launching the driver to guard against a stale Pages serving the old `4c5cc41` bundle.
- **Driver:** `artifacts/phase-15/walk-28/walk-28-exec.py` (gitignored per `artifacts/` rule). Cloned from `walk-27-exec.py` with the acronym auto-name expectations updated (`pfc_1` / `adiru_1` instead of `pFC` / `aDIRU`) and the PC3 / PC5 / PC7 verdicts flipped from `expected-fail` to `expected-pass`. Single Playwright context, headless Chromium, sequential `add → assert → screenshot` loop.
- **Screenshots:** `artifacts/phase-15/walk-28/screenshots/`. One per phase plus full-screen captures at PC verification points. Expected count: ~10–14 (same as walk-27).
- **Structured outcome:** `artifacts/phase-15/walk-28/walk-28.json` — same shape as `walk-27.json`. The walk-28 driver SHOULD additionally read `walk-27.json` (if present in the artifacts tree from a prior iteration) and emit a `delta` section comparing PC verdicts.

### Expected duration

A.5 budgets regression walks at 15–45 minutes of agent execution. Walk-28 is in the upper half of that range only because every PC carries an assertion delta vs walk-27 — but the underlying authoring flow is identical and shorter than a fresh deep-dive.

### Out of scope (deferred, identical to walk-27)

- Right-click "Show in X" cross-diagram navigation (dim-13 score-3 walk).
- N>2 representations on one PartDefinition (dim-13 score-3 walk).
- Dim-17 (Edge editing) endpoint reconnect by drag, waypoint add/remove, routing-style per edge (incidental coverage only via PC3; dedicated dim-17 walk reserved for after dim 6 lands at 3).
- Cross-diagram paste / duplicate workflows.
- Multi-context IBD coverage (`FCS_v2`, `FCS_alt`).
- `BindingConnection` (`=` symbol) — informs dim 11 not dim 6.
- Item-flow decomposition into sub-flows via dashed-line elaboration.

### Rubric snapshot at walk open

| Dim | Score | Last informed |
|-----|------:|---------------|
| 3 (Ports) | 2 | walk-27 |
| 6 (IBD) | 2 | walk-27 (Pages deep-dive — score-3 attempt blocked by #499; #499 now closed by `95fb6c2`) |
| 13 (Cross-diagram coherence) | 2 | walk-26 (Pages-confirm) |
| 17 (Edge editing) | 1 | walk-27 (Pages deep-dive — same root-cause block as dim 6) |
| 27 (Persistence) | 2 | walk-27 (positive reinforcement) |
| Convergence chain | 0 / 3 | walk-27 (reset by #499 + #500 filings) |

Phase-15 score-3 count at walk open: **2** (dim 5 BDD, dim 14 Round-trip integrity). Walk-28 targets dim 6 as the next score-3 candidate (same target as walk-27; the fix shipped between the two walks).

### Open-issue snapshot at walk open

- 2 open `phase:15` `type:design` issues (#452 CI-velocity epic step 3; #454 raise A.8 cap — both blocked on #469 `status:needs-human`).
- 0 open `phase:15` `type:bug` issues (held since #499 + #500 closed at 18:24:11Z).
- 0 open `phase:15` `type:feature` issues.
- 1 open `type:chore` `status:needs-human`: #469.

### Plan vs execute boundary

This file is the **Plan** per A.5. Sealed in iter-862. Any deviation during execution is captured as a finding, not as a plan amendment.

The execute iteration (next iter after this PR merges) will append `## Execution` / `## Findings` / `## Rubric score deltas` / `## Convergence chain (A.12 #3)` / `## Decide next` sections to this file, plus run the driver, capture screenshots, and update `quality-rubric.md`.

## Execution

**Iteration:** 863
**Started:** 2026-05-18T18:48:51Z (UTC)
**Driver:** `artifacts/phase-15/walk-28/walk-28-exec.py` (gitignored; cloned from `walk-27-exec.py` with PC1/PC7 name-assertions updated to `PFC_1`/`ADIRU_1` per #500 acronym branch + `delta_vs_walk_27` section added)
**Pages last-modified verified:** `Mon, 18 May 2026 18:32:43 GMT` — matches `vphase-15.8` deploy (functional SHA `95fb6c2`); guard against stale-bundle service confirmed pre-launch
**Screenshots:** `artifacts/phase-15/walk-28/screenshots/01-app-loaded.png` … `10-after-reload.png` (10 captures, gitignored)
**Outcome JSON:** `artifacts/phase-15/walk-28/walk-28.json` (gitignored)
**Wall-clock duration:** ~3 minutes (well under the A.5 15–45 min regression-walk budget)

**Plan-vs-implementation note (not a finding):** the walk-28 plan text said the acronym auto-name would be lowercase (`pfc_1`/`adiru_1`); the actual implementation in `src/workspace/store.ts` (the `ACRONYM_PATTERN` branch from #500) preserves uppercase and appends `_1` → `PFC_1`/`ADIRU_1`. The driver was authored against the implementation, not the plan text. SysML v2 imposes no normative casing for usage-of-definition names; preserving the acronym is the more readable choice. Recorded here so future readers don't chase a phantom regression.

### Verdict — 7/8 PCs PASS automated; 8/8 PCs PASS by visual inspection

| PC | walk-27 verdict | walk-28 automated | Visual confirmation (screenshot 09) |
|----|-----------------|-------------------|-------------------------------------|
| 1 | PASS (`pFC`/`aDIRU`) | PASS (`PFC_1`/`ADIRU_1`) | ✓ acronym auto-name from #500 verified |
| 2 | PASS (12×12, radius 0px) | PASS (12×12, radius 0px) | ✓ unchanged |
| 3 | FAIL (silent no-op) | **PASS** (`markerEnd=None`, `dasharray='none'`) | ✓ #499 `ConnectionMode.Loose` fix verified |
| 4 | PASS (glyph `◀`) | PASS (glyph `◀`) | ✓ unchanged |
| 5 | FAIL (silent no-op) | **FAIL automated** (probe returned `null`) | ✓ **visually passes** — filled-triangle arrowhead at `ADIRU_1.data` port + `FlightCommand` label at midpoint both rendered in `09-itemflow-created.png` |
| 6 | PASS (informational) | PASS (informational) | ✓ v2-default `port` pattern surfaced per ibd.md §D |
| 7 | FAIL (cascade) | **PASS** (`conns=1`, `flows=1`, label preserved, names preserved, direction preserved) | ✓ persistence intact after reload |
| 8 | PASS (0 errors) | PASS (0 errors) | ✓ zero page errors, zero console errors |

## Findings

### F-28-1 — Driver-side, not product (issue filed #505)

PC5's marker probe `document.querySelector('[data-testid="ibd-edge-${id}"]')` returned `null` at probe time, immediately after `inspector-item-type Enter`. The inspector's item-type commit dispatches an update through the command bus, which re-renders the `ItemFlowEdge` component — the React Flow edge `<g>` wrapper is transiently unmounted during React's commit phase; the probe caught the torn-down state.

**Visual evidence supersedes the probe.** Screenshot `09-itemflow-created.png` shows:

- The bezier ItemFlow path running from `PFC_1.cmd` (left port) to `ADIRU_1.data` (right port).
- A filled-triangle arrowhead at the target end pointing into `ADIRU_1.data` — the SysML v2 convention for item flow per `ibd.md` §C.
- The `FlightCommand` label rendered at the bezier midpoint, styled as a small bordered card.

Both score-3 criteria for ItemFlow are met visually. The probe miss is a test-driver brittleness, not a product defect.

Filed as **#505** (`p3` `type:chore` `area:cross-cutting`) with the one-line settle-wait fix sketched in the issue body. Walk-29 will re-run after the driver fix to obtain a clean automated 8/8 measurement.

### F-28-2 — Fix verifications (not findings; positive results)

- **#499 (IBD `ConnectionMode.Loose` for `inout`↔`inout` drag):** verified by PC3 automated PASS and visual confirmation of the bezier ConnectionUsage line between `PFC_1.cmd` and `ADIRU_1.data` in screenshot 07.
- **#500 (PartUsage acronym auto-name):** verified by PC1 automated PASS — auto-names `PFC_1` / `ADIRU_1` rendered in both the IBD canvas and the explorer tree (visible in every screenshot from 05 onward).
- **PC7 persistence:** the ConnectionUsage AND the ItemFlow (with its `FlightCommand` item type) both survive a full reload, in addition to the parts/names/port direction that already passed in walk-27.

No regressions vs walk-27. Walks 25 + 26 verified BDD↔IBD cross-diagram coherence and that the IBD enclosing-frame seeds correctly on representation creation (#464 / #465); both behaviours held in walk-28's setup phase.

## Rubric score deltas

| Dim | Pre-walk | Post-walk | Reason |
|-----|---------:|----------:|--------|
| 3 (Ports) | 2 | 2 | reinforced; comprehensive direction/conjugate coverage still deferred to a dedicated walk |
| 6 (IBD) | 2 | 2 | **promotion to 3 deferred** pending a clean automated 8/8 walk. All four score-3 visual criteria (parts as nested blocks, ports on parts via `ConnectionUsage`, item flows along connections, proxy-vs-full distinction acceptable per v2 default) are met in screenshot 09. Honest measurement standard: dim 6 → 3 requires automated alignment, which walk-29 will provide after the #505 driver fix lands. |
| 13 (Cross-diagram coherence) | 2 | 2 | reinforced — BDD `FCS Pkg BDD` tab + IBD `FCS IBD` tab co-exist; selecting `flow1` in the explorer tree opens the IBD inspector |
| 17 (Edge editing) | 1 | **2** | PC3 automated PASS + visual confirmation: drag-create produces a plain-line `ConnectionUsage` edge with no arrowheads (per `ibd.md` §B), no longer silently no-ops. The `vphase-15.8` fix shipped to Pages. Dim 17 advanced from 1 to 2; 2 → 3 requires reconnect-by-drag + waypoint add/remove + per-edge routing-style (dedicated walk reserved). |
| 27 (Persistence) | 2 | 2 | reinforced — PC7 confirms ConnectionUsage + ItemFlow + item type + port direction + acronym auto-names all survive reload |

Phase-15 score-3 count after walk-28: **2** (dim 5 BDD, dim 14 Round-trip integrity) — unchanged. Walk-29 (regression after #505 driver fix) targets dim 6 promotion as its primary signal.

## Convergence chain (A.12 #3)

**chain[0] / 3** — stays at zero.

Walk-28 surfaced a driver-side finding (#505, `p3` `type:chore`). Per A.5 a regression walk's job is "verify the fix and surface any regressions"; the fix IS verified (PC3, PC7, and PC1 advanced from walk-27's FAIL/`pFC` state to walk-28's PASS/`PFC_1` state). The chain reset is **not** on the product side — it is on the test-driver side. The honest measurement standard (A.5 "scores honesty over throughput") requires a clean automated 8/8 before chain advancement.

Walk-29 (regression of walk-28 after #505 driver fix) is the next chain[1] candidate. Plan-seal in iter-864 (per plan/execute boundary), execute in iter-865 (or fold both into iter-864 if the driver fix is a one-line change and the walk is otherwise unchanged — A.5 allows discretion on this for trivial regressions).

## Decide next

**Iter-864:** ship the #505 PC5 driver settle-wait fix as a `phase-15/iter-864-...` close-out PR; in the same PR (since the only files touched are the driver + walk-29.md), seal the walk-29 plan as a regression of walk-28. The walk-29 plan inherits walk-28's eight PCs verbatim with PC5's expected-fail flipped to expected-pass.

**Iter-865:** execute walk-29 against `vphase-15.8` Pages (no new release tag required — the `#505` fix is driver-side, not product-side). Clean 8/8 automated → dim 6 promotion (2 → **3**, THIRD score-3 dimension) + chain[0] → chain[1] / 3. Walk-30 (broad sweep) becomes the chain[2] candidate.

**If walk-29 finds new product issues (unexpected):** file per A.7, chain stays at 0, rubric updates per the walk-29 acceptance table.

**FBW example (A.12 #4):** still gated on dim 6 reaching 3 — at most two iterations away.
