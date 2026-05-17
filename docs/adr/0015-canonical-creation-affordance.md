# ADR 0015 — Canonical creation affordance: drag-from-palette + redundant click-shortcuts

Status: accepted (issue #376, rubric dim 15)
Context: Phase 15 — Architect-driven UX & feature hardening (operator-supplied seed, kickoff Section B)

## Decision

Adopt **drag-from-palette as the canonical creation pattern** for every element kind a viewpoint accepts. Each palette row becomes `draggable`; releasing it over a target canvas creates the element at the drop position. The three secondary surfaces (empty-state cards, diagram-toolbar `+ X`, inspector "+ New X") stay only as **redundant click-shortcuts that dispatch the same `CreateElementCommand`** — they do not own separate code paths.

A single drag-MIME (`PROJECT_TREE_DRAG_TYPE`, already in `src/workspace/tree/ProjectTree.tsx`) and a single command (`create-element`) cover every kind on every viewpoint. `IbdPalette` and `ActivityPalette` already demonstrate the pattern; #376 extends it to BDD, Requirements, State Machine, Use Case, Parametric, and Package palettes.

## Vocabulary

Standardise on the metamodel name wherever a surface names the element kind: **"Part Definition", "Action Definition", "State Definition", "Constraint Definition", "Port Definition"**. The "Block" alias was a SysML-1.x holdover. Two exceptions:

- Viewpoint titles that are SysML-1.x proper nouns stay ("Block Definition Diagram", "Internal Block Diagram").
- `src/workspace/tree/kindLabels.ts` keeps both forms but creation surfaces consume `singular`.

Today's "Block"/"Part Definition" mix on the same card fails NN/g H4 (Consistency).

## What changes — by surface

| Surface | Today | After ADR 0015 |
|---------|-------|----------------|
| **Palette** (project-tree group `+`, viewpoint strips) | Click `+` creates under root | Row becomes `draggable`; drop-on-canvas creates at cursor. Click `+` retires. |
| **Empty-state cards** (`src/workspace/EmptyState.tsx`) | Click creates under root, selects, renames | Click-shortcut. Dispatches `create-element` at canvas centre, then selects+renames. Vocabulary aligned to "Part Definition". |
| **Diagram-toolbar `+ X`** (`src/workspace/CanvasPane.tsx`) | Click creates under root | **Retires.** Palette drag fully covers it. Deletes four `toolbar-add-*` buttons. |
| **Inspector "+ New X"** (`src/workspace/inspector/Inspector.tsx`) | Click creates under root | Contextual shortcut only — creates X as a child of the *currently-selected* parent. No-op when no parent selected (empty-state card covers that case). |

## Migration order

One PR per step:

1. **Palette becomes draggable.** Foundational. Adds `draggable` + `onDragStart` to project-tree group-headers and per-viewpoint palette strips; canvas drop handler routes the MIME to `create-element` at the drop position. Additive only — no surface retires yet.
2. **Empty-state cards become click-shortcuts dispatching the shared command.** Replace `createChildElement` in `EmptyState.tsx` with a `create-element` dispatch at canvas centre. Vocabulary aligned to metamodel names.
3. **Diagram-toolbar `+ X` retires.** Delete the four `toolbar-add-*` buttons and handlers; update e2e tests probing `toolbar-add-block` to drive palette drag.
4. **Inspector "+ New X" rewired for contextual creation.** `dispatchInspectorCreate` takes the selected parent (or no-ops when none); label discloses parent ("Add to selected: + New Port Definition").

## References

- Issue #376 (operator-flagged, p1, rubric dim 15 blocker).
- Rubric dim 15 — `docs/architect/quality-rubric.md` row 15: *"All palette items behave the same — all draggable to canvas."*
- Operator seed, kickoff Section B: *"Inconsistent 'add element' controls — some are click-buttons, some are drag-from-palette. They should all be draggable onto diagrams."*
- Vendor convergence — `docs/architect/sysml-conventions.md` 2026-05-17 section (SysON, Cameo/MagicDraw, Capella, Papyrus all primary-use drag-from-palette).
- NN/g — [10 Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) (H4), [Drag-and-drop usability](https://www.nngroup.com/articles/drag-drop/).

## What this ADR does NOT decide

- **Drag visual.** Ghost preview vs. native HTML5 cursor vs. custom overlay — step-1 PR.
- **Snap-to-grid on drop** — implementation-detail PR.
- **Multi-element drag** — out of scope; first PR is single-row drag only.
- **Edge-tool palette behaviour.** Edges today are click-source-then-click-target; whether they should be drag-from-palette is a separate ADR.
- **Touch / pen input.** Tablet drag fidelity — deferred.
