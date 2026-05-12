# 0009 — Package Diagram shape: scope, containment model, import edges, move-between-packages

Date: 2026-05-13 · Status: accepted · Phase: 9 · Issue: #154

## Context

Phase 9 adds the Package Diagram — the eighth and final viewpoint. Four
questions need stable answers before #155–#157 land any code or tests:
what does a Package diagram contain, how is namespace containment
modelled and rendered, how does `PackageImport` work, and how is moving
an element between packages represented at the command-bus layer.

The metamodel work is already done — `PackageElement` (Phase 1) carries
`memberIds: ElementId[]` and `PackageImportEdge` (`{ sourceId, targetId,
label? }`) is part of the `ModelEdge` union. No Phase-1 reopen.

## Decision

1. **Diagram scope.** Multiple Package diagrams per project, no
   `Diagram.context` link. A Package diagram is a free-form workspace
   that shows one or more `Package` nodes with their members rendered
   inside (or referenced by a containment marker — see § 2) plus
   `PackageImport` edges between packages. Users create new tabs via
   `createDiagram('package')`; the fallback label is "Package Diagram".

2. **Containment is a list, not an edge.** `PackageElement.memberIds`
   is the source of truth for "X is in Package P". There is NO
   element-as-edge "Containment" relation; `acceptedEdgeElementKinds`
   stays empty. Rendering options for #155 (out of scope for #154):
   - **Group node** — the Package custom node is a ReactFlow group with
     member nodes nested inside (chosen-preferred at decomposition time,
     matches SysMLv2's package-as-namespace mental model).
   - **Badge** — a flat Package node with a member-count badge; no
     visual nesting; members appear in the project tree but not on
     canvas.
   #155 picks one and records the rationale in its commit body / a
   follow-up amendment to this ADR if the choice changes the data model
   (it should not — only the renderer changes).

3. **PackageImport endpoint typing.** Source and target are both
   `Package`. Self-imports (source === target) are rejected by the
   viewpoint's `isValidConnection` (lands in #156). Imports have a
   direction — A imports B means A's namespace can resolve names defined
   in B — so source/target are not canonicalised (unlike Parametric's
   symmetric `ParameterBinding`).

4. **Move-between-packages is a typed compound command.** Moving an
   element from package A to package B is `{ kind: 'compound', commands:
   [removeMember(A, x), addMember(B, x)] }` where `removeMember` and
   `addMember` are `update-element` commands on the Package's
   `memberIds` list. A single `Cmd-Z` reverts both halves, consistent
   with iter-17's `update-diagram-position` precedent (auto-layout is
   one compound of N position updates). Alternative considered: a
   dedicated `move-member` command. Rejected because it duplicates
   state already expressible as two `update-element` ops and adds a
   new event type for the collab provider to learn.

## Consequences

- The Package viewpoint config in #154 has empty `paletteItems` /
  `nodeTypes` / `edgeTypes`. `acceptedElementKinds` lists `Package`
  plus every kind that can be a member, so the project-tree drop
  semantics (#156) can attach any of them to a Package's `memberIds`
  without re-opening the viewpoint config.
- No new `Diagram.context` shape is needed. The existing
  `createDiagram(viewpointId)` overload covers free-form creation.
- An element is in at most one Package at a time. The compound
  command in § 4 enforces this at the call site (issued by the move
  affordance in #156); the metamodel itself is permissive (a member
  could appear in multiple `memberIds` lists). The Phase 9 gate
  (#157) asserts the single-package invariant via the move e2e.
- `PackageImport` carries no Phase-9 semantic beyond "this edge
  exists between two packages". A future phase may add namespace
  resolution; the model is forward-compatible because the edge
  records both endpoints explicitly.
