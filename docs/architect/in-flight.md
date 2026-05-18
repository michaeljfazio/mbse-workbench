# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `issue/548-actor-right-secondary-direction-association` | main agent | Iter-890 engineer-hat on walk-34's #548. Investigation traced the finding to a walk-driver artefact (popover-testid-prefix collision: `[data-testid^="use-case-edge-"]` matches both real edge testids and popover-kind testids). Adds a lock-in Playwright test exercising `actor.right → usecase.left` with popover-pick → Association edge; appends a `docs/CONTEXT.md` discovered-fact entry for future walk drivers; STATUS sync. No `src/` changes — application already correct. | #548 (close) | `tests/e2e/use-case-edges.spec.ts`, `docs/CONTEXT.md`, `STATUS.md` | 2026-05-19 | PR #553 open (auto-merge enabled) |
