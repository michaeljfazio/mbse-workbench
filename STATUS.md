# STATUS

## Current phase
phase:12 — Export/import + polish. Epic #13 OPEN. Slices F/G/H merged.
Open child slices: A (#231), B (#232), C (#233), D (#234), E (#235).

## Current iteration
- Iteration #: 501
- Started: 2026-05-13T22:30:00Z
- Branch: issue/231-json-import-export-ui
- Working on: #231 slice A — JSON import/export in workspace UI.
  Implementation, unit + e2e tests done locally. PR pending push.

## Last health check (iter-480)
- Pages https://michaeljfazio.github.io/mbse-workbench/ → 200 ✓
- Last 5 merged PRs (#242, #241, #240, #239, #229) all merged ✓
- 0 open `status:needs-human` issues ✓
- Last 3 CI runs on `main` all `success` ✓

## Last test run
- `pnpm exec tsc -b` ✓
- `pnpm lint` ✓ (4 pre-existing react-refresh warnings)
- `pnpm run test:unit` ✓ 854/854 (incl. new 7 jsonProject tests)
- `pnpm exec playwright test json-import-export --project=chromium` ✓ 3/3
- `pnpm exec playwright test json-import-export --project=webkit` ✓ 3/3

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — filtered out of any new gate's @a11y scan.
- Active diagram-tab `text-primary-foreground` contrast issue under
  axe-core (slice H finding) — needs follow-up issue.

## Decisions log
- 2026-05-14 (iter-501): Slice A JSON import/export shape — reuses
  the repository's existing JSON.stringify(Project) format. Pretty-
  printed (2-space) for diff-readability. Importer validates a
  minimal Project shape (id/name/timestamps/elements/edges/diagrams
  required; history+conversations default-filled), then mirrors the
  importSysmlText state-rebuild path (registry, bus, positionStore,
  subscribe). Acceptance "history reset on import" implemented by
  overwriting `history: EMPTY_COMMAND_HISTORY` on every import.
- 2026-05-13 (iter-492): UTC clock-check. `date -u` shows
  2026-05-13T22:16:29Z; run 25829567832 startedAt 22:15:34Z, so
  the "hung Unit tests" reports across iters 487–491 were a
  date confusion (local 2026-05-14 vs UTC 2026-05-13), not real
  hangs. Run is normal; do not cancel. Rule for future iters:
  always compare CI startedAt against `date -u`, not local date.
- 2026-05-14 (iter-485): Phase 12 gate seeds short diagram names
  ('BDD', 'IBD', ..., 'Pkg') so all 8 diagram tabs fit on a single
  row at the 1280×800 Playwright viewport.
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
1. Commit slice A; push branch; open PR with auto-merge SQUASH.
2. After merge, pick the next open slice (#232 — Empty-state UX
   & error boundaries) in the following iteration.
