# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-876-vphase-15.9-journal` | main agent | JOURNAL entry for `vphase-15.9` / `v1.6.0` release + STATUS overwrite to iter-876 close. Doc-only — ADR 0016 fast-path PR-gate. | #523 (close) | `JOURNAL.md`, `STATUS.md`, `docs/architect/in-flight.md` | 2026-05-19 | PR pending |
