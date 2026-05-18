# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-865-walk-29-exec` | main agent | walk-29 execution close-out (regression of walk-28 against unchanged `vphase-15.8` Pages — 7/8 PCs PASS automated, 8/8 visually; #505 settle-wait fix verified) | #508 (PC5 driver probe selects wrong `<path>`, `p3 type:chore`) | `docs/architect/walks/walk-29.md`, `docs/architect/in-flight.md`, `docs/architect/quality-rubric.md`, `STATUS.md` | 2026-05-19 | PR open, awaiting auto-merge |
