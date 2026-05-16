# STATUS

## Current phase
phase:14 — Standard library import (KerML + SysML)

T-14.02 merged at 8b3de56 (iter-782). T-14.03 in flight this iteration.

## Current iteration
- Iteration #: 783
- Started: 2026-05-16
- Branch: `issue/347-explorer-libraries-header`
- Working on: #347 — T-14.03 explorer Libraries section: surfaces
  `project.libraryRootIds` under a dedicated "Libraries" header with a
  lock badge per row. Read-only at the UI surface (no menus, no rename,
  no drag); expand/collapse + selection still work. PR to be opened
  with auto-merge enabled.

## Phase 14 plan-of-record (epic #342)
- [x] **T-14.01 (#343 → PR #344, 2cfc23f)** — Foundation schema hooks
- [x] **T-14.02 (#345 → PR #346, 8b3de56)** — Command-bus seam
- [ ] **T-14.03 (#347)** — Explorer "Libraries" section (this iteration)
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

## Iter-783 implementation notes
- **New component `src/workspace/tree/LibrariesSection.tsx`.** Self-
  contained — does not modify the existing `ContainmentTree`. Reuses
  `buildContainmentTree` once per `libraryRootIds[i]`, flattens, renders
  read-only rows. The component returns `null` when there are no
  resolvable library roots, so the section is fully invisible until
  T-14.04 seeds content.
- **Read-only UI surface.** Rows render with no row context menu, no
  rename input, no drag handle, no delete affordance. The row carries
  `aria-readonly="true"` + `data-readonly="true"` for tests and a11y.
  Mutation prevention is enforced at the command bus (T-14.02); this
  task only adds the visual signal.
- **Lock badge.** Every row inside the Libraries section displays a
  Lucide `Lock` icon as a trailing badge with `aria-label="read-only"`
  and `data-testid="libraries-lock-badge"`. Acceptance criterion's
  "library root + isReadOnly descendant" reading is generalized to
  "every row in the section" because library descendants inherit
  read-only-ness via containment; flagging only explicitly-marked rows
  would be misleading.
- **Wired into `ProjectTreePane`** between the Explorer containment
  tree and the Palette section.
- **Test seeding.** The component reads from the workspace store; tests
  bootstrap a fresh project, then mutate state via
  `useWorkspaceStore.setState({ project: { ...project, libraryRootIds },
  elements: [...existing, ...libElements] })` to install synthetic
  library roots. Avoids depending on T-14.04's library fixtures.

## Last test run
- Command: `pnpm vitest run` + `pnpm exec tsc -b` + `pnpm run lint` +
  `pnpm build` (local)
- Result: PASS
- Unit: 1372/1372 (was 1363; +9 new in LibrariesSection.test.tsx)
- Typecheck: `tsc -b` clean
- Lint: 0 errors, 3 pre-existing react-refresh warnings unchanged
- Build: 891 kB main chunk (+3 kB vs 888 kB baseline — new component +
  Lock icon)
- E2E: deferred to CI

## Known issues / blockers
- (none)

## Decisions log
- 2026-05-16 (iter-783): Lock badge appears on **every** row inside the
  Libraries section, not just on explicitly-flagged `isReadOnly === true`
  rows. Library descendants inherit read-only-ness via the containment
  chain (the command-bus guard walks up looking for a read-only
  Package), so showing the badge only on the root would let users
  misread inner rows as editable.
- 2026-05-16 (iter-783): `LibrariesSection` is a new component rather
  than a `readOnly` mode on `ContainmentTree`. The existing component
  is ~700 lines, dense with drag-drop, context menus, rename, and
  filter — adding a read-only branch would risk regressions in the
  primary tree. A separate component is ~150 lines, easier to evolve.
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
1. Commit + push branch `issue/347-explorer-libraries-header`.
2. Open PR closing #347, enable auto-merge.
3. Wait for CI green; T-14.04 (KerML core fixture + load into
   `libraryRootIds`) opens next iteration once #347 merges.
