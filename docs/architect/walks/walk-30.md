# Walk 30 — Regression of walk-29 (IBD deep-dive on `vphase-15.8` Pages, post-#508 driver fix)

**Iteration:** 866 (plan-seal); execution iteration TBD (likely iter-867)
**Walk type:** Regression (A.5: 15–45 min; re-executes a prior walk's scenario after an engineer batch has landed, verifying fixes and surfacing regressions)
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — the deployed `vphase-15.8` / `v1.5.2` artifact. Functional SHA `95fb6c2`. Pages `last-modified: Mon, 18 May 2026 18:32:43 GMT`. **No new release tag required for walk-30** — the only change between walk-29 and walk-30 is the test-driver probe-selector fix (#508); the workbench bundle is bit-for-bit unchanged from walks 28 and 29.

## Plan

Walk-30 is the regression of walk-29 (iter-865) following the iter-866 driver-side fix that closes #508 (PC5 marker-end probe selecting the wrong `<path>` element — the marker triangle inside `<defs>` rather than `BaseEdge`'s visible path carrying `marker-end`). Walk-29's verdict was **7/8 PCs PASS automated; 8/8 PCs PASS by visual inspection**. The #505 settle-wait fix from iter-864 was verified working: the probe correctly waited until React's commit phase resolved (edge `<g>` reattached, label `<div>` reattached, `label.textContent.trim() === 'FlightCommand'`). PC5 still failed automated because `g.querySelector('path')` returns the FIRST `<path>` in document order inside `<g data-testid="ibd-edge-${id}">`, which per `src/viewpoints/ibd/ItemFlowEdge.tsx` lines 48–73 is the marker's interior triangle path inside `<defs>` — not `BaseEdge`'s visible `<path>` with `marker-end="url(#…)"`. The product was correct in every measurable way (visual evidence in `09-itemflow-created.png`); only the probe's CSS selector needed adjustment. Walk-30 re-runs the same eight PCs verbatim with the corrected probe in place, expecting a clean 8/8 automated PASS.

Walk-30 is the **chain[0] candidate** following the chain reset from #508. A clean walk-30 simultaneously:

- promotes dim 6 (IBD) from 2 to **3** (THIRD score-3 dimension after dim 5 BDD and dim 14 Round-trip integrity) — the dim-6 promotion has been deferred twice now (walk-28 → #505, walk-29 → #508) to honour A.5's "scores honesty over throughput" requirement that automated alignment match visual;
- reinforces dim 17 (Edge editing) at 2 with a third pass on PC3 (drag-create plain-line `ConnectionUsage`) — no advance to 3 because score-3 still requires reconnect-by-endpoint-drag + waypoint add/remove + per-edge routing-style (dedicated dim-17 walk reserved for after dim 6 lands at 3);
- advances the convergence chain from **chain[0]** to **chain[1] / 3**.

If issues are filed, the chain stays at 0 and the rubric records measurement deltas per the walk-29 acceptance table (re-applied for walk-30). Per the iter-865 decisions log: if walk-30 fails for a third consecutive driver-side reason, file a `type:design` issue for a stable edge-probe helper (`tests/e2e/__helpers__/edge-probe.ts` or similar) — but only after the cost has actually been paid three times.

### Background

Walk-29's root-cause analysis (preserved in `docs/architect/walks/walk-29.md` § F-29-1) identified the PC5 marker-end probe miss as a driver-side selector defect, distinct from #505's settle-wait race. The `ItemFlowEdge` component renders, in document order inside `<g data-testid="ibd-edge-${id}">`:

1. `<defs><marker id="ibd-itemflow-arrow-${id}"><path d="M0 0 L12 6 L0 12 Z" fill={stroke}/></marker></defs>` — the FIRST `<path>` in the group; lives inside `<defs>` and has no `marker-end` attribute.
2. `<BaseEdge .../>` — renders as a `<path>` with `marker-end="url(#ibd-itemflow-arrow-${id})"`; this is the SECOND `<path>`.

Walk-29's probe used `g.querySelector('path')` which returns (1), so the `marker-end` attribute read returned `null` even though the visible edge correctly carried the marker. Issue #508 was filed as `p3 type:chore area:cross-cutting` with the one-line resolution sketch: switch to `g.querySelector('path[marker-end]')` (with a `[...g.querySelectorAll('path')].find(p => p.hasAttribute('marker-end'))` fallback for browser-quirks tolerance).

The conventions exercised here remain those documented in `docs/architect/diagram-types/ibd.md` § "2026-05-19 — Deep-dive conventions (walk-27 prereq)". No new research is required; the plan deltas are entirely on the test-driver side, not on the workbench or the conventions side.

### Scope

Identical to walks 28 and 29. The walk authors the same `FCS Pkg` / `FCS` / `PFC` / `ADIRU` skeleton with `PFC_1` / `ADIRU_1` PartUsages (acronym branch from #500), `cmd : Cmd` / `data : Cmd` ports, one `ConnectionUsage` between them, and one `FlightCommand` `ItemFlow` along the connection. Same enclosing structure, same context.

### Pass criteria (eight — identical to walks 28 and 29)

| # | Criterion | Walk-29 verdict | Walk-30 expectation |
|---|-----------|-----------------|---------------------|
| 1 | Two PartUsages render nested inside the FCS enclosing-frame with their acronym auto-names (`PFC_1`/`ADIRU_1`) visible | PASS | **PASS** (no change expected) |
| 2 | Port handles render as 12 × 12 squares with sharp corners (radius 0px) | PASS | **PASS** (no change expected) |
| 3 | Drag-create `ConnectionUsage` between `PFC_1.cmd` and `ADIRU_1.data` — plain solid line, no arrowheads (`markerEnd=null`, `markerStart=null`, `strokeDasharray='none'`) | PASS | **PASS** (no change expected) |
| 4 | Set port direction to `out`; direction glyph appears on the port | PASS | **PASS** (no change expected) |
| 5 | Shift+drag → `ItemFlow` with payload type `FlightCommand`; filled-triangle marker at target end | **FAIL automated** (`markerEnd=''` — wrong-element probe read); PASS visual | **PASS automated** — #508 probe-selector fix targets the `BaseEdge` `<path>` with `marker-end` attribute; the probe then resolves to the populated `{markerEnd: 'url(#ibd-itemflow-arrow-…)', markerExists: true, markerPathD: 'M0 0 L12 6 L0 12 Z', markerPathFill: '…'}` shape per `ibd.md` §C |
| 6 | Proxy vs full port distinction (where applicable) | PASS (informational) | **PASS** (no change expected — `ibd.md` §D accepts v2-default `port` as the proxy pattern) |
| 7 | Reload preserves the full structure (parts + names + cmd direction + 1 connection + 1 item flow with `FlightCommand` label) | PASS | **PASS** (no change expected) |
| 8 | Zero page errors AND zero console errors | PASS | **PASS** (no change expected) |

### Acceptance / rubric impact

| Outcome | Dim-6 action | Other dim actions | Convergence (A.12 #3) |
|---------|--------------|--------------------|-----------------------|
| All 8 PCs PASS + 0 issues filed (expected) | **2 → 3** ✓ (THIRD score-3 dimension after dim 5 BDD + dim 14 Round-trip; deferred from walks 28 and 29 for honest measurement) | dim 17 Edge editing: 2 → 2 (reinforced via PC3; advance to 3 still gated on dedicated reconnect+waypoint+routing-style walk); dim 3 Ports: 2 → 2 (positive reinforcement); dim 27 Persistence: 2 → 2 (reinforced) | chain[0] → **chain[1] / 3** |
| 1–2 PCs regress vs walk-29 (e.g., PC5 now passes automated but PC1 or PC3 silently breaks) | demote 2 → 1 only on the specific regressed scenario; otherwise stays at 2 | partial gains where applicable | chain resets to **0**; file `p1` regression-tag issue |
| PC5 still FAIL automated (probe fix insufficient — third consecutive driver-side defect on the same PC) | stays at 2 | file `type:design` issue per iter-865 decisions log for a stable edge-probe helper (`tests/e2e/__helpers__/edge-probe.ts` or equivalent) — the cost has now been paid three times | chain stays at **0** |
| New blocker found mid-walk (PC1–PC2 path breaks) | demote to 1 | dim 15 (Palette) demote if a kind becomes uncreatable | chain stays at **0** |

Walk-30 is the **chain[0] candidate** after walks 28 + 29 both reset the chain via driver-side findings. Per A.5 a regression walk's job is to verify the fix and surface any regressions; a clean outcome is the expected result, but the rubric explicitly scores honesty over throughput. The dim-6 promotion is the load-bearing rubric move of this walk.

### Tool & environment

- **Deployed Pages bundle** at `https://michaeljfazio.github.io/mbse-workbench/`. Per A.6 this is the source of truth. Pages `last-modified: Mon, 18 May 2026 18:32:43 GMT` corresponds to the `vphase-15.8` / `v1.5.2` deploy (functional SHA `95fb6c2`); the execute iteration MUST re-verify `last-modified` before launching the driver. **No new release tag exists between walks 28, 29, and 30** — the bundle is unchanged.
- **Driver:** `artifacts/phase-15/walk-30/walk-30-exec.py` (gitignored per `artifacts/` rule). Cloned from `walk-29-exec.py`. Sole functional delta: replace the PC5 marker-end probe's `<path>` selector with one that targets the `BaseEdge`'s visible path carrying `marker-end`, skipping the marker triangle inside `<defs>`.

  Reference implementation (Python `evaluate` body, with `id` bound via `arg=new_flow`):

  ```python
  marker_info = page.evaluate(
      """(id) => {
          const g = document.querySelector(`[data-testid="ibd-edge-${id}"]`);
          if (!g) return null;
          // Find the BaseEdge path (carries marker-end), skipping the marker
          // triangle path inside <defs> which has no marker-end attribute.
          // Primary: CSS attribute selector. Fallback: enumerate and find
          // (tolerates browser quirks where attribute selectors misbehave on
          // SVG path elements). Final fallback: first path (matches the
          // pre-#508 behaviour so a complete miss still surfaces a verdict).
          const path =
              g.querySelector('path[marker-end]')
              || [...g.querySelectorAll('path')].find(p => p.hasAttribute('marker-end'))
              || g.querySelector('path');
          if (!path) return null;
          const markerEnd = path.getAttribute('marker-end');
          // Marker definition lookup is unchanged from walk-29 — the
          // <marker> element selector is separate from the <path> probe.
          const markerIdMatch = markerEnd && markerEnd.match(/url\\(#([^)]+)\\)/);
          const markerId = markerIdMatch ? markerIdMatch[1] : null;
          const marker = markerId ? document.getElementById(markerId) : null;
          const markerPath = marker ? marker.querySelector('path') : null;
          return {
              markerEnd,
              markerExists: Boolean(marker),
              markerPathD: markerPath ? markerPath.getAttribute('d') : null,
              markerPathFill: markerPath ? markerPath.getAttribute('fill') : null,
          };
      }""",
      arg=new_flow,
  )
  ```

  PC5 verdict computation then asserts `marker_info['markerEnd']` is a non-empty string matching `url(#ibd-itemflow-arrow-…)`, AND `marker_info['markerExists']` is `True`, AND `marker_info['markerPathD'] == 'M0 0 L12 6 L0 12 Z'` (or the equivalent path data for the filled triangle), AND the existing `FlightCommand` label assertion holds.

  The #505 settle-wait specified in walk-29.md § "Tool & environment" stays in place verbatim — it runs BEFORE this probe, guaranteeing the edge `<g>` and label `<div>` are mounted and the label text is committed. The walk-30 probe-selector fix is the next layer of correctness: the wait ensures the elements exist; the corrected selector ensures we read the right element.

  Beyond the PC5 probe-selector change, the driver inherits walk-29-exec.py byte-for-byte: all helpers, all PC sequencing, all screenshot points, all assertions. The `walk_29.json` delta-emit section becomes `walk_30.json` reading `walk-29.json` (one-character filename swap) and emitting `delta_vs_walk_29`.

- **Screenshots:** `artifacts/phase-15/walk-30/screenshots/`. One per phase plus full-screen captures at PC verification points. Expected count: ~10 (same as walks 28 and 29).
- **Structured outcome:** `artifacts/phase-15/walk-30/walk-30.json` — same shape as `walk-29.json`. The driver SHOULD additionally read `walk-29.json` and emit a `delta_vs_walk_29` section comparing PC verdicts so the close-out shows what moved (expected: PC5 flip from `FAIL` to `PASS` automated; all others unchanged).

### Expected duration

A.5 budgets regression walks at 15–45 minutes of agent execution. Walk-30's authoring flow is identical to walks 28 and 29, with no additional waits beyond walk-29's settle-wait — expected wall-clock ~3 minutes, same as walks 28 and 29.

### Out of scope (deferred, identical to walks 27–29)

- Right-click "Show in X" cross-diagram navigation (dim-13 score-3 walk).
- N>2 representations on one PartDefinition (dim-13 score-3 walk).
- Dim-17 (Edge editing) endpoint reconnect by drag, waypoint add/remove, routing-style per edge (incidental coverage only via PC3; dedicated dim-17 walk reserved for after dim 6 lands at 3 — walk-30's expected outcome unblocks this dedicated walk).
- Cross-diagram paste / duplicate workflows.
- Multi-context IBD coverage (`FCS_v2`, `FCS_alt`).
- `BindingConnection` (`=` symbol) — informs dim 11 not dim 6.
- Item-flow decomposition into sub-flows via dashed-line elaboration.

### Rubric snapshot at walk open

| Dim | Score | Last informed |
|-----|------:|---------------|
| 3 (Ports) | 2 | walk-29 (positive reinforcement) |
| 6 (IBD) | 2 | walk-29 (promotion to 3 deferred a second time — automated alignment with visual was the remaining gate; #508 fix in this walk is that alignment) |
| 13 (Cross-diagram coherence) | 2 | walk-26 (Pages-confirm) |
| 17 (Edge editing) | 2 | walk-29 (PC3 plain-line evidence reinforced; edge creation continues to work on unchanged bundle) |
| 27 (Persistence) | 2 | walk-29 (positive reinforcement; edges-survive-reload reconfirmed) |
| Convergence chain | 0 / 3 | walk-29 (reset by #508 filing) |

Phase-15 score-3 count at walk open: **2** (dim 5 BDD, dim 14 Round-trip integrity). Walk-30 targets dim 6 as the next score-3 candidate (third attempt).

### Open-issue snapshot at walk open

- 2 open `phase:15` `type:design` issues (#452 CI-velocity epic step 3; #454 raise A.8 cap — both blocked on #469 `status:needs-human`).
- 0 open `phase:15` `type:bug` issues (held since #499 + #500 closed at 18:24:11Z).
- 0 open `phase:15` `type:feature` issues.
- 0 open `phase:15` `type:chore` `status:ready` issues (held once #508 closes in iter-866 — this PR).
- 1 open `type:chore` `status:needs-human`: #469.

### Plan vs execute boundary

This file is the **Plan** per A.5. Sealed in iter-866. Any deviation during execution is captured as a finding, not as a plan amendment.

The execute iteration (next iter after this PR merges) will append `## Execution` / `## Findings` / `## Rubric score deltas` / `## Convergence chain (A.12 #3)` / `## Decide next` sections to this file, plus run the driver, capture screenshots, and update `quality-rubric.md`.

## Execution

**Iteration:** 867
**Executed:** 2026-05-19 (UTC)
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — `vphase-15.8` / `v1.5.2` deploy. Pages `last-modified: Mon, 18 May 2026 18:32:43 GMT` **re-verified at launch** (bit-for-bit unchanged from walks 28/29; no new release tag required for the driver-only fix).
**Driver:** `artifacts/phase-15/walk-30/walk-30-exec.py` (gitignored). Cloned byte-for-byte from `artifacts/phase-15/walk-29/walk-29-exec.py` with the sole functional delta being the PC5 marker-end probe-selector replacement specified in § "Tool & environment". The #505 settle-wait inherited from walk-29 is preserved verbatim.
**Wall-clock:** ~3 minutes (matches the walks 28/29 envelope; well inside the A.5 15–45 min regression-walk budget).
**Screenshots:** `artifacts/phase-15/walk-30/screenshots/` — 10 PNGs captured at phases 01–10 inclusive.
**Outcome JSON:** `artifacts/phase-15/walk-30/walk-30.json` — pass/fail verdicts, timings, IDs, measurements, and a `delta_vs_walk_29` section comparing PC verdicts.

### Pass-criteria results

| # | Criterion | Walk-30 verdict (automated) | Walk-30 verdict (visual) | Delta vs walk-29 |
|---|-----------|-----------------------------|--------------------------|------------------|
| 1 | Two PartUsages render nested in FCS enclosing-frame with acronym auto-names (`PFC_1`/`ADIRU_1`) | **PASS** (`n_parts=2`, `frame=✓`, `pfc_name='PFC_1'`, `adiru_name='ADIRU_1'`) | PASS | unchanged |
| 2 | Port handles render as 12×12 squares, radius 0 px | **PASS** (`cmd=12×12, radius='0px'`; `data=12×12, radius='0px'`) | PASS | unchanged |
| 3 | Drag-create `ConnectionUsage` — plain solid line, no arrowheads | **PASS** (`markerEnd=None`, `markerStart=None`, `strokeDasharray='none'`) | PASS | unchanged |
| 4 | Set `cmd` direction to `out`; direction glyph appears | **PASS** (`direction='out'`, `glyph='◀'`) | PASS | unchanged |
| 5 | Shift+drag → `ItemFlow`; payload `FlightCommand`; filled-triangle marker at target end | **PASS** (`markerEnd='url(#ibd-itemflow-arrow-2899f63e-eec6-4c5b-9589-08496dc7d84a)'`, `triangle=True`, `label='FlightCommand'`) | PASS | **FLIPPED FAIL → PASS automated** — #508 probe-selector fix succeeded; visual unchanged from walk-29 (was already PASS visually) |
| 6 | Proxy vs full port distinction | **PASS** (informational — only v2-default `port` surfaced, acceptable per `ibd.md` §D) | PASS | unchanged |
| 7 | Reload preserves full structure (parts + names + cmd direction + 1 connection + 1 item flow with `FlightCommand` label) | **PASS** (`parts=2`, `conns=1`, `flows=1`, `pfc_name='PFC_1'`, `adiru_name='ADIRU_1'`, `cmd_dir='out'`, `flow_label='FlightCommand'`) | PASS | unchanged |
| 8 | Zero page errors AND zero console errors | **PASS** (`page_errors=0`, `console_errors=0`) | PASS | unchanged |

**Aggregate: 8/8 PCs PASS automated; 8/8 PCs PASS visually.** First fully clean IBD walk against the deployed bundle. The expected outcome from the plan's acceptance table held exactly: PC5 flipped to PASS automated; all other PCs unchanged.

## Findings

**Zero new findings.** No new issues filed. The #508 probe-selector fix specified in the plan resolved the only outstanding driver-side defect without disturbing any other PC. The bundle has not changed between walks 28, 29, and 30 — and three consecutive regressions on the same artifact now produce identical visual outcomes with the test driver converged on those visuals.

The acceptance-table row "All 8 PCs PASS + 0 issues filed" is realised. This is the path of least resistance through walk-30; no decision-tree branches activated.

Informational notes preserved from walks 28/29:

- PC6 continues to surface only the v2-default `port` pattern (no `«proxy»` / `«full»` keyword distinction). Acceptable per `ibd.md` §D — the v2-default `port` IS the proxy pattern; `«full»` has no v2 equivalent.
- The visible filled-triangle arrowhead in `09-itemflow-created.png` is rendered by the SVG `<marker>` element referenced by `BaseEdge`'s `marker-end="url(#ibd-itemflow-arrow-…)"` attribute; the `<marker>` lives inside an SVG `<defs>` and contains its own `<path d="M0 0 L12 6 L0 12 Z" fill={stroke}/>`. The walk-30 probe correctly identifies and traverses both elements.

## Rubric score deltas

| Dim | Old | New | Rationale |
|-----|-----|-----|-----------|
| 6 (SysML conformance — IBD) | 2 | **3** | **THIRD score-3 dimension** after dim 5 (BDD) and dim 14 (Round-trip integrity). All four score-3 IBD criteria from A.10 are now met against the deployed `vphase-15.8` bundle, with automated probe alignment honest-measurement passing: (a) **Parts as nested blocks within an enclosing block context** — PC1 PASS (PartUsages `PFC_1`/`ADIRU_1` nested inside `ibd-enclosing-frame-${fcsId}` with the FCS PartDefinition as the context, per ADR 0003 + `ibd.md` §A); (b) **Ports on parts** — PC2 PASS (12×12 squares with 0 px radius, `ibd.md` §A geometry); (c) **Connected via `ConnectionUsage`** — PC3 PASS (plain solid bezier between `PFC_1.cmd` and `ADIRU_1.data`, no arrowheads, `strokeDasharray='none'`, `ibd.md` §B); (d) **Item flows along connections** — PC5 PASS (filled-triangle arrowhead `M0 0 L12 6 L0 12 Z` at `ADIRU_1.data`, `FlightCommand` payload label, `ibd.md` §C); (e) **Proxy/full distinction where applicable** — PC6 PASS (v2-default `port` pattern surfaces as the proxy pattern per `ibd.md` §D — `«full»` has no v2 equivalent). Persistence reload reinforces the full structure (PC7 PASS) and the bundle is page-error-clean (PC8 PASS). Pages `last-modified: 18:32:43 GMT` confirms the same `vphase-15.8` artifact that walks 28/29 measured. |
| 3 (Visual fidelity — ports) | 2 | 2 | Pages-regression — third consecutive PC2 PASS reinforcement. 12×12 square geometry + 0 px border-radius on both `pfc_1.cmd` and `adiru_1.data`. Direction glyph `◀` rendered after setting `cmd` direction to `out`. Score 3 still gated on comprehensive direction coverage across all four boundary positions + `~Type` conjugate-port distinction. |
| 17 (Edge editing affordances) | 2 | 2 | Pages-regression — third consecutive PC3 PASS reinforcement (`ConnectionUsage` drag-create renders plain solid bezier on the unchanged bundle). Score 3 still gated on reconnect-by-endpoint-drag + waypoint add/remove + per-edge routing-style (dedicated dim-17 walk unblocks now that dim 6 lands at 3 — see "Decide next" below). |
| 27 (Persistence) | 2 | 2 | Pages-regression — third consecutive PC7 PASS reinforcement. Full IBD authoring state (parts + names + port direction + 1 ConnectionUsage + 1 ItemFlow with `'FlightCommand'` label) round-trips through sessionStorage on the unchanged bundle. Score 3 still gated on multi-project switching state preservation. |

## Convergence chain (A.12 #3)

**Status: chain[0] → chain[1] / 3.**

Walk-30 advances the convergence chain by one because no new issues were filed and the rubric did not degrade (dim 6 advanced, dims 3/17/27 reinforced positively). Chain progress under the A.12 #3 protocol:

- **chain[1]** — walk-30 (this walk): IBD regression on `vphase-15.8`, 8/8 PCs PASS automated + visual, zero issues filed, three rubric dims reinforced, one dim advanced 2 → 3.
- **chain[2]** — TBD walk (next regression or broad-sweep on the same or a successor bundle, must file zero issues with zero rubric degradation).
- **chain[3]** — TBD walk (third consecutive zero-issue walk = convergence).

A subsequent walk that files even one issue or degrades any rubric dim resets the chain to 0. Per A.12 #3 the chain must reach 3 to satisfy that termination clause, jointly with rubric saturation (A.12 #1), zero open phase:15 work (A.12 #2), FBW example shipped (A.12 #4), and final tags + green CI (A.12 #5, #6).

## Decide next

The clean walk-30 outcome unblocks the iter-868+ trajectory described in walk-30's plan and in `STATUS.md`. The next iteration should be a **broad-sweep walk** (walk-31), per A.6's recommendation that a broad-sweep confirm no broad-coverage regressions before committing the FBW example. The broad-sweep should:

- Touch every viewpoint with shallow modelling (BDD, IBD, Requirements, Activity, State Machine, Use Case, Parametric, Package).
- Verify the eight `vphase-15.8` fixes (acronym auto-name, `ConnectionMode.Loose`) do not leak unexpected behaviour into other viewpoints.
- Re-verify positive evidence on dims 1–4 (visual fidelity), 18 (explorer), 19 (inspector), 24 (empty state), and 25 (accessibility) at the resolution a regression sweep can reach.
- Inform a follow-up dim selection — likely dims 8/9/11 (Activity / State Machine / Parametric SysML conformance) as the next deep-dive candidates given dim 6 is now satisfied.

If walk-31 also files zero issues, chain[2] / 3 advances; one more clean walk after that satisfies A.12 #3.

The FBW example commit (A.12 #4) does not need to wait for the convergence chain to complete — A.12 #4 requires only that dim 6 reach 3 and the example loads via UI without console errors. With dim 6 at 3 the FBW model authoring effort can be planned in parallel with walk-31 (per the A.6 coverage targets — ≥50 PartDefinitions, ≥100 PartUsages, ≥60 ConnectionUsages, etc.). Decision on whether to start the FBW build now or hold for walk-31 will be made at iter-868 open after re-reading `STATUS.md` and the post-walk-30 phase-15 issue census.

The dedicated **dim-17 walk** (reconnect-by-endpoint-drag + waypoint add/remove + per-edge routing-style per edge) is now unblocked and can be scheduled after either walk-31 or alongside FBW work depending on iter-868's prioritisation.

**No new issues filed this iteration.** **No `type:design` issues opened** — the iter-865 contingency clause for a `tests/e2e/__helpers__/edge-probe.ts` stable helper does not trigger because the cost was paid only twice (#505 in walk-28 → settle-wait fix; #508 in walk-29 → probe-selector fix) and walk-30 closes the IBD-probe arc cleanly without a third occurrence.
