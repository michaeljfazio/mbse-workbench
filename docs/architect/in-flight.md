# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| phase-15/palette-show-all-kinds | iter-800 subagent | Palette discoverability | #372 | `src/workspace/tree/ProjectTree.tsx`, `tests/unit/workspace/tree/ProjectTree.test.tsx`, `tests/e2e/palette-shows-all-kinds.spec.ts` | 2026-05-17 | in-flight |
