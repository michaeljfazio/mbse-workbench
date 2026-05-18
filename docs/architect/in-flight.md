# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-857-walk-27-plan` | main | Iter-857 walk-27 plan-seal (A.5): IBD deep-dive on deployed `vphase-15.7` Pages — chain[3] candidate + dim 6 (IBD) score-3 promote candidate. Per A.9 also research-populates `ibd.md` § "2026-05-19 — Deep-dive conventions (walk-27 prereq)" with primary-source-cited port / connection / item-flow / proxy-vs-full conventions. | — (architect walk plan-seal + diagram-types research, doc-only) | `docs/architect/diagram-types/ibd.md` (append), `docs/architect/walks/walk-27.md` (new), `STATUS.md`, `docs/architect/in-flight.md` | 2026-05-19 | open as iter-857 PR; auto-merge armed SQUASH; expected `code = false`, `check` success ~1m 30s (seventh consecutive ADR 0016 doc-only-skip observation) |
