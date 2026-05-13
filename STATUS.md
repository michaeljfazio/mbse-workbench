# STATUS

## Current phase
phase:12 — Export/import + polish. Epic #13 OPEN. Slices A/B/C/F/G/H merged.
Open child slices: D (#234 in-progress this iter), E (#235).

## Current iteration
- Iteration #: 521
- Started: 2026-05-14T07:25:00Z
- Branch: issue/234-cmdk-command-palette
- Working on: #234 slice D — Cmd-K command palette / element search.
  Real `CommandPalette` replaces the slice C stub. Search filters by name
  and id substring (case-insensitive), capped at 50 results, returns only
  elements present on at least one diagram (so navigation has a target).
  Up/Down navigate (wrap), Enter selects → `navigateToElementOnDiagram`,
  Esc closes. role=dialog + aria-modal + listbox/option semantics.
  Slice C tests rebound from `command-palette-stub` → `command-palette`.

## Last health check (iter-480)
- Pages https://michaeljfazio.github.io/mbse-workbench/ → 200 ✓
- Last 5 merged PRs (#244, #243, #242, #241, #240) all merged ✓
- 0 open `status:needs-human` issues ✓
- Last 3 CI runs on `main` all `success` ✓

## Last test run
- `pnpm exec tsc -b` ✓
- `pnpm lint` ✓ (4 pre-existing react-refresh warnings)
- `pnpm run test:unit` ✓ 863/863 (replaced 3 stub tests with 6 search tests)
- `pnpm exec playwright test "command-palette|global-shortcuts" --project=chromium` ✓ 9/9
- `pnpm exec playwright test "command-palette|global-shortcuts" --project=webkit` ✓ 9/9
- @visual NOT runnable locally; no baseline drift expected (palette is
  hidden by default; no existing surface markup changed).

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.

## Decisions log
- 2026-05-14 (iter-521): Slice D search excludes elements not present on
  any diagram's `positions`. The acceptance requires selection to navigate
  to a containing diagram, so an orphan match (edge-only or unplaced)
  has nothing to select. Avoids dead-end results.
- 2026-05-14 (iter-521): Slice D footer hint uses `text-foreground`; row
  secondary spans use `opacity-80` instead of `text-muted-foreground` —
  needed to clear axe color-contrast (4.5:1) on bg-card and bg-accent.
- 2026-05-14 (iter-519): Slice C Delete handler defers to ReactFlow's
  own viewport keymap when focus is inside `.react-flow`. The global
  path covers tree- and inspector-driven selections.
- 2026-05-14 (iter-519): Slice C Cmd-K opens a placeholder
  `CommandPaletteStub` (disabled input + Close). Real palette lands
  in slice D (#234); stub exists so the binding is verifiable now
  and the empty-state crib isn't lying.
- 2026-05-14 (iter-519): Slice C Cmd-S triggers Export JSON (not
  saveProject) per #233 acceptance. Suppressed while palette open
  via a ref so the once-bound keydown handler sees the latest open
  state without re-binding on toggle.
- 2026-05-13 (iter-517): Slice B empty-state gated to BDD viewpoint
  only — other viewpoints have their own `*-empty` baselines that
  intentionally show a blank canvas.
- 2026-05-13 (iter-517): Boundaries use a window-flag test seam
  (`__WORKSPACE_FORCE_ERROR__`) read by a tiny <ErrorTestThrower/>
  embedded in each boundary.
- 2026-05-13 (iter-517): Three boundaries — `canvas`, `requirements`,
  `chat`. Inspector is not wrapped.
- 2026-05-14 (iter-501): Slice A JSON import/export shape (kept).
- 2026-05-13 (iter-492): UTC clock-check (kept).
- 2026-05-14 (iter-485): Phase 12 gate short diagram names (kept).
- 2026-05-14 (iter-485): Phase 12 gate elements+edges only (kept).
- 2026-05-14 (iter-477): parametric-empty baseline refresh (kept).
- 2026-05-14 (iter-469): Slice G parser tokenizer (kept).
- 2026-05-14 (iter-469): Forward-reference resolution (kept).
- 2026-05-14 (iter-469): `importSysmlText` rebuilds bus (kept).
- 2026-05-14 (iter-467): Phase 12 slice F serializer (kept).
- 2026-05-14 (iter-466): Phase 11 closed. Tagged vphase-11.
- 2026-05-14 (iter-456): Drop `@visual workspace end-state` (kept).
- 2026-05-13 (iter-454): No STATUS-only commits while CI runs.
- 2026-05-14 (iter-452): 4 rounds in one LLM fixture.
- 2026-05-14 (iter-452): Seed the project rather than synthesise IDs.
- 2026-05-14 (iter-452): Filter pre-existing contrast violation.
- 2026-05-14 (iter-452): Cmd-Z verifies compound-revert.
- 2026-05-14 (iter-436): Commit Linux PNGs only.
- 2026-05-13 (iter-404): `memberIds` typing at command boundary.
- 2026-05-13 (iter-404): `input_schema` widened.
- 2026-05-13 (iter-394): Resolvers in module-level Map.
- 2026-05-13 (iter-394): `acceptProposal` dispatches `compound`.
- 2026-05-13 (iter-332): @visual baselines from CI Linux artifact.

## Next action
1. Push branch, open PR closing #234, enable auto-merge.
2. After CI green → merge → pick last slice (#235 split view).
