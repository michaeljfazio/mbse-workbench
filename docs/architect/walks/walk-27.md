# Walk 27 — IBD deep-dive (dim 6 score-3 promote + convergence chain[3])

**Iteration:** 857 (plan-seal); execution iteration TBD
**Walk type:** Deep dive (A.5: 1–3 hours; pushes a single viewpoint hard, exercises rare relationships and edge cases)
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — the deployed `vphase-15.7` / `v1.5.1` artifact. Functional SHA `4c5cc41`. Pages `last-modified: Mon, 18 May 2026 16:17:04 GMT`. Per A.6 the Pages deploy is the source of truth.

## Plan

Walk-27 is the IBD deep-dive that walks 14, 24, 25, and 26 deferred. It exercises every dim-6 score-3 requirement from `quality-rubric.md`:

> *"Parts as nested blocks within an enclosing block context. Ports on parts, connected via `ConnectionUsage`. Item flows along connections. Proxy ports vs full ports distinguished where applicable."*

Walk-27 is the **chain[3] candidate** in the A.12 #3 convergence sequence: a clean walk-27 simultaneously delivers the third consecutive zero-issue walk **and** dim-6 → 3 (the third score-3 dimension after dim 5 BDD and dim 14 Round-trip integrity). If issues are filed, the chain resets to 0 but the rubric still gains useful measurement data on dim 3 (Ports), dim 6 (IBD), and possibly dim 17 (Edge editing).

### Background research

The conventions exercised in this walk are documented (with primary-source citations) in `docs/architect/diagram-types/ibd.md` § "2026-05-19 — Deep-dive conventions (walk-27 prereq)" — that section was sealed in this same iter-857 PR before walk-27 was planned. Walk-27 verifies the workbench against those documented conventions, not against ad-hoc visual intuition.

Key conventions (full citations in `ibd.md`):

- **Port shape:** small rectangle (square) **overlapping** the boundary of its owning block / part node. Anywhere on the four edges; not snapped to compass midpoints (SysML v2 §8.2.3.12).
- **Direction visualisation:** arrow perpendicular to the boundary edge inside the port square; `inout` as `<>` (SysML 1.5 §9.3.1.6 / v2 §8.2.3.12 `pdh`/`pdv` productions).
- **Conjugate port label:** `~TypeName` prefix in v2 style (the workbench convention we adopt).
- **Connection default:** plain solid line, **no arrowheads** at either end (SysML v2 §7.13 / Table 11; SysML 1.5 Table 8.4 `BidirectionalConnector`).
- **Connection with direction indication:** open arrowhead at the target end (v2 `a-direction` adornment).
- **Item flow on connection:** solid (filled) triangle arrowhead riding **on the connector line itself** toward the target end (SysML 1.5 §9.3.1.5; v2 Annex A §A.5).
- **Item flow label:** `name : ItemType` placed on the connection, optionally `«flow»`-prefixed (v2 §8.2.3.16 `flow-on-connection`).
- **Proxy vs full port (v1.x):** rendered as boundary squares differentiated by `«proxy»` / `«full»` keyword. In v2 the default `port` is the proxy pattern; `«full»` has no v2 equivalent — port with composite `PortDefinition` plays the same role.

### Scope

| Element | Kind | Count | Notes |
|---------|------|------:|-------|
| `FCS Pkg` | Package | 1 | container; carries the BDD representation |
| `FCS` | PartDefinition | 1 | IBD context (enclosing frame) — same as walk-25/26 |
| `PFC` | PartDefinition | 1 | first nested PartUsage type — primary flight computer |
| `ADIRU` | PartDefinition | 1 | second nested PartUsage type — air data inertial reference unit |
| `pfc_1`, `adiru_1` | PartUsage on `FCS` | 2 | the nested-parts test — rendered inside the enclosing frame |
| `cmd : Cmd` | PortUsage on `pfc_1` | 1 | first port — square on `pfc_1`'s boundary |
| `data : Cmd` | PortUsage on `adiru_1` | 1 | second port — square on `adiru_1`'s boundary; `~Cmd` form is preferred if conjugate-port semantics are exercised |
| `pfc_to_adiru` | ConnectionUsage | 1 | connects `pfc_1.cmd` ↔ `adiru_1.data` |
| `FlightCommand` flow | ItemFlow on the connection | 1 | typed item flow along `pfc_to_adiru`, direction `pfc_1.cmd → adiru_1.data` |
| 1 × BDD | representation on `FCS Pkg` | 1 | reuse — verifies cross-diagram coherence with walk-25/26 |
| 1 × IBD | representation on `FCS` | 1 | the focus of this walk |

