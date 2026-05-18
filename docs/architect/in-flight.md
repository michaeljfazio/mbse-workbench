# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-852-walk-25-plan` | main | Walk-25 plan: regression of walk-24 (dim-13 BDD↔IBD coherence) against post-fix HEAD `be050e0` | — (walk planning, doc-only) | `docs/architect/walks/walk-25.md`, `STATUS.md`, `docs/architect/in-flight.md` | 2026-05-18 | in PR (auto-merge armed SQUASH; expected outcome: `code = false`, all e2e shards SKIPPED, `check` success — same doc-only-skip shape as iter-850/851) |
