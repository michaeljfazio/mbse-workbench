# 0005 — Activity Diagram shape: scope, pseudostates, edge model, endpoint typing, onConnect discrimination

Date: 2026-05-12 · Status: accepted · Phase: 5 · Issue: #87

## Context

Phase 5 adds the Activity Diagram. Five questions need a stable answer
before #88–#90 land any code or tests: what does an Activity diagram
contain, how do pseudostates (initial / final / fork / join / decision /
merge) appear in the metamodel and on the canvas, how do control vs.
object flows render, what endpoint pairings are valid, and how does the
canvas decide which edge kind to create on a drag.

The metamodel work was already done in Phase 1. `ActionUsage` discriminates
pseudostates via `nodeType: ActionNodeType`
(`'action' | 'initial' | 'final' | 'fork' | 'join' | 'decision' | 'merge'`);
`ControlFlowEdge` and `ObjectFlowEdge` are first-class `ModelEdge` kinds.

## Decision

1. **Diagram scope.** Free-form, no `Diagram.context` link (unlike IBD's
   `PartDefinition` coupling). Multiple Activity diagrams per project,
   like Requirements per ADR 0004 § 1. Users open new Activity diagrams
   via `createDiagram('activity')`; the Phase 5 follow-ups or a later
   phase surface a UI affordance.

2. **Pseudostates as `nodeType` tags on `ActionUsage`.** No separate
   element kinds for initial / final / fork / join / decision / merge —
   the metamodel already discriminates via `ActionUsage.nodeType`. The
   viewpoint's `nodeTypeFor(element)` translates `nodeType` to a
   ReactFlow node-type string (e.g. `activity-action`, `activity-initial`,
   …). Single registry entry per pseudostate kind keeps the model
   compact and lets shared command-bus logic (`update-element` with
   `nodeType` patch) cover pseudostate↔action conversion if a later
   inspector affordance wants it.

3. **Edge model: `ModelEdge`, not element-as-edge.** Both `ControlFlow`
   and `ObjectFlow` stay in `ModelEdge` (like BDD's Composition /
   Generalization and Requirements' RequirementTrace), since they carry
   no identity beyond `{ sourceId, targetId, guard? }` for ControlFlow
   and `{ sourceId, targetId, itemType? }` for ObjectFlow. Promoting
   them to elements (like IBD's ConnectionUsage / ItemFlow, which carry
   a stable `id`/`name`) would add complexity without benefit. The
   viewpoint's `acceptedEdgeElementKinds` is therefore empty;
   `acceptedEdgeKinds` is `['ControlFlow', 'ObjectFlow']`.

4. **Endpoint typing.** Both endpoints must be `ActionUsage` nodes
   (pseudostates included). Self-loops are rejected. `nodeType: 'initial'`
   cannot be a target (initial node is the entry, never a sink);
   `nodeType: 'final'` cannot be a source (final node is the exit,
   never a launching point). The viewpoint's `isValidConnection`
   enforces this in #89.

5. **Shift-modifier discrimination on `onConnect`.** Default drag-
   creates a `ControlFlow`; holding Shift during drag-start switches to
   `ObjectFlow`. Mirrors IBD's ConnectionUsage vs. ItemFlow pattern
   from #52 (see `docs/CONTEXT.md` 2026-05-12 entry on `onConnectStart`'s
   native-event `shiftKey` seeding plus window-level keydown/keyup).
   The canvas-level branch lives in `CanvasPane.onConnect` and routes
   to one of two new workspace store actions (`connectControlFlow` /
   `connectObjectFlow`) that #89 introduces.

## Consequences

- The Activity viewpoint config has empty `nodeTypes` / `edgeTypes` after
  #87; #88 adds the seven `ActionUsage` node renderers, #89 adds the
  two edge renderers.
- `paletteItems` ship in #87 (seven entries, all `elementKind:
  'ActionUsage'`, with `defaultData.nodeType` covering the seven
  `ActionNodeType` values). The project tree groups them under
  "Actions" once #88 wires the drop handler; #87 only registers the
  viewpoint so the existing tree-derived "Actions" group surfaces.
- `acceptedElementKinds` includes both `ActionUsage` and
  `ActionDefinition` — Phase 5 only renders `ActionUsage`, but reserving
  `ActionDefinition` keeps the door open for "called activity" frames
  (a definition surface inside an action diagram) without an ADR
  revision later.
- No `Diagram.context` extension is needed; the existing
  `createDiagram(viewpointId)` overload (no options) covers free-form
  creation, matching the Requirements pattern.
- Reusing `ActionUsage` for pseudostates means the inspector's
  ActionExtras section (planned for #88) shows the `nodeType` as the
  primary discriminator; per-kind extras (e.g. `guard` on a decision)
  live on the outgoing `ControlFlow` edges rather than on the node.
