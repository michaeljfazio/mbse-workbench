# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/empty-ibd-seed-frame` | subagent | `area:viewpoint:ibd + area:cross-cutting` | #461 | `src/viewpoints/ibd/enclosingFrame.ts`, `src/workspace/flowGraph.ts`, `src/workspace/__tests__/ibdSeedFrame.test.ts`, `tests/e2e/ibd-seed-frame.spec.ts` | 2026-05-18 | in PR |
