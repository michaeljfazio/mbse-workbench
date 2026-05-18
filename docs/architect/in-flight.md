# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-847-paths-filter-toplevel-md` | main | `area:cross-cutting (CI doc-only classifier — top-level *.md fix)` | closes #483 | `.github/workflows/ci.yml`, `docs/adr/0016-ci-doc-only-skip-e2e.md`, `docs/architect/in-flight.md`, `STATUS.md` | 2026-05-18 | in PR (CI in progress; full e2e expected since `ci.yml` itself is touched) |
