# 0011 — Explorer foundation: ownerId single source of truth + required DiagramContext

**Status:** Accepted (2026-05-14, iter-531/iter-704)
**Issue:** #255 (T-13.29 + T-13.30, bundled per AGENT.md)

## Context

The Phase-13 walkthrough (JOURNAL iter-528..530) found that the Project Explorer
cannot present a containment hierarchy because containment is double-encoded:
every parent carries a child-id array (`Package.memberIds`,
`PartDefinition.portIds/propertyIds`, `PartUsage.portUsageIds`,
`ActionDefinition.parameterIds`, `InterfaceDefinition.portDefinitionIds`),
and child elements carry an optional `ownerId`. The two encodings drift; some
elements are owned by nothing; diagrams have an optional `context` that may
point at deleted elements.

## Decision

1. **`ownerId` + `ownerRole` + `ownerIndex` on `ElementBase` are the single
   source of truth for containment.** `ownerId` is required for every
   element except the root Package. **Naming collision resolution:** the
   pre-existing `ownerId: UserId` field (collab permission ownership, used
   only by `src/collab/permissions.ts`, `Inspector.tsx`, and one test) is
   renamed `ownerUserId`. The new `ownerId` is an `ElementId | null`. `ownerRole` is a short string discriminator
   (e.g. `'member'`, `'port'`, `'property'`, `'parameter'`, `'portUsage'`,
   `'portDefinition'`) so the same parent kind can host multiple child roles.
   `ownerIndex` is a non-negative integer giving sibling order within
   `(ownerId, ownerRole)`.
2. **All parent-side child arrays are removed** from element interfaces.
   Consumers query the registry's O(1) `childrenOf(id, role?)` instead.
3. **`Project` gains `rootId: ElementId`.** `Repository.load()` synthesizes an
   explicit root `Package` (named after `Project.name`) on legacy load, and
   re-parents every otherwise-orphan element under it.
4. **`DiagramContext` becomes a required discriminated union:**
   `{ kind: 'package' | 'partDefinition' | 'actionDefinition' | 'stateDefinition', id }`.
   Each viewpoint declares `acceptedContextKinds`. The legacy reader migrates
   orphan diagrams to `{ kind: 'package', id: rootId }`.
5. **Registry maintains parent/child indexes** updated on every add/remove and
   on `setOwner` mutations; the index is rebuilt on `replaceAll`.
6. **Load-time invariant checker** rejects models where: more than one element
   has `ownerId === null`; any `ownerId` is dangling; any diagram lacks a
   valid context; any persisted element retains a parent-side child array.

## Consequences

- Touches ~82 files (model, registry, repository, commands, serializer, parser,
  every LLM tool, every viewpoint, store, inspector, workspace, tests).
- Bundled into a single PR (#255) per AGENT.md; staged on branch
  `issue/255-explorer-foundation-ownerid-context` over multiple iterations.
- Phase 14 reserves `PackageElement.isReadOnly` and `Project.libraryRootIds`
  for standard-library import; this ADR does not block those.
- Locks the data shape the explorer rewrite (T-13.31..T-13.34) builds on.
