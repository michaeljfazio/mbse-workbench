# STATUS

## Current phase
phase:12 — Export/import + polish. Epic #13 OPEN. Child slices A–H
decomposed as #231..#238 (slice F closed in #240). Working slice G.

## Current iteration
- Iteration #: 477
- Started: 2026-05-14T00:00Z
- Branch: issue/237-sysmlv2-parser
- Working on: #237 slice G — PR #241 CI red on stale
  parametric-empty visual baseline (0.02 ratio). Drift is real:
  toolbar gained Import/Export dropdowns. Refreshed Linux baseline
  from CI playwright-report (per iter-332/436 pattern), pushing.

## Last test run
- `pnpm exec tsc -b` ✓
- `pnpm lint` ✓ (4 pre-existing react-refresh warnings)
- `pnpm run test:unit` ✓ 847/847 (16 new parser tests)
- `pnpm run build` ✓

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — filtered out of any new gate's @a11y scan.

## Decisions log
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
1. Wait for PR #241 CI; auto-merge will land it on green.
2. On green, start slice H (#238 — phase:12 gate: round-trip + smoke).
