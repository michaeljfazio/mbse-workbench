# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-886-vphase-15.10-release` | main agent | Iter-886 close-out — first agent-cut release under ADR 0017. A.8 release-window four-gate checklist on `7a118a7` passed clean (≥5 batches + CI Full Matrix GREEN + SemVer patch `v1.6.1` decided + no halt signal). Tags `vphase-15.10` and `v1.6.1` cut on `7a118a7` and pushed; release workflows queued. This PR appends JOURNAL release entry + syncs STATUS + swaps in-flight row. Walk-34 plan-seal un-blocks at iter-887. | #544 (close) | `STATUS.md`, `JOURNAL.md`, `docs/architect/in-flight.md` | 2026-05-19 | PR pending |
