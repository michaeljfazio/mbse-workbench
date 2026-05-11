# 0001 — Metamodel as discriminated unions

**Status:** Accepted
**Date:** 2026-05-11
**Phase:** phase:0

## Context

The SysMLv2 metamodel has many element kinds (Package, PartDefinition,
PartUsage, PortUsage, Requirement, ActionDefinition, StateDefinition,
Transition, UseCase, Actor, ConstraintUsage, …) and edges that only make
sense between specific kinds (e.g. `satisfy` connects a Requirement to a
PartUsage, not to a Transition). The shape we choose for the in-memory
model is read by every viewpoint, command, repository, serializer, and
the LLM tool dispatcher.

## Decision

Every element kind is a TypeScript discriminated union member with a
literal `kind: '...'` field. The same applies to edges. No `any`, no
stringly-typed enums, no shared "base class with optional fields" object.

```ts
type ModelElement =
  | { kind: 'PartDefinition';   id: string; name: string; ... }
  | { kind: 'PartUsage';        id: string; name: string; ... }
  | { kind: 'PortUsage';        id: string; name: string; ... }
  | ...;
```

TypeScript narrows `element.kind` switches to exhaustive checks, so
adding a new element kind produces compile errors at every site that
needs updating. Commands, viewpoint renderers, and serializers all
exhaustively switch on `kind`.

## Consequences

- Adding an element kind is a guided refactor; the type checker enumerates
  every site that must change.
- The metamodel doubles as runtime validation: parsers and the LLM
  dispatcher emit values that must satisfy the union, or they're rejected.
- We pay a small one-time cost: writing exhaustive switches feels more
  verbose than `if (el.type === 'whatever')` with a single shared shape.
  Worth it.
- Mandatory: a single `assertNever(x: never)` helper imported wherever
  exhaustive switches live, so the failure mode is "compile error" not
  "silent fallthrough."
