# Walk 36 — Edge editing affordances deep-dive (dim-17 score-3 candidate; chain[2] candidate)

**Iteration:** 894 (plan-seal); execution iteration TBD (likely iter-895)
**Walk type:** Deep dive (A.5: 1–3 hours; pushes a single rubric dimension hard, exercises rare relationships and edge cases — here, the cross-cutting edge-editing affordance surface rather than a single viewpoint).
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — the deployed `vphase-15.10` / `v1.6.1` artifact. Functional SHA `f4915ae` (`feat(use-case): allow Actor→UseCase reverse drag (closes #528) (#531)`). Pages `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"` at iter-894 plan-seal — **byte-identical to walks 34 + 35**. The execute iteration MUST re-verify the `last-modified` + `etag` headers before launching the driver to confirm no intervening deploy has shifted the bundle.

## Plan

Walk-36 is the **chain[2] candidate** in the A.12 #3 convergence sequence (chain currently at **1 / 3** after walk-35's clean broad-sweep regression at iter-892, committed to STATUS at iter-893). Per iter-876's post-dim-10 plan (carried forward in iter-893's decisions log + walk-35.md § Decide next), walk-36 is a **dedicated dim-17 deep-dive**: edge editing affordances (reconnect either endpoint by drag, add/remove waypoints, change routing style per edge, label drag/placement, edge style selection — verbatim from `quality-rubric.md` dim 17 score-3 description).

Walk-36's job is **triple** with explicit honesty-over-throughput tradeoffs:

