# ADR 0013 — KerML core library: fixture shape, merge semantics, and downstream filtering

Status: accepted (T-14.04, iter-784)
Context: Phase 14 — Standard library import

## Decision

The KerML standard library lands as a **TypeScript module** at
`src/library/kerml/core.ts` exporting `kermlCoreElements(): ModelElement[]`
(fresh array per call, no shared mutable state) and stable namespaced IDs
(`kerml.core.Base`, `kerml.core.Base.Anything`, …).

A pure helper `applyStandardLibrary(project) → Project` in `src/library/index.ts`
**idempotently** merges the library into a project: appends missing library
elements, prepends `kerml.core.Base` to `libraryRootIds` if absent. Called by
`InMemorySessionRepository.load()` and by `workspace.bootstrap()` for the
empty-project branch — every project the workspace ever sees has the library.

A second helper `isLibraryElement(element, libraryRootIds, elements)` walks
`ownerId` upward; returns true iff the chain terminates at a library root.
Consumers that count or list user-authored content **must filter** library
elements out — palette grouping (`ProjectTree`), auto-naming (`nextBlockName`),
auto-layout (`runAutoLayout`), and the Phase-13 gate invariant test.

## Why TypeScript module over JSON fixture

The issue offered a JSON file; we chose a TS module because:
- Library element shapes are type-checked against the discriminated union,
  catching schema drift the moment a fixture diverges from the metamodel.
- IDE jump-to-definition works for `KERML_CORE_ELEMENT_IDS.Anything`.
- No JSON loader / build-time import config needed.

## Kind mapping decisions

KerML concepts are mapped onto existing metamodel kinds. No new kinds in v1.

| KerML concept | Element kind         | Note                                              |
|---------------|----------------------|---------------------------------------------------|
| `Base`        | `Package`            | Root, `isReadOnly: true`                          |
| `Anything`    | `PartDefinition`     | `isAbstract: true` — universal supertype           |
| `Item`        | `PartDefinition`     | `isAbstract: false`                                |
| `Part`        | `PartDefinition`     | `isAbstract: false`                                |
| `Port`        | `PortDefinition`     | `direction: 'inout'` default                       |
| `Connection`  | `InterfaceDefinition`| Closest defining kind for connectable contracts    |
| `Action`      | `ActionDefinition`   | —                                                 |
| `Performance` | `ActionDefinition`   | Distinguished from Action by name + docs only      |
| `Definition`  | `PartDefinition`     | `isAbstract: true` — meta-marker, opaque in v1     |
| `Usage`       | `PartDefinition`     | `isAbstract: true` — meta-marker                   |

`Connection` is the only awkward mapping: KerML's Connection is a
definition-side concept but the v1 metamodel exposes `ConnectionUsage` only
on the edge side. `InterfaceDefinition` is the closest defining kind — a
namespace for connectable contracts. T-14.05+ may reify a `ConnectionDefinition`
kind if SysMLv2 textual `import` directives demand it.

## Containment invariant evolution (was: "exactly one root")

ADR 0011 / JOURNAL iter-531 set the Phase-13 gate invariant
"`elements.filter(e => e.ownerId === null).length === 1`". T-14.04 introduces
library roots which are **also** `ownerId === null` (sibling roots, not
nested under the project root). The invariant becomes:

> Exactly one element has `ownerId === null && id === project.rootId` (the
> project root). Every other `ownerId === null` element must appear in
> `project.libraryRootIds`.

Phase-13 gate test (`tests/unit/workspace/phase13GateInvariants.test.ts`)
updated accordingly.

## What this ADR does not decide

- The SysML standard library (deferred to a follow-up task in Phase 14).
- The `import Pkg::*` directive in SysMLv2 text round-trip (T-14.05).
- Namespace resolution precedence (T-14.06).
- Specialisation edges from user elements to library supertypes
  (`Anything` etc.). The library is named-symbol-only in v1.

## Consequences

- Every fresh and every loaded project has 10 extra elements + 1 library
  root id. Storage cost is negligible (<1 kB serialised).
- `isLibraryElement` is `O(depth)` per element; cumulative cost on a
  full-project scan is `O(N × max_depth)` where `max_depth` is the worst
  library nesting. KerML core is 1-deep so the cost in practice is `O(N)`.
- A new convention is established: **any code that filters
  `state.elements` for user-authored content must filter library elements
  via `isLibraryElement`**. New consumers will likely need updates; this
  is the cost of integrating the library at the storage layer.
