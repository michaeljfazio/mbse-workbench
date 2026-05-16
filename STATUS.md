# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

Iter-795: errata + pivot. While planning the iter-795 engineer batch
for the three p0 issues (#368/#369/#370 missing-viewpoint family),
an `Explore` subagent surfaced that the walk-1 Playwright probe
had a buggy ancestor check — it was opening the Package root's row
menu every time, regardless of which row was nominally targeted.
All eight viewpoints ARE registered and the Phase-13 cold-start gate
test creates each one via UI on every CI run. The walk-1 issues
were reframed from "no entry point" (p0) to "discoverability gap on
Package row menu" (p2), and rubric dims 6/8/9/11 raised from 1 → 2.

Iter-795's engineer batch pivots to the interaction issues:
**#374 (resize handles) + #375 (drag-position display)**. #376
(four UI surfaces for Block creation) is a `type:design` issue and
deferred to a follow-up ADR-driven batch.

## Current iteration
- Iteration #: 795
- Started: 2026-05-17
- Branches in-flight:
  - `chore/iter-795-walk-1-errata` (doc-only, this PR)
  - `phase-15/interaction-resize-drag` (engineer batch, dispatched separately)

## Last test run
- Main last green at `0c78e6b` (iter-794 walk-1 close-out).
- Errata PR: doc-only, no `src/` changes, `pnpm run check` expected to pass.

## Known issues / blockers
- (none)

## Open phase:15 issues — distribution after iter-795 errata

| Severity | Count | Issues |
|----------|-------|--------|
| p1 | 3 | #374 (resize), #375 (drag-coord), #376 (4-way Block — design) |
| p2 | 5 | #368 / #369 / #370 / #371 (discoverability), #372 (palette dynamic growth) |
| p3 | 2 | #373 (usage no `+`), #377 (palette labels) |

## Decisions log

- 2026-05-17 (iter-795): walk-1 self-correction. Three p0 reframed to p2 after corrected Playwright probe. Lesson recorded: use the `containment-tree-element-menu-trigger-${elementId}` testid pattern (per `phase-13-cold-start.spec.ts`) for any row-specific affordance probe.
- 2026-05-17 (iter-795): Engineer batch pivots from missing-viewpoint to interaction (#374/#375). #376 deferred to ADR.

## Next action

After this errata PR merges and CI green, dispatch a Sonnet engineer subagent on `phase-15/interaction-resize-drag` to close #374 + #375 (NodeResizer wrapper + onNodeDrag overlay). Pre-PR review subagent against the diff before opening the PR.