The walk is **additive** to walks 25/26 — it builds the dim-6 deep-dive structure inside the same `FCS Pkg` / `FCS` skeleton, so the BDD↔IBD coherence the prior walks measured is implicitly re-verified.

### Pass criteria (eight)

| # | Criterion | Rubric dim. informed |
|---|-----------|----------------------|
| 1 | After creating `pfc_1` and `adiru_1` as PartUsages on `FCS` (via Inspector "Add part" / palette drag / tree menu — whichever the canonical UX surfaces), both render as **nested block nodes inside the enclosing-frame** of the FCS IBD with their labels visible and editable. | dim 6 (IBD nested parts) |
| 2 | After adding `cmd : Cmd` to `pfc_1` and `data : Cmd` to `adiru_1` (via Inspector "+ Add port" or palette drag), each port renders as a **small square on the part-node's boundary** (per `ibd.md` §A). `getBoundingClientRect()` confirms square geometry (`width === height ± 2 px`) and edge-overlapping placement. | dim 3 (Ports), dim 6 |
| 3 | Drag-create a **connection edge** between `pfc_1.cmd` and `adiru_1.data`. The edge renders as a **plain solid line with no arrowheads** (per `ibd.md` §B — the default bidirectional `connection`). SVG path is `stroke-dasharray: none` and neither endpoint marker is an arrowhead. | dim 6 (ConnectionUsage), dim 17 (Edge editing) |
| 4 | Set direction on `pfc_1.cmd` to `out` (via Inspector). A **direction indicator** (arrow perpendicular to boundary, or `out`/`in`/`inout` label) appears on the port-square per `ibd.md` §A. | dim 3 (port direction) |
| 5 | Add an `ItemFlow` on the connection (via canvas right-click / Inspector / edge palette — whichever the UX surfaces) with payload type `FlightCommand`. The connection acquires a **solid-triangle arrowhead** (or v2 `flow-node` decoration) at the `adiru_1.data` end per `ibd.md` §C. Flow label format `name : ItemType` per `ibd.md` §C. | dim 6 (ItemFlow), dim 2 (Edge endpoints decoration) |
| 6 | Proxy-vs-full port distinction: if the workbench surfaces both kinds, verify visual distinction (per `ibd.md` §D — `«proxy»` keyword vs `«full»` keyword, or v2-style plain `port` vs port with composite `PortDefinition`). If only one kind is surfaced, **record the absence as a finding** (not a failure) — score 3 still requires the distinction to be visible *where applicable*. | dim 6 (proxy vs full) |
| 7 | Reload the page (`localStorage` preserved). The full IBD structure persists: 1 enclosing frame + 2 nested PartUsages + 2 ports + 1 connection + 1 item flow all reappear with the same names, the same geometric layout (within React Flow's tolerance), and the same direction/flow decorations. | dim 27 (Persistence) — incidental |
| 8 | Zero page errors and zero console errors across all phases of the walk. | dim 6 (broad cleanliness) — incidental |

### Acceptance / rubric impact

| Outcome | Dim-6 action | Other dim actions | Convergence (A.12 #3) |
|---------|--------------|--------------------|-----------------------|
| All 8 PCs PASS + 0 issues filed | **2 → 3** ✓ (THIRD score-3 dimension after dim 5 BDD + dim 14 round-trip) | dim 3 Ports: opportunistic 2 → 3 if PCs 2+4 unambiguous; dim 17 Edge editing: 1 → 2 if PC 3 holds; dim 27 Persistence: 2 → 2 (already at 2, reinforced) | chain[2] → **chain[3] / 3 → A.12 #3 trigger** |
| 1–2 PCs fail, others pass | stays at 2 (insufficient to promote to 3) | partial gains where applicable | chain resets to **0** |
| 3+ PCs fail | demote 2 → 1 only if a previously-passing scenario regressed (otherwise stays at 2) | partial gains; flag dim 6 score-3 path as needing dedicated engineer batches | chain resets to **0** |
| Walk blocked by missing affordance (e.g., no UI to add PartUsage to a PartDefinition) | stays at 2; **file `p1` `area:viewpoint:ibd` issue** for the missing affordance | dim 15 (Palette) demote 2 → 1 if a kind is completely uncreatable | chain resets to **0**; subsequent regression walk after the affordance lands |

Walk-27 is the **first** walk to attempt dim-6 score-3 promotion. Per A.5 deep-dives are expected to "exercise rare relationships and edge cases" — finding issues is not failure, it is the walk's job. The risk-balance noted in walk-26's decide-next is real: a clean walk-27 is the best outcome but a partial walk-27 is a useful outcome.

### Tool & environment

- **Deployed Pages bundle** at `https://michaeljfazio.github.io/mbse-workbench/`. Per A.6 this is the source of truth for Phase-15 walks. Pages `last-modified: Mon, 18 May 2026 16:17:04 GMT` corresponds to the `vphase-15.7` deploy (functional SHA `4c5cc41`).
- **Driver:** `artifacts/phase-15/walk-27/walk-27-exec.py` (gitignored per `artifacts/` rule). Adapted from `walk-26-exec.py`. Single Playwright context, headless Chromium, sequential `add → assert → screenshot` loop. Walk-27's driver will need to discover the UX paths for: (a) adding a PartUsage to a PartDefinition's IBD, (b) adding a PortUsage to a PartUsage, (c) creating a ConnectionUsage between two ports, (d) attaching an ItemFlow to a ConnectionUsage — these UX paths are exactly the affordances under test. If any path is undiscoverable from the deployed UI alone, that **is** the finding for that PC (per A.3 hard constraint #1: "If a flow cannot be completed via UI alone, that is the finding").
- **Screenshots:** `artifacts/phase-15/walk-27/screenshots/`. One per phase plus full-screen captures at PC verification points. Expected count: ~10–14.
- **Structured outcome:** `artifacts/phase-15/walk-27/walk-27.json` — same shape as `walk-26.json`: PC verdicts, per-element rendering measurements (port `width`/`height`, edge marker types, etc.), error counts, timings.

### Expected duration

A.5 budgets deep-dives at 1–3 hours of agent execution. Walk-27 is conservatively in the upper half: 8 PCs × discovery + assertion + screenshot, with 4 PCs exercising affordances that may not be straightforwardly reachable. If a PC-blocker is hit early, the walk stops at that finding (per A.5: "A walk that hits a blocking defect stops early").

### Out of scope (deferred)

- **Right-click "Show in X" cross-diagram navigation** — dedicated dim-13 score-3 walk; the convergence walk-27 candidate already double-promotes dim 6 + chain[3], so dim 13 stays at 2.
- **N>2 representations on one PartDefinition** — dedicated dim-13 score-3 walk.
- **Dim 17 (Edge editing) endpoint reconnect by drag, waypoint add/remove, routing-style per edge** — incidental coverage only via PC 3; dim 17 dedicated walk reserved for after dim 6 lands at 3.
- **Cross-diagram paste / duplicate workflows** — not a dim-6 invariant.
- **Multi-context IBD coverage (FCS_v2, FCS_alt)** — single-context is sufficient for dim 6 score-3 per the rubric description.
- **`BindingConnection` (`=` symbol)** — separate from `ConnectionUsage`; would inform dim 11 (Parametric) not dim 6.
- **Item-flow decomposition into sub-flows via dashed-line elaboration** (v2 §7.26.5) — advanced feature; not required for dim 6 score-3 baseline.

### Rubric snapshot at walk open

| Dim | Score | Last informed |
|-----|------:|---------------|
| 3 (Ports) | 2 | walk-4 |
| 6 (IBD) | 2 | walk-26 (Pages-confirm) |
| 13 (Cross-diagram coherence) | 2 | walk-26 (Pages-confirm) |
| 17 (Edge editing) | 1 | walk-4 |
| 27 (Persistence) | 2 | walk-2 |
| Convergence chain | 2 / 3 | walk-26 |

Phase-15 score-3 count at walk open: **2** (dim 5 BDD, dim 14 Round-trip integrity). Walk-27 targets dim 6 as the next score-3 candidate.

### Open-issue snapshot at walk open

- 2 open `phase:15` `type:design` issues (#452 CI-velocity epic step 3; #454 raise A.8 cap — both blocked on #469 `status:needs-human`).
- 0 open `phase:15` `type:bug` issues.
- 0 open `phase:15` `type:feature` issues.
- 1 open `type:chore` `status:needs-human`: #469.

### Plan vs execute boundary

This file is the **Plan** per A.5. Sealed in iter-857. Any deviation during execution is captured as a finding, not as a plan amendment.

The execute iteration (next iter after this PR merges) will append `## Execution` / `## Findings` / `## Rubric score deltas` / `## Convergence chain (A.12 #3)` / `## Decide next` sections to this file, plus run the driver, capture screenshots, and update `quality-rubric.md`.

## Execution

**Iteration:** 859
**Date:** 2026-05-19
**Run:** deployed Pages bundle at `https://michaeljfazio.github.io/mbse-workbench/`. Pages `last-modified: Mon, 18 May 2026 16:17:04 GMT` → built from `4c5cc41` (= `vphase-15.7` / `v1.5.1` tags). The plan-seal commit `d6d2720` on `main` is doc-only and does not affect the bundle being tested.
**Driver:** `artifacts/phase-15/walk-27/walk-27-exec.py` (single Playwright context, headless Chromium, 10 screenshots, structured `walk-27.json`). Wall-clock: ~75 s end-to-end (`app_load = 1448 ms` over network). 10 screenshots saved under `artifacts/phase-15/walk-27/screenshots/`.

The plan was followed verbatim. PCs 1–6 ran in order; PC7 (persistence) reloaded; PC8 aggregated errors at the end.

| Phase | Action | Outcome |
|-------|--------|---------|
| 1 | Bootstrap: clear browser storage; create `FCS Pkg` (Package), `FCS` (PartDefinition), `PFC` (PartDefinition), `ADIRU` (PartDefinition) via tree menus | ✓ all four created |
| 1 | Create BDD on `FCS Pkg`, IBD on `FCS` via tree-menu `Create representation…` | ✓ both diagrams created |
| 2 | Inspector `+ Add port` on `PFC` → port `cmd` (default direction `inout`); same on `ADIRU` → port `data` | ✓ both ports created |
| 3 | Tree-row click on the IBD row activates the IBD tab; enclosing frame `FCS` renders | ✓ `#465` + `#464` Pages-confirmed again |
| 4 | Drag IBD palette `Part` chip onto canvas → popover → pick `PFC` → `pFC` PartUsage created. Repeat → pick `ADIRU` → `aDIRU` PartUsage | ✓ both PartUsages render with the auto-name |
| 5 | Probe handle geometry: both ports rendered as `12 × 12` squares with computed `border-radius: 0px` (per `partUsageHelpers.placeHandle` + `!h-3 !w-3 !rounded-none`) | ✓ matches `ibd.md` §A square-port convention |
| 6 | Drag PFC's port handle to ADIRU's port handle (no Shift) → `ConnectionUsage` expected | **✗ no edge appeared; no toast, no inline error, no validity feedback** |
| 7 | Select `PFC` → Inspector `cmd` direction → `out`. Verify direction glyph (`◀`) on the port-usage in the IBD | ✓ glyph appears via `ibd-port-direction-…` testid |
| 8 | Shift+drag cmd-handle → data-handle → `ItemFlow` expected | **✗ no edge appeared; same silent-failure pattern as phase 6** |
| 9 | Probe deployed UI for `«proxy»` / `«full»` keyword / testid distinction | only the v2-default plain `port` is surfaced (no `«proxy»` / `«full»` text or testid present) — informational; per `ibd.md` §D the v2 default IS the proxy pattern |
| 10 | Reload page (`localStorage` preserved) | parts + port directions + auto-names all persist; no edges to verify (none were created) |
| 11 | Aggregate page errors + console errors across the run | ✓ 0 / 0 |

Page errors: 0. Console errors: 0.

### Eight pass-criteria verdict

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Two PartUsages render nested inside the FCS enclosing-frame with their auto-names visible | **PASS** (`n_parts=2`, frame ✓, `pfc_name='pFC'`, `adiru_name='aDIRU'`) |
| 2 | Port handles render as small squares (12 × 12; sharp corners) | **PASS** (`cmd=12×12 radius='0px'`, `data=12×12 radius='0px'`) |
| 3 | Drag-create `ConnectionUsage` between `cmd` and `data` — plain solid line, no arrowhead | **FAIL** (ConnectionUsage edge did NOT appear after drag) |
| 4 | Set port direction to `out`; direction glyph appears on the port | **PASS** (`data-direction='out'`, glyph `'◀'`) |
| 5 | Shift+drag → `ItemFlow`; set type `FlightCommand`; filled-triangle marker at target end | **FAIL** (ItemFlow edge did NOT appear after Shift+drag) |
| 6 | Proxy vs full port distinction (where applicable) | **PASS** (informational — only v2-default `port` surfaced; matches `ibd.md` §D — `«full»` has no v2 equivalent. Not filing as a bug) |
| 7 | Reload preserves the full structure | **FAIL** (parts ✓ + names ✓ + cmd direction ✓ persist, but `conns=0`, `flows=0` — cascade from PC3 + PC5; no edges were created to begin with) |
| 8 | Zero page errors AND zero console errors | **PASS** (`page_errors=0, console_errors=0`) |

**5 / 8 PASS. 2 root-cause issues filed (one tracking the source→source connection-drag silent failure, one tracking acronym-PartDefinition auto-naming).**

## Findings — workbench

1. **#499 — `p1`, `area:viewpoint:ibd` + `area:routing`** (filed during this iter). Port-to-port drag between two default-direction (`inout`) ports silently no-ops. Root cause: `HANDLE_TYPE_BY_DIRECTION.inout = 'source'` in `src/viewpoints/ibd/partUsageHelpers.ts` combined with React Flow's default connection mode (source→target only). The typed `isValidIbdConnection` validator in `src/viewpoints/ibd/isValidConnection.ts` explicitly accepts `inout:inout` per ADR 0003, but React Flow rejects the drag at the handle-type layer before the validator runs. Fixes both PC3 (`ConnectionUsage`) and PC5 (`ItemFlow`) since both go through the same React Flow `onConnect` pipeline. Suggested resolution: set `connectionMode="loose"` on the IBD `<ReactFlow>` so the typed validator becomes the single source of truth.

2. **#500 — `p2`, `area:viewpoint:ibd`** (filed during this iter). PartUsage auto-name lowercases only the first character of the typing PartDefinition's name. For mixed-case names (`Engine` → `engine`) this is fine; for all-acronym names (`PFC` → `pFC`, `ADIRU` → `aDIRU`) it produces awkward mid-camel forms that match no SysML convention. Cosmetic, not blocking.

## Findings — informational (not filed)

1. **PC6: only v2-default `port` surfaced (no `«proxy»` / `«full»` distinction).** Per `ibd.md` §D this is acceptable for v2 conformance — the v2 default `port` IS the proxy pattern and `«full»` has no v2 equivalent (a port with a composite `PortDefinition` plays the same role). Not a bug. Recorded for future-walk reference: if a future walk exercises a port with composite `PortDefinition` content, dim 6 score 3 may want to verify the distinction is *visually* surfaced on the IBD (today it is not).

2. **Auto-rename camelcase rule for acronyms (#500).** Same fact as the filed bug — listed here for narrative continuity.

## Findings — strong positive

1. **Drag-from-palette → PartDefinition popover → typed PartUsage creation works end-to-end on Pages** (PC1 PASS). The IBD palette `Part` chip is draggable; the `part-type-popover` opens at the drop site; clicking a `PartDefinition` option creates a typed PartUsage with the correct auto-name and the ports inherited from the type. This was the first time the deployed IBD palette was exercised against an architect-authored PartDefinition (prior walks used seeded fixtures).
2. **Port handles render as `12 × 12` square handles with `border-radius: 0px`** (PC2 PASS). Matches `ibd.md` §A — small rectangular ports overlapping the boundary of the owning part node. Geometry and edge placement are correct.
3. **Direction glyph reflects port direction on the IBD** (PC4 PASS). Setting `cmd` to `out` via the Inspector produces the `◀` glyph on the left-side handle and `data-direction="out"` on the port-usage element. The glyph is position-aware (left-side `out` → `◀`, right-side `out` → `▶`) per `directionGlyph()`.
4. **Persistence over reload is robust** (PC7 partial pass — the parts/ports/directions/names half PASSed; the conns/flows half FAILed only because they were never created). All authored model state survives a reload. No data loss observed.
5. **Zero page errors, zero console errors throughout the walk** (PC8 PASS). Even the silent-failure connection drags (PC3, PC5) did not emit any console diagnostic — which is itself a UX gap (the architect has no telemetry signal that the drag was rejected) but a separate concern from the connection-creation bug.
6. **Two `#464` + `#465` Pages-confirmations** carry forward from walks 25/26 — IBD canvas seeds enclosing frame; tree-row click activates diagram tab. Both held across walk-27's repeated tree↔canvas switches.

## Rubric score deltas

| Date | Walk | Dim # | Old | New | Rationale |
|------|------|-------|-----|-----|-----------|
| 2026-05-19 | walk-27 | 3 (Ports) | 2 | 2 | Positive evidence: 12×12 squares, 0px radius, direction glyph rendered. Score holds at 2 — comprehensive direction + conjugate-port coverage not yet exercised. |
| 2026-05-19 | walk-27 | 6 (IBD) | 2 | 2 | Score-3 promotion BLOCKED by #499. PC3 + PC5 silent-failure means dim-6 invariant "Parts on parts, connected via ConnectionUsage. Item flows along connections." cannot be exercised end-to-end from the default port-direction starting state. Score holds at 2 (not a regression — this path was never tested before; demote to 1 reserved for previously-passing scenarios). |
| 2026-05-19 | walk-27 | 17 (Edge editing) | 1 | 1 | Edge creation between two `inout` ports silently fails (same root cause as dim-6 above). Reconnect / waypoint / routing-style controls not exercised because no edge could be created. Score holds at 1. |
| 2026-05-19 | walk-27 | 27 (Persistence) | 2 | 2 | Reload preserved all created state cleanly; reinforces existing baseline. |

Phase-15 score-3 count: **2** (dim 5 BDD, dim 14 Round-trip integrity). No change — walk-27 did not promote any dimension to 3.

## Convergence chain (A.12 #3)

Walk-27 filed **2 workbench issues** (#499, #500). Per A.12 #3 the chain resets.

| Walk | Issues filed | Chain |
|------|-------------:|------:|
| walk-22 | 0 | (pre-reset 1) |
| walk-23 | 0 | (pre-reset 2) |
| walk-24 | 2 | 0 (RESET) |
| walk-25 | 0 | 1 |
| walk-26 | 0 | 2 |
| walk-27 | 2 | **0 (RESET)** |

The convergence trigger does not fire. Chain restarts at 0/3 after #499 + #500 land.

This was the **expected** risk-balance outcome noted in walk-26's decide-next: "if walk-27 = IBD deep-dive finds issues (likely on a deep-dive — see A.5 'deep dives push a single viewpoint hard, exercising rare relationships and edge cases'), the chain resets to 0 but the rubric still gains useful measurement data." Walk-27 confirmed both expectations: the deep-dive surfaced a real bug AND the rubric gained measurement on dim 3 (positive), dim 6 (blocked-path), dim 17 (blocked-path), and dim 27 (positive reinforcement).

## Decide next

**Next engineer batch — close #499.** Highest aggregate value:

- #499 unblocks dim-6 score-3 (after fix + regression walk it can promote 2 → 3 in one batch).
- #499 also unblocks dim-17 score-3 path (edge creation between any compatible pair).
- The fix is small and well-scoped: set `connectionMode="loose"` on the IBD `<ReactFlow>` and add a Playwright e2e that drags between two `inout` ports.
- Bundle #500 (acronym auto-naming) into the same PR if scope is small; otherwise file as its own batch.

**Walk-28 (regression of walk-27) — after #499 lands.** Re-run the same eight PCs against the post-fix bundle on `vphase-15.8` Pages. If clean, dim 6 promotes to 3 (third score-3 dim) AND chain advances from 0 → 1. That regression walk also re-verifies the dim-3 / dim-17 positive evidence captured here.

**FBW example (A.12 #4):** still blocked on dim-6 score-3 (cannot author the FBW IBD coverage without ConnectionUsage / ItemFlow creation working from default port directions). The bottleneck remains dim-6 promotion via #499 fix → walk-28 regression.

**#469 (CI step 3, merge queue):** no change. `status:needs-human` pending operator decision.

**ADR for raising A.8 cap (#454):** still blocked behind #469.

**Iter-counter:** Phase-15 iter-count at **66** of the 300 churn ceiling; well under.

**In-flight at walk-27 close (1/5 of A.8 cap):** the iter-859 walk-execute PR itself.
