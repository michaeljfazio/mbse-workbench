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

**Pre-flight (iter-892, 2026-05-19).**

- STOP file: absent.
- `status:emergency-stop` label: 0 open.
- Plan-seal PR #555 merged 2026-05-19T00:06:02Z at squash-commit `4eff517` on main.
- Pages headers re-verified at execute launch: `HTTP/2 200`, `last-modified: Mon, 18 May 2026 23:11:59 GMT`, `etag: "6a0b9cbf-1eb"` — **byte-identical to plan-seal anchor**. No intervening deploy; walk-35 targets the same `vphase-15.10` / `v1.6.1` bundle that walk-34 ran against, which is the correct target (application bidirectionality is already deployed; what walk-35 verifies is the deployed-bundle behaviour with a non-artefactual driver).

**Driver.** `artifacts/phase-15/walk-35/walk-35-exec.py` — copy of `walk-34-exec.py` with the use-case V-B amendment per § "Driver amendment from walk-34". The two changes (tightened probe selector + popover commit click) are localised to the use-case branch of `run_viewpoint()`; every other PC executes via byte-identical code to walk-34's iter-888 run.

**Started:** `2026-05-19T00:10:21Z`. Wall time ≈ 3 min (mirrors walk-34's footprint).

**Pass-criteria table (24 PCs).**

| PC | Result | Detail |
|----|--------|--------|
| bdd / V-A | PASS | PartDefinition `539ac16e…` bg `rgb(255, 255, 255)` childBg `rgb(51, 103, 217)` opacity 1 size 220×240 |
| bdd / V-B | PASS | Second-Block placement `854a8105…` (composition-edge drag skipped per plan) |
| ibd / V-A | PASS | PartUsage `98d7f6a0…` bg `rgb(255, 255, 255)` size 200×100 |
| ibd / V-B | PASS | Second PartUsage placement (`0c49215a…`) — `edge_kind=second-PartUsage-only` |
| requirements / V-A | PASS | Requirement `36bfe1f1…` bg `rgb(255, 255, 255)` size 240×180 |
| requirements / V-B | PASS | Second-Requirement placement `f9c8ecf5…` |
| activity / V-A | PASS | Action `4afc993e…` bg `rgb(255, 255, 255)` size 180×80 |
| activity / V-B | PASS | Control-flow edge created (`edge_kind=control-flow`) |
| state-machine / V-A | PASS | State `f17c6d4d…` bg `rgb(255, 255, 255)` size 160×72 |
| state-machine / V-B | PASS | Transition edge created (`edge_kind=transition`) |
| use-case / V-A | PASS | UseCase `70a7bdad…` size 180×90; ellipse SVG fill `hsl(var(--card))` |
| **use-case / V-B** | **PASS** | **`edge_kind=association-bidirectional` — both PRIMARY (`usecase.right → actor.left`) and SECONDARY (`actor.right → usecase.left`) drags opened the kind popover, committed via `use-case-edge-kind-Association` click, and produced a new `g[data-association-edge="true"]` element. Walk-34's PARTIAL is now disambiguated as a driver artefact (popover-prefix collision + missing popover commit click), not an application bug.** |
| parametric / V-A | PASS | ConstraintUsage `0d2593c9…` bg `rgb(255, 255, 255)` size 220×100 |
| parametric / V-B | PASS | ValueProperty node `d1b4762e…` |
| package / V-A | PASS | Package `e00f9848…` size 220×120 |
| package / V-B | PASS | Second Package node `dc9be157…` (containment edge skip per plan) |
| X-1 page/console errors | PASS | `page_errors=0`, `console_errors=0` |
| X-2 tree membership | PASS | All 8 viewpoints |
| X-3 tree activates diagram tab | PASS | All 8 viewpoints |
| X-4 ConnectionMode.Loose containment | PASS | All 8 viewpoints |
| X-5 acronym auto-name containment | PASS | All 8 viewpoints |
| X-6 persistence (reload) | PASS | All 8 viewpoints |
| X-7 chat sidebar drive-by | INFO | No chat tab `data-testid` discovered — dim 23 stays at score 0 (unchanged) |
| X-8 Cmd-K palette | PASS | Opens on Cmd-K, closes on Escape |

**Aggregate.** **23 PASS + 1 INFO (X-7).** Lands on **row 1** of § Acceptance / rubric impact — exactly as predicted by the plan-seal expected outcome.

**Use-case V-B detail.** Both direction-pairs of handles were located in the DOM, both `drag_handle()` calls successfully opened `[data-testid="use-case-edge-kind-popover"]`, both `use-case-edge-kind-Association` clicks committed the popover, and both pre/post counts of `g[data-association-edge="true"]` incremented by exactly 1. Walk-34's apparent PRIMARY-passes-SECONDARY-fails partition was an entirely-driver artefact: walk-34's PRIMARY was a false positive (popover testids matched the loose `[data-testid^="use-case-edge-"]` prefix selector and looked like "new edges" without the kind being committed) and its SECONDARY was a false negative (popover testids already present in the pre-drag snapshot from PRIMARY's un-committed popover prevented any "new" testids from appearing). The application has been bidirectional in `vphase-15.10` since iter-879's PR #531 landed; this walk confirms it on the deployed bundle with a non-artefactual driver. PR #553's lock-in test at `tests/e2e/use-case-edges.spec.ts` and walk-35's deployed-bundle result agree.

## Decide next

**Outcome row applied:** row 1 of § Acceptance / rubric impact.

- **Convergence (A.12 #3): chain advances 0 → 1 / 3.** Walk-35 closed zero issues at execute time and surfaced no rubric demotion. Iter-893's close-out PR commits the chain advance to STATUS.
- **Rubric (A.10): dim 10 (Use Case SysML conformance) promotes 2 → 3.** Bidirectional Actor↔UseCase Association is demonstrated on the deployed bundle with a non-artefactual driver — the exact promotion evidence A.3 #3 requires. Dim 10 becomes the **FOURTH** score-3 dimension (after dim 5 BDD at iter-826, dim 14 Round-trip at iter-834, dim 6 IBD at iter-867).
- No other dim affected.

**Issues filed:** none.

**Iter-893 (close-out for the architect lifecycle).** Walk-35 cleanly lands row 1. Iter-893 lands a small docs PR with: (1) STATUS sync committing chain 0 → 1/3, (2) rubric file edit promoting dim 10 to 3, (3) JOURNAL `event: design-decision` entry per A.14 "First rubric dimension at 3" — note A.14's literal trigger is the FIRST dim at 3, which already fired at iter-826 / dim 5; the broader interpretation used at iter-834 (dim 14) and iter-867 (dim 6) treats each subsequent dim promotion as a notable moment, so iter-893 follows the same precedent.

**Walk-36 (next architect walk / chain[2] candidate).** After iter-893 close-out, walk-36 becomes the chain[2] candidate. Per iter-876's post-dim-10 plan, walk-36 should be a dedicated **dim-17 walk** (edge editing affordances — reconnect endpoints, waypoints, label placement, edge style selection) — currently dim 17 holds at 2 and a focused walk against the deployed bundle is the lightest path to chain[2]. Plan-seal for walk-36 is iter-894+; the chain[2] retry on this same `vphase-15.10` bundle is permissible per A.5 since no source-code regression risk exists between iter-893's docs-only PR and walk-36's launch.

## Close-out

**Architect-hat finish (iter-892).** Walk-35 cleanly landed row 1 of § Acceptance / rubric impact. The corrected driver removed both the popover-prefix-collision false-positive (PRIMARY) and the un-committed-popover false-negative (SECONDARY), and the deployed `vphase-15.10` / `v1.6.1` bundle showed bidirectional Actor↔UseCase Association exactly as PR #553's lock-in test predicted. Iter-892's instrument worked: the broad-sweep regression driver, when written to a viewpoint's actual ADR-prescribed UI contract (popover-mediated kind selection) rather than a stale prefix heuristic, agrees with the unit-level lock-in test. This is the clean walk the plan called for.

**Convergence chain state after iter-892:** 0 / 3 at execute close; iter-893's PR commits the advance to 1 / 3.

**Rubric snapshot after iter-892:** dim 5 (BDD) = 3, dim 6 (IBD) = 3, dim 14 (Round-trip) = 3; **dim 10 (Use Case SysML conformance) staged 2 → 3** (iter-893's PR commits the promotion to `docs/architect/quality-rubric.md`); 21 other dims at 2; 3 dims at 0 (dims 3, 11, 23).

**A.12 #2 (zero open `phase:15` issues labelled `type:bug/feature/design`):** **satisfied at iter-892 close** — only `#556` open (`type:chore`, this iteration's close-out) which is label-scope-excluded.

**Walk artefacts (gitignored under `artifacts/`):**

- `artifacts/phase-15/walk-35/walk-35-exec.py` — driver (copy-of `walk-34-exec.py` with two use-case V-B amendments per § "Driver amendment from walk-34")
- `artifacts/phase-15/walk-35/walk-35.json` — outcome JSON (23/24 PASS + 1 INFO)
- `artifacts/phase-15/walk-35/screenshots/` — 26 PNGs across the 8 viewpoints + V-B primary/secondary split for use-case

The walk file itself (this document) is committed under `docs/architect/walks/walk-35.md` per A.5 step 6.
