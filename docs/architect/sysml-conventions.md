# SysML v2 conventions

## TBD — populated by research subagents

This file accretes as architect walks reference SysML v2 conventions. Each entry cites at least one primary source per A.9 (source priority list in `README.md`). The file is append-only with dated sections; older sections are not deleted, only marked superseded if needed.

## 2026-05-17 — Canonical element-creation affordance (informs #376, ADR 0015)

Research collected for ADR 0015 — what is the canonical UX pattern for creating modelling elements on a SysML/UML canvas? The MBSE workbench today exposes block creation via four distinct surfaces (palette `+`, empty-state card, diagram toolbar `+ Block`, inspector `+ New Block`), and the operator-supplied seed in kickoff Section B asks for a single canonical pattern. Source priority per `README.md` §"Source priority for citations".

### 1. OMG SysML v2 specification (highest authority)

The OMG SysML v2 Beta specification (`OMG-SYSML-2.0-Beta` family — PSMI, Visualization) **does not normatively prescribe a graphical-authoring UX**. The spec defines view definitions, view usages, and a notation grammar for the rendered output, but element-creation gestures (drag vs. click, toolbar layout, palette grouping) are explicitly out of scope. Cited concretely by the SysON team in [obeosoft 2025-12 blog post](https://blog.obeosoft.com/prepare-christmas-with-syson-2025-12) and by PTC: "*SysML v2 graphical syntax is being added later*" ([PTC Modeler SysML v2 overview](https://support.ptc.com/help/modeler/r10.1/en/Modeler/sysml2/overview_of_sysml2.html)). Net: the spec is silent on creation UX; downstream tooling has converged on conventions instead.

### 2. Vendor / open-source SysML tooling

Surveyed for canonical creation affordances:

- **SysON (Eclipse, SysML v2):** primary creation affordance is a **draggable palette** anchored on the canvas. Each diagram type ships a palette of node tools and edge tools; nodes are placed by drag-and-drop, edges by click-and-drag from source to target. SysON also exposes a containment-tree right-click "New > …" path as a secondary affordance for tree-creation without an open diagram. ([SysON user manual — Diagrams: Use the palette](https://doc.mbse-syson.org/syson/v2025.8.0/user-manual/features/diagrams.html); confirmed by the Sirius/Obeo platform pattern SysON is built on — Sirius palettes are drag-creators per [Sirius Documentation — Tool Sections](https://eclipse.dev/sirius/doc/specifier/general/Modeler_Specification.html)).
- **Cameo / MagicDraw (SysML 1.x, dominant commercial tool):** the diagram canvas displays a **smart-manipulator toolbar** at the top of the canvas (palette) — every node kind appears as a tool. Activation is hybrid: click-to-arm-then-click-on-canvas-to-place, or drag-and-drop. Cameo's "*Containment tree*" also lets users right-click an owner and choose `Create Element > …` as a secondary tree-creation affordance. ([MagicDraw 2024x — Diagram pane and toolbar](https://docs.nomagic.com/spaces/MD2024x/pages/136710445/Creating+diagrams); [Cameo SysML Plugin 2024x — Toolbars](https://docs.nomagic.com/spaces/SYSMLP2024xR2/)).
- **Capella (Eclipse, Arcadia/MBSE):** primary creation is **drag-from-palette** with edge tools using click-on-source-then-click-on-target. The Capella docs explicitly distinguish "*node tools*" (drag-to-place) from "*edge tools*" (two-click). Capella's project explorer also supports right-click "New > …" for tree-only creation. ([Capella User Manual — Diagram editor and palette](https://mbse-capella.org/documentation_user_manual.html); [Eclipse Sirius Diagram User Manual](https://eclipse.dev/sirius/doc/user/diagrams/Diagrams.html)).
- **Eclipse Papyrus (UML/SysML 1.x):** canvas palette is the canonical surface — each tool in the palette is a **drag-creator**. Palette is grouped into drawers per node-category. Tree creation is also available via right-click "New Child > …" on a tree owner. ([Papyrus User Guide — Diagram palette](https://wiki.eclipse.org/Papyrus_User_Guide); [Papyrus Starter Guide](https://wiki.eclipse.org/Papyrus_Starter_Guide)).

**Pattern convergence.** All four major SysML/UML tools converge on **drag-from-palette** (or click-from-palette-then-click-on-canvas — a near-equivalent for node tools) as the *primary* canvas-creation gesture. None offer a *single* `+ New X` button at canvas-toolbar level for arbitrary node kinds — the palette is always the affordance for the full kind-vocabulary. Tree-context-menu creation is universally present as a *secondary* affordance.

### 3. General canvas-tool UX heuristics

- **Nielsen Norman Group — Consistency and standards:** the heuristic "*do not make users wonder whether different words, situations, or actions mean the same thing*" applies directly to the four-surface inconsistency #376 calls out — "Block" (smart label) and "Part Definition" (metamodel) appearing on adjacent surfaces fails NN/g H4. ([NN/g — 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)).
- **Material Design — Toolbar actions:** floating action buttons (FABs) and toolbar `+` buttons are reserved for the *single most important* action in a region. Spawning four parallel surfaces for the same action (creation) violates the FAB single-action rule. ([Material Design — Floating Action Button](https://m2.material.io/components/buttons-floating-action-button)).
- **Drag-and-drop UX (NN/g):** drag is preferred over click when (a) the user needs to choose a *location* for the created element and (b) the affordance benefits from a visible "ghost preview" during the drag. Both apply to canvas creation — the user is choosing where on the diagram the new block lives, and the ghost preview is what current click-to-create surfaces *cannot* offer. ([NN/g — Drag-and-drop usability](https://www.nngroup.com/articles/drag-drop/)).

### 4. Workbench-internal precedent

- `src/workspace/IbdPalette.tsx` and `src/workspace/ActivityPalette.tsx` already implement drag-from-palette chips ("Drag onto canvas" header strip) for `PartUsage` (IBD) and `ActionUsage` variants (Activity). The drag wire-protocol is `PROJECT_TREE_DRAG_TYPE` from `src/workspace/tree/ProjectTree.tsx` line 3 of IbdPalette.tsx — i.e. the same drag-MIME the project-tree group headers use today. Extending this to BDD/RequirementsDiagram/StateMachine/UseCase/Parametric/Package palettes is a straightforward generalisation.
- The four-surface inventory for #376 (Block creation), confirmed by `grep -rn` 2026-05-17:
  - **Palette** (project-tree group header): `src/workspace/tree/ProjectTree.tsx:418-432` — `+` button, `aria-label="New Part Definition"`. Group header is itself already `draggable` (line 399) but the `+` is a click-button. Vocabulary: **"Part Definition"**.
  - **Empty-state card**: `src/workspace/EmptyState.tsx:109-115` — `title="New Block"`, `description="Adds a Part Definition under the project root."`. Vocabulary: **"Block"** (title) / **"Part Definition"** (description).
  - **Diagram toolbar**: `src/workspace/CanvasPane.tsx:1282-1290` — `data-testid="toolbar-add-block"`, button text `+ Block`. Vocabulary: **"Block"**.
  - **Inspector empty-state**: `src/workspace/inspector/Inspector.tsx:194-212` rendering `InspectorCreateAction.label` from `src/workspace/inspector/inspectorCreatePanel.ts:114` — `+ New ${item.label}` where `item.label = 'Block'` (from `src/viewpoints/bdd/index.ts:76`). Vocabulary: **"Block"**.

Net vocabulary mismatch: three surfaces say "Block", one says "Part Definition", and one mixes both within itself. This is exactly the NN/g H4 inconsistency.

### 5. Recommendation summary (drives ADR 0015)

- **Canonical creation gesture:** drag-from-palette, per the SysON/Cameo/Capella/Papyrus convergence and the NN/g drag-preferred-when-location-matters heuristic.
- **Secondary surfaces:** retain as click-shortcuts only where they add *contextual* value the palette cannot (e.g. inspector "+ New X" creates X as a child of the *currently-selected parent*). Surfaces whose only value is "click instead of drag at canvas centre" retire — the palette absorbs them.
- **Vocabulary:** standardise on the metamodel name (`Part Definition`, `Action Definition`, `State Definition`, `Constraint Definition`) wherever the surface exposes the element kind. Drop the SysML-1.x-era "Block" alias from kind-bearing surfaces; keep it in viewpoint titles ("Block Definition Diagram") where it is a proper noun referring to a SysML v1 diagram-type name.

