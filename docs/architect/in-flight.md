# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-875-webkit-baseline-lift` | main agent | Lift WebKit baseline for `use-case-with-association-edge` from `ci-full-matrix.yml` run `26060460694` (post-#519 merge); STATUS sync to iter-875 close. | #521 (close) | `tests/e2e/__screenshots__/use-case-edges.spec.ts/use-case-with-association-edge-webkit.png` (new), `STATUS.md`, `docs/architect/in-flight.md` | 2026-05-19 | PR pending |
