# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/walk-35-plan-seal` | main agent | Iter-891 architect-hat plan-seal for walk-35 — new chain[1] retry candidate post-#548-closure. Authors `docs/architect/walks/walk-35.md` with corrected use-case V-B driver consuming the iter-890 popover-prefix-collision gotcha (probe `g[data-association-edge="true"]`, click `use-case-edge-kind-Association` after each drag). STATUS sync; in-flight row swap. No `src/` changes. | #554 (close) | `docs/architect/walks/walk-35.md`, `docs/architect/in-flight.md`, `STATUS.md` | 2026-05-19 | Branch live; PR pending. |
