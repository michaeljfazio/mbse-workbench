# Walk 19 — Requirements + Package viewpoints validated

**Iteration:** 831 | **Date:** 2026-05-18 | **Walk type:** Deep dive (Requirements + Package)

## Plan

Per walk-18's `Decide next`, close out dim-1 cross-viewpoint coverage by exercising the two remaining workbench node kinds not yet visually validated: **Requirement** (Requirements diagram) and **Package** (Package diagram). If both render with non-transparent backgrounds and readable labels against the deployed `v1.4.0` Pages, the cumulative dim-1 evidence covers 9 of the workbench's node kinds — sufficient to weigh advancement.

**Scope.** Two sections, both against `https://michaeljfazio.github.io/mbse-workbench/`:

1. Create a `Reqs` Package, then a `REQ-001` Requirement under it. Open the Requirements diagram on the Package. Drag the Requirement row into the canvas. Sample `getComputedStyle` on the rendered node.
2. Create a `Sub` sub-Package under `Reqs`. Open the Package diagram on `Reqs`. Drag the sub-package into the canvas. Sample the rendered Package node's inner body (the outer `data-testid="package-node-…"` div is a layout wrapper with no background — known shape from `PackageNode.tsx`).

**Rubric dimensions this walk informs.** 1 (visual fidelity — node shapes), 7 (Requirements), 12 (Package).

## Execution

`artifacts/phase-15/walk-19/walk-19-exec.py` against `v1.4.0` Pages.

**Section A — Requirements:**
- `Reqs` Package created via `project-tree-group-create-Package`.
- `REQ-001` Requirement created via row-menu `Create child… → Requirement (member)`.
- Requirements diagram created via row-menu `Create representation… → requirements`.
- Tree row drag into canvas placed the node at (400, 280).
- Computed visual: `bg=rgb(255, 255, 255)`, `opacity=1`, size **240×180**, transparent=**False**.

**Section B — Package:**
- `Sub` sub-Package created via `Create child… → Package (member)`.
- Package diagram created on `Reqs` via `Create representation… → package`.
- Tree row drag into canvas placed `Sub` at (400, 300).
- Inner body computed visual: `bg=rgb(255, 255, 255)`, `opacity=1`, size **220×98**, transparent=**False**.
- Folder-tab stereotype visible alongside body (per `PackageNode.tsx:51-62`).

**Result:** 0 workbench defects filed. 0 page errors. 0 console errors. **All target visual fidelity assertions passed.**

## Probe-side errata

1. **Outer `package-node-${id}` div is a layout wrapper.** First run reported `rgba(0, 0, 0, 0)` because the `data-testid="package-node-${id}"` div carries handles + sub-divs but no background of its own. The visible body is `> div.rounded-b-md.bg-card`. Future visual probes against composite nodes (Package, possibly others) must target inner body elements. Recorded in this log; no GitHub issue.
2. **`> div:nth(0)` is a Handle, not the folder-tab.** Inside `[data-package-node="true"]`, the first child is a React Flow `<Handle>` (top), not the visible folder-tab. The tab is at child index 2. The probe sampled a 12×12 Handle (`bg=rgb(15, 23, 42)` — slate-900 = `bg-primary` per Tailwind config). Doesn't affect dim-1 evidence — the visible tab is present in `01-requirements-diagram.png` and `02-package-diagram.png` screenshots.

## Rubric score deltas

| Dim # | Old | New | Rationale |
|-------|-----|-----|-----------|
| 1 | 2 | 2 | Requirement + Package added to dim-1 cross-coverage (now: Block / Actor / UseCase / Action / State / Constraint / Value / Requirement / Package = 9 node kinds). Held at 2 — score 3 still requires **pseudostate-specific** evidence (initial filled disc, final bullseye, decision diamond, fork/join bar) plus IBD PartUsage + Port visual audit. Walks 20+ continue closing this. |
| 7 | 2 | 2 | Requirement node renders with ID/text compartments on the Requirements diagram (visual confirmation of the inspector model walk-3 verified). Score 3 still requires deep traceability-edge exercise (derive / satisfy / verify / refine). |
| 12 | 2 | 2 | Package node renders with folder-tab + body on the Package diagram. Score 3 still requires `import` directive visibility + package-merge semantics + move-between-packages drag verification. |

No advances this walk. All three target dimensions held at 2 with additional positive evidence — incremental progress toward eventual score-3 saturation.

## Convergence chain (A.12 #3)

Walk-19 zero issues. **Chain at 6 consecutive zero-issue walks (14, 15, 16, 17, 18, 19) — extends the strongest stretch in Phase 15.**

## Decide next

**Walk-20:** Pseudostate visual audit on the State Machine viewpoint. Specifically:
- Initial pseudostate — should be a filled black disc, small (≤16px diameter).
- Final pseudostate — should be a bullseye (filled disc inside an outer ring).
- Decision pseudostate — diamond.
- Fork/Join — solid horizontal/vertical bar.

If all four render correctly, dim 1 has the pseudostate coverage required for score 3 — and combined with the cumulative 9-node-kind coverage, dim 1 can finally advance. Estimated 1 walk.

**Walk-21+:** IBD-specific visual audit — PartUsage rendering inside enclosing context, port-as-square verification on block edges, port direction indication. Closes dim 1 + dim 3 + dim 6 toward 3.