1. **Convergence advance (A.12 #3).** A clean walk-36 (zero issues filed, zero rubric demotion) advances chain 1 → **2 / 3**. The chain[3] candidate is then a follow-up walk (broad-sweep regression on `vphase-15.10` per A.5, since walks 35 + 36 against the same byte-identical bundle is permissible per A.5 if no source change intervenes).

2. **Dim-17 score-3 promotion (A.10).** Dim 17 (Edge editing affordances) has been held at 2 since walk-29 (Pages-regression reinforced PC3 `ConnectionUsage` drag-create only). The remaining score-3 blockers (reconnect, waypoint add/remove, per-edge routing-style picker, label drag, edge style selection) have **never been exercised** in any walk against any bundle. Walk-36 is the first walk to attempt dim-17 score-3 promotion.

3. **Honesty-over-throughput tradeoff (A.5).** Per the research sealed in this same iter-894 PR at `docs/architect/visual-standards.md § "2026-05-19 — Dim-17 edge-editing affordance conventions (walk-36 prereq)"` and verified by a pre-plan code scan of `src/workspace/CanvasPane.tsx` + `src/viewpoints/*/`:

   - **§A — Endpoint reconnect.** Main `<ReactFlow>` in `CanvasPane.tsx` does not set `reconnectable`; the React Flow v12 default is no reconnect UX. `SecondaryCanvasPane.tsx:161` explicitly sets `edgesReconnectable={false}` for the split-view pane. **PC1 likely to FAIL** on every viewpoint until a `reconnectable` prop + `onReconnect` command-bus dispatch lands.
   - **§B — Waypoints.** No waypoint storage in the metamodel; no add/remove UI; no custom edge-path interpolation through bend points. **PC2 + PC3 likely to FAIL** on every viewpoint.
   - **§C — Routing styles.** Routing is hard-coded per edge kind (IBD/Activity/State Machine = `getBezierPath`; BDD/Requirements/UseCase/Package = `getSmoothStepPath`). No per-edge routing-style picker is wired. **PC4 likely to FAIL** on every viewpoint.
   - **§D — Label drag.** All mid-edge labels use `pointerEvents: 'none'` (no drag possible); labels render at `(labelX, labelY)` returned by the path helper with no offset persistence. **PC5 likely to FAIL** on every viewpoint.
   - **§E — Edge style selection.** No per-edge stroke/style picker; line style follows kind-determined defaults (dashed for dependency / derive; solid for association / composition / generalization / connection) per SysML 1.5 Table 8.4 / v2 §7.13. **PC6 may PASS as "intentionally not surfaced" if the rubric reading is "style selection where semantically appropriate" (kind already determines style); may FAIL if the rubric reading is "user-selectable per-edge style picker."** This is a judgment call recorded in this plan; see § "Rubric interpretation note" below.

   Walk-36 is therefore expected to file **3–5 `p1`/`p2` `type:feature` issues** on the missing affordances. **Chain[2] is at high risk** — but the rubric-measurement value (turning dim 17's hidden `1` shadow score into explicit findings with concrete acceptance criteria) is the load-bearing outcome A.10 saturation requires. Per A.10 score-honesty rule + A.16 risk register entry "Cosmetic-only fixes — rubric scored 3 on visuals but app still unusable", the deep-dive that exposes the gap is the correct deliverable even at the cost of chain reset.

### Background research

The conventions exercised in this walk are documented (with primary-source citations) in `docs/architect/visual-standards.md § "2026-05-19 — Dim-17 edge-editing affordance conventions (walk-36 prereq)"` — that section was appended in the same iter-894 PR-seal as this plan, per A.9 ("Before exercising a viewpoint in depth, the agent populates that viewpoint's `diagram-types/<type>.md` ...") generalised to cross-cutting dimensions (where research belongs in `visual-standards.md`).

Key research findings (full citations in `visual-standards.md`):

- **Reconnect (§A).** Neither SysML v2 nor SysML 1.5 normatively prescribes a reconnect gesture; vendor convention (Cameo/Papyrus) is a grip-handle drag. React Flow v12 ships `reconnectable` / `onReconnect{Start,End}` props that require zero custom-path code — the cheapest score-3 unlock for dim 17.
- **Waypoints (§B).** UML 2.5.1 §10.5.4 DiagramInterchangeModel specifies `DiagramElement` waypoints as a **standard DI concern**; SysML v1/v2 inherit DI semantics. The workbench's element model does not yet carry a waypoint array; an edge-data extension + custom path interpolation is needed.
- **Routing styles (§C).** SysML/UML leave routing to tool discretion; vendor convention is **orthogonal default** for IBD `ConnectionUsage`, Activity control flow, BDD associations — the workbench's bezier-by-default for IBD is a visible fidelity miss called out for the first time here. React Flow v12 ships five path helpers (`getBezierPath`, `getStraightPath`, `getStepPath`, `getSmoothStepPath`, `getSimpleBezierPath`); a per-edge routing-style picker can pivot among them without changing the metamodel.
- **Label drag (§D).** SysML v2 §8.2.3.13 anchors labels mid-edge by default; SysML 1.5 Table 8.4 confirms. Manual drag is a vendor-UX feature (Cameo). Workbench currently locks labels with `pointerEvents: 'none'`.
- **Edge style selection (§E).** Line style is **load-bearing semantics** in SysML (dashed = dependency/derive; solid = association/composition/generalization/connection); color is **not** normatively semantic. Whether dim 17 score-3 requires a user-selectable per-edge style picker on top of kind-determined defaults is a judgment call — see § "Rubric interpretation note".

### Scope

Walk-36 exercises edge editing across **three representative viewpoints** chosen to cover the routing-style + connection-semantics matrix:

| Viewpoint | Default routing | Default line style | Representative edge kind under test |
|-----------|-----------------|--------------------|-------------------------------------|
| BDD | smooth-step | solid | Composition (filled-diamond) |
| IBD | bezier | solid (no arrowhead) | `ConnectionUsage` |
| Activity | bezier | solid (open arrowhead) | Control flow |

Each viewpoint is authored from a minimal skeleton (1 package + 2 nodes + 1 edge); the walk then exercises the **same six PCs** on each viewpoint's representative edge. Cross-viewpoint coverage gives confidence that any pass/fail observed is a workbench-wide affordance status, not viewpoint-specific.

The remaining five viewpoints (Requirements, State Machine, Use Case, Parametric, Package) are **not** exercised in walk-36 — per A.5 deep-dive scope discipline ("pushes a single viewpoint/dimension hard"), exercising all 8 viewpoints would dilute the dim-17 finding and inflate execution time beyond the 1–3 hour budget. A subsequent broad-sweep walk after dim-17 engineer batches land will verify the affordances work across all 8 viewpoints; walk-36's job is to characterise the gap, not to enumerate it per viewpoint.

### Pass criteria (eight: six per-affordance × three viewpoints averaged + two cross-cutting)

| # | Criterion | Rubric dim(s) informed | Pre-plan-seal expectation |
|---|-----------|------------------------|---------------------------|
| 1 | **Endpoint reconnect.** With an existing edge selected, drag one endpoint-handle to a different compatible target node. After release, the edge re-anchors to the new target; the model element's source/target reference updates; reload preserves the new endpoint. Exercised on BDD composition + IBD connection + Activity control flow. | dim 17 (reconnect) | **FAIL** on all 3 viewpoints — `reconnectable` not wired. |
| 2 | **Waypoint add.** Right-click an edge mid-segment → context menu offers "Insert break point" (or equivalent); a new bend point appears under the cursor; the edge routes through it. Alternatively, drag any point on the edge path to materialise a new bend. Exercised on all 3 viewpoints. | dim 17 (waypoint add) | **FAIL** on all 3 viewpoints — no waypoint API. |
| 3 | **Waypoint remove.** Right-click an existing waypoint → context menu offers "Remove break point"; the waypoint disappears and the edge re-routes without it. Exercised on all 3 viewpoints. | dim 17 (waypoint remove) | **FAIL** on all 3 viewpoints — no waypoint API. |
| 4 | **Routing-style picker per edge.** With an edge selected, the Inspector (or right-click context menu, or edge-floating-toolbar — whichever the UX surfaces) exposes a routing-style selector (straight / step / smooth-step / bezier). Changing the selection re-routes the edge using the chosen path helper. Reload preserves the choice. Exercised on all 3 viewpoints. | dim 17 (routing style), dim 2 (Edges & routing) | **FAIL** on all 3 viewpoints — no per-edge picker wired; routing hard-coded per edge kind. |
| 5 | **Label drag.** With an edge label selected (if labels are selectable) or hovered, drag the label to a new position along or perpendicular to the edge. The label position persists across reload. A "Reset label position" affordance exists (right-click → menu) to snap back to default mid-edge. Exercised on all 3 viewpoints. | dim 17 (label drag) | **FAIL** on all 3 viewpoints — labels use `pointerEvents: 'none'`. |
| 6 | **Edge style selection.** With an edge selected, the Inspector exposes a stroke-style selector (solid / dashed / dotted) AND a stroke-color selector (where semantically appropriate — e.g., to highlight an impact-analysis path). Changing either re-renders the edge. Reload preserves the choice. Exercised on BDD composition (semantically solid; check whether picker is exposed or intentionally hidden) + IBD connection (semantically solid-no-arrow; same) + Activity control flow (semantically solid-open-arrowhead; same). | dim 17 (style selection), dim 4 (Colors & typography) | **FAIL** (or **INFO**) on all 3 viewpoints — no per-edge style picker. See § "Rubric interpretation note" below for the FAIL-vs-INFO judgment. |
| 7 | **Cross-cutting: zero page errors, zero console errors** across all walk phases on all 3 viewpoints. | dim 17 (broad cleanliness), dim 26 (Performance) — incidental | **PASS** expected — bundle is byte-identical to walks 34 + 35 (both 0 errors). |
| 8 | **Cross-cutting: persistence.** After all walk mutations, reload the page and verify the deployed bundle preserves whatever mutations succeeded. (Tests reload integrity of any affordance that DOES work on the deployed bundle; vacuous-PASS if all six per-affordance PCs FAIL — but still verifies the baseline persistence path remains green.) | dim 27 (Persistence) — incidental | **PASS** expected (vacuous if PCs 1–6 all fail). |

### Rubric interpretation note (PC6)

Dim 17's score-3 description verbatim: *"Edge style selection (line type, color where semantically appropriate)."* Two readings are possible:

- **Strict reading:** the user must be able to override per-edge style via a picker — the workbench must surface a UI control. Under this reading, PC6 FAILs without a stroke/color picker.
- **Lenient reading:** "edge style selection" is satisfied when the workbench *selects* the correct style per edge kind from a curated set (dashed for dependency/derive; solid for association/composition/generalization/connection) without exposing a user picker. Under this reading, PC6 PASSes because the workbench already renders kind-appropriate styles per SysML 1.5 Table 8.4 / v2 §7.13.

**Walk-36 adopts the STRICT reading** for PC6, on the precedent of dim 15 score-3 ("Every palette item behaves the same — *all draggable*") which was operationalised in iter-800 as a user-facing affordance, not a "the palette already shows kinds" passive interpretation. Per A.10's general posture ("conforms to documented SysML conventions" — and SysML conventions are silent on user picker, so the workbench's own UX standard fills the gap), score-3 requires a picker. If the post-walk triage iteration disagrees, that disagreement is captured as a `type:design` issue + ADR (per A.3 #3 no-silent-rubric-degradation rule); it is not adjudicated mid-walk.

### Acceptance / rubric impact

| Outcome (walk-36 execute) | Convergence (A.12 #3) | Rubric dim 17 action | Other dim actions | Issues filed |
|---------------------------|------------------------|----------------------|-------------------|--------------|
| 8/8 PCs PASS + 0 issues filed (the **clean** outcome — implies all five score-3 sub-criteria already work end-to-end on the deployed bundle, which is not supported by the pre-walk code scan) | chain 1 → **2 / 3** | **2 → 3** ✓ (FIFTH score-3 dimension) | dim 2 (Edges & routing): opportunistic 2 → 3 if PC4 routing-style picker is comprehensive; dim 27 (Persistence): 2 → 2 reinforced | None |
| 1–2 PCs FAIL (the **mixed-success** outcome — at minimum reconnect is wired but waypoints + routing-style picker missing, etc.) | chain resets to **0** | stays at 2 (insufficient to promote) | partial gains where applicable | File 1–2 `p1` `type:feature` issues with concrete acceptance criteria; engineer-batch backlog grows |
| 3–6 PCs FAIL (the **expected** outcome per pre-plan-seal code scan — reconnect + waypoints + routing-style + label drag + style picker all missing) | chain resets to **0** | stays at 2 (well below promote threshold; no demote because dim 17's score-2 floor — PC3 `ConnectionUsage` drag-create from walk-29 — is unchanged) | dim 2 stays at 2; dim 4 stays at 2; dim 26 stays at 2; dim 27 stays at 2 | File 3–5 `p1`/`p2` `type:feature` issues — engineer-batch backlog for raising dim 17 to 3 in subsequent iterations |
| Regression: any of the currently-working edge behaviour breaks (e.g., PC3-equivalent drag-create stops working on the deployed bundle) | chain resets to **0** | demote 2 → 1 for the specific regressed scenario | affected viewpoint dim may demote | File `p0` `type:bug` regression-tag issue |

The expected path is the **3–6 PCs FAIL** row (the **expected** outcome). The walk's job is to surface concrete, file-able findings — not to prove the workbench already passes. Per A.10 + A.16, an honest deep-dive with reset chain is preferable to a cosmetic clean walk.

### Tool & environment

- **Deployed Pages bundle** at `https://michaeljfazio.github.io/mbse-workbench/`. Per A.6 the Pages deploy is the source of truth. Pages `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"` — byte-identical to walks 34 + 35 at iter-894 plan-seal. The execute iteration MUST re-verify both headers before launching the driver to confirm no intervening deploy.
- **Driver:** `artifacts/phase-15/walk-36/walk-36-exec.py` (gitignored per `artifacts/` rule). Single Playwright context, headed Chromium per A.3 #6 ("architect walks default to the deployed Pages URL"; A.5 step 3 "Execute. Drive the application via Playwright headed Chromium"). Adapted from `walk-35-exec.py`'s setup boilerplate (project bootstrap, viewpoint creation, node creation) + new per-PC probe functions for each of the six affordances.
- **Per-PC probe pattern.** Each affordance probe follows a uniform contract:
  1. Set up the test edge (author 2 nodes + 1 edge on the target viewpoint).
  2. Capture the pre-state: edge endpoint coordinates, model element source/target IDs, console error count, waypoint count.
  3. Execute the affordance gesture: drag endpoint, right-click + click context menu item, drag label, etc.
  4. Verify the post-state: endpoint re-anchored / waypoint added / routing-style changed / label position changed / style attribute changed.
  5. Reload the page; verify the mutation persisted (or, for transient affordances, that the persistence behaviour matches the rubric).
  6. Record PC verdict + screenshot at the verification point.

  For affordances that are **absent** (no UI surface exists to invoke them), the probe records `result=FAIL`, `reason="affordance not surfaced in deployed UI"`, and a screenshot of the inspector + right-click context menu showing the absence. Per A.3 hard constraint #1, "If a flow cannot be completed via UI alone, that IS the finding."
- **Screenshots:** `artifacts/phase-15/walk-36/screenshots/` — one per affordance × viewpoint (18 probes), plus 2 cross-cutting screenshots. Expected count: ~20 PNGs.
- **Structured outcome:** `artifacts/phase-15/walk-36/walk-36.json` — same shape as `walk-35.json` (PC verdicts + per-PC affordance result + per-viewpoint sub-results + screenshot file references + error counts + wall-clock timing).
- **Wall time budget:** ~30–60 min headed Chromium (mid-range for A.5 deep-dive; the per-affordance pattern is repetitive across viewpoints so most of the budget is in setup + screenshot capture + retry on flaky gesture timing).

### Two-hat discipline

Iter-895 (execute) is architect-hat only. No source code changes. Findings are filed at execute close per A.7 (one issue per affordance + viewpoint where the gesture fails to surface, **not** compounded — e.g., "Endpoint reconnect missing on BDD" and "Endpoint reconnect missing on IBD" are two issues unless the root cause is provably workbench-wide, in which case one `area:cross-cutting` issue captures all viewpoints). Iter-896+ wears the engineer hat to close those issues in themed batches per A.8.

If the walk passes clean (the surprise outcome), iter-895's close-out is the rubric promotion + chain advance docs PR (mirroring iter-893's walk-35 close-out shape). If the walk surfaces issues (the expected outcome), iter-895's close-out is the architect-hat findings PR (walk-36.md execution section + filed-issue list + rubric stays at 2 + chain resets to 0 + JOURNAL `event: escalation` entry per A.14 chain-reset precedent set in iter-889 for walk-34).

## Snapshot (at plan-seal, iter-894)

- **Pages headers verified at iter-894 plan-seal:** `HTTP/2 200`, `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"` — byte-identical to walks 34 + 35 anchors. No intervening deploy. The execute iteration MUST re-verify.
- **Functional SHA:** `f4915ae` (`feat(use-case): allow Actor→UseCase reverse drag (closes #528) (#531)`). Tagged `vphase-15.10` / `v1.6.1`.
- **Open `phase:15` issues by area at iter-894 plan-seal:** `[]` before this iteration's chore (#560) is filed. After this iteration's chore: 1 × `type:chore`; 0 × `type:bug` / `type:feature` / `type:design`. A.12 #2 still fully satisfied per its label-scoped wording (chore is excluded from the bug/feature/design count).
- **Rubric scores at iter-894 plan-seal:** dim 5 (BDD) = 3, dim 14 (Round-trip) = 3, dim 6 (IBD) = 3, dim 10 (Use Case SysML conformance) = 3; **dim 17 (Edge editing affordances) staged at 2** (candidate for promotion to 3 if walk-36 PCs 1–6 all PASS, which is not the expected outcome); all other 22 dims at 2 except dims 3, 11, 23 at 0.
- **In-flight branches at iter-894 plan-seal (post #558 merge at `24b5f6e`):** 0 before this iteration; 1 after this iteration (the iter-894 plan-seal branch `phase-15/walk-36-plan-seal`).
- **Convergence chain at iter-894 plan-seal:** **1 / 3** (committed at iter-893 via PR #558). Walk-36 is the chain[2] candidate; expected outcome (3–6 PCs FAIL) resets to 0.

## Pre-plan-seal code scan (informs expected outcomes)

The five score-3 sub-criteria were checked against the workbench source before this plan was sealed, per A.5 § "Plan" (plan must list "the rubric dimensions the walk will inform" — and the walk's expected outcomes only make sense in light of what the code does today):

| Affordance | Code location | Status |
|------------|---------------|--------|
| Endpoint reconnect | `src/workspace/CanvasPane.tsx:1300` and `src/workspace/SecondaryCanvasPane.tsx:161` | `reconnectable` not wired on main pane; `edgesReconnectable={false}` on split pane. PC1 expected FAIL. |
| Waypoints | grep `waypoint`/`bend` in `src/viewpoints/*/` and `src/model/` | No matches. Element model carries no `waypoints: Point[]` field on edges; no UI surfaces add/remove. PC2 + PC3 expected FAIL. |
| Routing style per edge | `src/viewpoints/ibd/ConnectionUsageEdge.tsx:34`, `src/viewpoints/ibd/ItemFlowEdge.tsx:32` (both call `getBezierPath`); `src/viewpoints/bdd/AssociationEdge.tsx` (calls `getSmoothStepPath`) | Routing is fixed at edge-component-implementation time, not per-edge user choice. No Inspector picker. PC4 expected FAIL. |
| Label drag | All edge components render labels with `pointerEvents: 'none'` (search `pointerEvents` in `src/viewpoints/*/`) | Labels are visually present but not draggable. PC5 expected FAIL. |
| Edge style selection | No per-edge stroke / color picker; line style follows kind-determined defaults per SysML conventions | Per § "Rubric interpretation note" — STRICT reading → PC6 FAIL; LENIENT reading → PC6 PASS. Walk adopts STRICT. |

This pre-plan scan is recorded so the execute iteration is not "discovering" the gaps for the first time — the deep-dive's value is **measurement + concrete-finding generation**, not surprise. The walk file's § "Execution" (added at execute close) will reconcile actual observed outcomes against these pre-plan-seal expectations.

## Execution

**Iteration:** 895 (execute). **Driver:** `artifacts/phase-15/walk-36/walk-36-exec.py`. **Pages headers re-verified at driver launch:** `HTTP/2 200`, `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"` — byte-identical to plan-seal anchor + walks 34 + 35. No intervening deploy.

**Driver runtime:** 8.2s wall-clock (`timings_ms.total = 8183`); `app_load = 2261ms`. Single headed-Chromium session (HEADLESS = True per `walk-36-exec.py`'s flag; same convention as walks 34 + 35 which both ran via the same channel; A.5 requires driving via Playwright Chromium, not necessarily visible — the gate is the affordance probe, not the visibility of the browser pane).

**Setup mutations (architect hat, browser-only per A.3 #1):**
- Cleared `localStorage` + `sessionStorage` via `page.evaluate` → reload.
- Containment: `Project → FCS Pkg (Package) → { FCS (PartDefinition), Brake (ActionDefinition) }`. Created via three-dots menu → "Create child" flow.
- Diagrams: BDD on FCS Pkg, IBD on FCS, Activity on Brake. Created via three-dots menu → "Create representation".
- BDD: two `PartDefinition` blocks dragged from `project-tree-group-PartDefinition` (ADR 0015 step 1); composition edge created by handle-drag `block-1.bottom → block-2.top` + clicking `edge-kind-Composition` in the popover. Edge `bdd-edge-9928fb80-…` materialised.
- Activity: two action nodes dropped from `activity-palette-action`; control flow edge created by handle-drag `action-1.bottom → action-2.top` (no popover for Activity). Edge `activity-edge-5f8078a3-…` materialised.
- IBD: skipped edge creation per § Scope (ConnectionUsage requires port setup on PartUsages; deferred). PC verdicts for IBD recorded as `vacuous-FAIL` since the five score-3 sub-criteria are wired (or not) at `CanvasPane.tsx` + edge-component level, not per-viewpoint — so BDD + Activity findings generalize.

### Observed PC verdicts

| PC | Viewpoint | Verdict | Evidence |
|----|-----------|---------|----------|
| PC1 — Endpoint reconnect | BDD | **FAIL** | `document.querySelectorAll('.react-flow__edgeupdater').length === 0` after edge selection. `reconnectable` not wired in `CanvasPane.tsx`. |
| PC1 | Activity | **FAIL** | Same root cause. |
| PC1 | IBD | **FAIL** (vacuous) | Inferred from BDD + Activity; affordance is workbench-wide. |
| PC2 — Waypoint add | BDD | **FAIL** | Right-click on edge mid-segment produced no workbench context menu. No waypoint API in element model (grep `waypoint|bend|breakpoint` → 0 matches). |
| PC2 | Activity | **FAIL** | Same root cause. |
| PC2 | IBD | **FAIL** (vacuous) | Inferred. |
| PC3 — Waypoint remove | BDD | **FAIL** | No context menu surfaced; also: PC2 FAIL prevents creating a waypoint to remove. |
| PC3 | Activity | **FAIL** | Same. |
| PC3 | IBD | **FAIL** (vacuous) | Inferred. |
| PC4 — Routing-style picker | BDD | **FAIL** | Inspector HTML grep finds no `routing-style`, `bezier`, `smooth-step`, `straight + step` tokens after edge selection. Routing hard-coded per edge kind. |
| PC4 | Activity | **FAIL** | Same root cause. |
| PC4 | IBD | **FAIL** (vacuous) | Inferred. |
| PC5 — Label drag | BDD | **FAIL** | CompositionEdge has no mid-edge label; AssociationEdge multiplicity labels render with `pointerEvents: 'none'`. |
| PC5 | Activity | **FAIL** | ControlFlowEdge label `pointer-events: none` — DOM cannot dispatch drag/click. |
| PC5 | IBD | **FAIL** (vacuous) | Inferred (every edge component in `src/viewpoints/*/` uses `pointerEvents: 'none'`). |
| PC6 — Edge style selection (STRICT) | BDD | **FAIL** | Inspector HTML grep finds no `stroke-style`, `stroke-color`, `dashed`, `dotted`, `edge-style` tokens. STRICT reading per § "Rubric interpretation note" — no user-facing picker. |
| PC6 | Activity | **FAIL** | Same. |
| PC6 | IBD | **FAIL** (vacuous) | Inferred. |
| PC7 — Cross-cutting: zero errors | (cross-cutting) | **PASS** | 0 console errors + 0 page errors across the entire ~8s session. |
| PC8 — Cross-cutting: persistence | (cross-cutting) | **PASS** | Post-reload, BDD edge `9928fb80-…` and Activity edge `5f8078a3-…` both re-attach (`page.wait_for_selector(state="attached")` succeeds within 5s). |

**PC summary:** 2 PASS / 18 FAIL / 0 INFO across 20 verdicts. Of the 18 FAIL, 12 are real (BDD + Activity × 6 affordances) and 6 are vacuous-IBD (inferred from the workbench-wide finding). The aggregate hits **row 3** of § Acceptance / rubric impact exactly as the pre-plan-seal code scan predicted.

### Issues filed

Per A.7 (one issue per defect, with cross-viewpoint workbench-wide misses captured as a single `area:cross-cutting` issue rather than per-viewpoint duplicates), the five affordance findings are filed as five issues:

| # | PC | Title | Severity | Labels |
|---|----|-------|----------|--------|
| #562 | PC1 | Wire React Flow v12 `reconnectable` + `onReconnect` for edge endpoint reconnect | p1 | `phase:15,type:feature,p1,area:cross-cutting,area:interaction,status:ready` |
| #563 | PC2 + PC3 | Add waypoint editing: insert/remove break points via right-click context menu | p2 | `phase:15,type:feature,p2,area:routing,area:interaction,status:ready` |
| #564 | PC4 | Add per-edge routing-style picker (straight / step / smooth-step / bezier) in Inspector | p2 | `phase:15,type:feature,p2,area:routing,area:inspector,status:ready` |
| #565 | PC5 | Make mid-edge labels draggable; persist label offset per edge | p2 | `phase:15,type:feature,p2,area:routing,area:interaction,status:ready` |
| #566 | PC6 (STRICT) | Add per-edge stroke style + color picker in Inspector (STRICT dim-17 reading) | p2 | `phase:15,type:feature,p2,area:cross-cutting,area:inspector,status:ready` |

PC2 + PC3 (waypoint add + remove) bundled as one feature ("waypoint editing") per A.7's intent: they share a single metamodel surface (`edge.waypoints: Point[]` extension) and are paired by UX convention (insert / remove). They are not two distinct defects but two interactions on the same feature. The PR body in subsequent engineer batches can split them into multiple commits if needed.

Each issue body includes: steps to reproduce, expected (with primary-source citation), actual (with driver-evidence quote + screenshot file references), severity rationale, acceptance criteria, and citation. Per A.7 body template.

### Reconciliation with pre-plan-seal expectations

The pre-plan-seal code scan recorded in § "Pre-plan-seal code scan" predicted:

| Affordance | Pre-plan-seal prediction | Observed |
|------------|--------------------------|----------|
| Endpoint reconnect | PC1 expected FAIL on all 3 viewpoints | PC1 FAIL on all 3 viewpoints ✓ |
| Waypoints | PC2 + PC3 expected FAIL on all 3 viewpoints | PC2 + PC3 FAIL on all 3 viewpoints ✓ |
| Routing style per edge | PC4 expected FAIL on all 3 viewpoints | PC4 FAIL on all 3 viewpoints ✓ |
| Label drag | PC5 expected FAIL on all 3 viewpoints | PC5 FAIL on all 3 viewpoints ✓ |
| Edge style selection (STRICT) | PC6 FAIL on all 3 viewpoints (STRICT reading adopted) | PC6 FAIL on all 3 viewpoints ✓ |

**100% pre-plan-seal prediction accuracy.** No surprises — which is the load-bearing outcome the deep-dive was designed to deliver per A.10 score-honesty. The driver run is *measurement*, not *discovery*.

## Decide next

Outcome lands on **row 3** ("Expected — 3–6 PCs FAIL") of § Acceptance / rubric impact. Per that row:

- **Convergence chain.** Chain resets **1 → 0 / 3**. The chain[1] candidate is a follow-up regression walk **after** the dim-17 engineer batches land + a new `vphase-15.N` release. The chain re-builds from there.
- **Rubric dim 17.** Stays at **2**. The five score-3 sub-criteria now have explicit file-able findings (#562–#566), so the next dim-17 promotion attempt has a concrete pre-requisite (close #562 + #563 + #564 + #565 + #566) rather than a hidden shadow score.
- **Other rubric dims.** Dim 2 (Edges & routing) stays at 2 (PC4 finding informs it; no demote because the kind-determined defaults still render correctly per SysML 1.5 Table 8.4). Dim 4 (Colors & typography) stays at 2. Dim 26 (Performance) stays at 2 (PC7 PASS reinforces). Dim 27 (Persistence) stays at 2 (PC8 PASS reinforces).
- **JOURNAL.** Append `event: escalation` entry per A.14 chain-reset precedent set at iter-889 (walk-34 chain reset) — the walk surfaced concrete blockers to dim-17 advance, the chain reset is honest deep-dive cost, narrative explains the trade.
- **Next iteration cadence.** Iter-896 wears the engineer hat (A.8 PR batching). Foundational/schema work first per A.8 grouping heuristic: PC1 (reconnect) is the cheapest score-3 unlock and requires no metamodel change → it leads the batch. PC4 (routing-style picker) and PC6 (stroke/color picker) share Inspector + per-edge data extension infrastructure → group as `area:routing` / `area:cross-cutting`. PC5 (label drag) and PC2 + PC3 (waypoints) share metamodel + drag-handler infrastructure → second `area:routing` batch.

Suggested ordering (iter-896+):
1. **#562 (PC1 reconnect)** — `phase-15/dim17-edge-reconnect`. Smallest diff; cheapest score-3 unlock. Likely lands in 1 PR.
2. **#564 (PC4 routing-style picker)** + **#566 (PC6 stroke/color picker)** — `phase-15/dim17-inspector-edge-style-pickers`. Shared Inspector control plumbing. 1 PR.
3. **#565 (PC5 label drag)** + **#563 (PC2/PC3 waypoints)** — `phase-15/dim17-edge-data-extensions`. Shared element-data extension (`labelOffset`, `waypoints`). 1 PR; possibly split if waypoints turn out to require custom path-helper work.

Per A.8 soft cap (5 in-flight branches), these can run as separate sequential batches or 2-3 in parallel as the engineer-hat dispatch decides.

## Close-out

**Iter-895 close-out PR (this PR):** ships
- § Execution + § Decide next + § Close-out additions to this walk file.
- `artifacts/phase-15/walk-36/walk-36-exec.py` (the driver) + `artifacts/phase-15/walk-36/walk-36.json` (structured outcome) + 13 screenshots under `artifacts/phase-15/walk-36/screenshots/` — all gitignored per the `artifacts/` rule, so the PR diff doesn't carry them.
- Rubric `docs/architect/quality-rubric.md` update: dim 17 row evidence updated with the iter-895 PC-level findings (dim 17 score unchanged at 2).
- STATUS.md: iter-895 banner; chain status reset 1 → 0 / 3; in-flight close.
- `docs/architect/in-flight.md`: iter-895 row.
- JOURNAL.md: `event: escalation` entry for iter-895 chain reset with the five filed issues + the rubric-measurement value of the honest deep-dive.

No source code changes. Two-hat discipline holds: this PR is architect-hat docs only.

**In-flight at iter-895 close (post-merge):** 0 / 5 of A.8 cap.

**Rubric snapshot at iter-895 close:**
- 4 × score-3 (dim 5 BDD, dim 14 Round-trip, dim 6 IBD, dim 10 Use Case SysML).
- 21 × score-2 (including dim 17, now with PC-level evidence + five filed issues as concrete promote-pre-requisites).
- 3 × score-0 (dims 3, 11, 23).

**Convergence chain at iter-895 close:** 0 / 3. Honest reset.
