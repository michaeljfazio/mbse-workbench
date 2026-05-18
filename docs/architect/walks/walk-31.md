# Walk 31 — Broad sweep across every viewpoint on `vphase-15.8` Pages (chain[2] candidate)

**Iteration:** 868 (plan-seal); execution iteration TBD (likely iter-869)
**Walk type:** Broad sweep (A.5: 30–60 min; touches every viewpoint with shallow modelling to surface coarse defects and regressions)
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — the deployed `vphase-15.8` / `v1.5.2` artifact. Functional SHA `95fb6c2`. Pages `last-modified: Mon, 18 May 2026 18:32:43 GMT`. **No new release tag exists between walks 28, 29, 30, and 31** — the bundle is bit-for-bit unchanged; only the test driver evolves. Per A.6 the Pages deploy is the source of truth; the execute iteration MUST re-verify the `last-modified` header before launching the driver.

## Plan

Walk-31 is the broad-sweep prescribed by walk-30's § "Decide next" (iter-867). With dim 6 (IBD) at 3 as the third score-3 dimension, the convergence chain at chain[1] / 3, and the `vphase-15.8` bundle thoroughly characterised on the IBD-deep-dive axis, the next walk's job is to verify *no broad-coverage regression* leaked into the other seven viewpoints from the `#499 ConnectionMode.Loose` + `#500 acronym auto-name` changes, and to inform which dim is the next score-3 candidate.

Walk-31 is the **chain[2] candidate** in the A.12 #3 convergence chain. A clean walk-31 (zero issues filed, zero rubric degradation) advances chain[1] → **chain[2] / 3**. A single issue filed or any rubric demotion resets the chain to 0. Walk-31 is **not** primarily a score-3 promotion walk — every viewpoint except BDD (dim 5 → 3), IBD (dim 6 → 3), and Round-trip integrity (dim 14 → 3) is held at 2 from prior walks, and broad-sweep coverage is by definition too shallow to promote a SysML-conformance dimension to 3 (which requires deep-dive evidence per A.10 score-3 descriptions). The reinforcement value is in dims 1 (visual fidelity — node shapes), 4 (colors & typography), 15 (palette & creation), 16 (direct-manipulation), 18 (project tree / explorer), 19 (inspector), 24 (empty states), and 28 (help / discoverability) — all rubric dims whose score-3 evidence accretes incrementally across walks rather than via single deep-dive concentrations.

### Background

The most recent broad-sweep walk against the deployed bundle was **walk-1** (iter-794, against `vphase-14` Pages at `fac60c7`) — the first walk of Phase 15 and the seed for the initial rubric measurements. Every subsequent walk (walks 2–30) has been either a regression of a prior walk or a deep-dive on a single viewpoint or dimension. After 30 walks across ~75 iterations, all 28 rubric dimensions have moved from `0 — unmeasured` to either 2 or 3, with the lone exception of dim 23 (LLM integration) which stays at 0 pending its dedicated walk. The Pages bundle now reflects:

- `vphase-15.1` BDD resize handles (walk-2).
- `vphase-15.2` drag-coord overlay + Cmd-Z rename fix (walks 3, 4).
- `vphase-15.3` palette show-all-kinds + label consistency (walk-5).
- `vphase-15.4` IBD palette, usage hints, implicit-owner Package row, bus-dispatched diagrams (walks 6, 7, 8).
- `vphase-15.5` empty-state click-shortcut + inspector contextual + toolbar `+` retires (walks 12–17, etc.).
- `vphase-15.6` quoted-ident + SysML view-block round-trip (walks 21, 22, 23).
- `vphase-15.7` IBD enclosing-frame seed + tree-row activates diagram tab (walks 25, 26).
- `vphase-15.8` IBD `ConnectionMode.Loose` for inout↔inout drag + acronym auto-name (walks 27, 28, 29, 30).

Broad-sweep coverage on the deployed bundle has therefore *not* been re-baselined since walk-1 against `vphase-14`. Every other walk has been narrow. Walk-31 closes that gap: it re-touches every viewpoint with the eyes of someone who hasn't seen any single viewpoint deeply, but expects to see all eight working cleanly.

### Scope

For each of the eight viewpoints (BDD, IBD, Requirements, Activity, State Machine, Use Case, Parametric, Package), in this order:

