# 0004 — Requirements Diagram shape: scope, edge model, endpoint typing, cross-diagram visibility

Date: 2026-05-12 · Status: accepted · Phase: 4 · Issue: #70

## Context

Phase 4 adds the Requirements Diagram. Four questions need a stable answer
before #71–#74 land any code or tests: what does a Requirements diagram
contain, how do trace links render, what endpoint pairings are valid, and
how do trace links appear on diagrams that aren't the Requirements
diagram itself.

The metamodel work is already done — `RequirementElement`
(`reqId`/`priority`/`status`/`text`/`rationale`) and `RequirementTraceEdge`
(with the four `RequirementTraceKind` values `derive`/`satisfy`/`verify`/
`refine`) shipped in Phase 1.

## Decision

1. **Diagram scope.** Multiple Requirements diagrams per project, no
   `Diagram.context` link (unlike IBD's PartDefinition coupling). Each
   Requirements diagram is a free-form workspace where the user groups
   related requirements visually; the model does not bind a Requirements
   diagram to any specific "owning" element. Users open new Requirements
   diagrams via `createDiagram('requirements')` (today: programmatically;
   the Phase 4 gate or a later phase will surface a UI affordance).

2. **Edge model: `ModelEdge`, not element-as-edge.** RequirementTrace
   stays in `ModelEdge` (like BDD's Composition and Generalization). It
   carries no identity beyond `{ sourceId, targetId, traceKind, label }`,
   so promoting it to an element (like IBD's ConnectionUsage/ItemFlow,
   which carry a stable `id`/`name`) would add complexity without value.
   Tests live in `tests/unit/model/edges.test.ts` (already present from
   Phase 1). The viewpoint's `acceptedEdgeElementKinds` is empty;
   `acceptedEdgeKinds` is `['RequirementTrace']`.

3. **Endpoint typing.** Source is always a Requirement. Target may be
   any `ModelElement` whose kind the model allows — Requirement,
   PartDefinition, PartUsage, ActionDefinition, ActionUsage,
   StateDefinition, StateUsage, UseCase. Self-loops (source === target)
   are rejected. **`derive` and `refine` require both endpoints to be
   Requirements** (Requirement-to-Requirement relationships only).
   **`satisfy` and `verify`** allow any non-Requirement target from the
   allowed list above (the typical pattern: a Requirement is *satisfied
   by* a part, *verified by* an action/use-case). The viewpoint's
   `isValidConnection` will enforce this in #72.

4. **Cross-diagram visibility.** A RequirementTrace edge is part of the
   model graph and exists regardless of which diagram is open. Phase 4
   ships *rendering* of trace edges on the **Requirements canvas only**:
   if either endpoint is missing from the active diagram's `positions`,
   the edge is not drawn. Phase 4's cross-diagram traceability seam
   (#73) is an **inspector panel** ("Trace links") that lists the
   requirements linked to the selected element and lets the user add /
   remove links from any viewpoint. Rendering trace edges *directly* on
   BDD/IBD is OUT of scope here and deferred to Phase 10's traceability
   matrix work.

## Consequences

- The Requirements viewpoint config has empty `paletteItems` /
  `nodeTypes` / `edgeTypes` after #70; #71 adds Requirement + palette
  drop, #72 adds the RequirementTrace edges + traceKind picker.
- No new `Diagram.context` shape is needed in #70. The diagram type
  already supports an absent `context` field; the existing
  `createDiagram(viewpointId)` overload (no options) covers
  "free-form" creation.
- Workspaces can have any number of Requirements diagrams. Cross-
  diagram nav from a Requirement to "the Requirements diagram"
  becomes ambiguous; the navigation seam (#73 inspector panel) sticks
  to listing trace links rather than jumping to a specific diagram.
- Trace edges are model-layer first. The Phase 4 gate (#74) exercises
  the model in isolation (create requirement, link via inspector
  on BDD, assert the `RequirementTraceEdge` exists in
  `registry.edges()`) before asserting visual rendering on the
  Requirements canvas.
