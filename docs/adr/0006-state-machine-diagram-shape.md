# 0006 — State Machine Diagram shape: scope, pseudostates, edge model, endpoint typing, onConnect discrimination

Date: 2026-05-12 · Status: accepted · Phase: 6 · Issue: #104

## Context

Phase 6 adds the State Machine Diagram. Five questions need a stable answer
before #105–#107 land any code or tests: what does a State Machine diagram
contain, how do pseudostates (initial / final) appear in the metamodel and
on the canvas, how does the Transition render, what endpoint pairings are
valid, and is there an `onConnect` discrimination case the canvas must
handle.

The metamodel work was already done in Phase 1. `StateUsage` discriminates
pseudostates via `stateType: StateNodeType` (`'state' | 'initial' | 'final'`);
`Transition` is a first-class `ModelElement` with `sourceId` / `targetId`
baked in plus optional `trigger` / `guard` / `effect` — confirmed in
`src/model/elements.ts:124-145`. `KIND_OPTIONAL_FIELDS` already whitelists
the optional fields on both kinds, so the registry's `update<K>` guard
accepts first-time patches without changes.

## Decision

1. **Diagram scope.** Free-form, no `Diagram.context` link (unlike IBD's
   `PartDefinition` coupling). Multiple State Machine diagrams per project,
   like Activity per ADR 0005 § 1 and Requirements per ADR 0004 § 1. Users
   open new State Machine diagrams via `createDiagram('state-machine')`;
   the UI affordance lands in a later phase alongside Activity's.

2. **Pseudostates as `stateType` tags on `StateUsage`.** No separate
   element kinds for initial / final — the metamodel already discriminates
   via `StateUsage.stateType`. The viewpoint's `nodeTypeFor(element)`
   translates `stateType` to a ReactFlow node-type string
   (`state-machine-state`, `state-machine-initial`, `state-machine-final`).
   Single registry entry per pseudostate kind keeps the model compact and
   lets shared command-bus logic (`update-element` with `stateType` patch)
   cover pseudostate↔state conversion if a later inspector affordance
   wants it. Mirrors Activity's `ActionUsage.nodeType` decision in
   ADR 0005 § 2.

3. **Edge model: element-as-edge, not `ModelEdge`.** Transition stays in
   `ModelElement` with `sourceId` / `targetId` baked in (same Phase 1
   metamodel split as IBD's `ConnectionUsage` / `ItemFlow` per ADR 0003
   § 3 and ADR 0002). The viewpoint's `acceptedEdgeKinds` is therefore
   empty; `acceptedEdgeElementKinds` is `['Transition']`. This differs
   from Activity (ADR 0005 § 3) where `ControlFlow` / `ObjectFlow` stay
   in `ModelEdge` — Transitions carry stable identity (a name plus
   optional `trigger` / `guard` / `effect` triple) so promoting them to
   elements is worth the bookkeeping.

4. **Endpoint typing.** Both endpoints must be `StateUsage` nodes
   (pseudostates included). Self-loops are rejected. `stateType: 'initial'`
   cannot be a target (initial pseudostate is the entry, never a sink);
   `stateType: 'final'` cannot be a source (final pseudostate is the
   exit, never a launching point). The viewpoint's `isValidConnection`
   enforces this in #106. Identical to Activity (ADR 0005 § 4); junction
   / choice pseudostates are deferred — initial / final cover the
   demo's needs and the metamodel intentionally only ships those two.

5. **No `onConnect` discrimination needed.** Unlike Activity (#89) which
   forks ControlFlow ↔ ObjectFlow on the Shift modifier and IBD (#52)
   which forks ConnectionUsage ↔ ItemFlow the same way, State Machine
   ships exactly one transition kind. The `shiftHeldRef` plumbing in
   `CanvasPane.onConnect` does NOT need a State Machine branch.

## Consequences

- The State Machine viewpoint config has empty `nodeTypes` / `edgeTypes`
  after #104; #105 adds the three `StateUsage` node renderers (state +
  initial + final pseudostates), #106 adds the Transition edge renderer.
- `paletteItems` ship in #104 (three entries, all `elementKind:
  'StateUsage'`, with `defaultData.stateType` covering the three
  `StateNodeType` values). The project tree groups them under "State
  usages" once #105 wires the drop handler; #104 only registers the
  viewpoint so the existing tree-derived "State usages" group surfaces.
- `acceptedElementKinds` includes both `StateUsage` and `StateDefinition`
  — Phase 6 only renders `StateUsage`, but reserving `StateDefinition`
  keeps the door open for "called state machine" frames (a definition
  surface inside a state-machine diagram) without an ADR revision later
  (parallels Activity reserving `ActionDefinition`).
- No `Diagram.context` extension is needed; the existing
  `createDiagram(viewpointId)` overload (no options) covers free-form
  creation.
- Reusing `StateUsage` for pseudostates means the inspector's
  `StateExtras` section (planned for #105) shows the `stateType` as the
  primary discriminator; per-instance extras (entry / exit / do actions)
  live on `StateUsage` itself, and per-Transition extras (trigger /
  guard / effect) live on the outgoing edge (planned for #106's
  `TransitionExtras`).
- `nodeSizeFor` returns 160×72 for `state`, 28×28 for both pseudostates
  — same `actionNodeSize`-style per-element seam Activity introduced in
  iteration 36 (`docs/CONTEXT.md` 2026-05-12 entry on per-element node
  sizes). Final visual proportions are still up to #105.
