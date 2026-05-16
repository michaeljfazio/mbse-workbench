# Walk 1 — broad sweep: every viewpoint, empty-project baseline

**Iteration:** 794
**Date:** 2026-05-16
**Walk type:** broad sweep (per A.5)

## Plan

### Scope

Touch every viewpoint with shallow modelling to surface coarse defects. Eight viewpoints in order: **BDD, IBD, Requirements, Activity, State Machine, Use Case, Parametric, Package.** Start from a fresh, empty project (no fixtures imported). Do not deep-dive any single viewpoint — the goal is breadth of coverage, not depth.

### Goals

For each viewpoint:

1. **Diagram creation.** Can a new diagram of this viewpoint be created from the empty-state UI? Through what affordance (button, palette, menu, right-click)? Is the affordance discoverable?
2. **Element creation.** Can one element of the viewpoint's primary kind be created via UI? Through what affordance (palette drag, click, context menu)? Is the creation consistent with other viewpoints' element creation?
3. **Element naming.** Inline rename or inspector-driven? Does the name update reflect in the project tree?
4. **Visual fidelity at a glance.** Are node shapes recognisable per SysML/UML convention (use case = ellipse, actor = stick figure, action = rounded rectangle, etc.)? Any transparent fills? Any clipped labels? Any obvious typography issues?
5. **Direct manipulation.** Can the element be dragged? Resized? Is the position visible during drag (A.3 operator-supplied seed)? Any rubber-band selection?
6. **Inspector reflection.** Does selecting the element populate the inspector with its properties?
7. **Explorer behaviour.** Does the new element appear in the project tree under its owning container? Is containment visually meaningful?
8. **Empty-state copy.** What does the empty-diagram canvas say? Is there guidance for next steps?

Cross-cutting observations (record once, surfaced from any viewpoint):

