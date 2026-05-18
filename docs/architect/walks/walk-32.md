# Walk 32 — Broad-sweep regression on `vphase-15.8` Pages with corrected driver (chain[1] candidate)

**Iteration:** 871
**Walk type:** Broad-sweep regression (A.5: re-execute walk-31 with the four mechanical driver corrections recorded in iter-870 disambiguation; same 24-PC structure against the same unchanged bundle).
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — `vphase-15.8` / `v1.5.2`. Functional SHA `95fb6c2`. Pages `last-modified: Mon, 18 May 2026 18:32:43 GMT`. Re-verified at iter-871 launch (`curl -sI` before driver invocation).

## Plan

Walk-32 is the **chain[1] candidate** in the A.12 #3 convergence chain (chain reset 1 → 0 in iter-869 by walk-31's #513). Iter-870 disambiguated #513 as a driver artefact and closed it `wontfix`; iter-871 re-runs the same 24-PC sweep with the driver corrected per iter-870's findings:

1. `drag_tree_group_to_canvas("Package", …)` — was lowercase `"package"` (line 656).
2. `drag_tree_group_to_canvas("PartDefinition", …)` — was lowercase (line 680).
3. `drag_tree_group_to_canvas("Requirement", …)` — was lowercase (line 702).
4. Use-Case association drag direction: source = `usecase.right` → target = `actor.top|left` (was reversed; per `ActorNode.tsx:51-62` the actor declares only `type="target"` handles at Top + Left, no source handle, no right handle).

### Scope

Identical to walk-31: 8 viewpoints × 2 per-viewpoint PCs + 8 cross-cutting PCs = 24 PCs. See `walk-31.md § Scope` for the full table; reproduced via the same `walk-32-exec.py` driver (copy-of `walk-31-exec.py` with the four amendments above).

### Pass criteria

24 PCs total: 16 per-viewpoint (V-A/V-B for each of bdd, ibd, requirements, activity, state-machine, use-case, parametric, package) + 8 cross-cutting (X-1 page/console errors, X-2 tree membership, X-3 tree-row activates diagram, X-4 ConnectionMode.Loose containment, X-5 acronym auto-name containment, X-6 persistence, X-7 chat sidebar drive-by, X-8 Cmd-K). See `walk-31.md` for full criterion definitions.

### Acceptance / rubric impact

