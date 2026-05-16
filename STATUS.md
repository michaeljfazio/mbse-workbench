# STATUS

## Current phase
phase:14 — Standard library import (RELEASED + smoke-verified)

Phase 14 epic closed at iter-790. All seven children (T-14.01..T-14.07)
merged to main; CI green on `fac60c7`; tag `vphase-14` pushed; release
workflow green; Pages live at
https://michaeljfazio.github.io/mbse-workbench/. Release issue #359
closed by iter-791 with the post-deploy Playwright smoke evidence.

The next phase is **not** scoped in AGENT.md. Phase 14 was the last
defined phase. Post-release work for iter-792+:
1. Decide whether to scope **Phase 15** (SysML core library layered on
   KerML — the deferred half of Phase 14's epic goal) and open the epic,
   OR declare the endeavour **COMPLETE** per AGENT.md halting conditions
   (`v1.0.0` tag exists, all phase epics closed, all `type:feature` /
   `type:bug` issues closed excluding `status:needs-human`).

## Current iteration
- Iteration #: 791
- Started: 2026-05-16
- Branch: `chore/iter-791-vphase-14-smoke`
- Working on: post-deploy Playwright smoke against the live Pages URL —
  deferred from iter-790, closes #359.

## Iter-791 smoke narrative
- **Live Pages URL verified.** HTTP 200 at
  https://michaeljfazio.github.io/mbse-workbench/, last-modified
  Sat, 16 May 2026 12:00:17 GMT — corresponds to the vphase-14 deploy.
- **Smoke script committed.** `scripts/smoke-vphase-14.mjs` — a
  superset of `smoke-vphase-13.mjs` that adds the two Phase-14-specific
  assertions before the carry-over viewpoint walkthrough:
  - Libraries section visible (collapsed) with KerML root row + lock badge.
  - Expanding the KerML root surfaces ≥2 lock-badged rows (actual: 10
    rows = Base + 9 children, 10 lock badges).
- **Smoke result.** 18 steps, zero console errors, 17 PNG screenshots
  saved locally under `artifacts/release-vphase-14/` (gitignored) and
  uploaded to the `vphase-14` GitHub Release as assets — the same
  pattern vphase-13 used. Headless Chromium against the live URL,
  1920×900 viewport.
- **Closure on #359.** Smoke summary comment with the gate evidence
  + release-asset links posted; #359 closed by this PR. Iter-791
  chose option (a) from the iter-790 STATUS deferral (per-phase
  smoke script in `scripts/` + GH Release asset upload) rather than
  option (b) (document as deliberate skip in `docs/CONTEXT.md`).

## Last test run
- Command: `node scripts/smoke-vphase-14.mjs` (against live Pages URL)
- Result: PASS (18 steps, 0 console errors, 17 screenshots)
- Pre-iter-791 CI on `main` (`fac60c7`): PASS (run 25961143276, 630
  passed, 8.6m)
- Bookkeeping CI on `main` (`3925aa2`, PR #360): PASS (run 25961438552)
- Release workflow on `vphase-14` (run 25961363730): PASS (all 3 jobs)
- Pages reachability: HTTP 200

## Known issues / blockers
- (none)

## Decisions log
- 2026-05-16 (iter-791): Post-deploy smoke ships as a **per-phase
  script** (`scripts/smoke-vphase-N.mjs`), not a generalised
  `scripts/deploy-smoke.sh`. Rationale: each release adds new feature
  surfaces that need bespoke assertions (Phase 13 added the
  containment tree + Cmd-K palette; Phase 14 added the Libraries
  section). A single generalised script would either be lowest-common-
  denominator (cold-start + viewpoints only — missing the new
  surface that's the whole point of the release) or grow conditional
  per-phase branching anyway. Per-phase scripts are short (~180
  lines, mostly carry-over from the prior phase) and read as a
  changelog of UI surface.
- 2026-05-16 (iter-791): Smoke screenshots are **uploaded as GitHub
  Release assets**, not committed to the repo. The `.gitignore` rule
  `!artifacts/release-*` is dead code: the parent `artifacts` is
  ignored without a trailing slash, and Git cannot re-include
  contents of an excluded directory — so the un-ignore never
  takes effect. Past vphase-13 release also uploaded to GH Release
  assets (`gh release upload vphase-13 artifacts/release-vphase-13/*.png`)
  and that's the right durable home: the screenshots travel with the
  release artifact + are discoverable from the release page, and the
  repo stays free of binary churn. The `.gitignore` line could be
  removed but is left as-is (load-bearing zero) to avoid an
  unrelated diff in this PR.
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
  *Resolved by iter-791 — chose per-phase script.*
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
1. **Iter-792**: with #359 closed and the smoke pattern committed, the
   immediate AGENT.md halting check is satisfied: all phase epics
   closed, no `type:feature`/`type:bug` issues open, `v1.0.0` tag
   exists with green release + live Pages. Iter-792 either:
   - (a) Declares **COMPLETE** — writes `COMPLETE` as the final line
     of STATUS.md, appends a `complete` JOURNAL entry, exits.
   - (b) Opens a **Phase 15** epic for SysML core library layered on
     KerML (the deferred half of Phase 14's epic goal) and proceeds
     with decomposition.
   The choice is a scope decision — AGENT.md defines phases 0..14
   inclusive, so (a) is the literal-AGENT.md path. (b) extends the
   endeavour beyond the prompt's defined scope.