1. **Diagram creation.** Create a new diagram of this viewpoint from the explorer's empty-state UI (post-`vphase-15.4`/`vphase-15.5` flow: tree row → activates diagram tab; new diagram via right-click context menu or palette-driven seed per viewpoint).
2. **One element per viewpoint.** Drop the viewpoint's primary kind via palette drag onto the canvas. Verify shape, label, default name, inspector reflection.
3. **One edge per viewpoint** (where natural for the viewpoint). E.g., BDD composition between two blocks, IBD `ConnectionUsage` between two ports, Activity control-flow between two actions, State-machine transition between two states, Use-case association between an actor and a use case, Package containment. Skip for viewpoints where one element is enough (Parametric: just one constraint usage; Requirements: just one requirement).
4. **Cross-viewpoint check.** Verify the just-created elements appear correctly in the project tree under their owning containers (per `vphase-15.7`'s tree behaviour).
5. **Reload at the end of each viewpoint's mini-session.** Confirm persistence per dim 27.

Cross-cutting observations (recorded once, surfaced from any viewpoint):

- Console errors at any point during the walk (open devtools).
- Affordance inconsistencies across viewpoints (e.g., one viewpoint's palette item is click-only when others are drag).
- Acronym auto-name (#500): does it apply only to PartUsages, or does the convention leak into other usage kinds inappropriately?
- `ConnectionMode.Loose` (#499): does the loose-mode edge creation leak into other viewpoints' edge-drag behaviour in a way that creates ghost edges or wrong-direction connections?
- Tree-row → activates diagram tab (#465): does it work consistently across all viewpoints (not just IBD where it was originally validated)?
- LLM chat sidebar: drive-by visibility check (not exercised deeply — dim 23 reserved for its dedicated walk).
- Cmd-K search palette: presence and basic invocation (not exercised deeply).
- Empty-state copy on each diagram type: present? accurate?

### Pass criteria (sixteen — two per viewpoint)

For each viewpoint V in {BDD, IBD, Requirements, Activity, State Machine, Use Case, Parametric, Package}, define:

| # | Criterion | Notes |
|---|-----------|-------|
| V-A | Diagram of viewpoint V can be created via the deployed UI's affordances; one primary-kind element drags from the palette onto the canvas; the element renders with a recognisable SysML/UML shape, a non-transparent fill, and a readable name | Per-viewpoint primary kind: BDD = PartDefinition (block); IBD = PartUsage (inside enclosing frame); Requirements = Requirement; Activity = ActionUsage; State Machine = StateUsage; Use Case = UseCase; Parametric = ConstraintUsage; Package = Package (nested) |
| V-B | One natural edge in viewpoint V can be created via drag (where applicable) or a second-element relationship can be established | BDD: composition; IBD: ConnectionUsage; Requirements: containment (or `derive`); Activity: control flow; State Machine: transition; Use Case: association; Parametric: skip (count one element); Package: containment skip (use parent-Package selection) |

Plus eight cross-cutting criteria (one per viewpoint, but evaluated at the same point — viewpoint close):

| # | Criterion | Notes |
|---|-----------|-------|
| X-1 | Zero page errors AND zero console errors across the entire walk | aggregate across all viewpoints |
| X-2 | Project tree shows every created element under its owning container (Package by default, except IBD parts which nest under the enclosing PartDefinition) | per-viewpoint mini-check |
| X-3 | Tree-row click activates the corresponding diagram tab where applicable (`vphase-15.7` regression check) | per-viewpoint mini-check |
| X-4 | `ConnectionMode.Loose` edge-drag behaviour does NOT leak into non-IBD viewpoints (no ghost edges, no wrong-direction connections in BDD/Activity/State-machine drags) | per-viewpoint mini-check; primary signal in BDD + Activity |
| X-5 | PartUsage acronym auto-name (#500) does NOT apply to non-PartUsage kinds (e.g., ActionUsage doesn't pick up acronym-derived names) | per-viewpoint mini-check; primary signal in Activity + State Machine |
| X-6 | Reload at the end of each viewpoint preserves all elements created during that viewpoint's mini-session | aggregate persistence check |
| X-7 | LLM chat sidebar drive-by visibility: button present, opens, no console error on open | informational only — dim 23 stays at 0 |
| X-8 | Cmd-K search palette opens via keyboard shortcut on at least one viewpoint and exits cleanly | informational only |

**Total: 8 × 2 + 8 = 24 PCs.** Aggregate format: `Σ PASS / 24 automated; Σ PASS / 24 visual`. A clean walk = 24/24 PASS automated + 24/24 PASS visual + zero issues filed + zero rubric demotions.

### Acceptance / rubric impact

| Outcome | Score-3 promotion candidates | Reinforcements | Convergence (A.12 #3) |
|---------|------------------------------|----------------|------------------------|
| 24/24 PCs PASS + 0 issues filed (expected) | None (broad-sweep too shallow to promote any SysML-conformance dim to 3) — but **dim 1 (visual fidelity — node shapes)** may inform a future promotion-to-3 candidacy if shape evidence is comprehensive across all node kinds | dims 1, 4, 15, 16, 18, 19, 24, 27, 28 all reinforced at 2 with broad-coverage evidence; dim 13 (cross-diagram coherence) reinforced via tree-row → diagram-tab cross-checks | chain[1] → **chain[2] / 3** |
| 1–4 PCs FAIL on bugs introduced since walk-1 / `vphase-14` | Specific dim demote 2 → 1 only for the affected viewpoint(s) | dims 1, 4 partial reinforcement | chain resets to **0**; file `p1`/`p2` `type:bug` issue(s) per A.7 |
| Console errors or page errors observed | dim 26 (Performance) demote candidate if related; otherwise informational | n/a | chain resets to **0**; file `type:bug` |
| `ConnectionMode.Loose` leaks into non-IBD viewpoint (X-4 FAIL) | dim 17 (Edge editing) demote 2 → 1 with regression-tag; dim 6 (IBD) NOT demoted since the IBD fix itself is sound | n/a | chain resets to **0**; file `p1` `type:bug` regression issue |
| Acronym auto-name leaks into non-PartUsage kinds (X-5 FAIL) | dim 5 (BDD) or dim 8 (Activity) etc. demote with regression-tag depending on where leak surfaces | n/a | chain resets to **0**; file `p1` `type:bug` regression issue |
| Tree-row → diagram-tab broken on some viewpoint (X-3 FAIL) | dim 18 (Explorer) demote 2 → 1 only for the affected viewpoint | n/a | chain resets to **0**; file `p1` `type:bug` |

The honest-measurement principle from A.5 applies: walk-31 explicitly does NOT chase a rubric promotion. Its primary job is convergence and regression-detection. Reinforcement evidence is incidental.

### Tool & environment

- **Deployed Pages bundle** at `https://michaeljfazio.github.io/mbse-workbench/`. Pages `last-modified: Mon, 18 May 2026 18:32:43 GMT` corresponds to the `vphase-15.8` / `v1.5.2` deploy. The execute iteration MUST re-verify `last-modified` before launching the driver.
- **Driver:** `artifacts/phase-15/walk-31/walk-31-exec.py` (gitignored per `artifacts/` rule). New script (not cloned from walks 28–30, which were narrow IBD-only). Structured as a sequence of per-viewpoint mini-sessions; each mini-session opens the relevant diagram (or creates one if none exists), performs V-A and V-B, then runs the per-viewpoint slice of X-2 / X-3 / X-4 / X-5 / X-6.

  Driver sequencing (Python pseudocode):

  ```python
  # 1. Fresh project. Bootstrap: empty Package.
  # 2. For each viewpoint in order:
  #    bdd, ibd, requirements, activity, state_machine, use_case, parametric, package:
  #      session = open_or_create_diagram(viewpoint)
  #      pc_v_a = drag_primary_kind(viewpoint)
  #      if viewpoint has natural edge:
  #          pc_v_b = drag_secondary_and_create_edge(viewpoint)
  #      else:
  #          pc_v_b = drag_secondary_only(viewpoint)  # for parametric, just count one element
  #      reload_and_verify(viewpoint)  # X-6 slice
  #      record_verdict(viewpoint, pc_v_a, pc_v_b)
  # 3. After all viewpoints done:
  #    page_errors_total, console_errors_total = aggregate_errors()
  #    cmdk_test = open_close_search_palette()
  #    llm_visibility = check_chat_sidebar_button_present()
  ```

  The driver inherits the #505 settle-wait helper (label-text + edge-`<g>` reattach polling) and the #508 marker-end probe-selector from walks 29/30 verbatim — even though walk-31 only exercises the marker-end probe on the IBD viewpoint (V-B for IBD = drag ConnectionUsage between two ports; same surface as walk-30 PC3 minus the ItemFlow elaboration which is dim-6-specific deep-dive territory).

- **Screenshots:** `artifacts/phase-15/walk-31/screenshots/`. Two per viewpoint (one after V-A, one after V-B), plus aggregate captures at session boundaries. Expected count: ~20.
- **Structured outcome:** `artifacts/phase-15/walk-31/walk-31.json` — per-viewpoint verdicts, aggregate counts, error totals, IDs, names, and a `delta_vs_walk_1` section comparing 24 PCs vs walk-1's coarser findings (walk-1 used a less-formal PC structure; the delta is informational, not gate-bearing).

### Expected duration

A.5 budgets broad-sweep walks at 30–60 min of agent execution. Walk-31 has eight viewpoint mini-sessions plus the cross-cutting aggregate — wall-clock estimate ~10–15 minutes assuming the deployed bundle behaves as walks 28–30 confirmed it does for IBD.

### Out of scope (deferred)

- Deep-dive evidence on any single viewpoint (each handled by its own dedicated walk).
- Dim 14 (Round-trip integrity): already at 3 via walk-22 / `vphase-15.6`; no broad-sweep needed.
- Dim 17 (Edge editing) score-3 promotion: still gated on the dedicated reconnect-by-endpoint-drag + waypoint add/remove + per-edge routing-style walk (chain-independent; can be scheduled in parallel with FBW after walk-31).
- Dim 20 (Search & navigation) deep evidence: walk-31 only checks Cmd-K open/close; deep dive deferred.
- Dim 21 (Undo / redo) coverage across viewpoints: walk-31 does not exercise undo/redo.
- Dim 22 (Import / export): not exercised; round-trip already at 3, PNG/SVG export deferred.
- Dim 23 (LLM integration): only drive-by visibility (X-7); deep dive deferred until LLM walk is scheduled.
- Dim 25 (Accessibility) formal axe scan: separate axe-core/playwright walk.
- Dim 26 (Performance) benchmarks: separate walk.
- FBW example authoring: parallel-track work; independent of walk-31's gate.

### Rubric snapshot at walk open

| Dim | Score | Last informed |
|-----|------:|---------------|
| 1 (Visual fidelity — node shapes) | 2 | walk-1 (broad sweep on `vphase-14`) |
| 2 (Visual fidelity — edges & routing) | 2 | walk-4 |
| 3 (Visual fidelity — ports) | 2 | walk-29 / walk-30 reinforcement |
| 4 (Visual fidelity — colors & typography) | 2 | walk-1 |
| 5 (SysML — BDD) | **3** | walk-14 |
| 6 (SysML — IBD) | **3** | walk-30 |
| 7 (SysML — Requirements) | 2 | walk-3 |
| 8 (SysML — Activity) | 2 | walk-1 (errata) |
| 9 (SysML — State Machine) | 2 | walk-1 (errata) |
| 10 (SysML — Use Case) | 2 | walk-3 |
| 11 (SysML — Parametric) | 2 | walk-1 (errata) |
| 12 (SysML — Package) | 2 | walk-4 |
| 13 (Cross-diagram coherence) | 2 | walk-26 (Pages-confirm) |
| 14 (Round-trip integrity) | **3** | walk-22 |
| 15 (Palette & creation) | 2 | iter-800 |
| 16 (Direct-manipulation) | 2 | iter-795 (smoke) |
| 17 (Edge editing) | 2 | walk-29 / walk-30 |
| 18 (Project tree / explorer) | 2 | walk-1 |
| 19 (Inspector) | 2 | walk-1 |
| 20 (Search & navigation) | 2 | walk-1 |
| 21 (Undo / redo) | 2 | iter-798 |
| 22 (Import / export) | 2 | walk-4 |
| 23 (LLM integration) | 0 | — |
| 24 (Empty states & error UX) | 2 | walk-1 |
| 25 (Accessibility) | 2 | walk-4 |
| 26 (Performance) | 2 | walk-2 |
| 27 (Persistence) | 2 | walk-29 / walk-30 |
| 28 (Help / discoverability) | 2 | iter-807 |
| **Convergence chain** | **1 / 3** | walk-30 |

Phase-15 score-3 count at walk open: **3** (dim 5 BDD, dim 6 IBD, dim 14 Round-trip integrity).

### Open-issue snapshot at walk open

- 2 open `phase:15` `type:design` issues (#452 CI-velocity epic step 3; #454 raise A.8 cap — both blocked on #469 `status:needs-human`).
- 0 open `phase:15` `type:bug` issues.
- 0 open `phase:15` `type:feature` issues.
- 0 open `phase:15` `type:chore` `status:ready` issues.
- 1 open `type:chore` `status:needs-human`: #469.

### Plan vs execute boundary

This file is the **Plan** per A.5. Sealed in iter-868. Any deviation during execution is captured as a finding, not as a plan amendment.

The execute iteration (next iter after this PR merges) will append `## Execution` / `## Findings` / `## Rubric score deltas` / `## Convergence chain (A.12 #3)` / `## Decide next` sections to this file, plus run the driver, capture screenshots, and update `quality-rubric.md`.
