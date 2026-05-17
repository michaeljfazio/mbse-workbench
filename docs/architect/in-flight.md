# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| phase-15/palette-label-consistency | iter-802 (inline) | Palette labels | #377 | `src/workspace/tree/kindLabels.ts`, `tests/unit/workspace/tree/ProjectTree.test.tsx` | 2026-05-17 | in-flight |
