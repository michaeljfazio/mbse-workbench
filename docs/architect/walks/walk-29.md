# Walk 29 — Regression of walk-28 (IBD deep-dive on `vphase-15.8` Pages, post-#505 driver fix)

**Iteration:** 864 (plan-seal); execution iteration TBD (likely iter-865)
**Walk type:** Regression (A.5: 15–45 min; re-executes a prior walk's scenario after an engineer batch has landed, verifying fixes and surfacing regressions)
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — the deployed `vphase-15.8` / `v1.5.2` artifact. Functional SHA `95fb6c2`. Pages `last-modified: Mon, 18 May 2026 18:32:43 GMT`. **No new release tag required for walk-29** — the only change between walk-28 and walk-29 is the test-driver settle-wait fix (#505); the workbench bundle is bit-for-bit unchanged.

## Plan

Walk-29 is the regression of walk-28 (iter-863) following the iter-864 driver-side fix that closed #505 (PC5 marker-probe brittleness to inspector-edit re-render). Walk-28's verdict was **7/8 PCs PASS automated; 8/8 PCs PASS by visual inspection**, with PC5 failing in the automated path because `document.querySelector('[data-testid="ibd-edge-${id}"]')` returned `null` at probe time — the inspector's item-type Enter commit triggers a model update that re-renders `ItemFlowEdge`, and the probe caught the transiently torn-down `<g>` wrapper. The product behaviour was correct (visually confirmed in `09-itemflow-created.png` from walk-28); only the driver needed a settle-wait. Walk-29 re-runs the same eight PCs verbatim with the settle-wait pattern in place, expecting a clean 8/8 automated PASS.

Walk-29 is the **chain[1] candidate** after walk-28's chain[0] result. A clean walk-29 simultaneously:

- promotes dim 6 (IBD) from 2 to **3** (THIRD score-3 dimension after dim 5 BDD and dim 14 Round-trip integrity) — the dim-6 promotion was deferred from walk-28 to honour A.5's "scores honesty over throughput" requirement that automated alignment match visual;
- reinforces dim 17 (Edge editing) at 2 with a second pass on PC3 (drag-create plain-line `ConnectionUsage`) — no advance to 3 because score-3 still requires reconnect-by-endpoint-drag + waypoint add/remove + per-edge routing-style (dedicated dim-17 walk reserved for after dim 6 lands at 3);
- advances the convergence chain from **chain[0]** to **chain[1] / 3**.

If issues are filed, the chain stays at 0 and the rubric records measurement deltas per the walk-28 acceptance table (re-applied for walk-29).

### Background

Walk-28's root-cause analysis (preserved in `docs/architect/walks/walk-28.md` § F-28-1) identified the PC5 marker-probe miss as a driver-side race: the probe ran immediately after `page.locator('[data-testid="inspector-item-type"]').press("Enter")`, and the inspector's item-type commit dispatches an update through the command bus, which re-renders the `ItemFlowEdge` component. React's commit phase transiently unmounts the edge `<g>` wrapper before remounting it with the updated label; the probe caught the unmounted state and returned `null` for the entire JS evaluate. Issue #505 was filed as `p3 type:chore area:cross-cutting` with the one-line resolution sketch: insert a `page.wait_for_function` settle-wait between the Enter press and the marker probe, asserting that BOTH the edge `<g>` AND the label `<div>` are reattached AND the label's text content equals `"FlightCommand"` (the committed item type).

The conventions exercised here remain those documented in `docs/architect/diagram-types/ibd.md` § "2026-05-19 — Deep-dive conventions (walk-27 prereq)". No new research is required; the plan deltas are entirely on the test-driver side, not on the workbench or the conventions side.

### Scope

Identical to walk-28. The walk authors the same `FCS Pkg` / `FCS` / `PFC` / `ADIRU` skeleton with `PFC_1` / `ADIRU_1` PartUsages (acronym branch from #500), `cmd : Cmd` / `data : Cmd` ports, one `ConnectionUsage` between them, and one `FlightCommand` `ItemFlow` along the connection. Same enclosing structure, same context.

### Pass criteria (eight — identical to walk-28)

| # | Criterion | Walk-28 verdict | Walk-29 expectation |
|---|-----------|-----------------|---------------------|
| 1 | Two PartUsages render nested inside the FCS enclosing-frame with their acronym auto-names (`PFC_1`/`ADIRU_1`) visible | PASS | **PASS** (no change expected) |
| 2 | Port handles render as 12 × 12 squares with sharp corners (radius 0px) | PASS | **PASS** (no change expected) |
| 3 | Drag-create `ConnectionUsage` between `PFC_1.cmd` and `ADIRU_1.data` — plain solid line, no arrowheads (`markerEnd=null`, `markerStart=null`, `strokeDasharray='none'`) | PASS | **PASS** (no change expected) |
| 4 | Set port direction to `out`; direction glyph appears on the port | PASS | **PASS** (no change expected) |
| 5 | Shift+drag → `ItemFlow` with payload type `FlightCommand`; filled-triangle marker at target end | **FAIL automated** (probe → `null`); PASS visual | **PASS automated** — #505 settle-wait waits for the edge `<g>` AND the `FlightCommand` label to reattach before probing; the marker probe then resolves to the populated `{markerEnd: 'url(#…)', markerExists: true, markerPathD: 'M0 0 L12 6 L0 12 Z', markerPathFill: '…'}` shape per `ibd.md` §C |
| 6 | Proxy vs full port distinction (where applicable) | PASS (informational) | **PASS** (no change expected — `ibd.md` §D accepts v2-default `port` as the proxy pattern) |
| 7 | Reload preserves the full structure (parts + names + cmd direction + 1 connection + 1 item flow with `FlightCommand` label) | PASS | **PASS** (no change expected) |
| 8 | Zero page errors AND zero console errors | PASS | **PASS** (no change expected) |

### Acceptance / rubric impact

| Outcome | Dim-6 action | Other dim actions | Convergence (A.12 #3) |
|---------|--------------|--------------------|-----------------------|
| All 8 PCs PASS + 0 issues filed (expected) | **2 → 3** ✓ (THIRD score-3 dimension after dim 5 BDD + dim 14 Round-trip; was deferred from walk-28 for honest measurement) | dim 17 Edge editing: 2 → 2 (reinforced via PC3; advance to 3 still gated on dedicated reconnect+waypoint+routing-style walk); dim 3 Ports: 2 → 2 (positive reinforcement); dim 27 Persistence: 2 → 2 (reinforced) | chain[0] → **chain[1] / 3** |
| 1–2 PCs regress vs walk-28 (e.g., PC5 now passes automated but PC1 or PC3 silently breaks) | demote 2 → 1 only on the specific regressed scenario; otherwise stays at 2 | partial gains where applicable | chain resets to **0**; file `p1` regression-tag issue |
| PC5 still FAIL automated (settle-wait insufficient) | stays at 2 | file `p2 type:chore` follow-up for a stronger settle-wait (e.g., wait on a non-React-Flow stable selector or extend the wait to include `requestAnimationFrame` boundary) | chain stays at **0** |
| New blocker found mid-walk (PC1–PC2 path breaks) | demote to 1 | dim 15 (Palette) demote if a kind becomes uncreatable | chain stays at **0** |

Walk-29 is the **first chain[1] candidate** after walk-28. Per A.5 a regression walk's job is to verify the fix and surface any regressions; a clean outcome is the expected result, but the rubric explicitly scores honesty over throughput. The dim-6 promotion is the load-bearing rubric move of this walk.

### Tool & environment

- **Deployed Pages bundle** at `https://michaeljfazio.github.io/mbse-workbench/`. Per A.6 this is the source of truth. Pages `last-modified: Mon, 18 May 2026 18:32:43 GMT` corresponds to the `vphase-15.8` / `v1.5.2` deploy (functional SHA `95fb6c2`); the execute iteration MUST re-verify `last-modified` before launching the driver. **No new release tag exists between walk-28 and walk-29** — the bundle is unchanged.
- **Driver:** `artifacts/phase-15/walk-29/walk-29-exec.py` (gitignored per `artifacts/` rule). Cloned from `walk-28-exec.py`. Sole functional delta: insert a `page.wait_for_function` settle-wait between the inspector-item-type `Enter` press and the marker probe in the PC5 phase. The settle-wait MUST assert:
  1. The edge `<g>` is reattached: `document.querySelector('[data-testid="ibd-edge-${id}"]')` is non-null.
  2. The label is reattached: `document.querySelector('[data-testid="ibd-edge-label-${id}"]')` is non-null.
  3. The label's text content has committed: `.textContent.trim() === 'FlightCommand'`.

  Reference implementation (Python, with `id` bound via `arg=new_flow`):

  ```python
  page.wait_for_function(
      """(id) => {
          const edge = document.querySelector(`[data-testid="ibd-edge-${id}"]`);
          const label = document.querySelector(`[data-testid="ibd-edge-label-${id}"]`);
          return Boolean(
              edge
              && label
              && label.textContent
              && label.textContent.trim() === 'FlightCommand'
          );
      }""",
      arg=new_flow,
      timeout=5_000,
  )
  ```

  This pattern guarantees React has finished the commit phase (label text reflects the committed `itemTypeName`) AND both DOM nodes the probe will read are mounted. The probe runs after this wait resolves.

  Beyond the PC5 settle-wait, the driver inherits walk-28-exec.py byte-for-byte: all helpers, all PC sequencing, all screenshot points, all assertions. The `walk_28.json` delta-emit section becomes `walk_29.json` reading `walk-28.json` (one-character filename swap) and emitting `delta_vs_walk_28`.

- **Screenshots:** `artifacts/phase-15/walk-29/screenshots/`. One per phase plus full-screen captures at PC verification points. Expected count: ~10 (same as walk-28).
- **Structured outcome:** `artifacts/phase-15/walk-29/walk-29.json` — same shape as `walk-28.json`. The driver SHOULD additionally read `walk-28.json` and emit a `delta_vs_walk_28` section comparing PC verdicts so the close-out shows what moved (expected: PC5 flip from `FAIL` to `PASS` automated; all others unchanged).

### Expected duration

A.5 budgets regression walks at 15–45 minutes of agent execution. Walk-29's authoring flow is identical to walk-28's, plus a sub-second settle-wait per PC5 — expected wall-clock ~3 minutes, same as walk-28.

### Out of scope (deferred, identical to walks 27–28)

- Right-click "Show in X" cross-diagram navigation (dim-13 score-3 walk).
- N>2 representations on one PartDefinition (dim-13 score-3 walk).
- Dim-17 (Edge editing) endpoint reconnect by drag, waypoint add/remove, routing-style per edge (incidental coverage only via PC3; dedicated dim-17 walk reserved for after dim 6 lands at 3 — walk-29's expected outcome unblocks this dedicated walk).
- Cross-diagram paste / duplicate workflows.
- Multi-context IBD coverage (`FCS_v2`, `FCS_alt`).
- `BindingConnection` (`=` symbol) — informs dim 11 not dim 6.
- Item-flow decomposition into sub-flows via dashed-line elaboration.

### Rubric snapshot at walk open

| Dim | Score | Last informed |
|-----|------:|---------------|
| 3 (Ports) | 2 | walk-28 (positive reinforcement) |
| 6 (IBD) | 2 | walk-28 (promotion to 3 deferred for honest measurement — automated alignment with visual was the remaining gate; walk-29 is that alignment) |
| 13 (Cross-diagram coherence) | 2 | walk-26 (Pages-confirm) |
| 17 (Edge editing) | 2 | walk-28 (PC3 plain-line evidence + edge creation no longer broken) |
| 27 (Persistence) | 2 | walk-28 (positive reinforcement; edges-survive-reload confirmed) |
| Convergence chain | 0 / 3 | walk-28 (reset by #505 filing) |

Phase-15 score-3 count at walk open: **2** (dim 5 BDD, dim 14 Round-trip integrity). Walk-29 targets dim 6 as the next score-3 candidate.

### Open-issue snapshot at walk open

- 2 open `phase:15` `type:design` issues (#452 CI-velocity epic step 3; #454 raise A.8 cap — both blocked on #469 `status:needs-human`).
- 0 open `phase:15` `type:bug` issues (held since #499 + #500 closed at 18:24:11Z).
- 0 open `phase:15` `type:feature` issues.
- 0 open `phase:15` `type:chore` `status:ready` issues (held since #505 closes in iter-864 — this PR).
- 1 open `type:chore` `status:needs-human`: #469.

### Plan vs execute boundary

This file is the **Plan** per A.5. Sealed in iter-864. Any deviation during execution is captured as a finding, not as a plan amendment.

The execute iteration (next iter after this PR merges) will append `## Execution` / `## Findings` / `## Rubric score deltas` / `## Convergence chain (A.12 #3)` / `## Decide next` sections to this file, plus run the driver, capture screenshots, and update `quality-rubric.md`.

## Execution

**Iteration:** 865 (2026-05-19). **Driver:** `artifacts/phase-15/walk-29/walk-29-exec.py` (gitignored per `artifacts/` rule), cloned byte-for-byte from `walk-28-exec.py` with one functional delta: the `page.wait_for_function` settle-wait specified in § "Tool & environment" inserted between the inspector-item-type `Enter` press and the PC5 marker probe. **Target:** deployed `vphase-15.8` Pages bundle. **Pre-launch verification:** `curl -sI https://michaeljfazio.github.io/mbse-workbench/` returned `last-modified: Mon, 18 May 2026 18:32:43 GMT` — confirmed unchanged from walk-28's measurement (no new release tag between walks; functional SHA `95fb6c2`). **Browser:** headless Chromium via Playwright `sync_api`; 1440×900 viewport; networkidle wait on goto. **Wall clock:** ~3 minutes (`app_load = 1507 ms`).

**Outcome:** **7/8 PCs PASS automated; 8/8 by visual inspection** of `screenshots/09-itemflow-created.png` (filled-triangle arrowhead at `ADIRU_1.data`, `FlightCommand` label committed on the bezier path, inspector populated). Identical pattern to walk-28: PC5 fails automated, visual PASS holds.

| # | Verdict | Detail |
|---|---------|--------|
| PC1 | PASS | `n_parts=2, frame=✓, pfc_name='PFC_1', adiru_name='ADIRU_1'` (acronym auto-name from #500 verified again). |
| PC2 | PASS | `cmd=12×12 radius='0px'`, `data=12×12 radius='0px'`. |
| PC3 | PASS | `markerEnd=None, markerStart=None, strokeDasharray='none'` — `ConnectionMode.Loose` from #499 verified again. |
| PC4 | PASS | `direction='out'`, glyph `'◀'`. |
| **PC5** | **FAIL automated; PASS visual** | `markerEnd='', triangle=True, label='FlightCommand'`. The #505 settle-wait worked — the probe ran with the edge `<g>` AND the label `<div>` reattached AND `label.textContent.trim() === 'FlightCommand'` (the wait would otherwise have timed out). But the marker-end attribute read returned `null` because of a different driver-side defect (see § Findings). |
| PC6 | PASS | Only v2-default proxy pattern surfaced — acceptable per `ibd.md` §D. |
| PC7 | PASS | Reload preserves `parts=2`, `conns=1`, `flows=1`, names, port direction, item-flow label `'FlightCommand'`. |
| PC8 | PASS | 0 page errors, 0 console errors. |

**Delta vs walk-28:** PC5 verdict text changes shape (`markerEnd=null` from a torn-down `<g>` → `markerEnd=''` from a stably-mounted `<g>` with a wrong-element probe read). All other PCs identical, as predicted by the plan's "no change expected" column. The structural delta (`walk_28 vs walk_29` in `walk-29.json`'s `delta_vs_walk_28` section) confirms: PC1–PC4 + PC6–PC8 byte-identical; PC5 reshaped per above.

## Findings

### F-29-1 — PC5 driver probe selects wrong `<path>` element (filed as #508)

**Severity:** `p3 type:chore area:cross-cutting` (driver-side measurement defect, not a product defect; no architect modeling blocked; one-line fix).

**Root cause:** The probe at `walk-29-exec.py` line ~745 uses `g.querySelector('path')` to read the BaseEdge's `marker-end` attribute. Per `src/viewpoints/ibd/ItemFlowEdge.tsx` lines 48–73 the `<g data-testid="ibd-edge-${id}">` contains, in document order:

1. `<defs><marker id="ibd-itemflow-arrow-${id}"><path d="M0 0 L12 6 L0 12 Z" fill={stroke}/></marker></defs>` — the FIRST `<path>` in the group; lives inside `<defs>` and has no `marker-end` attribute.
2. `<BaseEdge .../>` — renders as a `<path>` with `marker-end="url(#ibd-itemflow-arrow-${id})"`; this is the SECOND `<path>`.

`g.querySelector('path')` returns (1), the marker's interior triangle path, which has no `marker-end`. The probe correctly reads `markerExists=true` and the correct `markerPathD`/`markerPathFill` from a separate `marker` selector, but the `marker-end` attribute read goes to the wrong element. **The product is correct in every measurable way:** filled-triangle marker definition exists, BaseEdge path renders with the marker applied (screenshot confirms), label commits to `'FlightCommand'`, persistence holds across reload. Only the driver's probe selector is wrong.

**Distinction from #505:** #505 was the settle-wait issue — the probe ran while React was mid-commit and the entire `<g>` wrapper was transiently torn down, so `g.querySelector('path')` returned `null`. The #505 fix (the settle-wait specified in walk-29.md) DID work — it correctly waited until the edge AND label were both mounted AND the label text had committed. That fix is verified by this walk. #508 is a separate driver-side defect that the #505 fix exposed by getting past the unmount race.

**Fix:** Replace the probe's path selector with `g.querySelector('path[marker-end]')` or the explicit walk past `<defs>`. Forward-fix lands in walk-30's `walk-30-exec.py` per the gitignore policy and is documented in walk-30.md § "Tool & environment" prior to walk-30 execution. Issue acceptance is the corrected probe shape recorded in that file.

**No other findings.** PC1–PC4, PC6, PC7, PC8 inherit walk-28's PASS verdicts unchanged; the bundle is bit-for-bit identical so the structural assertions cannot have moved.

## Rubric score deltas

| Dim | Old | New | Rationale |
|-----|----:|----:|-----------|
| 6 (IBD) | 2 | **2** | Pages-regression of walk-28 against `vphase-15.8` (unchanged bundle). 7/8 PCs PASS automated; 8/8 visually. The #505 settle-wait fix DID work (the probe correctly waited until React's commit phase resolved). PC5 still FAIL automated due to #508 (driver probe selects wrong `<path>` element). **Score-3 promotion deferred again** to walk-30 regression after #508 fix lands. Honest-measurement standard (A.5) again chosen over throughput. |
| 17 (Edge editing) | 2 | **2** | Pages-regression. PC3 PASS reinforced — `ConnectionMode.Loose` plain-line `ConnectionUsage` creation continues to work on the unchanged bundle. No advance to 3 (still gated on reconnect-by-endpoint-drag + waypoint + routing-style — dedicated dim-17 walk reserved for after dim 6 reaches 3). |
| 27 (Persistence) | 2 | **2** | Pages-regression. PC7 PASS reinforced — reload preserves `parts=2`, `conns=1`, `flows=1`, names, direction, and item-flow label `'FlightCommand'` on the unchanged bundle. Score 3 still reserves multi-project switching coverage. |

## Convergence chain (A.12 #3)

**Status:** `chain[0] / 3`. Walk-29 surfaced a finding (#508 — driver-side, A.5 strict reading: "rubric explicitly scores honesty over throughput"). Even though the product is correct in every visual and structural sense (and the #505 fix this walk was designed to verify is itself verified), a new issue was filed; per A.5 the chain does not advance.

**Reset rationale:** Two consecutive walks (28, 29) have now failed dim-6 score-3 promotion for distinct driver-side reasons (#505 settle-wait, then #508 probe-selector). Both findings are `p3 type:chore`. The product behaviour has been steady across both walks — bit-for-bit identical bundle (`95fb6c2`), identical visual output. The convergence chain stays at 0; the next chain[0] candidate is walk-30 (regression of walk-29 after #508 fix).

## Decide next

**Iter-866 — execute walk-30** as the chain[0] candidate. Walk-30 is itself a regression of walk-29 (re-running the same eight PCs) with the #508 driver-probe fix in place. The driver inherits walk-29-exec.py byte-for-byte except for the PC5 marker-end probe selector, which becomes `g.querySelector('path[marker-end]')` (or equivalent). Expected outcome: 8/8 PCs PASS automated; dim 6 promotion 2 → **3** (THIRD score-3 dimension); chain[0] → chain[1] / 3; #508 closes.

**If walk-30 also fails for some new reason:** chain stays at 0; file the finding; dim 6 stays at 2. Two consecutive driver-side findings on the same PC suggests the probe shape itself is fragile and a dedicated `tests/e2e/__helpers__/edge-probe.ts` or equivalent stable selector pattern should be invested in — that would be a `type:design` issue at that point.

**Walks 31 + 32** become the chain[1]/chain[2] candidates after walk-30 lands cleanly. The plan for them stays as previously stated (broad-sweep walk-30 was the original chain[2] candidate, but the #508 finding now consumes that slot — walks 30/31/32 collectively now form the convergence chain).

**FBW example (A.12 #4):** unblocks the iteration after dim 6 reaches 3 — currently expected iter-867 or iter-868 (post-walk-30 clean).

**#469 (CI step 3, merge queue):** no further loop work. `status:needs-human` unchanged.

**ADR for raising A.8 cap (#454):** indefinitely blocked behind #469.
