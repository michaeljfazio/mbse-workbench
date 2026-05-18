# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-855-vphase-15.7-release` | main | Iter-855 release close-out: `vphase-15.7` + `v1.5.1` tags pushed on `main` at `4c5cc41`; STATUS sync + JOURNAL release entry; release workflow handles Pages deploy | — (release close-out, doc-only) | `STATUS.md`, `JOURNAL.md`, `docs/architect/in-flight.md` | 2026-05-18 | open as iter-855 PR; auto-merge armed SQUASH; expected `code = false`, `check` success ~1m 30s |
