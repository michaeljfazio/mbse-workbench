# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/explorer-diagram-row-click-area` | main | `area:explorer + area:cross-cutting` | #462 | `src/workspace/tree/ContainmentTree.tsx`, `tests/unit/workspace/tree/ContainmentTree.test.tsx`, `tests/e2e/explorer-diagram-row-activate.spec.ts` | 2026-05-18 | in PR |
