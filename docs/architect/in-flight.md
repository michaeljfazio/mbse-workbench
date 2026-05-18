# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-867-walk-30-execute` | main agent | walk-30 execute (regression of walk-29 on unchanged `vphase-15.8` Pages — #508 probe-selector fix verified end-to-end, dim 6 IBD promoted 2 → 3) | none | `docs/architect/walks/walk-30.md`, `docs/architect/quality-rubric.md`, `docs/architect/in-flight.md`, `STATUS.md` | 2026-05-19 | PR open, awaiting auto-merge |
