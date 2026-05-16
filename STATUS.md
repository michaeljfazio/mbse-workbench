# STATUS

## Current phase
phase:14 — Standard library import (KerML + SysML)

T-14.03 merged at 0f9890d (iter-783). T-14.04 in flight this iteration.

## Current iteration
- Iteration #: 784
- Started: 2026-05-16
- Branch: `issue/349-kerml-core-library`
- Working on: #349 — T-14.04 vendor KerML core library and merge into
  every loaded/bootstrapped project. PR to be opened with auto-merge.

## Phase 14 plan-of-record (epic #342)
- [x] **T-14.01 (#343 → PR #344, 2cfc23f)** — Foundation schema hooks
- [x] **T-14.02 (#345 → PR #346, 8b3de56)** — Command-bus seam
- [x] **T-14.03 (#347 → PR #348, 0f9890d)** — Explorer "Libraries" section
- [ ] **T-14.04 (#349)** — Vendor KerML core + load into libraryRootIds
      (this iteration)
- [ ] **T-14.05** — SysMLv2 text `import` directive: parser accepts
      `import Pkg::*`; serializer emits when project references
      library elements; round-trip preserved
- [ ] **T-14.06** — Namespace resolution for unqualified names
      against imported packages: precedence local → imported → root
- [ ] **T-14.07** — Phase 14 gate spec: cold-start UI walkthrough
      exercises the library tree (read-only) + an `import`-using
      model round-trips

## Iter-784 implementation notes
- **Fixture as TypeScript module.** `src/library/kerml/core.ts` exports
  `kermlCoreElements(): ModelElement[]` (fresh array per call) and
  `KERML_CORE_ELEMENT_IDS` constants. Chose TS over JSON for type
  enforcement against the discriminated union + IDE navigation. See
  ADR 0013 for the full kind-mapping table.
- **Merge helper.** `src/library/index.ts` exports
  `applyStandardLibrary(project) → Project`, idempotent. Reference-
  equal output when no merge is needed. Called by
  `InMemorySessionRepository.load()` AND by `workspace.bootstrap()`'s
  empty-project branch — every project the workspace ever sees has
  the library.
- **`isLibraryElement` helper.** Walks `ownerId` up; true iff the
  chain terminates at a library root. Pure, side-effect-free.
- **Downstream consumer fixes (required by the merge).** This was
  the bulk of the iteration — library elements appearing in
  `state.elements` broke several consumers that count or list user
  content:
  - `nextBlockName` — filter out library PartDefinitions so a fresh
    project's first block is "Block 1", not "Block 6".
  - `ProjectTree` palette grouping — filter library elements so the
    Blocks/Ports/etc. kind groups don't count KerML primitives.
  - `runAutoLayout` — exclude library elements from the candidate
    set so empty-diagram auto-layout is still a no-op.
  - Phase-13 gate invariant (`tests/unit/workspace/
    phase13GateInvariants.test.ts`) — the "exactly one ownerId-null
    root" invariant is now "exactly one *project* root plus N
    *library* roots".
- **Test updates.** `sessionStorage.test.ts` (2 sites) filters
  library elements when asserting on user-visible content. The
  existing T-14.01 round-trip test in `libraryHooks.test.ts` updated
  to expect the merged `[KERML_CORE_LIBRARY_ROOT_ID, 'lib-kerml']`.
  `LibrariesSection.test.tsx` first "empty libraryRootIds" case
  clears `libraryRootIds` after bootstrap. `ContainmentTree.test.tsx`
  one site filters when counting PartDefinitions.
- **New tests.** `tests/unit/library/kermlCore.test.ts` (8 cases) +
  `tests/unit/library/applyStandardLibrary.test.ts` (8 cases) cover
  fixture shape + merge semantics + idempotency.

## Last test run
- Command: `pnpm vitest run` + `pnpm exec tsc -b` + `pnpm run lint` +
  `pnpm build` (local)
- Result: PASS
- Unit: 1389/1389 (was 1372; +17 new across kermlCore + applyStandardLibrary)
- Typecheck: `tsc -b` clean
- Lint: 0 errors, 3 pre-existing react-refresh warnings unchanged
- Build: 895 kB main chunk (+4 kB vs 891 kB baseline — library
  fixture + helpers)
- E2E: deferred to CI

## Known issues / blockers
- (none)

## Decisions log
- 2026-05-16 (iter-784): Containment-root invariant relaxed. ADR 0013.
  Was "exactly one ownerId-null element"; now "exactly one *project*
  root plus N *library* roots". Library roots are sibling ownerId-null
  Packages that appear in `project.libraryRootIds`. Phase-13 gate test
  updated.
- 2026-05-16 (iter-784): KerML library merged at the storage layer
  (`load()`), not just at the workspace layer. Tradeoff: every
  downstream consumer of `state.elements` that filtered for
  user-authored content needs to also filter via `isLibraryElement`.
  Three production sites + one gate test updated. Alternative
  considered: keep library out of `project.elements` and expose via a
  separate slice — rejected because it would force a parallel registry
  + duplicate the command-bus library guard (T-14.02), which currently
  resolves `isReadOnly` via the `ownerId` chain in the existing
  registry.
- 2026-05-16 (iter-784): KerML `Connection` mapped to
  `InterfaceDefinition` (closest defining kind in the v1 metamodel).
  `Performance` mapped to `ActionDefinition` (distinguished from
  Action by name/docs only). `Definition`/`Usage` mapped to abstract
  `PartDefinition` (meta-marker placeholders). ADR 0013 §Kind mapping.
- 2026-05-16 (iter-784): TypeScript module fixture over JSON file —
  type-checked against the discriminated union; IDE jump-to-def
  works; no JSON loader plumbing.
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
- 2026-05-14 (iter-705): `pnpm typecheck` (= `tsc --noEmit` on root
  tsconfig.json with files=[] + references) is a no-op; real errors
  only surface via `tsc -p tsconfig.app.json` or `tsc -b`.

## Next action
1. Commit + push branch `issue/349-kerml-core-library`.
2. Open PR closing #349, enable auto-merge.
3. Wait for CI green; T-14.05 (SysMLv2 text `import` directive) opens
   next iteration once #349 merges.
