# 0008 — Parametric Diagram shape: scope, edge model, endpoint typing, equations

Date: 2026-05-12 · Status: accepted · Phase: 8 · Issue: #135

## Context

Phase 8 adds the Parametric Diagram — the eighth and final viewpoint
(ahead of the Package viewpoint deferred to a future phase per the
prescribed plan). Four questions need a stable answer before #136–#138
land any code or tests: what does a Parametric diagram contain, how do
parameter bindings render, what endpoint pairings are valid, and how
are constraint equations modelled.

The metamodel work is already done — `ConstraintDefinitionElement`,
`ConstraintUsageElement`, `ValuePropertyElement`, and
`ParameterBindingEdge` shipped in Phase 1. `ConstraintDefinition`
carries `expression: string` (the constraint equation as plain text)
and `parameterIds: ElementId[]` (the ValueProperty parameters);
`ConstraintUsage` links to one via `definitionId` so multiple usages
can share the same definition. `ValueProperty` carries
`valueType: 'string' | 'number' | 'boolean'` (required) and an
optional `defaultValue: ValueLiteral`. `ParameterBindingEdge` is a
`ModelEdge` with `{ sourceId, targetId, label? }` and no further
discriminators.

## Decision

1. **Diagram scope.** Multiple Parametric diagrams per project, no
   `Diagram.context` link. A Parametric diagram is a free-form
   workspace where the user composes one or more ConstraintUsage nodes
   alongside the ValueProperty nodes whose values they bind to. Users
   open new Parametric diagrams via `createDiagram('parametric')`
   (today: programmatically; a UI affordance arrives in #136 or the
   Phase 8 gate).

2. **Edge model: `ModelEdge`, not element-as-edge.** ParameterBinding
   stays in `ModelEdge` (like BDD's Composition / Generalization and
   Requirements' Trace) because it carries no identity beyond
   `{ sourceId, targetId, label }`. The label, when present, is the
   bound parameter name on the ConstraintUsage side. Promoting it to
   an element (like IBD's ConnectionUsage / ItemFlow) would add
   complexity without value — no SysMLv2 Parametric workflow needs a
   binding to be selectable from a tree or trace target.
   `acceptedEdgeElementKinds` is empty; `acceptedEdgeKinds` is
   `['ParameterBinding']`.

3. **Endpoint typing.** A ParameterBinding connects exactly one
   ConstraintUsage parameter on one side and a ValueProperty (or
   another ConstraintUsage parameter — for chained equations) on the
   other. Self-loops (source === target) are rejected. The
   viewpoint's `isValidConnection` will enforce this in #137. There
   is no direction semantic (a binding is symmetric: a value flows
   either way to make the constraint hold); the stored `sourceId` is
   canonicalised to the ConstraintUsage side so persistence is
   deterministic. No shift-modifier discrimination needed (single
   edge kind).

4. **Equations as plain strings, no evaluator.** The constraint
   expression is a free-form string stored on
   `ConstraintDefinition.expression` and rendered on the
   ConstraintUsage node body (resolved through `definitionId`). Phase 8
   does NOT ship an evaluator, units system, or symbolic solver — the
   demo's contract is "the user types `mass = density * volume` into
   the node and it's preserved through round-trip". A future phase
   may add evaluation; the model representation today is
   evaluator-agnostic so that work won't break existing diagrams.

## Consequences

- The Parametric viewpoint config has empty `paletteItems` /
  `nodeTypes` / `edgeTypes` after #135; #136 adds the
  ConstraintUsage + ValueProperty nodes + palette items + inspector
  Extras sections, #137 adds the ParameterBinding edge + endpoint
  validator + canonicaliser.
- No new `Diagram.context` shape is needed in #135. The existing
  `createDiagram(viewpointId)` overload (no options) covers
  "free-form" creation.
- Workspaces can have any number of Parametric diagrams.
- Equations are opaque strings — search across elements (Phase 12)
  can grep the equation field as plain text, but no structural
  reasoning happens over it.
