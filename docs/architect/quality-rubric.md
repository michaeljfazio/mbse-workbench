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
| 1 | Visual fidelity — node shapes | 2 | Every node kind matches SysML/UML convention (use-case ellipses, actor stick figures, action rounded rectangles, state rounded rectangles, initial pseudostate filled disc, final bullseye, decision diamond, fork/join bar, block square corners, etc.). No transparent fills. No clipped labels. | walk-1 |
| 2 | Visual fidelity — edges & routing | 0 | Edge endpoints carry correct arrowheads/decorations per relationship type. Routing styles (orthogonal, straight, spline) selectable per diagram and per edge. Composition diamonds filled; aggregation diamonds open; generalization triangles. Item-flow arrows have flow direction notation. | — |
| 3 | Visual fidelity — ports | 0 | Ports render as small squares on block edges, positioned at user-set locations or sensible defaults. Conjugate ports indicated. Direction (in/out/inout) visible. | — |
| 4 | Visual fidelity — colors & typography | 2 | Color tokens consistent across diagrams. Text readable in light and dark theme. No accidental transparency. Selection state and hover state distinct. | walk-1 |
| 5 | SysML conformance — BDD | 2 | Composition, aggregation, generalization, association, dependency all supported with correct notation and semantics. Cardinality on associations. Block compartments (properties, operations, ports). | walk-1 |
| 6 | SysML conformance — IBD | 2 | Parts as nested blocks within an enclosing block context. Ports on parts, connected via `ConnectionUsage`. Item flows along connections. Proxy ports vs full ports distinguished where applicable. | walk-1 (errata) |
| 7 | SysML conformance — Requirements | 2 | Requirement nodes with ID, text, type. `derive`, `satisfy`, `verify`, `refine`, `containment` all supported. Requirement-to-element linking from any other viewpoint. | walk-3 |
| 8 | SysML conformance — Activity | 2 | Action nodes, control flow, object flow with pins, fork/join, decision/merge with guards, initial/final nodes, send/receive signal actions, swimlanes (partitions). | walk-1 (errata) |
| 9 | SysML conformance — State machine | 2 | States with entry/exit/do, internal transitions, transitions with triggers/guards/effects, initial/final/history pseudostates, junction/choice pseudostates, composite states. | walk-1 (errata) |
| 10 | SysML conformance — Use case | 2 | Use case ellipses, actor stick figures, association, `include`, `extend`, generalization between use cases, generalization between actors, system boundary rectangle with system name. | walk-3 |
| 11 | SysML conformance — Parametric | 2 | Constraint blocks with parameters, parameter bindings, value properties bound to parameters. | walk-1 (errata) |
| 12 | SysML conformance — Package | 0 | Package containment, namespace organisation, `import` directive visible, package merge if supported. | — |
| 13 | Cross-diagram coherence | 0 | Same element across viewpoints stays in sync. Cross-diagram navigation (right-click → show in X) works both directions. Renaming in one place reflects everywhere. Element registry integrity holds. | — |
| 14 | Round-trip integrity | 0 | Project → JSON → project is lossless. Project → SysML v2 text → project is structurally identical modulo IDs. The FBW model survives both. | — |
| 15 | Palette & creation affordances | 2 | Every element kind creatable from a palette. All palette items behave the same (all draggable to canvas — no click-only mix). Palette grouped by viewpoint applicability. Drag preview during drag. | iter-800 |
| 16 | Direct-manipulation affordances | 2 | Element resize handles on every shape kind. Element position visible during drag. Snap-to-grid optional. Alignment guides on drag. Rubber-band multi-select. Keyboard nudge with arrow keys. | iter-795 (smoke) |
| 17 | Edge editing affordances | 0 | Reconnect either endpoint by drag. Add/remove waypoints. Change routing style per edge. Label drag/placement. Edge style selection (line type, color where semantically appropriate). | — |
| 18 | Project tree / explorer | 2 | Containment hierarchy reflects the metamodel. Representations nest under their owning element. Bidirectional selection sync with canvas. Context menu per node. Filter bar. Drag-drop move semantics for any container. | walk-1 |
| 19 | Inspector | 2 | Reflects current selection in the canvas. All editable properties present. Updates push to the command bus. Inline error feedback on invalid input. | walk-1 |
| 20 | Search & navigation | 2 | Cmd-K palette searches across all elements by name, ID, type. Recent-elements list. Jump-to-element from any context. | walk-1 |
| 21 | Undo / redo | 2 | Every command undoable. Redo restores exactly. Visible undo stack depth. Keyboard shortcuts. | iter-798 |
| 22 | Import / export | 0 | JSON import/export round-trips. SysML v2 text export pretty-printed. Import of a hand-authored SysML file works. PNG/SVG export per diagram. | — |
| 23 | LLM integration | 0 | Chat sidebar opens, streams, retains history. API key entry flow obvious. Tool dispatch with diff preview works for create/modify tools. No hallucinated SysML conventions in LLM output (validate against `docs/architect/sysml-conventions.md`). | — |
| 24 | Empty states & error UX | 2 | Every empty state is intentional. Error boundaries are explanatory. Loading states present where async happens. No raw stack traces. | walk-1 |
| 25 | Accessibility | 0 | Zero `serious`/`critical` axe violations on every screen. Keyboard-only operation possible for core flows. Focus visible. Screen-reader labels on icon buttons. | — |
| 26 | Performance | 2 | A 100-block diagram pans/zooms at 60fps. Initial load < 3s on Pages. Auto-layout converges within 1s on representative diagrams. | walk-2 |
| 27 | Persistence | 2 | Reload recovers session state. Multi-project switching preserves state. No data loss on browser refresh. | walk-2 |
| 28 | Help / discoverability | 1 | First-run guidance. Keyboard shortcuts discoverable. Empty-state action affordances. "Load example" entry visible (see A.11). | walk-1 |

