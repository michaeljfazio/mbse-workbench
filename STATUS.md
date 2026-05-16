# STATUS

## Current phase
phase:14 — Standard library import (RELEASED)

Phase 14 epic closed at iter-790. All seven children (T-14.01..T-14.07)
merged to main; CI green on `fac60c7`; tag `vphase-14` pushed; release
workflow green (build + deploy + github-release all success); Pages live
at https://michaeljfazio.github.io/mbse-workbench/. Release issue #359
tracks the deploy + post-release smoke.

The next phase is **not** scoped in AGENT.md. Phase 14 was the last
defined phase. Post-release work for iter-791+:
1. Post-deploy Playwright smoke against the live Pages URL across every
   viewpoint + the new Libraries section; save under
   `artifacts/release-vphase-14/`; comment on #359.
2. If no further phases are scoped, write `COMPLETE` to STATUS.md and
   append a `complete` JOURNAL entry per AGENT.md halting conditions.
3. If a Phase 15 is scoped (SysML core library was deferred from Phase
   14's epic goal), open the epic and decompose.

## Current iteration
- Iteration #: 790
- Started: 2026-05-16
- Branch: `chore/iter-790-phase-14-release`
- Working on: Phase 14 release shipped — epic #342 closed, release issue
  #359 opened, tag `vphase-14` pushed and deployed. Bookkeeping PR
  (this commit: STATUS.md iter-790 narrative + JOURNAL.md release entry).

## Iter-790 release narrative (Phase 14)
- **Pre-release verification.** All seven Phase 14 children merged to
  main. CI on `fac60c7` (run 25961143276) green: 630 passed, 8.6m.
  The latest commit (#358) was the stale-chromium-baseline rebaseline
  for `state-machine-with-pseudostates` — a layout shift introduced by
  T-14.03 + T-14.04's LibrariesSection that surfaced intermittently
  (0.02 vs 0.01 maxDiffPixelRatio threshold) on the T-14.05 and T-14.06
  post-merge main runs but not on the PR runs that auto-merged them.
- **Tag.** `vphase-14` pushed on `fac60c7` with annotated message
  citing closing #342 + tracking #359.
- **Epic close.** #342 closed with summary comment linking to the
  release issue and CI artifact.
- **Release workflow.** Run 25961363730 — all three jobs success
  (build, deploy, github-release). Release URL:
  https://github.com/michaeljfazio/mbse-workbench/releases/tag/vphase-14.
  Pages URL HTTP 200: https://michaeljfazio.github.io/mbse-workbench/.
- **Journal entry.** Appended to `JOURNAL.md` with the Phase 14
  narrative: ten iterations (iter-781..790), library-as-projected-slice
  decision (iter-785), visual-baseline cascade lesson (iter-786 + #358),
  KerML-only scope deferral of SysML core.
- **Deferred to iter-791.** Post-deploy Playwright smoke against the
  live Pages URL. Past phase releases (e.g. vphase-13) did not have a
  smoke artifact committed either; this is a recurring outstanding
  item across phase releases. Iter-791 should either land the smoke
  pattern as a reusable script or document why it's been skipped.

## Phase 14 plan-of-record (epic #342, CLOSED iter-790)
- [x] **T-14.01 (#343 → PR #344, 2cfc23f)** — Foundation schema hooks
- [x] **T-14.02 (#345 → PR #346, 8b3de56)** — Command-bus seam
- [x] **T-14.03 (#347 → PR #348, 0f9890d)** — Explorer "Libraries" section
- [x] **T-14.04 (#349 → PR #350, be2a4e8)** — Vendor KerML core +
      merge into every project
- [x] **T-14.05 (#351 → PR #352, 08e2285)** — SysMLv2 text `import Pkg::*;`
      directive: parser + serializer + standard-library round-trip
- [x] **T-14.06 (#353 → PR #354, 53e3477)** — `LibraryIndex` generalizes
      namespace resolution to user-defined library roots and nested
      Package qualnames
- [x] **T-14.07 (#355 → PR #356, 2efda0b)** — Phase 14 gate spec:
      cold-start UI walkthrough + import-directive round-trip
- [x] **Post-merge cleanup (#357 → PR #358, fac60c7)** — Stale chromium
      visual baseline rebaselined to fix intermittent main reds

## Last test run
- Command: CI on `fac60c7` (run 25961143276)
- Result: PASS (630 passed, 8.6m)
- Release workflow on `vphase-14` (run 25961363730): PASS (all 3 jobs)
- Pages reachability: HTTP 200 at
  https://michaeljfazio.github.io/mbse-workbench/

## Known issues / blockers
- (none)

## Decisions log
- 2026-05-16 (iter-790): Phase 14 ships **KerML core only**. The epic
  goal mentioned "KerML + SysML core" but the plan-of-record locked at
  iter-781 explicitly only included KerML core via T-14.04's "minimal
  KerML core" vendoring. SysML core (deeper standard-library content
  layered on KerML) is a candidate **Phase 15** if scoped — the
  infrastructure (LibraryIndex, projected-slice persistence model,
  command-bus guard, explorer surfacing) is now general-purpose and
  ready to accept additional library roots without further plumbing.
- 2026-05-16 (iter-790): Post-deploy Playwright smoke against the live
  Pages URL is **deferred to iter-791**. Past phase releases (Phase 13
  / vphase-13) shipped without the smoke artifact committed; this is a
  recurring outstanding item that's worth either solving once with a
  reusable script (`scripts/deploy-smoke.sh` invoking Playwright
  against `https://michaeljfazio.github.io/mbse-workbench/`) or
  documenting as a deliberate skip in `docs/CONTEXT.md`.
- 2026-05-16 (iter-789): Phase 14 gate is an **e2e-only** spec, not a
  unit + e2e pair. Rationale: the gate's purpose is to lock down the
  user-facing UI behaviour (libraries section read-only + import
  directive round-trip via toolbar). The underlying namespace
  resolution, strip-survival, and parser/serializer round-trip
  semantics already have unit coverage in `tests/unit/library/`
  (libraryIndex, sysmlImportRoundTrip, userLibraryRoundTrip,
  applyStandardLibrary). Adding parallel unit tests at the gate
  level would duplicate without adding coverage; the gate's value is
  the UI-layer assertion that those primitives compose end-to-end.
- 2026-05-16 (iter-789): Library lock-badge assertion in the gate
  counts visible badges and requires ≥2 after expanding the KerML
  root, not an exact count. Rationale: the canonical library may grow
  (Phase 14 future + SysML core in later phases) and pinning the
  exact descendant count would make the gate brittle.
- 2026-05-16 (iter-789): Test 2's round-trip assertion is on
  `definitionId` value, not on `libraryRootIds`. Rationale:
  sessionStorage carries user content only (iter-785) — standard-
  library roots are stripped on save and re-merged on load — so the
  persisted shape never includes `kerml.core.Base` in
  `libraryRootIds`. The load-time hydration is verified by the
  visible Libraries section (Test 1 + the post-reload assertion in
  Test 2); the parser+serializer cross-reference is verified by
  `definitionId` surviving export → import.
- 2026-05-16 (iter-788): `LibraryIndex` is a **runtime interface built
  per call**, not a singleton + plus-overlay. Considered keeping the
  standard-library singleton and merging a per-project overlay at lookup
  time; rejected because the merge semantics for `resolveImport` (which
  layer wins on name collision?) get awkward and the workspace already
  has a clean point to rebuild (`importSysmlText`,
  `serializeProject`).
- 2026-05-16 (iter-788): `buildLibraryIndexForProject` **always** folds
  in canonical KerML, even when `project.libraryRootIds` already lists
  it. Rationale: at the serializer entry, the caller has typically
  passed `stripStandardLibrary(project)` so `project.elements` no
  longer contains the KerML subtree — but `refName(KERML_CORE_ID, ...)`
  must still render `Part`, not `<missing>`. Re-merging library elements
  inside the index builder makes this transparent to callers.
- 2026-05-16 (iter-788): Library roots **self-register** in their own
  `resolveImport` bucket. Preserved from T-14.05 to keep `: Foo`
  references round-trip-safe.
- 2026-05-16 (iter-788): Top-level rendering filters
  `libraryIndex.isLibraryElement(e.id)` — user-defined libraries are
  declared by `import` in exported text, not embedded as `package Foo {…}`
  blocks.
- 2026-05-16 (iter-787): T-14.05 ships the **minimum namespace-seeding
  needed for standard-library round-trip**, not full T-14.06 resolution.
  Two static tables in `@/library` (id→name, qn→(name→id)) suffice for
  the canonical library. T-14.06 will generalize for user-defined
  imported packages.
- 2026-05-16 (iter-787): Parser disambiguates `import` directive from
  PackageImport edge by **3-token lookahead** (`import ident ::` →
  directive; `import ident ->` → edge).
- 2026-05-16 (iter-786): Rebaseline by lifting CI artifact actuals, not
  by running `scripts/regen-baselines.sh` locally. The CI-uploaded
  `playwright-test-results` artifact contains the exact `-actual.png`
  bytes the next CI run will compare against.
- 2026-05-16 (iter-785): Library treated as a *projected* slice. The
  in-memory project carries library content (applied on `load()` and on
  parse paths), but sessionStorage + every exported file (JSON, SysMLv2
  text) is "user content only". `stripStandardLibrary` is the inverse
  of `applyStandardLibrary` and runs at all three persistence-boundary
  sites: `repository.save`, `serializeProjectJson`,
  `downloadProjectSysml`.
- 2026-05-16 (iter-785): `LibrariesSection` default-collapsed. UX-wise,
  library content is reference material — discoverable on click rather
  than always-visible.
- 2026-05-16 (iter-784): Containment-root invariant relaxed. ADR 0013.
  Was "exactly one ownerId-null element"; now "exactly one *project*
  root plus N *library* roots".
- 2026-05-16 (iter-784): KerML library merged at the storage layer
  (`load()`), not just at the workspace layer.
- 2026-05-16 (iter-784): KerML `Connection` mapped to
  `InterfaceDefinition` (closest defining kind in the v1 metamodel).
  `Performance` mapped to `ActionDefinition`. `Definition`/`Usage`
  mapped to abstract `PartDefinition` (meta-marker placeholders).
- 2026-05-16 (iter-784): TypeScript module fixture over JSON file —
  type-checked against the discriminated union; IDE jump-to-def
  works; no JSON loader plumbing.
- 2026-05-16 (iter-783): Lock badge appears on **every** row inside the
  Libraries section, not just on explicitly-flagged `isReadOnly === true`
  rows.
- 2026-05-16 (iter-783): `LibrariesSection` is a new component rather
  than a `readOnly` mode on `ContainmentTree`.
- 2026-05-16 (iter-782): Library guard in the command bus, not
  per-command. ADR 0012. Pre-apply (not post-apply rollback).
- 2026-05-16 (iter-782): No toast primitive exists; chose to mirror
  the `ImportErrorBanner` pattern rather than introduce a new UI
  primitive.
- 2026-05-16 (iter-782): Bus accepts `onError(err, cmd)` callback as
  the single seam to surface rejections to the workspace.
- 2026-05-16 (iter-781): Phase 14 first slice (T-14.01) is **schema-
  only** — fields added, migration tolerates, no enforcement, no UI
  surface.
- 2026-05-14 (iter-705): `pnpm typecheck` (= `tsc --noEmit` on root
  tsconfig.json with files=[] + references) is a no-op; real errors
  only surface via `tsc -p tsconfig.app.json` or `tsc -b`.

## Next action
1. **Iter-791** lands the post-deploy Playwright smoke against the live
   Pages URL (`https://michaeljfazio.github.io/mbse-workbench/`).
   Decide between:
   - (a) Writing a reusable `scripts/deploy-smoke.sh` that runs
     Playwright against the live URL with screenshots saved under
     `artifacts/release-vphase-<N>/`, OR
   - (b) Documenting the smoke as a deliberate skip in
     `docs/CONTEXT.md` (the live Pages URL is built from the same
     CI-tested commit, so the deploy itself is the smoke).
2. **Iter-792+**: decide whether to scope Phase 15 (SysML core library
   layered on KerML) or declare the endeavour COMPLETE per AGENT.md
   halting conditions (`v1.0.0` already exists, all phase epics
   closed, all `type:feature` / `type:bug` issues closed excluding
   `status:needs-human`).
