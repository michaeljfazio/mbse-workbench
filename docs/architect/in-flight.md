# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-871-walk-32-execute` | main agent | walk-32 execute (broad-sweep regression with corrected driver against `vphase-15.8` Pages — 22/24 PCs PASS, 1 PARTIAL persists for use-case/V-B; iter-870 disambiguation half-falsified — Actor↔UseCase association still rejects per ADR 0007 § 5 deferral; #517 filed `type:feature`; chain holds at 0 / 3) | #516 (close), #517 (new) | `docs/architect/walks/walk-32.md` (new), `docs/architect/in-flight.md`, `docs/architect/quality-rubric.md`, `docs/CONTEXT.md`, `STATUS.md` (driver + JSON + screenshots are gitignored under `artifacts/` per Phase-0 `.gitignore`) | 2026-05-19 | PR pending |
