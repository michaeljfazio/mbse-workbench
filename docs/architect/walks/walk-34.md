# Walk 34 — Broad-sweep regression on `vphase-15.10` / `v1.6.1` Pages (chain[1] retry; dim-10 score-3 gate)

**Iteration:** 887 (plan-seal); execution iteration: 888 (planned)
**Walk type:** Broad-sweep regression (A.5: re-execute walk-33's 24-PC sweep against the newly-deployed `vphase-15.10` / `v1.6.1` Pages bundle which now contains the #528 fix — Actor source handles added in PR #531).
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — `vphase-15.10` / `v1.6.1`. Functional commit `f4915ae` (`feat(use-case): allow Actor→UseCase reverse drag (closes #528) (#531)`). Pages `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"` at iter-887 plan-seal. **The execute iteration MUST re-verify the `last-modified` header before launching the driver** to confirm no intervening deploy has shifted the bundle.

## Plan

Walk-34 is the **chain[1] retry candidate** in the A.12 #3 convergence chain (chain currently at 0/3 after walk-33 filed #528 in iter-878). #528 was the genuine partial-implementation gap that the corrected walk-33 driver surfaced (bidirectional validator + uni-directional handle typing on `ActorNode`); it shipped via PR #531 (iter-879, squash `f4915ae`) and was released in `vphase-15.10` / `v1.6.1` (iter-886, the first agent-cut release under ADR 0017).

Walk-34's job is **dual** — identical contract to walk-33 but with #528 now released:

1. **Convergence advance (A.12 #3).** A clean walk-34 (zero new issues filed, zero rubric demotion) advances chain 0 → **1 / 3**. The chain[2] candidate is then a follow-up walk (broad-sweep or dedicated dim-17 walk per iter-876 "After dim-10 promotion" plan).

2. **Dim-10 score-3 promotion (A.10).** Dim 10 (Use Case SysML conformance) has been held at 2 since walk-1 by the missing Actor↔UseCase association in **both** drag directions — explicitly cited in walk-33 § "Acceptance / rubric impact": *"the score-3 description's 'association' requires both directions for true SysML conformance per OMG UML 2.5 § 16.3 association notation."* With #528 shipped in `vphase-15.10`, the bidirectionality gap is removed in principle. Walk-34 verifies it is also removed in practice against the deployed bundle.

   Dim-10's A.10 score-3 description: *"Use case ellipses, actor stick figures, association, `include`, `extend`, generalization between use cases, generalization between actors, system boundary rectangle with system name."* The remaining blocker on dim-10's path to score-3 was the bidirectionality completeness; system-boundary chrome remains explicitly deferred per ADR 0007 § 5 and is **not** required for dim 10 score-3 (separate decoration concern outside the relationship set). Walk-34's clean pass on use-case V-B in both directions IS the dim-10 score-3 promotion evidence.

### Scope

Identical to walk-33: 8 viewpoints × 2 per-viewpoint PCs + 8 cross-cutting PCs = 24 PCs. See `walk-31.md § Scope` for the full table; reproduced via a fresh `walk-34-exec.py` driver (copy-of `walk-33-exec.py` with one amendment — see below).

### Driver amendment from walk-33

The walk-33 driver's use-case/V-B step ran two sub-passes:

- Primary direction (`usecase.right` → `actor.left`) — PASSED.
- Secondary direction (`actor.left` → `usecase.left`) — FAILED (ActorNode declared `left` as target only; React Flow gated drag-initiation on `type="source"` handles before the validator ran).

PR #531's fix added paired source handles on the existing UseCaseNode positions: `Position.Right` and `Position.Bottom` are now `type="source"` on ActorNode (`src/viewpoints/useCase/ActorNode.tsx:147-158`). The `top` and `left` handles remain target-only — the fix added new source handles rather than converting existing ones.

The walk-34 secondary direction MUST therefore drag from one of Actor's **new** source handles (`right` or `bottom`) into one of UseCase's target handles (`top` or `left`). The canonical pair is `actor.right` → `usecase.left` (Actor on left, UseCase on right, natural left-to-right drag motion):

```python
# walk-34-exec.py — use-case V-B
# Primary direction (unchanged from walk-33): usecase.right -> actor.left
pc_v_b_primary = drag_handle("uc-0", "right", "actor-0", "left")

# Secondary direction (post-#528 — actor-initiated drag now reaches onConnect):
# actor.right -> usecase.left. The validator (isValidUseCaseConnection)
# accepts cross-kind in both directions per #519; the handle typing now
# permits drag-initiation from the Actor side per #531.
pc_v_b_secondary = drag_handle("actor-0", "right", "uc-0", "left")

# Both must produce an AssociationEdge in the model store.
pc_v_b = pc_v_b_primary == "PASS" and pc_v_b_secondary == "PASS"
```

Layout note: the walk-33 driver positioned the actor at the diagram-left and the use case at the diagram-right per the canonical scenario in `examples/__fixtures__/use-case-association.json`. That layout puts `actor.right` directly facing `usecase.left`, so the drag path is short and the existing screenshot framing remains valid. No baseline change required.

### Pass criteria

24 PCs total: 16 per-viewpoint (V-A/V-B for each of bdd, ibd, requirements, activity, state-machine, use-case, parametric, package) + 8 cross-cutting (X-1 page/console errors, X-2 tree membership, X-3 tree-row activates diagram, X-4 ConnectionMode.Loose containment, X-5 acronym auto-name containment, X-6 persistence, X-7 chat sidebar drive-by, X-8 Cmd-K). See `walk-31.md § "Pass criteria"` for full criterion definitions.

### Acceptance / rubric impact

| Outcome | Convergence (A.12 #3) | Rubric impact | Issues filed |
|---------|------------------------|---------------|--------------|
| 23/24 PASS + 1 INFO (X-7 unchanged) — use-case V-B PASS in **both** directions | chain 0 → **1 / 3** | Dim 10 (Use Case SysML conformance) promotes **2 → 3** (FOURTH score-3 dimension) | None |
| 23/24 PASS + 1 INFO — use-case V-B PASS primary direction, FAIL secondary | chain stays at **0** | Dim 10 holds at 2 | File `p1` `type:bug` for the #531 regression / incomplete fix |
| Any new FAIL outside use-case V-B (regression from `vphase-15.9` → `vphase-15.10`) | chain stays at **0** | Affected dim demote 2 → 1 with regression tag | File `p1` `type:bug` per A.7 |
| Console errors observed (X-1 FAIL) | chain stays at **0** | dim 26 demote candidate if perf-related | File `p1` `type:bug` |

The expected path is row 1 (clean walk → chain advance + dim-10 promotion). #531 was a small, focused fix (+4 lines of `Handle` JSX) with a new e2e test covering the actor-initiated drag; the implementation surface is narrow and the fix was reviewed pre-merge. Confidence is high that walk-34 lands on row 1.

### Tool & environment

- **Deployed Pages bundle** at `https://michaeljfazio.github.io/mbse-workbench/`. Pages `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"` corresponds to `vphase-15.10` / `v1.6.1` (agent-tagged on commit `7a118a7` at 2026-05-18T23:11:11Z; deploy fronted ~48s later at 23:11:59). The execute iteration MUST re-verify before launching the driver.
- **Driver:** `artifacts/phase-15/walk-34/walk-34-exec.py` (gitignored per `artifacts/` rule). Copy-of `walk-33-exec.py` + the use-case V-B secondary-direction amendment above (handle pair `actor.right` → `usecase.left`).
- **Outcome artefacts:** `artifacts/phase-15/walk-34/walk-34.json` + `artifacts/phase-15/walk-34/screenshots/`.
- **Wall time budget:** ~3 min (single-pass headless Chromium, mirroring walk-33's footprint).

### Two-hat discipline

Iter-888 (execute) is architect-hat only. No source code changes. If the walk surfaces a regression or a fresh issue, iter-889 files the issue (architect close-out) and iter-890+ wears the engineer hat. If the walk passes clean (the expected outcome), iter-889 is the close-out PR (dim-10 promotion + chain advance + JOURNAL `event: design-decision` entry per A.14 "First rubric dimension at 3 of category" — first use-case viewpoint dim at 3 + first dim promoted off score-2 since iter-867).

## Snapshot (at plan-seal, iter-887)

- Pages SHA: `7a118a7` (agent-tagged); functional commit (the #528 fix) is `f4915ae` from PR #531, squash-merged into main 2026-05-18T22:17:16Z. The tag was anchored to the most recent main commit (`7a118a7`) per the iter-886 release-notes decisions-log entry. `curl -sI` at iter-887 launch returned `last-modified: Mon, 18 May 2026 23:11:59 GMT, etag: "6a0b9cbf-1eb"`, HTTP 200. Drift from walk-33 anchor (`6a0b8154-1eb` / `21:15:00 GMT`) confirmed.
- Open `phase:15` issues by area at launch: `[]` before iter-887's plan-seal chore is filed (A.12 #2 fully satisfied). After this iteration's chore (`#546`): 1 × `type:chore`; 0 × `type:bug`/`type:feature`/`type:design`. A.12 #2 still satisfied per its label-scoped wording.
- Rubric scores at launch: dim 5 (BDD) = 3, dim 6 (IBD) = 3, dim 14 (Round-trip) = 3; **dim 10 (Use Case SysML conformance) staged at 2 → 3 candidate for walk-34**; all other 22 dims at 2 except dims 3, 11, 23 at 0.
- In-flight branches at launch (post iter-886 merge at `179f1fe`): 0 before this iteration; 1 after this iteration (the iter-887 plan-seal branch).
- Convergence chain at launch: **0 / 3**. Walk-34 is the chain[1] retry candidate.

## Execution

**Driver:** `artifacts/phase-15/walk-34/walk-34-exec.py` (gitignored). Authored as a byte-for-byte copy of `walk-33-exec.py` with one amendment per § Driver amendment from walk-33: the use-case V-B SECONDARY drag now uses `actor.right → usecase.left` (the NEW source handle added by PR #531 at `ActorNode.tsx:147-158`) instead of walk-33's `actor.left → usecase.left`. Run as a single-pass headless Chromium driver in ~3 min wall time. Outcome JSON at `artifacts/phase-15/walk-34/walk-34.json`; screenshots under `artifacts/phase-15/walk-34/screenshots/` (both gitignored per the `artifacts/` rule).

**Pre-flight at execute launch (iter-888).** Pages headers re-verified via `curl -sI https://michaeljfazio.github.io/mbse-workbench/`: `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"`, HTTP 200 — identical to the plan-seal anchor (no intervening deploy). Halt check clean. Iter-887 plan-seal PR #547 merged at `a8651bb`.

**Pass-criteria table (24 PCs).**

| PC | Result | Detail |
|----|--------|--------|
| bdd / V-A | PASS | `node_id=914a218e…` bg `rgb(255, 255, 255)` opacity 1 size 220×240 |
| bdd / V-B | PASS | Second-Block placement only (composition-edge drag skipped per plan) |
| ibd / V-A | PASS | PartUsage `e7700f5a…` bg `rgb(255, 255, 255)` size 200×100 |
| ibd / V-B | PASS | Second PartUsage placement (`9a7ec712…`) — `edge_kind=second-PartUsage-only` |
| requirements / V-A | PASS | Requirement `eefe84f2…` bg `rgb(255, 255, 255)` size 240×180 |
| requirements / V-B | PASS | Second-Requirement placement only |
| activity / V-A | PASS | Action `21ca1445…` bg `rgb(255, 255, 255)` size 180×80 |
| activity / V-B | PASS | Control-flow edge created (`edge_kind=control-flow`) |
| state-machine / V-A | PASS | State `61f8461b…` bg `rgb(255, 255, 255)` size 160×72 |
| state-machine / V-B | PASS | Transition edge created (`edge_kind=transition`) |
| use-case / V-A | PASS | UseCase `8af6be19…` size 180×90; ellipse SVG fill `hsl(var(--card))` |
| **use-case / V-B** | **PARTIAL** | **PRIMARY `usecase.right → actor.left` PASS; SECONDARY `actor.right → usecase.left` FAIL — drag completes, no edge appears within 5s. `edge_kind=association-primary-only`. Finding logged.** |
| parametric / V-A | PASS | ConstraintUsage `1bf8cd53…` bg `rgb(255, 255, 255)` size 220×100 |
| parametric / V-B | PASS | ValueProperty node `92861c74…` |
| package / V-A | PASS | Package `bdc90e5a…` size 220×120 |
| package / V-B | PASS | Second Package node `4543544a…` (containment edge skip per plan) |
| X-1 page/console errors | PASS | `page_errors=0`, `console_errors=0` |
| X-2 tree membership | PASS | All 8 viewpoints |
| X-3 tree activates diagram tab | PASS | All 8 viewpoints |
| X-4 ConnectionMode.Loose containment | PASS | All 8 viewpoints |
| X-5 acronym auto-name containment | PASS | All 8 viewpoints |
| X-6 persistence (reload) | PASS | All 8 viewpoints |
| X-7 chat sidebar drive-by | INFO | No chat tab `data-testid` discovered — dim 23 stays at score 0 (unchanged) |
| X-8 Cmd-K palette | PASS | Opens on Cmd-K, closes on Escape |

**Aggregate.** **22 PASS + 1 PARTIAL + 1 INFO.** Lands on row 2 of § Acceptance / rubric impact.

**Use-case V-B detail.** Both the actor's right-side source handle (`react-flow__handle-right` on `[data-testid="use-case-actor-<id>"]`) and the use case's left-side target handle (`react-flow__handle-left` on `[data-testid="use-case-usecase-<id>"]`) were located in the DOM. The driver dispatched the same `drag_handle()` helper that succeeded for the primary direction (real `mouse.down/move/up` events, not synthetic `dispatchEvent`). After the drag, the driver waited 5s for a new entry in the `use-case-edge-*` testid set and timed out. No new finding from the validator side: `src/viewpoints/useCase/isValidConnection.ts:25-32` accepts `Actor → UseCase` per #519. Issue **#548** filed (`p1`, `area:viewpoint:uc`, `type:bug`) with three candidate hypotheses for the engineer to investigate (duplicate-edge dedupe; `connectionMode` mismatch; `onConnectStart` filtering).

## Decide next

**Outcome row applied:** row 2 of § Acceptance / rubric impact.

- Convergence (A.12 #3): **chain stays at 0 / 3.** Walk-34 surfaced a fresh `type:bug`; chain resets to 0 per A.12 #3 semantics. The next walk (walk-35) becomes the new chain[1] candidate.
- Rubric (A.10): **dim 10 (Use Case SysML conformance) holds at 2.** The bidirectional-association completeness gap that has held dim 10 at 2 since walk-1 is still present; the partial fix delivered by #531 closed the handle-typing portion but not the connection-creation portion.
- No other dim demoted — no regression observed on any other viewpoint.

**Issues filed**

- **#548** — `[area:viewpoint:uc] Actor→UseCase drag from new source handle still produces no edge (vphase-15.10 / v1.6.1; PR #531 fix incomplete)` (`p1`, `type:bug`, `area:viewpoint:uc`, `status:ready`).

**Iter-889 (close-out for the architect lifecycle).** Walk-34 is fully scored; no further architect work required in iter-889. Iter-889 lands STATUS sync + JOURNAL `event: escalation` entry per A.14 (walk surfaced fresh issue; chain reset).

**Iter-890+ (engineer hat).** First engineer batch closes **#548**. Per the hypotheses in #548's body, the investigation order is: (1) isolated repro to falsify the duplicate-edge-dedupe hypothesis, (2) inspect `connectionMode` on the use-case ReactFlow instance, (3) inspect any `onConnectStart` filtering by `data-use-case-node-kind`. The fix lands with a new e2e test that drags `actor.right → usecase.left` in a clean diagram (no preceding primary) and asserts an Association edge appears.

**Walk-35 (next architect walk).** After the #548 fix ships in a subsequent `vphase-15.N` release, walk-35 is the new chain[1] retry candidate against that bundle. Walk-35's contract is identical to walk-34's — 24 PCs against the deployed bundle, with use-case V-B now expected to PASS both directions cleanly.

## Close-out

**Architect-hat finish (iter-888).** Walk-34 cleanly surfaced exactly the residual gap predicted by walk-34.md row 2: #531 made the handle source-typed but did not close the bidirectional-association path through to edge creation. The architect's instrument (the broad-sweep regression driver) did its job — caught a partial implementation that would have shipped invisibly otherwise.

**Convergence chain state after iter-888:** 0 / 3 (reset by #548 filing).

**Rubric snapshot after iter-888:** dim 5 (BDD) = 3, dim 6 (IBD) = 3, dim 14 (Round-trip) = 3; 22 other dims at 2 (incl. dim 10 holding); 3 dims at 0 (dims 3, 11, 23). No change from iter-887.

**A.12 #2 (zero open `phase:15` issues labelled `type:bug/feature/design`):** **NOT satisfied at iter-888 close** — #548 (`type:bug`, `p1`) is open. Engineering iter-890+ work returns A.12 #2 to satisfied once #548 is closed and released.

**Walk artefacts (gitignored):**

- `artifacts/phase-15/walk-34/walk-34-exec.py` — driver
- `artifacts/phase-15/walk-34/walk-34.json` — outcome JSON
- `artifacts/phase-15/walk-34/screenshots/` — 27 PNGs across the 8 viewpoints + V-B primary/secondary split for use-case

The walk file itself (this document) is committed under `docs/architect/walks/walk-34.md` per A.5 step 6.
