# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-877-walk-33-plan` | main agent | Walk-33 plan-seal (chain[1] candidate regression of walk-32 on `vphase-15.9` Pages; dim-10 score-3 gate). Doc-only — ADR 0016 fast-path PR-gate. | #525 (close) | `docs/architect/walks/walk-33.md`, `STATUS.md`, `docs/architect/in-flight.md` | 2026-05-19 | PR pending |
