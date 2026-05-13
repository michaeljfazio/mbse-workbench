# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D/E merged on main
(PR #228 squashed at fe4e90e). Slice F (#222) is the **Phase 11 gate** —
this iteration scaffolds the gate spec + recorded fixture.

## Current iteration
- Iteration #: 453
- Started: 2026-05-14T (resume)
- Branch: issue/222-phase-11-gate-e2e-recorded-fixture
- Working on: #222 slice F — PR #229 open, auto-merge --squash armed,
  CI run 25822206490 in_progress (single `check` job). Awaiting result.
  Expected baseline miss on `phase-11-final-chat.png` (Linux PNG
  extraction recipe ready per iter-332 / iter-436).

## Last test run
- Local: typecheck ✓, lint ✓ (4 pre-existing fast-refresh warnings,
  zero errors), unit 815/815 ✓, build ✓.
- Visual baseline `phase-11-final-chat.png` not yet generated; will
  miss on first CI run and require Linux PNG extraction per
  docs/CONTEXT.md (iter-332 / iter-436 recipe).

## How the spec is wired
- `tests/fixtures/llm/phase-11-gate-full-flow.json` — multi-round
  fixture with placeholder tokens `__REQ_ID__` / `__TARGET_ID__` in
  the `link_requirement` partial_json. The spec substitutes them at
  load-time with the seeded element IDs.
- `tests/e2e/phase-11-gate.spec.ts` — pre-seeds a project with
  PartDefinition "Vessel" (id `el-vessel`) and Requirement "Mission"
  (id `el-mission`), opens chat, arms `createMultiRoundFixtureProvider`
  through the existing `window.__llm` seam, and drives the round-trip
  loop via `chat-send`.
- Added `data-testid="chat-pane"` to `ChatPane` for the @visual scope.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — filtered out of the gate's @a11y scan with a
  narrow exclusion (only `color-contrast` rules touching that class).

## Decisions log
- 2026-05-14 (iter-452, slice F): Place 4 rounds in one fixture
  (explain_diagram, create_element, link_requirement, end_turn).
  Reason: matches the issue body's required flow and exercises both
  read-only and mutating-with-accept dispatcher paths in one recording.
- 2026-05-14 (iter-452): Seed the project rather than synthesise IDs
  in the fixture. Reason: `create_element` generates IDs server-side
  and the assistant cannot reference them in subsequent calls; the
  link_requirement target/source must therefore pre-exist with known
  IDs that the recorded fixture can reference via placeholders.
- 2026-05-14 (iter-452): Scope @visual baseline to `chat-pane`, not
  the full workspace. Reason: canvas cascade + viewport make full-
  workspace snapshots flaky.
- 2026-05-14 (iter-452): Filter pre-existing `text-muted-foreground`
  contrast violation out of the @a11y assertion. Reason: tracked under
  slice C; gate must not double-fail on a known shared defect.
- 2026-05-14 (iter-452): Press Cmd-Z after dispatcher completes to
  verify atomic compound-revert of the link batch with Pump surviving.
  Reason: validates the compound-per-acceptance invariant from
  iter-394 under the gate's microscope.
- 2026-05-14 (iter-436): Commit Linux PNGs only.
- 2026-05-13 (iter-404): `memberIds` typing bound at command boundary.
- 2026-05-13 (iter-404): `input_schema` widened with
  `additionalProperties?: boolean`.
- 2026-05-13 (iter-394): Resolvers in a module-level Map.
- 2026-05-13 (iter-394): `acceptProposal` dispatches `compound`.
- 2026-05-13 (iter-332): `@visual` baselines from CI: extract Linux
  PNGs from playwright-report base64 blob and commit.

## Next action
1. When CI run 25822206490 completes: if green, auto-merge will squash
   PR #229 and close #222 — proceed to step 3.
2. If red on missing `phase-11-final-chat.png`: extract Linux PNG from
   the playwright-report artifact and commit per iter-332/iter-436.
   If red elsewhere, diagnose; respect 3-attempt escalation rule.
3. After slice F PR merges: close epic #12, open `type:release` issue,
   push tag `vphase-11`, deploy smoke per Ralph loop step 17, then
   append the phase-11 journal entry.
