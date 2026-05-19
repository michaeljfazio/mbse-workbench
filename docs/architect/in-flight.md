# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/walk-36-plan-seal` | main agent | Iter-894 plan-seal (architect hat) for walk-36 — dedicated dim-17 (edge editing affordances) deep-dive against the byte-identical `vphase-15.10` / `v1.6.1` Pages bundle. Plan-seal PR appends the `## 2026-05-19 — Dim-17 edge-editing affordance conventions (walk-36 prereq)` research section to `docs/architect/visual-standards.md` (primary-source-cited per A.9), authors `docs/architect/walks/walk-36.md` with the full A.5 Plan + Snapshot + Pre-plan-seal code scan, refreshes this in-flight row, and syncs STATUS. No `src/` changes; doc-only PR; CI fast-path per ADR 0016. Walk-36 is the chain[2] candidate; expected outcome (3–6 PCs FAIL) resets the chain to 0 — see walk-36.md § Acceptance / rubric impact for the honesty-over-throughput tradeoff. | #560 (close) | `docs/architect/visual-standards.md`, `docs/architect/walks/walk-36.md` (new), `docs/architect/in-flight.md`, `STATUS.md` | 2026-05-19 | Branch live; PR pending. |
