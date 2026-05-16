# STATUS

## Current phase
phase:14 — Standard library import (KerML + SysML)

T-14.01 merged at 2cfc23f (iter-781). T-14.02 in flight this iteration.

## Current iteration
- Iteration #: 782
- Started: 2026-05-16
- Branch: `issue/345-library-seam-enforcement`
- Working on: #345 — T-14.02 command-bus seam: `LibraryViolationError`
  + `isReadOnly` pre-apply guard + `onError` callback + workspace
  `commandError` banner. PR to be opened with auto-merge enabled.

## Phase 14 plan-of-record (epic #342)
- [x] **T-14.01 (#343 → PR #344, 2cfc23f)** — Foundation schema hooks
- [ ] **T-14.02 (#345)** — Command-bus seam (this iteration)
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

## Iter-782 implementation notes
- **Guard placement.** Single `checkLibraryGuard(command)` in
  `src/commands/bus.ts` runs after `checkPermissions` and before
  `applyAndInvert`. Recurses into compounds atomically so a single
  violating subcommand rejects the whole compound and no subcommand
  applies (verified by test).
- **Destructive-kind enumeration.** `DESTRUCTIVE_COMMAND_KINDS` and
  `EXEMPT_COMMAND_KINDS` exported from `src/commands/bus.ts`.
  `destructiveCoverage.test.ts` asserts the union covers every
  `CommandKind`. Adding a new mutating command without classifying it
  is a CI failure.
- **UI surface.** No toast primitive exists in the codebase (verified
  by grep). Reused the `ImportErrorBanner` pattern via a parallel
  `CommandErrorBanner` reading a new `commandError: { message } | null`
  field on the store. ADR 0012 explains the choice not to introduce a
  new UI primitive.
- **Error routing.** Rather than wrap each of the 60+ `bus.dispatch`
  call sites in try/catch, the bus accepts an `onError?: (err, cmd) =>
  void` callback. Workspace bootstrap wires it to set
  `commandError`. The error is still re-thrown to the original caller.
- **End-to-end test.** A test in `CommandErrorBanner.test.tsx`
  bootstraps the real workspace, seeds a read-only Package via the
  registry, dispatches an `update-element` against a child, and asserts
  both the banner DOM and the store state. This verifies the wire-up
  end-to-end (registry → bus → guard → onError → store → banner).

## Last test run
- Command: `pnpm vitest run` + `pnpm exec tsc -b` + `pnpm run lint` +
  `pnpm build` (local)
- Result: PASS
- Unit: 1363/1363 (was 1340; +23 new across libraryGuard.test.ts,
  destructiveCoverage.test.ts, CommandErrorBanner.test.tsx)
- Typecheck: `tsc -b` clean
- Lint: 0 errors, 3 pre-existing react-refresh warnings unchanged
- Build: 888 kB main chunk (+3 kB vs 885 kB baseline — new banner +
  guard)
- E2E: deferred to CI

## Verified-without-guard cross-check
Confirmed the new tests genuinely exercise the guard: commented out
the `checkLibraryGuard(command)` call in `bus.ts` and re-ran
`libraryGuard.test.ts` — 14 of 18 tests failed (the 4 passing without
the guard are the negative cases that assert non-readonly targets
succeed and the exempt update-diagram-position case). Restored the
guard before commit.

## Known issues / blockers
- (none)

## Decisions log
- 2026-05-16 (iter-782): Library guard in the command bus, not
  per-command. ADR 0012. Pre-apply (not post-apply rollback). Bus
  exports `DESTRUCTIVE_COMMAND_KINDS` + `EXEMPT_COMMAND_KINDS`;
  partition is enforced by test.
- 2026-05-16 (iter-782): No toast primitive exists; chose to mirror
  the `ImportErrorBanner` pattern rather than introduce a new UI
  primitive. The issue's "wired through the existing toast store" line
  is best interpreted as "use the existing notification idiom" — the
  banner shape IS that idiom in this repo.
- 2026-05-16 (iter-782): Bus accepts `onError(err, cmd)` callback as
  the single seam to surface rejections to the workspace, rather than
  wrapping 60+ existing `bus.dispatch` sites. Error is still re-thrown
  for any local handling.
- 2026-05-16 (iter-781): Phase 14 first slice (T-14.01) is **schema-
  only** — fields added, migration tolerates, no enforcement, no UI
  surface. Unblocks T-14.02 (this iteration) and T-14.03 (explorer
  surfacing) without entangling them.
- 2026-05-16 (iter-781): Discovered that the Phase-14 reserved hooks
  (ADR 0011 §Consequences) were never actually added to the schema —
  ADR text reserved the names as design commitment, but no TypeScript
  change landed. Recorded in `docs/CONTEXT.md`.
- 2026-05-16 (iter-780): Post-deploy smoke `scripts/smoke-vphase-13.mjs`
  mirrors the cold-start spec's UI flow rather than seeding
  sessionStorage (the vphase-11 precedent).
- 2026-05-16 (iter-779): Tag `vphase-13` placed at the last
  functional commit (T-13.44 merge, 83018f9) rather than at the
  release-issue PR. Mirrors the vphase-12 convention.
- 2026-05-14 (iter-705): `pnpm typecheck` (= `tsc --noEmit` on root
  tsconfig.json with files=[] + references) is a no-op; real errors
  only surface via `tsc -p tsconfig.app.json` or `tsc -b`.

## Next action
1. Commit + push branch `issue/345-library-seam-enforcement`.
2. Open PR #346 (or next) closing #345, enable auto-merge.
3. Wait for CI green; T-14.03 (explorer "Libraries" header + lock
   badge) opens next iteration once #345 merges.
