# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-872-actor-usecase-association` | main agent | Implement Actor↔UseCase association edge (closes ADR 0007 § 5 / § 7 deferral); validator accepts cross-kind, store dispatches `AssociationEdge`, viewpoint registers `USE_CASE_ASSOCIATION_EDGE_TYPE`, popover gains an Association entry, plain-solid-line `AssociationEdge.tsx` renderer. Dim 10 (UC SysML conformance) score-3 promotion blocker. | #517 (close) | `src/viewpoints/useCase/AssociationEdge.tsx` (new), `src/viewpoints/useCase/isValidConnection.ts`, `src/viewpoints/useCase/index.ts`, `src/viewpoints/index.ts`, `src/workspace/store.ts`, `src/workspace/UseCaseEdgeKindPopover.tsx`, `docs/adr/0007-use-case-diagram-shape.md`, `tests/unit/viewpoints/useCase.test.ts`, `tests/unit/viewpoints/useCase/isValidConnection.test.ts`, `tests/unit/workspace/useCaseActions.test.ts`, `tests/e2e/use-case-edges.spec.ts`, `docs/architect/in-flight.md`, `STATUS.md` | 2026-05-19 | PR pending |
