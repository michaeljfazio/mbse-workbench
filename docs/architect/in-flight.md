# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/fix-ibd-connection-mode` | main | Iter-860 IBD connection-mode fix + acronym auto-name. Sets `ConnectionMode.Loose` on the IBD `<ReactFlow>` so source→source drags (the default for `inout↔inout`) delegate validity to `isValidIbdConnection`. Updates `nextPartUsageName()` to suffix all-uppercase acronyms (`PFC` → `PFC_1`) instead of producing `pFC`. | Closes #499 + #500 | `src/workspace/CanvasPane.tsx`, `src/workspace/store.ts`, `tests/unit/workspace/ibdActions.test.ts`, `tests/e2e/ibd-connection.spec.ts`, `tests/e2e/ibd-itemflow.spec.ts`, `docs/CONTEXT.md`, `docs/architect/in-flight.md`, `STATUS.md` | 2026-05-19 | open as iter-860 PR; auto-merge armed SQUASH; expected full code-path CI (TS + lint + unit + Playwright + visual on linux runners) |
