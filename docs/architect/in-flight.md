# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-885-operator-cut-tag-design` | main agent | Iter-885 escalation — file `#542` design issue (operator-cut-tag session convention vs AGENT.md step 17 prescription) and resolve in same-iteration close-out PR via ADR 0017. Resolution: agent cuts both `vphase-15.N` and `v1.X.Y` tags when A.8's release-window four-gate checklist passes; operator-cut remains opt-in. Iter-886 (post-merge) re-runs the checklist on post-#531 `main` and is expected to cut `vphase-15.10` / `v1.6.1`. | #542 (close) | `STATUS.md`, `docs/adr/0017-tag-cutting-cadence.md`, `docs/adr/README.md`, `docs/architect/in-flight.md`, `JOURNAL.md` | 2026-05-19 | PR pending |
