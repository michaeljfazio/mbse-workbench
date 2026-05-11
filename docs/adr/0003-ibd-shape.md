# 0003 — IBD shape: scope, ports as handles, connection typing, BDD↔IBD coupling

Date: 2026-05-12 · Status: accepted · Phase: 3 · Issue: #49

## Context

Phase 3 adds Internal Block Diagrams (IBD). Four questions need a stable
answer before #50–#53 land any code or tests: what does an IBD represent,
how do ports render, when is a connection valid, and how do BDD and IBD
relate.

## Decision

1. **IBD scope.** Each IBD diagram is associated with **exactly one**
   `PartDefinition`. `Diagram.context` carries the link:
   `context?: { kind: 'partDefinition'; id: ElementId }`. BDD diagrams
   leave `context` `undefined`. One IBD per PartDefinition; IBDs are
   created lazily when the user first navigates to the internal view of a
   block (the cross-diagram nav lands in #53).

2. **PortUsages as Handles.** `PortUsage` does not render as a separate
   React Flow node. It appears as a labelled `<Handle>` attached to the
   parent `PartUsage` node. Per `docs/CONTEXT.md` `@xyflow/react`
   multi-handle notes, each handle gets a unique `id` equal to its
   `PortUsage.id`, and is positioned with inline CSS `top: '<pct>%'`
   along the chosen `Position`.

3. **ConnectionUsage typing.** A `(sourcePort, targetPort)` pair is valid
   when:
   - both port directions are `inout`, **or**
   - the directions are complementary (`out` → `in` — canonicalized on
     apply, so `in` → `out` is normalised), **or**
   - one side is `inout` and the other is `in` or `out`.
   `in` ↔ `in` and `out` ↔ `out` are rejected. The viewpoint's
   `isValidConnection` enforces this; the eventual `ConnectionUsage`
   element carries the **PortUsage** ids in `sourceId`/`targetId`, not
   the PartUsage ids.

4. **BDD ↔ IBD coupling for Phase 3.** Keep the existing simplification:
   `Composition` in BDD remains a direct `PartDefinition`→`PartDefinition`
   edge — no auto-spawned `PartUsage` on either side. IBD content is
   authored independently by dragging Parts into the IBD canvas. Cross-
   diagram nav lets the user jump between definition (BDD) and usage
   (IBD); the two views share the same underlying `PartDefinition`
   element through the registry, so renames on the BDD side reflect in
   the IBD's part labels (and vice-versa).

## Consequences

- `Diagram.context` is the only new persistence anchor needed in #49.
  Missing `context` on a loaded diagram normalises to `undefined` for
  forward-compat — JSON serialisation drops the key on save when the
  field is absent.
- IBD's initial `paletteItems` are empty; #50 adds a "Part" palette
  item once the `PartUsageNode` and its handles exist.
- ConnectionUsage typing lives next to the viewpoint (mirrors the BDD
  pattern in `src/viewpoints/bdd/isValidConnection.ts`).
- Re-using a single `PartDefinition` across BDD and IBD without auto-
  spawning usages keeps Phase 3 tractable. A future ADR can revisit
  the linkage when the model gains usage-from-definition semantics.
