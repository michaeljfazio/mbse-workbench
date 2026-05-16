# Production-quality rubric

Phase 15 ends only when every dimension below is scored **3**, every `phase:15` issue is closed (excluding `status:needs-human`), three consecutive architect walks file no new issues, and the FBW example is committed and loadable. (See A.10 and A.12 in AGENT.md.)

## Scoring scale

- **0 — Unmeasured.** No walk has informed this dimension yet.
- **1 — Broken.** Major defects; the dimension blocks an architect's normal flow.
- **2 — Acceptable.** No blocking defects; recognisable rough edges; a competent user can work around them.
- **3 — Production-quality.** No rough edges visible during a normal architect walk; conforms to documented SysML conventions; passes axe; baseline screenshots stable; performant.

Score changes require a one-line explanation in the **Score delta log** below (which walk informed the change, what evidence). Lowering a target or removing a dimension requires a `type:design` issue and ADR per A.3.

## Dimensions

| # | Dimension | Score | Score-3 description | Last informed |
|---|-----------|-------|---------------------|---------------|
| 1 | Visual fidelity — node shapes | 0 | Every node kind matches SysML/UML convention (use-case ellipses, actor stick figures, action rounded rectangles, state rounded rectangles, initial pseudostate filled disc, final bullseye, decision diamond, fork/join bar, block square corners, etc.). No transparent fills. No clipped labels. | — |
| 2 | Visual fidelity — edges & routing | 0 | Edge endpoints carry correct arrowheads/decorations per relationship type. Routing styles (orthogonal, straight, spline) selectable per diagram and per edge. Composition diamonds filled; aggregation diamonds open; generalization triangles. Item-flow arrows have flow direction notation. | — |
| 3 | Visual fidelity — ports | 0 | Ports render as small squares on block edges, positioned at user-set locations or sensible defaults. Conjugate ports indicated. Direction (in/out/inout) visible. | — |
| 4 | Visual fidelity — colors & typography | 0 | Color tokens consistent across diagrams. Text readable in light and dark theme. No accidental transparency. Selection state and hover state distinct. | — |
| 5 | SysML conformance — BDD | 0 | Composition, aggregation, generalization, association, dependency all supported with correct notation and semantics. Cardinality on associations. Block compartments (properties, operations, ports). | — |
| 6 | SysML conformance — IBD | 0 | Parts as nested blocks within an enclosing block context. Ports on parts, connected via `ConnectionUsage`. Item flows along connections. Proxy ports vs full ports distinguished where applicable. | — |
| 7 | SysML conformance — Requirements | 0 | Requirement nodes with ID, text, type. `derive`, `satisfy`, `verify`, `refine`, `containment` all supported. Requirement-to-element linking from any other viewpoint. | — |
| 8 | SysML conformance — Activity | 0 | Action nodes, control flow, object flow with pins, fork/join, decision/merge with guards, initial/final nodes, send/receive signal actions, swimlanes (partitions). | — |
| 9 | SysML conformance — State machine | 0 | States with entry/exit/do, internal transitions, transitions with triggers/guards/effects, initial/final/history pseudostates, junction/choice pseudostates, composite states. | — |
| 10 | SysML conformance — Use case | 0 | Use case ellipses, actor stick figures, association, `include`, `extend`, generalization between use cases, generalization between actors, system boundary rectangle with system name. | — |
| 11 | SysML conformance — Parametric | 0 | Constraint blocks with parameters, parameter bindings, value properties bound to parameters. | — |
| 12 | SysML conformance — Package | 0 | Package containment, namespace organisation, `import` directive visible, package merge if supported. | — |
| 13 | Cross-diagram coherence | 0 | Same element across viewpoints stays in sync. Cross-diagram navigation (right-click → show in X) works both directions. Renaming in one place reflects everywhere. Element registry integrity holds. | — |
| 14 | Round-trip integrity | 0 | Project → JSON → project is lossless. Project → SysML v2 text → project is structurally identical modulo IDs. The FBW model survives both. | — |
| 15 | Palette & creation affordances | 0 | Every element kind creatable from a palette. All palette items behave the same (all draggable to canvas — no click-only mix). Palette grouped by viewpoint applicability. Drag preview during drag. | — |
| 16 | Direct-manipulation affordances | 0 | Element resize handles on every shape kind. Element position visible during drag. Snap-to-grid optional. Alignment guides on drag. Rubber-band multi-select. Keyboard nudge with arrow keys. | — |
| 17 | Edge editing affordances | 0 | Reconnect either endpoint by drag. Add/remove waypoints. Change routing style per edge. Label drag/placement. Edge style selection (line type, color where semantically appropriate). | — |
| 18 | Project tree / explorer | 0 | Containment hierarchy reflects the metamodel. Representations nest under their owning element. Bidirectional selection sync with canvas. Context menu per node. Filter bar. Drag-drop move semantics for any container. | — |
| 19 | Inspector | 0 | Reflects current selection in the canvas. All editable properties present. Updates push to the command bus. Inline error feedback on invalid input. | — |
| 20 | Search & navigation | 0 | Cmd-K palette searches across all elements by name, ID, type. Recent-elements list. Jump-to-element from any context. | — |
| 21 | Undo / redo | 0 | Every command undoable. Redo restores exactly. Visible undo stack depth. Keyboard shortcuts. | — |
| 22 | Import / export | 0 | JSON import/export round-trips. SysML v2 text export pretty-printed. Import of a hand-authored SysML file works. PNG/SVG export per diagram. | — |
| 23 | LLM integration | 0 | Chat sidebar opens, streams, retains history. API key entry flow obvious. Tool dispatch with diff preview works for create/modify tools. No hallucinated SysML conventions in LLM output (validate against `docs/architect/sysml-conventions.md`). | — |
| 24 | Empty states & error UX | 0 | Every empty state is intentional. Error boundaries are explanatory. Loading states present where async happens. No raw stack traces. | — |
| 25 | Accessibility | 0 | Zero `serious`/`critical` axe violations on every screen. Keyboard-only operation possible for core flows. Focus visible. Screen-reader labels on icon buttons. | — |
| 26 | Performance | 0 | A 100-block diagram pans/zooms at 60fps. Initial load < 3s on Pages. Auto-layout converges within 1s on representative diagrams. | — |
| 27 | Persistence | 0 | Reload recovers session state. Multi-project switching preserves state. No data loss on browser refresh. | — |
| 28 | Help / discoverability | 0 | First-run guidance. Keyboard shortcuts discoverable. Empty-state action affordances. "Load example" entry visible (see A.11). | — |

## Score delta log

_(Empty. Each score change adds one row: date, walk-N, dimension #, old → new, one-line rationale.)_

| Date | Walk | Dimension # | Old | New | Rationale |
|------|------|-------------|-----|-----|-----------|
| — | — | — | — | — | — |
