# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| phase-15/bdd-drag-coord-overlay | iter-797 | interaction/drag feedback | #375 | src/workspace/CanvasPane.tsx, src/workspace/DragCoordOverlay.tsx, src/workspace/__tests__/dragCoordOverlay.test.ts, tests/e2e/bdd-drag-coord-overlay.spec.ts | 2026-05-17 | in-progress |
