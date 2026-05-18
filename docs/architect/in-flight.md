# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-836-status-sync` | main | `area:cross-cutting (STATUS hygiene)` | n/a (STATUS-only sync) | `STATUS.md` | 2026-05-18 | in PR (#459, CI green, BEHIND) |
| `phase-15/walk-24-dim13-cross-diagram` | main | `area:cross-cutting (walk-24 close-out, files #461 #462, demotes dim 6)` | files #461, #462 | `docs/architect/walks/walk-24.md`, `docs/architect/quality-rubric.md`, `STATUS.md`, `artifacts/phase-15/walk-24/*` | 2026-05-18 | in PR (#463, CI in progress) |
| `phase-15/iter-840-inflight-board-sync` | main | `area:cross-cutting (claim-board hygiene)` | closes #470 | `docs/architect/in-flight.md` | 2026-05-18 | in PR (this branch) |
