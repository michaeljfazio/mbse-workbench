# STATUS

## Current phase
phase:14 — Standard library import (KerML + SysML)

Phase 13 closed at iter-779; tag `vphase-13` placed at 83018f9; release
workflow run 25955411574 SUCCEEDED; post-deploy smoke clean at iter-780
(release-issue PR #341 merged at fbaf4f1, issue #340 closed). Phase 14
kicked off this iteration: epic #342 opened, foundation child #343
opened, branch in flight.

## Current iteration
- Iteration #: 781
- Started: 2026-05-16
- Branch: `issue/343-library-schema-hooks`
- Working on: #343 — T-14.01 foundation: schema hooks
  `PackageElement.isReadOnly?: boolean` and
  `Project.libraryRootIds?: readonly ElementId[]`, plus migration
  tolerance. PR #344 open, auto-merge enabled, CI running.

## Phase 14 plan-of-record (epic #342)
- [ ] **T-14.01 (#343)** — Foundation schema hooks (this iteration)
- [ ] **T-14.02** — Command-bus seam: `LibraryViolationError` +
      pre-apply `isReadOnly` guard on destructive ops + toast on
      rejection (depends on T-14.01)
- [ ] **T-14.03** — Explorer surfaces `libraryRootIds` under
      "Libraries" header with lock badge (depends on T-14.01)
- [ ] **T-14.04** — Vendor minimal KerML core as JSON fixture under
      `src/library/kerml/` (Base, Anything, Item, Part, Port,
      Connection, Action, Performance, Definition, Usage); loaded
      into `libraryRootIds` on repository load
- [ ] **T-14.05** — SysMLv2 text `import` directive: parser accepts
      `import Pkg::*`; serializer emits when project references
      library elements; round-trip preserved
- [ ] **T-14.06** — Namespace resolution for unqualified names
      against imported packages: precedence local → imported → root
- [ ] **T-14.07** — Phase 14 gate spec: cold-start UI walkthrough
      exercises the library tree (read-only) + an `import`-using
      model round-trips

(Child issues opened just-in-time per AGENT.md; T-14.01 was the only
one opened this iteration. T-14.02 opens next iteration once #343
merges.)

## Iter-781 key discovery (recorded in docs/CONTEXT.md)
The Phase 14 carry-forward note in STATUS iter-780 — and the iter-779
JOURNAL entry — both claim `PackageElement.isReadOnly` and
`Project.libraryRootIds` are "already in place per iter-531 /
ADR 0011". They were **not**. ADR 0011 §Consequences reserved the
*names* as a design commitment, but no TypeScript change shipped.
`grep -r 'isReadOnly\|libraryRootIds' src/` returned zero hits before
this iteration. T-14.01 lands the actual schema. AGENT.md's "verify
before recommending from memory" rule caught this.

## Last test run
- Command: `pnpm vitest run` + `npx tsc -b` + `pnpm run lint` +
  `pnpm build` (local)
- Result: PASS
- Unit: 1340/1340 (was 1334; +6 from `tests/unit/repository/libraryHooks.test.ts`)
- Typecheck: `tsc -b` clean
- Lint: 0 errors, 3 pre-existing react-refresh warnings unchanged
- Build: 885 kB main chunk (unchanged from baseline)
- E2E: deferred to CI

## Known issues / blockers
- (none — PR #344 mid-CI with auto-merge enabled)

## Decisions log
- 2026-05-16 (iter-781): Phase 14 first slice (T-14.01) is **schema-
  only** — fields added, migration tolerates, no enforcement, no UI
  surface. Smallest viable PR; unblocks T-14.02 (command-bus
  enforcement) and T-14.03 (explorer surfacing) without entangling
  them. ADR 0012 (library seam design) deferred to T-14.02 when the
  actual seam-decision is being made.
- 2026-05-16 (iter-781): Discovered that the Phase-14 reserved hooks
  (ADR 0011 §Consequences) were never actually added to the schema —
  ADR text reserved the names as design commitment, but no TypeScript
  change landed. Recorded in `docs/CONTEXT.md`. The stale "already in
  place per iter-531" claim lives in append-only JOURNAL.md
  iter-779, so future iterations need the CONTEXT.md note to reconcile.
- 2026-05-16 (iter-780): Post-deploy smoke `scripts/smoke-vphase-13.mjs`
  mirrors the cold-start spec's UI flow rather than seeding
  sessionStorage (the vphase-11 precedent). The Phase-13 schema
  migration (iter-531) made the old seed pattern invalid (now requires
  explicit root Package + diagram contexts); reusing the cold-start
  spec's known-good flow is cheaper than re-deriving a valid seed.
- 2026-05-16 (iter-779): Tag `vphase-13` placed at the last
  functional commit (T-13.44 merge, 83018f9) rather than at the
  release-issue PR. Mirrors the vphase-12 convention.
- 2026-05-14 (iter-705): `pnpm typecheck` (= `tsc --noEmit` on root
  tsconfig.json with files=[] + references) is a no-op; real errors
  only surface via `tsc -p tsconfig.app.json` or `tsc -b`. Recorded
  in docs/CONTEXT.md.
- 2026-05-14 (iter-532): Bundle T-13.16 + T-13.17 in PR #253 per
  AGENT.md. Chat @visual baselines regenerated against a `--mode test`
  preview build; procedure in scripts/regen-chat-baselines.sh and
  docs/CONTEXT.md.

## Next action
1. Wait for PR #344 to auto-merge once CI is green; issue #343 then
   closes via "Closes #343".
2. Open T-14.02 child issue: command-bus seam with
   `LibraryViolationError` + pre-apply guard. Author ADR 0012
   (library seam) alongside.
3. Branch `issue/<num>-library-seam-enforcement` from main; start the
   slice TDD-style (failing test that dispatches a destructive
   command against a read-only Package and expects the error).
