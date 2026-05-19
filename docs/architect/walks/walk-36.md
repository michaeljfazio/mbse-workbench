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

Pending. Iter-895 (execute) will append a § "Execution" subsection with pre-flight, driver invocation, PC table with observed verdicts + screenshots, and aggregate result.

## Decide next

Pending. Iter-895 will choose based on outcome row of § Acceptance / rubric impact:

- **Clean (row 1 — surprise):** chain 1 → 2; dim 17 promote 2 → 3 (FIFTH score-3); iter-896 plan-seals chain[3] candidate (broad-sweep regression on same bundle, mirroring walk-35).
- **Mixed (row 2):** chain resets to 0; dim 17 stays at 2; iter-896+ wears engineer hat to close the 1–2 filed issues; chain[1] candidate (after issue closure + new release) is a regression walk on the new bundle.
- **Expected (row 3 — 3–6 PCs FAIL):** chain resets to 0; dim 17 stays at 2; iter-896 plan-seals an engineer-batch decomposition issue (`type:design`) for the 3–5 filed dim-17 issues; subsequent batches per A.8 close them in `area:routing` / `area:cross-cutting` themed PRs; once enough land to enable the affordances, a regression walk re-targets dim 17.
- **Regression (row 4):** `p0` issue + revert + chain reset; takes priority over dim-17 work until incident closes.

## Close-out

Pending. Iter-895 (execute close-out) will finalise this walk file with the issues-filed list, the in-flight row close, the rubric snapshot, and a one-line A.12 status update to STATUS.md. The plan-seal PR (this iteration's PR) ships only the § Plan + § Snapshot + § Pre-plan-seal code scan sections.
