# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-850-status-validation` | main | empirical validation of iter-849 ADR 0016 fix | — (doc-only) | `STATUS.md`, `docs/architect/in-flight.md` | 2026-05-18 | in PR (just opened; auto-merge armed SQUASH; expected outcome: `code = false`, all e2e shards SKIPPED, `check` success in ~2-3 min) |
