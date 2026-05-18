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

**TBD — populated at iter-878 (or whichever iteration executes walk-33). The execute iteration appends:**

- Per-PC verdict table (`PC`, `walk-32`, `walk-33`, `Δ` columns mirroring walk-32's table format).
- Aggregate count.
- Use-case V-B sub-finding (primary direction outcome + secondary direction outcome).
- Issues filed (if any), per A.7.
- Rubric movement (dim 10 promotion → 3 if all clean; otherwise unchanged).
- Convergence chain update (0 → 1 if clean; held at 0 if any issue filed).

## Decide next

**TBD — populated at execute close. Anticipated paths:**

- **Clean walk-33** (23/24 PASS + X-7 INFO): chain[2] candidate is either a follow-up broad-sweep or the dedicated dim-17 edge-editing walk per iter-876's "After dim-10 promotion (iter-878+)" plan. FBW example authoring (A.12 #4) can run in parallel with the chain[2] walk.
- **Use-case V-B secondary direction FAIL only**: file `p2` `type:bug`; chain stays at 0; engineer batch follows to close the bidirectionality gap; walk-34 is the chain[1]-retry against the fixed bundle.
- **Non-use-case regression**: file `p1` `type:bug`; chain stays at 0; engineer batch follows; walk-34 is the chain[1]-retry against the fixed bundle.

## Close-out

**TBD — populated at execute close. Pattern from walk-32:**

- Walk-33 driver: `artifacts/phase-15/walk-33/walk-33-exec.py`.
- Outcome JSON: `artifacts/phase-15/walk-33/walk-33.json`.
- Screenshots: `artifacts/phase-15/walk-33/screenshots/` (per-viewpoint × {V-A, V-B-primary, V-B-secondary, after-reload}, plus bootstrap stages 01-03).
- Issues filed: TBD.
- Chain status: TBD.
- Rubric: TBD (dim 10 promotion contingent on clean PASS in both V-B directions).

---
