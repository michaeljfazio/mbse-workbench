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
