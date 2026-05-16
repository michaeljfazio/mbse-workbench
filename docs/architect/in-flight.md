# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| phase-15/bdd-block-resize | Sonnet subagent | BDD block resize handles | #374 | src/workspace/diagram.ts, src/workspace/flowGraph.ts, src/workspace/store.ts, src/workspace/CanvasPane.tsx, src/viewpoints/bdd/BlockNode.tsx, src/viewpoints/bdd/index.ts, src/workspace/__tests__/bddBlockResize.test.ts, tests/e2e/bdd-block-resize.spec.ts | 2026-05-17 | in-flight |