- Console errors during normal use (open devtools).
- Affordance inconsistencies across viewpoints (e.g., palette vs click-button mix per A.10 rubric #15).
- Accessibility informal observations (focus rings, keyboard nav, contrast). Formal axe scans are a separate walk.
- LLM chat sidebar visibility / first-impression. Not exercised deeply.
- Cmd-K search palette presence.
- "Load example" entry presence (not expected — A.11 wires it later).

### Out of scope for this walk

- Round-trip JSON / SysML text export-import (rubric dim 14) — separate walk.
- Edge editing deep dive (dim 17) — separate walk.
- Cmd-K search palette deep dive (dim 20) — separate walk.
- Undo/redo deep dive (dim 21) — separate walk.
- LLM tool dispatch (dim 23) — separate walk.
- Performance benchmarks (dim 26) — separate walk.
- Persistence + multi-project (dim 27) — separate walk.
- Formal axe scans (dim 25) — separate sweep using axe-core/playwright.

### Expected duration

30–60 minutes of agent execution (per A.5 broad-sweep guidance).

### Rubric dimensions this walk will inform

Initial measurement (score 0 → 1/2/3) for:

- **1** Visual fidelity — node shapes
- **2** Visual fidelity — edges & routing _(light touch — exercised when adding one edge per viewpoint where natural)_
- **3** Visual fidelity — ports _(IBD only; light)_
- **4** Visual fidelity — colors & typography
- **5–12** SysML conformance — one per viewpoint (BDD, IBD, Req, Act, Stm, UC, Par, Pkg) _(initial reading only; deep dives later)_
- **13** Cross-diagram coherence _(light — only if same element rendered in two viewpoints during the walk)_
- **15** Palette & creation affordances _(this is a primary dimension for the walk)_
- **16** Direct-manipulation affordances _(primary; drag, resize, drag-position-visible)_
- **18** Project tree / explorer _(primary)_
- **19** Inspector _(light)_
- **24** Empty states & error UX
- **28** Help / discoverability

Not informed by this walk (next walks): **14, 17, 20, 21, 22, 23, 25, 26, 27**.

### Snapshot at walk start

- **Deployed Pages URL:** https://michaeljfazio.github.io/mbse-workbench/
- **Pages commit (vphase-14):** `fac60c772942673ff1f33f936197fc2abf49a8e7`
- **Open `phase:15` issues:** 0
- **Open issues total:** 0
- **Rubric:** all 28 dimensions scored `0 — unmeasured` (per `quality-rubric.md` at iter-793 head).
- **AGENT.md head:** main at `64f8106` (iter-793 JOURNAL append). Note: Pages deploy lags this by two PRs — the bootstrap PR (#365) and JOURNAL PR (#367) did not retag a release, so the deployed app reflects `fac60c7` / vphase-14 exactly. Findings on the deployed app reflect the workbench's pre-Phase-15 state.

### Acceptance for this walk plan

The plan is "done" when this file's `## Plan` section is committed. Execution proceeds in step 3 (`## Findings (live)`); triage in step 4 (`## Issues filed`); rubric scoring in step 5 (`## Rubric deltas`); close-out commit in step 6.

## Findings (live)

The walk produced three Playwright scripts and one probe family under `artifacts/phase-15/walk-1/`:

- `walk-1-recon.py` — initial DOM reconnaissance (no clicks).
- `walk-1-exec.py` — primary broad-sweep execution (14 numbered steps).
- `walk-1-viewpoints.py` + `walk-1-viewpoint-discovery.py` + `probe-submenu*.py` + `probe-ibd-path.py` + `probe-other-diagrams.py` — follow-on probes that established which viewpoint kinds are reachable from which element kinds.

Raw observation logs: `findings.json`, `findings-viewpoints.json`, `viewpoint-discovery.json`, plus 30+ screenshots under `screenshots/`.

**Headline observations:**

1. **Default empty project ships with two pre-created tabs**: `Requirements` (a "surface" — id `surface-tab-requirements`) and `Main BDD` (a diagram — id `diagram-tab-<uuid>`). Two different tab-id patterns coexist.
2. **Element creation is fragmented across 4 UI surfaces.** A `PartDefinition` ("Block") can be created via the palette `+ New Part Definition`, the empty-state "New Block" card, the diagram toolbar `+ Block` button, or the inspector `+ New Block` button. Three different vocabulary patterns ("Block" / "Part Definition" / "Block Definition"). All are click-only — no drag-from-palette as the operator seed prescribes.
3. **`Create representation…` submenu offers only 4 of 8 viewpoints** from every owner kind tested (Package, PartDefinition, Requirement, UseCase, Actor): BDD, Requirements, Use Case, Package. **Missing: IBD, Activity, State Machine, Parametric.**
4. **IBD is reachable** via the inspector's `Open Internal Diagram` button on a selected `PartDefinition`. **Activity, State Machine, Parametric have no equivalent inspector button**, and no submenu path. They are unreachable from any architect-discoverable affordance.
5. **Palette grows dynamically.** Initial palette: 5 categories with `+` (`Package`, `Part Definition`, `Requirement`, `Use Case`, `Actor`). After creating an Action / State / Constraint Definition via `Create child…`, three new categories with `+` appear. A first-time architect never sees Action/State/Constraint Definitions in the palette.
6. **Usage categories (`PARTS`, `ACTIONS`, `STATES`, `CONSTRAINTS`, `VALUES`) appear in the palette without `+` buttons** — only counts. The asymmetry is unexplained in the UI.
7. **No resize handles** on a selected Block node (`.react-flow__resize-control` count = 0). Operator seed confirmed.
8. **No coordinate display during drag** — body text contains no `(x, y)` indicator while a node is being dragged. Operator seed confirmed.
9. **Block visual:** `«block»` stereotype, four compartments (`PARTS`, `PORTS`, `VALUES`, `CONSTRAINTS`). Computed `backgroundColor` = `rgb(255,255,255)` — the T-13.16 card-token fix is holding.
10. **Cmd-K opens** a command palette with Undo/Redo/Save project as JSON/Delete selection/Open chat plus a search input. Functional but element-search depth not exercised.
11. **Inspector populates correctly** on PartDefinition selection: Name, Description, Ports (+ Add port), Open Internal Diagram, Linked requirements (+ Link requirement), Owner UUID.
12. **Zero console errors and zero page errors** across the entire walk execution. Clean runtime.

## Issues filed

Ten issues filed against `phase:15` per A.7's template (Context / Steps / Expected / Actual / Severity rationale / Citation):

| # | Title | Severity | Areas |
|---|-------|----------|-------|
| [#368](https://github.com/michaeljfazio/mbse-workbench/issues/368) | `[area:viewpoint:act]` Activity Diagram has no UI creation entry point | **p0** | viewpoint:act / explorer / cross-cutting |
| [#369](https://github.com/michaeljfazio/mbse-workbench/issues/369) | `[area:viewpoint:stm]` State Machine Diagram has no UI creation entry point | **p0** | viewpoint:stm / explorer / cross-cutting |
| [#370](https://github.com/michaeljfazio/mbse-workbench/issues/370) | `[area:viewpoint:par]` Parametric Diagram has no UI creation entry point | **p0** | viewpoint:par / explorer / cross-cutting |
| [#371](https://github.com/michaeljfazio/mbse-workbench/issues/371) | `[area:viewpoint:ibd]` IBD reachable only via inspector, not via "Create representation…" submenu | p2 | viewpoint:ibd / explorer |
| [#372](https://github.com/michaeljfazio/mbse-workbench/issues/372) | `[area:palette]` Palette categories appear only after first element of that kind is created | p2 | palette / empty-state |
| [#373](https://github.com/michaeljfazio/mbse-workbench/issues/373) | `[area:palette]` Usage categories shown without `+` creation buttons | p3 | palette |
| [#374](https://github.com/michaeljfazio/mbse-workbench/issues/374) | `[area:interaction]` Element resize handles absent on Block nodes | p1 | interaction / visual-fidelity |
| [#375](https://github.com/michaeljfazio/mbse-workbench/issues/375) | `[area:interaction]` Element position not displayed while dragging on the canvas | p1 | interaction |
| [#376](https://github.com/michaeljfazio/mbse-workbench/issues/376) | `[area:palette]` Block creation exposed via four distinct UI surfaces | p1 | palette / empty-state |
| [#377](https://github.com/michaeljfazio/mbse-workbench/issues/377) | `[area:palette]` Palette category labels mix kind-as-noun with full-definition names | p3 | palette |

Three p0 (the missing-viewpoint family), four p1 (interaction + creation-surface inconsistency), two p2, one p3.

The three p0 issues are intentionally filed as three issues — not one compound issue — per A.7's "one issue per defect" rule. They share a common root cause (the `Create representation…` registry is missing entries for these viewpoints) and will likely be closed by a single PR in an engineer batch.

## Rubric deltas

Walk-1 informs 14 of 28 dimensions. Detail in `docs/architect/quality-rubric.md`'s **Score delta log**.

| # | Dimension | 0 → | Headline |
|---|-----------|-----|----------|
| 1 | Visual fidelity — node shapes | **2** | BDD block well-formed. Others not yet exercised. |
| 4 | Visual fidelity — colors & typography | **2** | Computed white fill; no transparency; light theme readable. |
| 5 | SysML conformance — BDD | **2** | Compartments + stereotype present. Edges not yet exercised. |
| 6 | SysML conformance — IBD | **1** | Discoverability + creation-affordance gap. Issue #371. |
| 8 | SysML conformance — Activity | **1** | No UI entry point. Issue #368. |
| 9 | SysML conformance — State machine | **1** | No UI entry point. Issue #369. |
| 11 | SysML conformance — Parametric | **1** | No UI entry point. Issue #370. |
| 15 | Palette & creation affordances | **1** | Four issues (#372, #373, #376, #377). |
| 16 | Direct-manipulation affordances | **1** | No resize (#374); no drag-coord (#375). |
| 18 | Project tree / explorer | **2** | Containment correct; row `⋯` menus functional. |
| 19 | Inspector | **2** | Reflects selection with relevant fields. |
| 20 | Search & navigation | **2** | Cmd-K palette functional. |
| 24 | Empty states & error UX | **2** | Intentional empty state with four CTAs + shortcuts. |
| 28 | Help / discoverability | **1** | Four non-discoverable viewpoints (overlap with #368–#371). |

Fourteen dimensions remain at `0 — unmeasured`: 2 (edges), 3 (ports), 7 (Requirements), 10 (Use Case), 12 (Package), 13 (cross-diagram), 14 (round-trip), 17 (edge editing), 21 (undo/redo), 22 (import/export), 23 (LLM), 25 (a11y), 26 (perf), 27 (persistence).

## Close-out

Walk-1 is **complete**. The broad-sweep mission held: every viewpoint was touched at the discoverability level (8 of 8), even though 4 of 8 cannot be exercised because their creation paths are missing. That is itself the most important finding of the walk: the workbench has *reach* for half the viewpoint set under an architect-only-uses-the-UI constraint.

**Next walk decision** (per A.5 step 7): the four `p0` and `p1` issues block deeper viewpoint walks (cannot deep-dive Activity / State Machine / Parametric until they exist as reachable surfaces). The natural next engineer batch is the missing-viewpoint family (#368, #369, #370, possibly #371) — a foundational schema/registry change that other PRs will depend on (per A.8 grouping heuristic #1, "Foundational/schema work first"). Iter-795 should pick that batch.

After the missing-viewpoint batch lands and `vphase-15.1` deploys, walk-2 should be a regression walk re-running walk-1's discovery passes to confirm reach is restored, followed by a deep-dive walk per viewpoint as each reaches rubric score ≥ 2.

**Walk file finalised.** No further edits to this file. Subsequent walk findings go in `walk-2.md`, `walk-3.md`, …

## Errata — iter-795 self-correction

While planning the iter-795 engineer batch for the three p0 issues (#368 Activity, #369 State Machine, #370 Parametric), an `Explore` subagent surfaced that **all eight viewpoints are registered** in `src/workspace/store.ts` and the **Phase-13 cold-start gate test** (`tests/e2e/phase-13-cold-start.spec.ts`) creates all eight diagrams via UI on every CI run. The static map in `src/workspace/tree/representationAcceptance.ts` actually offers:

| Owner kind | Submenu |
|------------|---------|
| Package | BDD, Requirements, Use Case, Package |
| PartDefinition | BDD, **IBD**, **Parametric** |
| ActionDefinition | **Activity** |
| StateDefinition | **State Machine** |

A corrected Playwright probe using the `containment-tree-element-menu-trigger-${elementId}` testid pattern confirmed Activity is reachable from an `ActionDefinition` row. The walk-1 script's `open_row_menu_for` Python helper had a too-loose ancestor check that caused it to always open the **Package root's** row menu — every owner-kind I tested was reading Package's submenu, not its own. That's why the walk concluded "only 4 of 8 viewpoints offered" universally.

**Consequence.** Issues #368/#369/#370 were re-scoped from **p0 "no UI creation entry point"** to **p2 "discoverability gap on Package row menu"** with explanatory comments. The real finding survives — an architect surveying the Project root's row menu sees 4 of 8 viewpoints and must already know SysML containment semantics to navigate to the rest — but this is a UX discoverability problem, not a missing feature.

**Rubric corrections** (also recorded in `quality-rubric.md` score delta log):
- Dimension 6 (IBD): 1 → 2 (reachable via inspector and via PartDefinition row menu).
- Dimension 8 (Activity): 1 → 2.
- Dimension 9 (State machine): 1 → 2.
- Dimension 11 (Parametric): 1 → 2.

**Lesson recorded.** For all future walks, prefer the data-testid pattern used by the Phase-13 spec (`containment-tree-element-menu-trigger-${elementId}`) over text-content heuristics for any row-specific affordance. Loose ancestor checks across explorer panels produce false-positive matches because element text bubbles up the panel ancestry.

The walk-1 Python scripts under `artifacts/phase-15/walk-1/` are kept as-is — they are the historical record of the bug. Future walks may import a corrected helper from `artifacts/phase-15/_lib/` if one is written.
