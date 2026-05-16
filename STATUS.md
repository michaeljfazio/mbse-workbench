# STATUS

## Current phase
phase:14 — Standard library import (KerML + SysML)

T-14.04 merged at be2a4e8 (PR #350). T-14.05 PR #352 open this iteration,
auto-merge enabled, awaiting CI.

## Current iteration
- Iteration #: 787
- Started: 2026-05-16
- Branch: `issue/351-sysml-import-directive`
- Working on: #351 — T-14.05 SysMLv2 text `import Pkg::*;` directive
  landed (parser + serializer + round-trip preservation for projects
  that reference standard-library content). PR #352 opened with
  1408/1408 unit tests, tsc clean, lint clean, build clean. Awaiting
  CI to confirm e2e + visual baselines unaffected.

## Phase 14 plan-of-record (epic #342)
- [x] **T-14.01 (#343 → PR #344, 2cfc23f)** — Foundation schema hooks
- [x] **T-14.02 (#345 → PR #346, 8b3de56)** — Command-bus seam
- [x] **T-14.03 (#347 → PR #348, 0f9890d)** — Explorer "Libraries" section
- [x] **T-14.04 (#349 → PR #350, be2a4e8)** — Vendor KerML core +
      merge into every project
- [~] **T-14.05 (#351 → PR #352)** — SysMLv2 text `import Pkg::*;`
      directive: parser accepts; serializer emits when project
      references library elements; round-trip preserved (in flight)
- [ ] **T-14.06** — Namespace resolution for unqualified names
      against user-defined imported packages (T-14.05 already seeds
      *standard-library* names via two static tables in `@/library`;
      T-14.06 generalizes to user libraries + nested qualnames)
- [ ] **T-14.07** — Phase 14 gate spec: cold-start UI walkthrough
      exercises the library tree (read-only) + an `import`-using
      model round-trips

## Iter-787 implementation notes (T-14.05 PR #352)
- **Scope.** Parser + serializer + round-trip preservation for projects
  that reference standard-library content. Namespace resolution for
  arbitrary user-defined imports is T-14.06; this iteration ships the
  minimum needed for KerML-referencing projects to survive
  `serialize → parse` cleanly.
- **Tokenizer.** `::` emitted as a single 2-char punct (before single-`:`
  check, so `::` wins). `*` added to `PUNCT_CHARS` explicitly (already
  was a single-char punct via the catch-all — same behavior, now
  declared). No multiplicity (`[0..*]`) regression because the
  multiplicity parser concatenates token values inside `[...]` without
  caring about punct vs ident.
- **Parser.** `parseFile` top-level loop checks `isImportDirective()` —
  `import ident ::` lookahead — before falling through to edge keyword
  handling. Disambiguates from the PackageImport edge form
  (`import a -> b;`). Parsed import qualnames surface as
  `ParsedProject.imports: readonly string[]` (source order, undefined
  when none). On each parsed directive, `seedLibraryNames(qn)` populates
  `nameToId` from `STANDARD_LIBRARY_NAMES_BY_QUALNAME` so the body's
  unqualified `: Part` resolves to `kerml.core.Base.Part`. Library
  bindings never overwrite user names (precedence: user > library).
- **Serializer.** `serializeProject` calls `findLibraryReferences(project)`
  between header and first element; emits one `import <qn>::*;` line per
  detected qualname. `refName(id, byId)` falls back to
  `STANDARD_LIBRARY_ID_TO_NAME` so stripped library refs print as
  `Part` instead of `<missing>` (necessary because `downloadProjectSysml`
  / `serializeProjectJson` / `repository.save` strip the library at
  the persistence boundary per ADR 0013).
- **Library reference detection.** `findLibraryReferences(project)`
  walks every id-valued field on non-library elements + edges
  (`definitionId`, `interfaceId`, edge `sourceId/targetId`) and returns
  the sorted unique qualified names of library packages referenced.
  `ownerId` is excluded — library elements only own library elements.
- **Two new static tables in `@/library`.** `STANDARD_LIBRARY_ID_TO_NAME`
  (id → short name; used by serializer fallback) and
  `STANDARD_LIBRARY_NAMES_BY_QUALNAME` (qn → short name → id; used by
  parser seeding). Pure functions of the library fixture; no per-project
  plumbing. T-14.06 will generalize for user libraries + nested qualnames.
- **Tests.** +8 findLibraryReferences, +6 parser import directive,
  +3 serializer, +2 end-to-end round-trip = +19. 1408/1408 unit pass.
  Typecheck clean, lint clean (3 pre-existing react-refresh warnings
  unchanged), build clean (897 kB main, +~3 kB for static tables).
- **Verification (local).** `pnpm vitest run`, `pnpm exec tsc -b`,
  `pnpm run lint`, `pnpm build` all green on macOS. E2E + visual
  deferred to CI (no UI touches in this PR; expected to pass cleanly).

## Iter-786 implementation notes (visual baseline refresh on PR #350)
- **Diagnosis.** CI run 25958746408 (commit `bb7a274`) summary: 55 failed,
  1 flaky, 570 passed. All 55 failures = `@visual` screenshot comparisons
  at ~0.02 pixel-ratio (just above 0.01 threshold). The flake is
  `[webkit] command-palette T-13.05d` which passed on retry — unrelated to
  T-14.04. So there are **zero true functional regressions** on PR #350;
  the only remaining work is rebaselining the visuals to match the
  deliberate UI change.
- **Approach.** Lifted the 55 `*-actual.png` files from CI's
  `playwright-test-results` artifact (artifact id 7032464755). The artifact
  is produced by amd64 Ubuntu 24.04 runners — the same renderer that
  evaluates the baselines on the next CI run — so byte-for-byte deterministic.
  No podman/regen-baselines.sh round-trip needed.
- **Script.** `/tmp/lift-actuals2.sh` (ephemeral). Walks every
  `test-results/<dir>/<name>-actual.png`, parses browser from the dir
  suffix (`-chromium-visual` | `-webkit-visual`), maps `<dir>` back to a
  `*.spec.ts` filename by longest-prefix match (with a fallback that
  strips Playwright's `-[a-f0-9]{4,6}-` truncation hash for cases like
  `requirements-create-and-ed-fd001-...` whose full spec name is
  `requirements-create-and-edit.spec.ts`), then `cp` to
  `tests/e2e/__screenshots__/<spec>.spec.ts/<name>-<browser>.png`.
  Result: copied 55, skipped 0.
- **Verification.** Spot-checked
  `tests/e2e/__screenshots__/project-tree.spec.ts/project-tree-populated-chromium.png`
  — shows the "LIBRARIES" section default-collapsed with `Base` (KerML
  core root) and a lock-icon badge below the project content and above the
  palette. Matches the expected UI from T-14.03 + iter-785's
  default-collapse change. No unexpected layout shifts in the rest of
  the frame.

## Iter-785 implementation notes (CI fix on PR #350)
- **Symptom.** CI run 25958133933 was red: 33 distinct functional
  failures + 54 visual-baseline diffs across both chromium and webkit
  projects. Auto-merge held the PR open.
- **Functional root cause.** `state.elements` now includes library
  content after T-14.04. Consumers that count or assert "user content
  only" tripped:
  - `CanvasPane.elementCount` (line 1186) counted *all* non-null-ownerId
    elements → export menu always enabled, empty-state CTA never shown.
    Fix: count from `canvasElements` (the already-library-filtered slice).
  - `repository.save` / `serializeProjectJson` / `downloadProjectSysml`
    serialized library content into sessionStorage and exported files.
    Round-trip e2es and final/phase gates failed on element counts.
    Fix: new `stripStandardLibrary(project)` (inverse of
    `applyStandardLibrary`, scoped to `KERML_CORE_LIBRARY_ROOT_ID` only
    so user-defined libraryRootIds and their subtrees are preserved)
    applied at all three persistence-boundary sites.
  - `importSysmlText` built its project from parsed elements only (no
    library). After import, in-memory state lacked KerML, breaking
    components that filter by `libraryRootIds`. Fix: wrap the project
    constructor in `applyStandardLibrary(...)` so import mirrors load.
- **Visual root cause.** `LibrariesSection` default-expanded every
  library root; KerML's 8 visible descendants reshaped the tree pane
  across all baselines that captured it. Fix: default-collapse library
  roots (state flipped from `collapsed` set to `expanded` set, both
  initialized empty). Section header (lock icon + "Libraries" label)
  stays visible, so library presence is still surfaced; descendants are
  reveal-on-click. Three LibrariesSection unit tests adjusted to drive
  expansion explicitly.
- **Verification (local).** 1389/1389 unit; tsc clean; lint clean.
  Functional e2es that were red all green on chromium: empty-state-
  error-boundary, bdd-export, json-import-export, toolbar-disabled-
  reasons, phase-{4..9,12}-gate, final-gate. Visual e2es skipped
  locally (macOS, per `SKIP_VISUAL_LOCALLY` config); CI on Linux will
  determine whether the default-collapse change brings the baselines
  back within the 0.01 maxDiffPixelRatio threshold. If some baselines
  still exceed, next iteration will dispatch a snapshot-update workflow.

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
  `pnpm build` (local, iter-787)
- Result: PASS
- Unit: 1408/1408 (was 1389; +19 new across findLibraryReferences +
  parser import directive + serializer + round-trip)
- Typecheck: `tsc -b` clean
- Lint: 0 errors, 3 pre-existing react-refresh warnings unchanged
- Build: 897 kB main chunk (+~3 kB vs 895 kB — two static library tables)
- E2E: deferred to CI

## Known issues / blockers
- (none)

## Decisions log
- 2026-05-16 (iter-787): T-14.05 ships the **minimum namespace-seeding
  needed for standard-library round-trip**, not full T-14.06 resolution.
  Two static tables in `@/library` (id→name, qn→(name→id)) suffice for
  the canonical library because every standard-library element id is
  known at compile time. T-14.06 will generalize for user-defined
  imported packages (which require runtime traversal of project
  elements under each listed `libraryRootId`). Rationale: lands a
  useful, round-trip-safe slice now; defers the per-project plumbing
  cost until there's a second consumer that justifies it.
- 2026-05-16 (iter-787): Parser disambiguates `import` directive from
  PackageImport edge by **3-token lookahead** (`import ident ::` →
  directive; `import ident ->` → edge). Cleaner than registering
  `import` differently in `isEdgeKeyword`, and keeps the existing
  edge form parsing untouched. The directive-vs-edge ambiguity exists
  *only* on the `import` keyword; all other edge keywords have no
  directive form.
- 2026-05-16 (iter-786): Rebaseline by lifting CI artifact actuals, not
  by running `scripts/regen-baselines.sh` locally. Rationale: the
  CI-uploaded `playwright-test-results` artifact contains the exact
  `-actual.png` bytes the next CI run will compare against (same amd64
  Ubuntu renderer). The podman container regen exists for cases where
  CI hasn't yet produced actuals (new specs, or actuals not captured) —
  it adds an arm64 round-trip risk per CONTEXT.md and is slower. Use it
  when needed, but prefer artifact-lift when the failed run is already
  in hand.
- 2026-05-16 (iter-785): Library treated as a *projected* slice. The
  in-memory project carries library content (applied on `load()` and on
  parse paths), but sessionStorage + every exported file (JSON, SysMLv2
  text) is "user content only". `stripStandardLibrary` is the inverse
  of `applyStandardLibrary` and runs at all three persistence-boundary
  sites: `repository.save`, `serializeProjectJson`,
  `downloadProjectSysml`. Library is scoped to `KERML_CORE_LIBRARY_ROOT_ID`
  only — user-defined library roots in `libraryRootIds` (T-14.01
  schema) persist normally. Tradeoff: a single canonical-library
  constant per standard library; SysML core (Phase 14 next steps) adds
  its root id to the same set.
- 2026-05-16 (iter-785): `LibrariesSection` default-collapsed. Was
  default-expanded (iter-783); reverted because KerML core's 8 visible
  descendants reshape every visual baseline that captures the tree pane.
  UX-wise, library content is reference material — discoverable on
  click rather than always-visible.
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
1. Wait for CI on PR #352 (T-14.05). Auto-merge enabled — green CI
   triggers squash merge.
2. If green, T-14.06 (namespace resolution for user-defined imports)
   opens next iteration. Scope hooks: generalize the `seedLibraryNames`
   parser path to also walk `project.libraryRootIds` and seed names
   from every library subtree; teach `findLibraryReferences` to bucket
   refs by user-defined library root (not just the standard set).
3. If red, diagnose: most likely surface is an existing snapshot
   test that captured the old `<missing>` rendering — but I grep'd
   the snapshot files and saw none, so this is unlikely.
