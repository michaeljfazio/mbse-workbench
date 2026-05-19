# Walk 35 — Broad-sweep regression on `vphase-15.10` / `v1.6.1` Pages (chain[1] retry; dim-10 score-3 gate; **corrected driver**)

**Iteration:** 891 (plan-seal); execution iteration: 892 (planned)
**Walk type:** Broad-sweep regression (A.5: re-execute walk-34's 24-PC sweep against the same `vphase-15.10` / `v1.6.1` Pages bundle, with a **corrected use-case V-B driver** that consumes the iter-890 popover-prefix-collision gotcha — see `docs/CONTEXT.md` discovered-facts entry dated 2026-05-19).
**Target:** `https://michaeljfazio.github.io/mbse-workbench/` — `vphase-15.10` / `v1.6.1`. Functional commit `f4915ae` (`feat(use-case): allow Actor→UseCase reverse drag (closes #528) (#531)`). Pages `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"` at iter-891 plan-seal. **The execute iteration MUST re-verify the `last-modified` header before launching the driver** to confirm no intervening deploy has shifted the bundle.

## Plan

Walk-35 is the **new chain[1] retry candidate** in the A.12 #3 convergence chain (chain currently at 0/3 after walk-34 filed #548 in iter-888, regardless of #548 having been later closed in iter-890 as a walk-driver artefact — per the iter-889 + iter-890 strict-read decisions log, a walk that files a `type:bug` at walk time resets the chain; later reclassification does not retroactively un-reset it).

Walk-35's job is **dual** — identical contract to walk-34 but with a corrected driver:

1. **Convergence advance (A.12 #3).** A clean walk-35 (zero new issues filed, zero rubric demotion) advances chain 0 → **1 / 3**. The chain[2] candidate is then a follow-up walk (broad-sweep or dedicated dim-17 walk per iter-876 "After dim-10 promotion" plan).

2. **Dim-10 score-3 promotion (A.10).** Dim 10 (Use Case SysML conformance) has been held at 2 since walk-1 by the missing Actor↔UseCase association in **both** drag directions. Walk-34 discovered (PARTIAL on V-B SECONDARY) that the underlying application is in fact bidirectional after PR #531 / `vphase-15.10`; iter-890's investigation + lock-in e2e test (PR #553) proved this conclusively. Per A.3 #3 (the no-silent-rubric-promotion corollary), dim-10 promotion to 3 requires an architect walk demonstrating bidirectional Actor↔UseCase Association on the deployed bundle with a non-artefactual driver. Walk-35 is that walk.

   Dim-10's A.10 score-3 description: *"Use case ellipses, actor stick figures, association, `include`, `extend`, generalization between use cases, generalization between actors, system boundary rectangle with system name."* The remaining blocker is the bidirectionality completeness; system-boundary chrome remains explicitly deferred per ADR 0007 § 5 and is **not** required for dim 10 score-3 (separate decoration concern outside the relationship set). Walk-35's clean pass on use-case V-B in both directions IS the dim-10 score-3 promotion evidence.

### Scope

Identical to walk-34: 8 viewpoints × 2 per-viewpoint PCs + 8 cross-cutting PCs = 24 PCs. See `walk-31.md § Scope` for the full table; reproduced via a fresh `walk-35-exec.py` driver (copy-of `walk-34-exec.py` with the driver amendment below).

### Driver amendment from walk-34 (consumes iter-890 popover-prefix-collision gotcha)

The walk-34 driver's use-case V-B step suffered the popover-prefix collision documented at `docs/CONTEXT.md` § "Discovered facts" (entry dated 2026-05-19, iter-890):

> Edge components emit `data-testid={`use-case-edge-${id}`}` (e.g. `use-case-edge-${edgeId}`) and the kind picker emits `use-case-edge-kind-popover` plus one button per kind (`use-case-edge-kind-Include`, `-Extend`, `-Generalization`, `-Association`). Both sets share the `use-case-edge-` prefix, so any selector that probes for "did a new edge appear?" using `[data-testid^="use-case-edge-"]` will match the popover items, not just the edges. […] **Rule:** walk drivers and tests MUST probe for real edges via the edge-component-emitted `g[data-association-edge="true"]` / `g[data-include-edge="true"]` / `g[data-extend-edge="true"]` / `g[data-generalization-edge="true"]` (decorated by the edge components themselves), or `[data-testid^="use-case-edge-"]:not([data-testid^="use-case-edge-kind-"])`.

Additionally, walk-34's driver dragged but never picked from the popover — the use-case viewpoint per ADR 0007 § 4 stages edge-kind selection through a popover (`use-case-edge-kind-popover`) rather than auto-creating an edge on drop. The corrected walk-35 driver MUST:

1. Replace the probe selector with `g[data-association-edge="true"]` (and the analogous `data-{kind}-edge` for other kinds when added).
2. After each drag, wait for the `use-case-edge-kind-popover` testid to be visible, then click the appropriate `use-case-edge-kind-Association` button to commit the edge. Without this click the edge never materialises.
3. Snapshot the edge count via the corrected selector *before* the drag, then poll for the post-pick count to exceed the pre-drag count by exactly 1.

```python
# walk-35-exec.py — use-case V-B (corrected)
#
# PRIMARY: usecase.right -> actor.left
before = page.locator('g[data-association-edge="true"]').count()
drag_handle("uc-0", "right", "actor-0", "left")
page.wait_for_selector('[data-testid="use-case-edge-kind-popover"]', state="visible", timeout=2000)
page.click('[data-testid="use-case-edge-kind-Association"]')
page.wait_for_function(
    f'document.querySelectorAll(\'g[data-association-edge="true"]\').length === {before + 1}',
    timeout=5000,
)
pc_v_b_primary = "PASS"

# SECONDARY: actor.right -> usecase.left (the actor's new Position.Right source handle from PR #531)
before = page.locator('g[data-association-edge="true"]').count()
drag_handle("actor-0", "right", "uc-0", "left")
page.wait_for_selector('[data-testid="use-case-edge-kind-popover"]', state="visible", timeout=2000)
page.click('[data-testid="use-case-edge-kind-Association"]')
page.wait_for_function(
    f'document.querySelectorAll(\'g[data-association-edge="true"]\').length === {before + 1}',
    timeout=5000,
)
pc_v_b_secondary = "PASS"

pc_v_b = pc_v_b_primary == "PASS" and pc_v_b_secondary == "PASS"
```

If any future per-kind probe is added (Include/Extend/Generalization V-B), apply the same pattern with `g[data-include-edge="true"]` / `g[data-extend-edge="true"]` / `g[data-generalization-edge="true"]`.

Layout note: unchanged from walk-34 — actor at diagram-left, use case at diagram-right; `actor.right` directly faces `usecase.left`. No screenshot framing change.

### Pass criteria

24 PCs total: 16 per-viewpoint (V-A/V-B for each of bdd, ibd, requirements, activity, state-machine, use-case, parametric, package) + 8 cross-cutting (X-1 page/console errors, X-2 tree membership, X-3 tree-row activates diagram, X-4 ConnectionMode.Loose containment, X-5 acronym auto-name containment, X-6 persistence, X-7 chat sidebar drive-by, X-8 Cmd-K). See `walk-31.md § "Pass criteria"` for full criterion definitions.

### Acceptance / rubric impact

| Outcome | Convergence (A.12 #3) | Rubric impact | Issues filed |
|---------|------------------------|---------------|--------------|
| 23/24 PASS + 1 INFO (X-7 unchanged) — use-case V-B PASS in **both** directions with the corrected driver | chain 0 → **1 / 3** | Dim 10 (Use Case SysML conformance) promotes **2 → 3** (FOURTH score-3 dimension) | None |
| 23/24 PASS + 1 INFO — use-case V-B PASS primary direction, FAIL secondary (with the corrected driver — i.e. genuine application bug, not artefact) | chain stays at **0** | Dim 10 holds at 2 | File `p1` `type:bug`. **Important:** treat this as a real regression vs. PR #553's lock-in test; investigation must reconcile the discrepancy (deployed-bundle bug vs. test-only artefact). |
| Any new FAIL outside use-case V-B (regression from `vphase-15.10`'s prior walk-34 results) | chain stays at **0** | Affected dim demote 2 → 1 with regression tag | File `p1` `type:bug` per A.7 |
| Console errors observed (X-1 FAIL) | chain stays at **0** | dim 26 demote candidate if perf-related | File `p1` `type:bug` |

The expected path is row 1 (clean walk → chain advance + dim-10 promotion). PR #553's lock-in test proved the application is bidirectional on the exact same bundle walk-35 targets; the corrected driver removes the artefact path that produced walk-34's false PARTIAL. Confidence is high that walk-35 lands on row 1.

### Tool & environment

- **Deployed Pages bundle** at `https://michaeljfazio.github.io/mbse-workbench/`. Pages `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"` — same as walk-34 (no intervening deploy; iter-890's PR #553 was test+docs-only, did not trigger a release per ADR 0017). The execute iteration MUST re-verify before launching the driver.
- **Driver:** `artifacts/phase-15/walk-35/walk-35-exec.py` (gitignored per `artifacts/` rule). Copy-of `walk-34-exec.py` + the use-case V-B corrected-selector amendment above.
- **Outcome artefacts:** `artifacts/phase-15/walk-35/walk-35.json` + `artifacts/phase-15/walk-35/screenshots/`.
- **Wall time budget:** ~3 min (single-pass headless Chromium, mirroring walk-34's footprint).

### Two-hat discipline

Iter-892 (execute) is architect-hat only. No source code changes. If the walk surfaces a regression or a fresh issue, iter-893 files the issue (architect close-out) and iter-894+ wears the engineer hat. If the walk passes clean (the expected outcome), iter-893 is the close-out PR (dim-10 promotion + chain advance + JOURNAL `event: design-decision` entry per A.14 "First rubric dimension at 3" — first use-case viewpoint dim at 3 + first dim promoted off score-2 since iter-867).

## Snapshot (at plan-seal, iter-891)

- Pages SHA: `fd1d625` is the head of main but does NOT correspond to a new deploy — that commit shipped via PR #553 which was test+docs-only and did not bump a release tag. The deployed bundle remains `vphase-15.10` / `v1.6.1` tagged on `7a118a7`. `curl -sI` at iter-891 launch returned `last-modified: Mon, 18 May 2026 23:11:59 GMT, etag: "6a0b9cbf-1eb"`, HTTP 200 — byte-identical to walk-34's anchor. No drift.
- Open `phase:15` issues by area at launch: `[]` before iter-891's plan-seal chore (#554) is filed (A.12 #2 fully satisfied at iter-890 close after #548 closed). After this iteration's chore (`#554`): 1 × `type:chore`; 0 × `type:bug`/`type:feature`/`type:design`. A.12 #2 still satisfied per its label-scoped wording.
- Rubric scores at launch: dim 5 (BDD) = 3, dim 6 (IBD) = 3, dim 14 (Round-trip) = 3; **dim 10 (Use Case SysML conformance) staged at 2 → 3 candidate for walk-35**; all other 22 dims at 2 except dims 3, 11, 23 at 0.
- In-flight branches at launch (post iter-890 merge at `fd1d625`): 0 before this iteration; 1 after this iteration (the iter-891 plan-seal branch).
- Convergence chain at launch: **0 / 3**. Walk-35 is the new chain[1] retry candidate post-#548-closure.

## Execution

Reserved for iter-892. The execute iteration appends a `## Execution` body documenting the driver pre-flight (Pages-header re-verification, halt check, plan-seal PR merge SHA), a 24-PC pass-criteria table, and any use-case V-B detail block (especially if a discrepancy appears between the corrected driver result and PR #553's lock-in test).

## Decide next

Reserved for iter-892. Per § Acceptance / rubric impact, the expected outcome row is row 1: chain advance + dim-10 promotion. Iter-893 close-out then plans the chain[2] candidate (likely a dedicated dim-17 walk per iter-876 plan, or a broad-sweep regression on the next post-promotion `vphase-15.N` if any release is cut).

## Close-out

Reserved for iter-892/893.
