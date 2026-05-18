# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-879-actor-source-handles` | main agent | Engineer fix for #528 — promote use-case viewpoint to `ConnectionMode.Loose` (same pattern as IBD #499) so drags can initiate from `type="target"` handles. Validator-layer `isValidUseCaseConnection` already accepts both Actor↔UseCase orderings. +11/-1 in CanvasPane, +41 LOC e2e test. | #528 (close) | `src/workspace/CanvasPane.tsx`, `tests/e2e/use-case-edges.spec.ts`, `STATUS.md`, `docs/architect/in-flight.md` | 2026-05-19 | PR pending |
