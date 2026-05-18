# 0007 — Use Case Diagram shape: scope, edge model, endpoint typing, onConnect discrimination

Date: 2026-05-12 · Status: accepted · Phase: 7 · Issue: #117

## Context

Phase 7 adds the Use Case Diagram. Six questions need stable answers before
#118–#120 land code or tests: what does a Use Case diagram contain, how do
Actor and UseCase appear on the canvas, how do Include / Extend / Generalization
render, what endpoint pairings are valid, where does the SysML system boundary
live, and how does `onConnect` discriminate among three accepted edge kinds.

The metamodel work was already done in Phase 1. `UseCaseElement` (with optional
`text?: string` for narrative), `ActorElement`, `IncludeEdge`, `ExtendEdge`
(with optional `extensionPoint?: string`), and `GeneralizationEdge` (reused
from BDD) all live in `src/model/elements.ts` and `src/model/edges.ts`.

## Decision

1. **Free-form scope.** Use Case diagrams are free-form like Requirements
   (ADR 0004 § 1), Activity (ADR 0005 § 1), and State Machine (ADR 0006 § 1).
   No `Diagram.context` anchor. A project may have multiple Use Case diagrams.
   Users open new diagrams via `createDiagram('use-case')`; the UI affordance
   lands alongside the other free-form viewpoints in a later phase.

2. **Actor + UseCase as nodes.** Both render as ReactFlow custom nodes.
   Actor draws as a stick figure (the SysML convention); UseCase as a
   horizontal ellipse. Node sizes default to Actor 80×100 and UseCase
   180×90 (`nodeSizeFor` returns per-kind sizes — same per-element seam
   Activity introduced).

3. **Include + Extend live in `ModelEdge`.** Following ADR 0004's reasoning
   for `RequirementTrace` and ADR 0005's for `ControlFlow` / `ObjectFlow`,
   Include and Extend are pure relationships with no instance identity
   beyond the source/target pair (plus an optional `extensionPoint` on
   Extend). They are **not** element-as-edge. `acceptedEdgeElementKinds`
   is therefore empty.

4. **Generalization reuse.** Use Case diagrams accept the existing
   `Generalization` edge for actor-actor and use-case-use-case inheritance —
   no new edge kind. `acceptedEdgeKinds = ['Include', 'Extend', 'Generalization']`.

5. **Endpoint typing.** `Include` is UseCase→UseCase. `Extend` is
   UseCase→UseCase. `Generalization` is Actor→Actor OR UseCase→UseCase
   (no cross-kind). Self-loops rejected. Enforced by #119's
   `isValidUseCaseConnection`. Phase 7 does **not** add an Actor↔UseCase
   association edge — system-boundary chrome and association edges are
   deferred to Phase 12 polish.

6. **System boundary deferred.** The SysML system boundary (a labelled
   rectangle framing a subset of use cases) is presentation chrome, not a
   model element. It does NOT belong in the metamodel. Defer to Phase 12
   polish.

7. **onConnect discrimination via stereotype picker popover.** Three edge
   kinds means the shift-modifier two-way fork used in Activity (#89) and
   IBD (#52) is insufficient. Instead, on drop the canvas opens a small
   popover at the cursor offering the valid stereotypes for the endpoint
   pair (matching #72's RequirementTrace picker pattern). Defaults:
   UseCase↔UseCase → `Include`, Actor↔Actor → `Generalization`,
   mixed (Actor↔UseCase) → reject silently.

## Consequences

- The Use Case viewpoint config has empty `nodeTypes` / `edgeTypes` after
  #117; #118 adds the Actor + UseCase node renderers and palette items;
  #119 adds the Include / Extend / Generalization edge renderers plus the
  stereotype picker popover.
- `paletteItems` is empty in #117 and gets populated in #118 with one
  Actor entry and one UseCase entry — same chip-strip pattern Activity and
  State Machine use.
- No `Diagram.context` extension is needed; the existing
  `createDiagram(viewpointId)` overload covers free-form creation.
- The Generalization edge renderer is shared with BDD (already implemented
  in `bddViewpoint.edgeTypes`). #119 either reuses the BDD component
  directly or registers a Use-Case-specific variant — the choice is local
  to that child.

## 2026-05-19 amendment — § 5 / § 7 deferral closed by phase-15 #517

Phase 7 deferred the Actor↔UseCase association edge to "Phase 12 polish."
Phase 12 shipped without it; phase-15 walk-32 surfaced the gap as the
explicit rubric-dim-10 score-3 blocker. #517 closes the deferral:

- `isValidUseCaseConnection` accepts cross-kind Actor↔UseCase pairs in
  both directions.
- The stereotype picker offers a fourth option, `Association`, enabled
  only for cross-kind drops. `defaultUseCaseEdgeKindFor` returns
  `'Association'` for the cross-kind case.
- The store's `linkUseCaseEdge` dispatches an `AssociationEdge`
  (already in the metamodel — shared with BDD) for `Association`-kind
  cross-kind drops; same-kind pairs still reject for `Association`.
- The new `src/viewpoints/useCase/AssociationEdge.tsx` renders the
  edge as a plain solid line (UML use-case convention — no
  arrowhead, no stereotype label). Optional multiplicities mirror
  the BDD AssociationEdge geometry so they sit at the same canonical
  distance from each endpoint.

§ 6 (system-boundary chrome) remains deferred — that is a separate
presentation concern not in scope of #517.
