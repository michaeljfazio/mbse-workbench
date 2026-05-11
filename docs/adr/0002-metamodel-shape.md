# 0002 — Metamodel shape: elements vs. edges, discriminated unions, IDs

**Status:** accepted
**Date:** 2026-05-11
**Phase:** phase:1 — Metamodel + command bus + repository + collaboration seams
**Issue:** #17

## Context

AGENT.md § Architectural directives 1 mandates that every SysMLv2 element
kind be a TypeScript discriminated-union member with `kind: '…'`. AGENT.md
§ Feature set — Core modelling lists 19 element kinds. Edges
(Composition, RequirementTrace, etc.) are not in that list, but they are
required by every viewpoint and need their own typed shape.

Several SysMLv2 concepts (`ConnectionUsage`, `ItemFlow`, `Transition`)
*are* elements per the constitution but *connect* a source and a target.
We had to decide: live in elements, live in edges, or both.

## Decision

1. **All 19 element kinds live in `src/model/elements.ts` as a
   `ModelElement` discriminated union.** Each member is an `interface`
   that extends an internal `ElementBase` with `{ id, ownerId?, name,
   documentation? }`, and adds a `readonly kind: '<literal>'`.
2. **Edge-like elements stay in the element union** (`ConnectionUsage`,
   `ItemFlow`, `Transition`). They carry `sourceId` and `targetId`
   directly. They are first-class elements: they can be named, selected,
   referenced, and have properties — they happen to render as edges.
3. **Pure structural relationships live in `src/model/edges.ts` as
   `ModelEdge`** (Composition, Generalization, RequirementTrace,
   ControlFlow, ObjectFlow, Include, Extend, ParameterBinding,
   PackageImport). Each carries `{ id, sourceId, targetId, label? }`
   and a literal `kind`.
4. **IDs are branded strings** in `src/model/id.ts`: `ElementId`,
   `EdgeId`, `UserId`, `ProjectId`. Production `src/model/` code never
   casts strings to IDs; #18 will introduce the factory.
5. **No `any`, no `as` casts in `src/model/`.** Sub-discriminators
   (`ActionUsage.nodeType`, `StateUsage.stateType`,
   `RequirementTraceEdge.traceKind`) are typed unions of literal
   strings.
6. **`ELEMENT_KINDS` and `EDGE_KINDS` are exported `as const` arrays**
   so callers can iterate every kind at runtime without re-listing
   them, and so missing-kind drift is caught by an exhaustive switch
   test backed by `assertNever`.

## Adding a new kind

1. Add the interface in `elements.ts` (or `edges.ts`) extending the
   appropriate base.
2. Add the kind to the relevant union and to the `*_KINDS` const array.
3. Add a case in `describeElement` / `describeEdge` exhaustive-switch
   tests — TypeScript fails the build if you don't.
4. Add a sample factory in the kind-keyed test table.

## Consequences

- New viewpoints in Phases 2–9 do **not** need to extend the
  metamodel — they only register a viewpoint config. The metamodel is
  closed for those phases.
- Diagram positions are deliberately **not** on elements; they live
  per-view in the future Diagram/View structure (Phase 2+).
- The element union has some redundancy with the edge union for the
  three "edge-like" elements. The diagram renderer derives its edge
  geometry from either source — documented at the renderer site when
  it lands.
