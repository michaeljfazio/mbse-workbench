# Walk 33 — Broad-sweep regression on `vphase-15.9` Pages (chain[1] candidate, dim-10 score-3 gate)

**Iteration:** 877 (plan-seal); execution iteration: 878 (planned)
**Walk type:** Broad-sweep regression (A.5: re-execute walk-32's 24-PC sweep against the newly-deployed `vphase-15.9` / `v1.6.0` Pages bundle which now contains the Actor↔UseCase association implementation from PR #519).
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — `vphase-15.9` / `v1.6.0`. Functional commit `4e474ee` (`feat(use-case): implement Actor↔UseCase association (closes #517) (#519)`). Pages `last-modified: Mon, 18 May 2026 21:15:00 GMT`, `etag: "6a0b8154-1eb"`. **The execute iteration MUST re-verify the `last-modified` header before launching the driver** to confirm no intervening deploy has shifted the bundle.

## Plan

Walk-33 is the **chain[1] candidate** in the A.12 #3 convergence chain (chain currently at 0/3 after walk-32 filed #517 in iter-871). The chain reset traces back to walk-31's #513 (iter-869, since closed wontfix as driver artefact in iter-870). #517 was the genuine feature gap that the corrected walk-32 driver surfaced; it shipped via PR #519 (iter-872) and was released in `vphase-15.9` / `v1.6.0` (iter-876).

Walk-33's job is **dual**:

1. **Convergence advance (A.12 #3).** A clean walk-33 (zero new issues filed, zero rubric demotion) advances chain 0 → **1 / 3**. The chain[2] candidate is then a follow-up walk (broad-sweep or dedicated dim-17 walk per iter-876 "After dim-10 promotion" plan).

2. **Dim-10 score-3 promotion (A.10).** Dim 10 (Use Case SysML conformance) has been held at 2 since walk-1 by the missing Actor↔UseCase association — explicitly cited in walk-32 § "Rubric impact": *"users can still author UseCase↔UseCase (Include, Extend, Generalization) and Actor↔Actor (Generalization) edges. The missing Actor↔UseCase association is the specific blocker preventing dim 10 from reaching score-3."* With #517 shipped in `vphase-15.9`, the blocker is removed in principle. Walk-33 verifies the blocker is also removed in practice against the deployed bundle — a regression of walk-32's use-case/V-B PC plus the broader use-case viewpoint must now demonstrate the full association notation set (UseCase↔UseCase Include/Extend/Generalization + Actor↔Actor Generalization + Actor↔UseCase Association in **both** directions per `src/viewpoints/useCase/isValidConnection.ts` post-#519).

   Dim-10's A.10 score-3 description: *"Use case ellipses, actor stick figures, association, `include`, `extend`, generalization between use cases, generalization between actors, system boundary rectangle with system name."* Of these, the only blocker on dim-10's path to score-3 was the missing **association** edge between Actor and UseCase (system-boundary chrome remains explicitly deferred per ADR 0007 § 5 and is **not** required for dim 10 score-3 — that's a separate decoration concern outside the relationship set). Walk-33's clean pass on use-case V-B in both directions IS the dim-10 score-3 promotion evidence.

### Scope

Identical to walk-32: 8 viewpoints × 2 per-viewpoint PCs + 8 cross-cutting PCs = 24 PCs. See `walk-31.md § Scope` for the full table; reproduced via a fresh `walk-33-exec.py` driver (copy-of `walk-32-exec.py` with one amendment — see below).

### Driver amendment from walk-32

The walk-32 driver's use-case/V-B step dragged `usecase.right` (source) → `actor.top|left` (target) per iter-870's handle-direction correction. Walk-33 retains that direction for the **primary** V-B assertion (since that's the canonical direction declared by the handle types in `ActorNode.tsx:51-62`: actor has only target handles, so the source MUST be the use case), but **adds** a second pass in the reverse direction (`actor.left` → `usecase.left`) to confirm the post-#519 implementation accepts the association in both directions per the `isValidUseCaseConnection` change in PR #519:

```ts
// src/viewpoints/useCase/isValidConnection.ts (post-#519)
if (s.kind === 'UseCase' && t.kind === 'UseCase') return true;
if (s.kind === 'Actor' && t.kind === 'Actor') return true;
if ((s.kind === 'Actor' && t.kind === 'UseCase') ||
    (s.kind === 'UseCase' && t.kind === 'Actor')) return true;
return false;
```

The walk-33 driver therefore wraps the use-case/V-B step as:

```python
# walk-33-exec.py — use-case V-B
# Primary direction (handle-canonical): usecase.right -> actor.left
pc_v_b_primary = drag_handle("uc-0", "right", "actor-0", "left")

# Secondary direction (validator-permissive): actor.{any} -> usecase.{any}
# Per #519, isValidUseCaseConnection accepts both directions for the
# Actor↔UseCase pair. The actor declares only target handles, so the
# secondary direction relies on the validator overriding handle-typing.
# Note: React Flow's onConnect will still fire even if the source handle
# is declared as target — the validator is the gate. If this fails, it
# would be a #519 regression to file.
pc_v_b_secondary = drag_handle("actor-0", "left", "uc-0", "left")

# Both must produce an AssociationEdge in the model store.
pc_v_b = pc_v_b_primary == "PASS" and pc_v_b_secondary == "PASS"
```

If the secondary direction produces no edge while the primary does, that's a **partial** post-#519 implementation gap (the validator accepts cross-kind in both directions per the code, but React Flow's handle-source-typing rejects before the validator runs). That would be a `p2` `type:bug` filing rather than a `type:feature` (the deferral is closed; only the bidirectionality completeness would remain). Walk-33 makes this gap visible if it exists.

### Pass criteria

24 PCs total: 16 per-viewpoint (V-A/V-B for each of bdd, ibd, requirements, activity, state-machine, use-case, parametric, package) + 8 cross-cutting (X-1 page/console errors, X-2 tree membership, X-3 tree-row activates diagram, X-4 ConnectionMode.Loose containment, X-5 acronym auto-name containment, X-6 persistence, X-7 chat sidebar drive-by, X-8 Cmd-K). See `walk-31.md § "Pass criteria"` for full criterion definitions.

### Acceptance / rubric impact

| Outcome | Convergence (A.12 #3) | Rubric impact | Issues filed |
|---------|------------------------|---------------|--------------|
| 23/24 PASS + 1 INFO (X-7 unchanged) — use-case V-B PASS in **both** directions | chain 0 → **1 / 3** | Dim 10 (Use Case SysML conformance) promotes **2 → 3** (FOURTH score-3 dimension) | None |
| 23/24 PASS + 1 INFO — use-case V-B PASS primary direction, FAIL secondary | chain stays at **0** | Dim 10 holds at 2 (the score-3 description's "association" requires both directions for true SysML conformance per OMG UML 2.5 § 16.3 association notation) | File `p2` `type:bug` for the validator-vs-handle-typing gap |
| Any new FAIL outside use-case V-B (regression from `vphase-15.8` → `vphase-15.9`) | chain stays at **0** | Affected dim demote 2 → 1 with regression tag | File `p1` `type:bug` per A.7 |
| Console errors observed (X-1 FAIL) | chain stays at **0** | dim 26 demote candidate if perf-related | File `p1` `type:bug` |

### Tool & environment

- **Deployed Pages bundle** at `https://michaeljfazio.github.io/mbse-workbench/`. Pages `last-modified: Mon, 18 May 2026 21:15:00 GMT`, `etag: "6a0b8154-1eb"` corresponds to `vphase-15.9` / `v1.6.0` (operator-tagged on commit `4e474ee` at 2026-05-18T21:14:11Z; deploy fronted ~46s later). The execute iteration MUST re-verify before launching the driver.
- **Driver:** `artifacts/phase-15/walk-33/walk-33-exec.py` (gitignored per `artifacts/` rule). Copy-of `walk-32-exec.py` + the use-case V-B bidirectionality amendment above.
- **Outcome artefacts:** `artifacts/phase-15/walk-33/walk-33.json` + `artifacts/phase-15/walk-33/screenshots/`.
- **Wall time budget:** ~3 min (single-pass headless Chromium, mirroring walk-32's footprint).

### Two-hat discipline

Iter-878 (execute) is architect-hat only. No source code changes. If the walk surfaces a regression or the secondary-direction PARTIAL described above, iter-879 files the issue (architect close-out) and iter-880+ wears the engineer hat.

## Snapshot (at plan-seal, iter-877)

- Pages SHA: `4e474ee` (operator-tagged); functional `dist/` byte-identical to `55ae385` per iter-876 decisions-log entry. `curl -sI` at iter-877 launch returned `last-modified: Mon, 18 May 2026 21:15:00 GMT, etag: "6a0b8154-1eb"`, HTTP 200.
- Open `phase:15` issues by area at launch: `[]` (A.12 #2 fully satisfied).
- Open `phase:15` issues by area at launch with new iter-877 chore: 1 × `type:chore` (#525 — this plan-seal); 0 × `type:bug`/`type:feature`/`type:design`. A.12 #2 still satisfied per its label-scoped wording.
- Rubric scores at launch: dim 5 (BDD) = 3, dim 6 (IBD) = 3, dim 14 (Round-trip) = 3; **dim 10 (Use Case SysML conformance) staged at 2 → 3 candidate for walk-33**; all other 22 dims at 2 except dims 3, 11, 23 at 0.
- In-flight branches at launch (post iter-876 merge at `3b142c7`): 0 before this iteration; 1 after this iteration (the iter-877 plan-seal branch).
- Convergence chain at launch: **0 / 3**. Walk-33 is the chain[1] candidate.

## Execution

Iter-878 executed the walk against the deployed `vphase-15.9` / `v1.6.0` bundle. Pages `last-modified` re-verified at execute launch: `Mon, 18 May 2026 21:15:00 GMT, etag: "6a0b8154-1eb"` — same bundle as plan-seal. Driver: `artifacts/phase-15/walk-33/walk-33-exec.py` (copy-of walk-32 + the use-case V-B bidirectionality amendment). Wall time: ~3 min (single-pass headless Chromium).

### Per-PC verdicts

| PC | walk-32 | walk-33 | Δ |
|----|---------|---------|---|
| bdd/V-A | PASS | PASS | — |
| bdd/V-B | PASS | PASS | — |
| ibd/V-A | PASS | PASS | — |
| ibd/V-B | PASS | PASS | — |
| requirements/V-A | PASS | PASS | — |
| requirements/V-B | PASS | PASS | — |
| activity/V-A | PASS | PASS | — |
| activity/V-B | PASS | PASS | — |
| state-machine/V-A | PASS | PASS | — |
| state-machine/V-B | PASS | PASS | — |
| use-case/V-A | PASS | PASS | — |
| use-case/V-B | FAIL (no association edge) | **PARTIAL** (primary PASS, secondary FAIL) | ↑ (deferral closed; bidirectionality gap remains) |
| parametric/V-A | PASS | PASS | — |
| parametric/V-B | PASS | PASS | — |
| package/V-A | PASS | PASS | — |
| package/V-B | PASS | PASS | — |
| X-1 page/console errors | PASS | PASS | — |
| X-2 tree membership | PASS | PASS | — |
| X-3 tree-row activates diagram | PASS | PASS | — |
| X-4 ConnectionMode.Loose containment | PASS | PASS | — |
| X-5 acronym auto-name containment | PASS | PASS | — |
| X-6 persistence | PASS | PASS | — |
| X-7 chat sidebar drive-by | INFO | INFO | — |
| X-8 Cmd-K | PASS | PASS | — |

**Aggregate: 22/24 PASS + 1 PARTIAL (use-case/V-B) + 1 INFO (X-7).**

### Use-case V-B sub-finding (the load-bearing finding)

Driver recorded `edge_kind='association-primary-only' edge_made=True`. Decomposed:

- **Primary direction (`usecase.right` → `actor.left`):** ✅ PASS. An `AssociationEdge` (`use-case-edge-*` test-id) appeared in the store after the drag. Screenshot: `vp-use-case-after-V-B-primary.png`.
- **Secondary direction (`actor.left` → `usecase.left`):** ❌ FAIL. No new edge in the store after the mousedown→mousemove→mouseup sequence. No console error. The walk-32→walk-33 fix surfaced bidirectional acceptance in the validator (`src/viewpoints/useCase/isValidConnection.ts:29-30` returns `true` for both orderings), but ActorNode (`src/viewpoints/useCase/ActorNode.tsx:51-62`) declares both handles (`top`, `left`) as `type="target"`. React Flow gates drag-initiation on `type="source"` handles, so the secondary direction never reaches `onConnect`. Screenshot: `vp-use-case-after-V-B-secondary.png`.

This is the exact outcome anticipated in `## Plan § Driver amendment from walk-32`: "If the secondary direction produces no edge while the primary does, that's a **partial** post-#519 implementation gap (the validator accepts cross-kind in both directions per the code, but React Flow's handle-source-typing rejects before the validator runs). That would be a `p2` `type:bug` filing rather than a `type:feature`."

### Issues filed

- **#528** (`type:bug`, `p2`, `area:viewpoint:uc`, `status:ready`) — `Actor→UseCase reverse-direction drag silently fails (no source handles on ActorNode)`. Body cites OMG UML 2.5.1 § 11.5.4 (Association undirected), walk-33 § Plan's anticipation, and the precise file:line `ActorNode.tsx:51-62`. Proposed resolution: add paired `type="source"` Handles on the existing positions (and recommended additionally on `right`/`bottom` for symmetry with UseCaseNode).

### Rubric movement

**None.** Dim 10 (Use Case SysML conformance) holds at **2**. The walk-33 plan made the promotion contingent on a clean PASS in **both** V-B directions per the OMG UML 2.5 § 16.3 undirected-association semantics; primary-only is insufficient for dim-10 score-3.

### Convergence chain (A.12 #3)

**Chain holds at 0 / 3.** Any `type:bug` filing during a walk resets/freezes the chain per A.5 walk-completion semantics (a clean walk advances; an issue-filing walk does not). #528 is the issue that prevents chain advance this iteration.

## Decide next

The use-case-V-B-secondary FAIL outcome is the second-row anticipated path in `## Plan § Acceptance / rubric impact`. Following its prescription:

- **Iter-879 → engineer hat → close #528.** The fix is small (add source handles to ActorNode). Engineer batch can be a single PR. Expected diff: +4 to +8 lines in `ActorNode.tsx`, plus a new e2e test that exercises `actor.* → usecase.*` drag and asserts an `AssociationEdge` in the store, plus a Chromium visual baseline for the actor-initiated drag scenario (the existing `use-case-with-association-edge` baseline already covers the primary direction — no baseline change there).
- **Iter-880+ → walk-34 → chain[1] retry.** Once #528 is released in `vphase-15.10` (a `v1.6.1` patch tag per A.8 SemVer rule for bug-only releases), walk-34 re-executes the same 24 PCs with the bidirectional driver. A clean walk-34 advances chain 0 → 1/3 and promotes dim 10 → 3 as the FOURTH score-3 dimension.
- **FBW example authoring (A.12 #4) remains gated** behind dim-10 promotion — the example contains use-case diagrams that must demonstrate the full association relationship set including the bidirectional handle behaviour. Starting authoring with a known-broken affordance would bake the gap into the example's mental model.

## Close-out

- **Walk-33 driver:** `artifacts/phase-15/walk-33/walk-33-exec.py` (gitignored per `artifacts/` rule; reproducible via the snapshot in `## Plan`).
- **Outcome JSON:** `artifacts/phase-15/walk-33/walk-33.json` (gitignored).
- **Screenshots:** `artifacts/phase-15/walk-33/screenshots/` (gitignored). Per-viewpoint × {V-A, V-B, after-reload} × use-case adds {V-B-primary, V-B-secondary} = 27 images total + bootstrap stages 01..03 = 30 images.
- **Issues filed:** #528 (`p2`, `type:bug`, `area:viewpoint:uc`).
- **Chain status:** 0 / 3 (held).
- **Rubric:** dim 10 stays at 2. All other dims unchanged. **3 × score-3** dimensions (dim 5 BDD, dim 14 Round-trip, dim 6 IBD) + **22 × score-2** + **0 × score-1** + **3 × score-0** unchanged.

Walk-33 done.

---
