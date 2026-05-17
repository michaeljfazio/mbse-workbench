# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| phase-15/cmd-z-rename-input-fix | iter-798 (inline) | undo/keyboard | #386 | src/workspace/tree/ContainmentTree.tsx, tests/e2e/cmd-z-from-rename-input.spec.ts | 2026-05-17 | in-flight |