## Score delta log

Each score change records the date, walk, dimension #, old → new score, and a one-line rationale tied to evidence.

| Date | Walk | Dimension # | Old | New | Rationale |
|------|------|-------------|-----|-----|-----------|
| 2026-05-16 | walk-1 | 1 | 0 | 2 | BDD block well-formed (`«block»` stereotype + PARTS/PORTS/VALUES/CONSTRAINTS compartments). White fill, no transparency. Other node kinds (use case, action, state, etc.) not yet exercised. |
| 2026-05-16 | walk-1 | 4 | 0 | 2 | `getComputedStyle(node).backgroundColor === 'rgb(255,255,255)'` — T-13.16 card-token fix holding. Light theme readable; dark theme untested. No accidental transparency observed. |
| 2026-05-16 | walk-1 | 5 | 0 | 2 | PartDefinition shows correct SysML v1.x-style compartments. Stereotype `«block»` present. Edges not yet created — score withheld at 2 pending composition/generalization/association exercise. |
| 2026-05-16 | walk-1 | 6 | 0 | 1 | IBD only reachable via inspector "Open Internal Diagram" (#371), not via "Create representation…" submenu. Empty IBD has no toolbar element-creation button — unclear how to add parts. Discoverability/feature gap blocks normal flow. |
| 2026-05-16 | walk-1 | 8 | 0 | 1 | No UI entry point for Activity diagram (#368). Cannot model any Activity. |
| 2026-05-16 | walk-1 | 9 | 0 | 1 | No UI entry point for State Machine diagram (#369). Cannot model any State Machine. |
| 2026-05-16 | walk-1 | 11 | 0 | 1 | No UI entry point for Parametric diagram (#370). Cannot model any Parametric. |
| 2026-05-16 | walk-1 | 15 | 0 | 1 | Four UI surfaces create a Block (#376); palette omits 5+ kinds until first instance created (#372); Usage categories shown without `+` (#373); label naming inconsistent (#377). Major rubric-dim-15 deficiency. |
| 2026-05-16 | walk-1 | 16 | 0 | 1 | No resize handles on Block nodes (#374); no coordinate display during drag (#375). Both are direct operator-supplied seeds, both confirmed. |
| 2026-05-16 | walk-1 | 18 | 0 | 2 | Project tree shows containment (Untitled Project package → New Part Definition → New Part Definition IBD nesting). Per-row `⋯` context menu with Rename / Create child / Create representation. Bidirectional sync and drag-drop move not yet exercised. |
| 2026-05-16 | walk-1 | 19 | 0 | 2 | Inspector reflects PartDefinition selection: Name, Description, Ports section with `+ Add port`, Open Internal Diagram, Linked requirements, Owner UUID. Inline editing depth not exercised. |
| 2026-05-16 | walk-1 | 20 | 0 | 2 | Cmd-K opens command palette with Undo/Redo/Save/Delete/Open chat plus search input. Element search depth (search-by-name-ID-type, recent list, jump-to) not yet exercised. |
| 2026-05-16 | walk-1 | 24 | 0 | 2 | Empty state intentional: four CTA cards (New Block, New Requirement, Import JSON, Open Chat) plus keyboard shortcuts table. Error boundaries not exercised this walk. |
| 2026-05-16 | walk-1 | 28 | 0 | 1 | Keyboard shortcuts visible in empty-state, but four viewpoints (Activity, State Machine, Parametric, IBD-via-submenu) are non-discoverable from the project tree's representation menu. No first-run guidance. No "Load example" entry (A.11 wires it later). |
| 2026-05-17 | walk-1 errata | 6 | 1 | 2 | Walk-1's `open_row_menu_for` Python helper was buggy (ancestor check too loose, always opened Package root's menu). Corrected probe confirms IBD reachable from PartDefinition row menu + inspector. Discoverability remains a rough edge (covered by #371). |
| 2026-05-17 | walk-1 errata | 8 | 1 | 2 | Same probe bug. Corrected probe confirms Activity reachable from ActionDefinition row menu. Discoverability rough edge captured in #368 (re-scoped to p2). |
| 2026-05-17 | walk-1 errata | 9 | 1 | 2 | Corrected probe confirms State Machine reachable from StateDefinition row menu. Discoverability rough edge in #369 (re-scoped to p2). |
| 2026-05-17 | walk-1 errata | 11 | 1 | 2 | Corrected probe confirms Parametric reachable from PartDefinition row menu. Discoverability rough edge in #370 (re-scoped to p2). |
| 2026-05-17 | iter-795 smoke | 16 | 1 | 2 | BDD `NodeResizer` wiring shipped in vphase-15.1 (PR #382 closing #374). Smoke probe against deployed Pages confirms 8 resize handles (4 corner + 4 edge) on a selected Block. IBD/Activity/State Machine/Use Case/Parametric block-like nodes adopt the same pattern in follow-up PRs — required for score 3 ("every shape kind"). Drag-position display (#375), snap-to-grid, alignment guides, rubber-band multi-select, keyboard nudge remain — also required for score 3. |
| 2026-05-17 | walk-2 | 21 | 0 | 1 | Cmd-Z keyboard shortcut NO-OP'd in walk-2 after a palette `+ New Part Definition` click (M3.02). Cmd-Shift-Z redo also NO-OP'd. Possible focus-context issue (handler scoped to canvas, palette button has focus). Filed as #386. Conservative score 1 until #386 resolves. |
| 2026-05-17 | walk-2 | 26 | 0 | 2 | Initial load on Pages (DOMContentLoaded + networkidle): 1665ms — well under the 3000ms score-3 target. Score 3 also requires 60fps pan/zoom on a 100-block diagram and `<1s` auto-layout — separate benchmark walk. |
| 2026-05-17 | walk-2 | 27 | 0 | 2 | Resize-then-reload: block size persisted from pre-reload 300×300 to post-reload 300×300 via sessionStorage. Score 3 also requires multi-project switching state preservation — not exercised. |
| 2026-05-17 | iter-798 | 21 | 1 | 2 | #386 fix shipped via PR #392 — Cmd-Z on the untouched inline-rename input now cancels the rename and dispatches model undo. Three Playwright tests verify the fix. Score 3 still requires visible undo stack depth + redo restoration depth across all known surfaces (text-input edited path tested; canvas-focused path was already working). |
| 2026-05-17 | walk-3 | 7 | 0 | 2 | Requirements inspector reveals comprehensive property set live: Name, Description, Requirement ID, Priority (Low/Medium/High/Critical), Status (Draft/Approved/Implemented/Verified/Rejected), Text, Rationale, Linked requirements with `+ Link requirement` action. Score 3 needs deeper traceability-edge exercise (derive/satisfy/verify/refine) in a follow-up walk. |
| 2026-05-17 | walk-3 | 10 | 0 | 2 | Use Case diagram creates via Package row's `Create representation…` submenu (the corrected pattern). Visual fidelity (actor stick figures, use-case ellipses) and `include`/`extend`/generalization edges not deeply audited — score 3 needs that. |
| 2026-05-17 | iter-800 | 15 | 1 | 2 | #372 fix shipped via PR #397 — the palette now shows every root-Package-creatable element kind from the empty state with its `+` button. Score 3 still requires drag-from-palette (currently click-only for BDD; mixed elsewhere — captured by #376), viewpoint-applicability grouping, and drag preview during drag. |
