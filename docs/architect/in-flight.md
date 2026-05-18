# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-859-walk-27-execute` | main | Iter-859 walk-27 execute (A.5): IBD deep-dive on deployed `vphase-15.7` Pages. 5/8 PCs PASS, 2 issues filed (#499 `p1` connection-mode root cause; #500 `p2` acronym auto-name). Chain[2] → chain[0] (reset, expected risk-balance outcome). dim 3 / dim 6 / dim 17 / dim 27 measurements all hold at prior scores. | #499 + #500 filed (walk findings, not closed by this PR — closed by the next engineer batch) | `docs/architect/walks/walk-27.md` (append), `docs/architect/quality-rubric.md` (append), `STATUS.md`, `docs/architect/in-flight.md` | 2026-05-19 | open as iter-859 PR; auto-merge armed SQUASH; expected `code = false`, `check` success ~1m 30s (eighth consecutive ADR 0016 doc-only-skip observation) |
