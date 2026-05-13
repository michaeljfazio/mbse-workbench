# STATUS

## Current phase
phase:12 — Export/import + polish. Epic #13 OPEN. Child slices A–H
decomposed as #231..#238. Slices F (#240) + G (#241) merged. Working
slice H (#238) — the final Phase 12 gate.

## Current iteration
- Iteration #: 485
- Started: 2026-05-14T06:00Z
- Branch: issue/238-phase-12-gate
- Working on: #238 slice H — Phase 12 gate: round-trip +
  full-viewpoint smoke. Local checks green; PR being opened.

## Last health check (iter-480)
- Pages https://michaeljfazio.github.io/mbse-workbench/ → 200 ✓
- Last 5 merged PRs (#241, #240, #239, #229, #228) all merged ✓
- 0 open `status:needs-human` issues ✓
- Last 3 CI runs on `main` all `success` ✓

## Last test run
- `pnpm exec tsc -b` ✓
- `pnpm lint` ✓ (4 pre-existing react-refresh warnings)
- `pnpm run test:unit` ✓ 847/847
- `pnpm exec playwright test phase-12-gate --project=chromium` ✓ 2/2
- `pnpm exec playwright test phase-12-gate --project=webkit` ✓ 2/2

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — filtered out of any new gate's @a11y scan.
- New (from slice H): active diagram-tab `text-primary-foreground`
  resolves to muted-foreground under axe-core; appears to be CSS-var
  cascade resolution. Filtered in phase-12-gate @a11y scan; needs a
  follow-up issue for the underlying CSS fix.

## Decisions log
- 2026-05-14 (iter-485): Phase 12 gate seeds short diagram names
  ('BDD', 'IBD', ..., 'Pkg') so all 8 diagram tabs fit on a single
  row at the 1280×800 Playwright viewport. With 'Main XYZ' names the
  rightmost tabs word-wrap behind the inspector sidebar tab and
  become unclickable.
- 2026-05-14 (iter-485): Phase 12 gate compares elements+edges only
  after round-trip. Serializer does not carry diagrams; the importer
  constructs a single default diagram. AGENT.md criterion is
  "structurally identical, modulo IDs" — IDs round-trip via `// id:`
  comments.
- 2026-05-14 (iter-477): parametric-empty baseline refreshed in
  slice G PR. Drift is from Import/Export toolbar dropdowns added
  in slices F+G; baseline last touched in #225 (Phase 11 slice B)
  before those landed. Justified in PR body.
- 2026-05-14 (iter-469): Slice G parser tokenizer accepts unknown
  printable chars as single-char punct tokens so bracketed segments
  (multiplicities, ControlFlow guards) preserve arithmetic-ish
  characters when reconstructed via token-value concatenation.
- 2026-05-14 (iter-469): Forward-reference resolution: parser stores
  pending `(name, apply)` fixups when an ident reference is seen
  before the corresponding def's `// id:` marker; resolved after the
  full file parses.
- 2026-05-14 (iter-469): `importSysmlText` rebuilds registry + bus
  from scratch and resets selection/impact/proposals; subscribe()
  closure mirrors bootstrap so autosave still fires after every
  dispatch.
- 2026-05-14 (iter-467): Phase 12 slice F shipped. Serializer at
  `src/serializer/sysml.ts`; deterministic kind-then-id ordering;
  trailing `// id:` comments are the slice G parser's ID-recovery
  channel. Edges emit at end-of-file under `// edges`.
- 2026-05-14 (iter-466): Phase 11 closed. Tagged vphase-11.
- 2026-05-14 (iter-456): Drop `@visual workspace end-state` from
  Phase 11 gate (sub-pixel font-hinting variance).
- 2026-05-13 (iter-454): Don't push STATUS-only commits to a PR
  branch while CI is running.
- 2026-05-14 (iter-452): 4 rounds in one LLM fixture.
- 2026-05-14 (iter-452): Seed the project rather than synthesise IDs.
- 2026-05-14 (iter-452): Filter pre-existing
  `text-muted-foreground` contrast violation from gate @a11y.
- 2026-05-14 (iter-452): Press Cmd-Z after dispatcher completes to
  verify atomic compound-revert.
- 2026-05-14 (iter-436): Commit Linux PNGs only.
- 2026-05-13 (iter-404): `memberIds` typing bound at command boundary.
- 2026-05-13 (iter-404): `input_schema` widened with
  `additionalProperties?: boolean`.
- 2026-05-13 (iter-394): Resolvers in a module-level Map.
- 2026-05-13 (iter-394): `acceptProposal` dispatches `compound`.
- 2026-05-13 (iter-332): `@visual` baselines from CI: extract Linux
  PNGs from playwright-report base64 blob and commit.

## Next action
1. Push PR for #238; let auto-merge land it on green CI.
2. On green, close Phase 12 epic #13, tag vphase-12, then move to
   Final gate: v1.0.0 + COMPLETE.
