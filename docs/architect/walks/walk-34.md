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

(To be filled by iter-888.)

## Decide next

(To be filled by iter-888.)

## Close-out

(To be filled by iter-888.)