| Outcome | Convergence (A.12 #3) | Issues filed |
|---------|------------------------|--------------|
| 24/24 PCs PASS + 0 issues | chain[0] → **chain[1] / 3** | None |
| Any V-B failure persisting after corrections | chain stays at **0** | File per A.7 for the unfixed cause |

## Snapshot (at walk launch, iter-871)

- Pages SHA: `95fb6c2` (HEAD via `curl -sI` returned `last-modified: Mon, 18 May 2026 18:32:43 GMT, etag: "6a0b5b4b-1eb"` — identical to iter-869 walk-31 snapshot).
- Open `phase:15` issues by area at launch:
  - `area:viewpoint:uc`: 0 (after #513 closed wontfix).
  - `area:palette`: 0.
  - Other areas: unchanged from iter-870 close.
- Rubric scores at launch: dim 5 BDD = 3, dim 6 IBD = 3, dim 14 Round-trip = 3; all other dims at 2 except dims 3, 11, 23 at 0.
- In-flight branches at launch: 0 (iter-870 disambiguation merged at `33d705e`).

## Execution

Run command: `python3 artifacts/phase-15/walk-32/walk-32-exec.py` (headless Chromium, single-pass driver, ~3 min wall time).

### Per-PC verdicts

| PC | walk-31 | walk-32 | Δ |
|----|---------|---------|---|
| bdd / V-A | PASS | PASS | — |
| bdd / V-B | FAIL (lowercase `"partDefinition"`) | **PASS** (PascalCase fix) | ✓ |
| ibd / V-A | PASS | PASS | — |
| ibd / V-B | PASS | PASS | — |
| requirements / V-A | PASS | PASS | — |
| requirements / V-B | FAIL (lowercase `"requirement"`) | **PASS** (PascalCase fix) | ✓ |
| activity / V-A | PASS | PASS | — |
| activity / V-B | PASS | PASS | — |
| state-machine / V-A | PASS | PASS | — |
| state-machine / V-B | PASS | PASS | — |
| use-case / V-A | PASS | PASS | — |
| **use-case / V-B** | **PARTIAL** (`association-drag-no-edge`) | **PARTIAL** (`association-drag-no-edge`) | ✗ persists |
| parametric / V-A | PASS | PASS | — |
| parametric / V-B | PASS | PASS | — |
| package / V-A | PASS | PASS | — |
| package / V-B | FAIL (lowercase `"package"`) | **PASS** (PascalCase fix) | ✓ |
| X-1 (errors) | PASS | PASS | — |
| X-2 (tree) | PASS | PASS | — |
| X-3 (tree→tab) | PASS | PASS | — |
| X-4 (Loose containment) | PASS | PASS | — |
| X-5 (acronym containment) | PASS | PASS | — |
| X-6 (persistence) | PASS | PASS | — |
| X-7 (chat) | INFO | INFO | — |
| X-8 (Cmd-K) | PASS | PASS | — |

**Aggregate:** 22/24 PASS, 1 PARTIAL (use-case/V-B), 1 INFO (X-7).

Walk-31 had 19/24 PASS, 1 PARTIAL, 1 INFO, 3 FAIL. Walk-32 cleanly recovered the three V-B drag-tree-group FAILs via the PascalCase fix (proving iter-870's V-B-half disambiguation was correct) — but the use-case/V-B PARTIAL **persists across both directions of the handle drag**, proving iter-870's use-case-half disambiguation was wrong.

### Use-case V-B PARTIAL — root cause (corrected from iter-870)

Iter-870 hypothesised: "The walk-31 driver dragged actor.right → usecase.left, but the actor has no right handle and no source handles at all. Canonical direction per code: usecase.right (source) → actor.top|left (target). Driver direction was reversed."

That handle-direction observation is correct (the actor genuinely has no source handles), but the conclusion that reversing the direction would fix the PARTIAL is wrong. Walk-32 reversed the direction. The PARTIAL persists.

**Actual root cause:** `src/viewpoints/useCase/isValidConnection.ts:19-23`:

```ts
if (s.kind === 'UseCase' && t.kind === 'UseCase') return true;
if (s.kind === 'Actor' && t.kind === 'Actor') return true;
// Per ADR 0007 § 4: Actor↔UseCase association is deferred (system-boundary
// polish). Reject silently so the drag completes without creating an edge.
return false;
```

Per `docs/adr/0007-use-case-diagram-shape.md` § 5: *"Phase 7 does not add an Actor↔UseCase association edge — system-boundary chrome and association edges are deferred to Phase 12 polish."* § 7: *"mixed (Actor↔UseCase) → reject silently."* Phase 12 shipped, but the polish deferral never landed; `isValidUseCaseConnection` still rejects in both directions.

Iter-870's disambiguation looked only at handle declarations (`ActorNode.tsx:51-62`) and missed the second-stage validation rejection in `isValidConnection.ts`. Both handle directions get rejected by that validator. The V-B test as authored cannot pass against any current build that still honours ADR 0007 § 5 deferral.

### Issues filed

- **#517** (`type:feature`, `p2`, `area:viewpoint:uc`) — Implement Actor↔UseCase association (ADR 0007 § 5/§ 7 deferral never landed). Acceptance criteria, root cause, proposed resolution sketch all in the issue body. This is a real feature gap, not a driver artefact.

**Walk-32 filed 1 new issue → convergence chain remains at 0 / 3** (per A.12 #3 acceptance table: "A single issue filed or any rubric demotion resets the chain to 0." The chain was already at 0 from walk-31's #513; walk-32 holds it at 0 by filing #517).

### Rubric impact

No rubric demotions. Dim 10 (Use Case SysML conformance) was already at 2, which is consistent with the finding: *"no blocking defects; recognisable rough edges; a competent user can work around them"* — users can still author UseCase↔UseCase (`Include`, `Extend`, `Generalization`) and Actor↔Actor (`Generalization`) edges. The missing Actor↔UseCase association is the specific blocker preventing dim 10 from reaching score-3, which the score-3 description requires.

**Dims reinforced at 2** (broad-coverage evidence accreted but no promotion to 3): dim 1 (visual fidelity — node shapes), dim 4 (colors & typography), dim 13 (cross-diagram coherence, via X-3), dim 15 (palette & creation), dim 16 (direct-manipulation), dim 18 (project tree / explorer), dim 19 (inspector), dim 24 (empty states), dim 27 (persistence, via X-6), dim 28 (help / discoverability).

**Dim 23 (LLM integration) stays at 0** per X-7 — no chat tab test-id discovered on the deployed bundle. Reserved for dedicated walk.

## Decide next

- **iter-872 should not immediately re-run walk-33 as another broad sweep.** Walk-32 has produced clean broad-coverage evidence; the next walk should either pick up #517 (engineer hat — implement Actor↔UseCase association, then regress walk-32 to clear chain[1]) or schedule the long-deferred dim-23 LLM walk (X-7's INFO points to dim 23 still being at 0).
- The convergence-chain advance path is: ship #517 → re-run walk-32 (or a new walk-33 regression) → if 23/24 PASS + 1 INFO (no PARTIAL), advance chain 0 → 1 / 3. ETA ~2-3 iterations for the implementation + regression.
- **Two-hat discipline:** iter-871 wore both hats (engineer for driver edits; architect for walk-32 execution). Per the §"Iter-871 scope" justification in iter-870 STATUS, this was permitted because the engineer work was a trivial driver amendment in a non-production test file. iter-872 onward returns to one-hat-per-iteration.

## Iter-870 disambiguation amendment (for the audit trail)

Iter-870's disambiguation conclusion was 50% right (V-B drag-tree-group lowercase typos — confirmed by walk-32's 3/3 PASS recovery) and 50% wrong (use-case association reversed direction — falsified by walk-32's persistent PARTIAL). The wrong-half disambiguation closed #513 wontfix on incomplete code reading: iter-870 inspected the handle declarations in `ActorNode.tsx` but did not check the connection validator in `isValidConnection.ts`. The two-stage React Flow drag pipeline (handle hit-test → onConnect → isValidConnection) was not fully traced.

**Heuristic for `docs/CONTEXT.md`:** when triaging a React Flow handle-drag failure, check BOTH the handle declarations (source/target type, position, presence) AND the viewpoint's `isValidConnection` (or equivalent endpoint typing rule). The drag pipeline has two stages; either can reject. A driver-artefact hypothesis that only inspects one stage is incomplete.

## Close-out

- Walk-32 driver: `artifacts/phase-15/walk-32/walk-32-exec.py` (copy-of `walk-31-exec.py` + four amendments).
- Outcome JSON: `artifacts/phase-15/walk-32/walk-32.json`.
- Screenshots: `artifacts/phase-15/walk-32/screenshots/` (per-viewpoint × {V-A, V-B, after-reload}, plus bootstrap stages 01-03).
- Issue filed: **#517** (`type:feature`, `p2`, `area:viewpoint:uc`).
- Chain status: **0 / 3** (held by walk-32's #517 filing).
- Rubric: no movement (3 × score-3, 22 × score-2, 0 × score-1, 3 × score-0 unchanged).

---
