# STATUS

## Current phase
phase:12 — Export/import + polish. Epic #13 OPEN. Slices A/B/C/D/F/G/H merged.
Open child slices: E (#235 in-progress this iter — final Phase 12 slice).

## Current iteration
- Iteration #: 522
- Started: 2026-05-14T07:35:00Z
- Branch: issue/235-split-view-side-by-side
- Working on: #235 slice E — Split view (side-by-side diagrams).
  Store gains `secondaryDiagramId` + `secondarySelectedElementIds` plus
  `splitDiagram` / `closeSplit` / `setSecondarySelection`. Persistence
  piggybacks on the existing `LayoutSnapshot` (sessionStorage), so split
  state survives reload alongside pane widths. Stale ids dropped on
  bootstrap. `setActiveDiagram` auto-closes the split when the new
  primary equals the current secondary.
  New `<SecondaryCanvasPane>` renders a slim, view-mostly React Flow
  on the right when split is open: same nodes/edges as the chosen
  diagram, independent selection store, draggable to reposition (the
  position command goes through the bus, so positions reflect into the
  primary too). No popovers/toolbar/empty-state on the secondary —
  edit affordances stay on the primary canvas. CanvasPane wraps both
  panes in a `flex` container; the diagram tabs row now has a separate
  `role="toolbar"` strip of `⇆` split-buttons (one per diagram) sitting
  beside the role="tablist" — axe rejects non-tab descendants of a
  tablist, so the split affordance lives in its own toolbar.
  `toFlowNodes` / `toFlowEdges` extracted to `flowGraph.ts` so the
  secondary pane reuses them without a new react-refresh warning.

## Last health check (iter-480)
- Pages https://michaeljfazio.github.io/mbse-workbench/ → 200 ✓
- Last 5 merged PRs (#246, #245, #244, #243, #242) all merged ✓
- 0 open `status:needs-human` issues ✓
- Last 3 CI runs on `main` all `success` ✓

## Last test run
- `pnpm exec tsc -b` ✓
- `pnpm lint` ✓ (4 pre-existing react-refresh warnings — unchanged)
- `pnpm run test:unit` ✓ 872/872 (+9 store split-view tests)
- `pnpm exec playwright test split-view --project=chromium` ✓ 4/4
- `pnpm exec playwright test split-view --project=webkit` ✓ 4/4
- Regression sweep `bdd-canvas|ibd-canvas|context-menu|cross-diagram-trace|phase-2-gate|phase-12-gate` ✓ on chromium

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.

## Decisions log
- 2026-05-14 (iter-522): Slice E persists split state in the LayoutSnapshot
  sessionStorage entry rather than the Project. Pane widths already live
  there; split is the same flavour of per-tab view state. Project schema
  stays clean for cross-tab persistence (future use).
- 2026-05-14 (iter-522): Secondary pane is view-mostly (selection +
  drag-reposition only) rather than a full editing surface. Acceptance
  is "edit in one reflects in other" — model coherence — not "both panes
  fully editable". Avoids a heavy refactor of CanvasInner's ~30 store
  hooks. Toolbar / popovers / empty-state stay on the primary pane.
- 2026-05-14 (iter-522): Split-toolbar separated from role="tablist"
  because axe's `aria-required-children` rule rejects any non-tab
  descendant of a tablist. A second `role="toolbar"` strip beside the
  tablist preserves the visual adjacency without the violation.
- 2026-05-14 (iter-522): `toFlowNodes` / `toFlowEdges` moved to
  `flowGraph.ts` so SecondaryCanvasPane can import them without adding
  react-refresh warnings to CanvasPane.tsx (component+helper exports
  in the same file trip the rule).
- 2026-05-14 (iter-521): Slice D search excludes elements not present
  on any diagram's `positions` (kept).
- 2026-05-14 (iter-521): Slice D footer hint uses `text-foreground`;
  row secondary spans use `opacity-80` (kept).
- 2026-05-14 (iter-519): Slice C Delete handler defers to ReactFlow
  (kept).
- 2026-05-14 (iter-519): Slice C Cmd-S triggers Export JSON (kept).
- 2026-05-13 (iter-517): Slice B empty-state gated to BDD viewpoint
  only (kept).
- 2026-05-13 (iter-517): Boundaries use a window-flag test seam (kept).
- 2026-05-13 (iter-517): Three boundaries — `canvas`, `requirements`,
  `chat` (kept).
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
Open PR closing #235; auto-merge=SQUASH. Once green, all Phase 12 child
slices (A–H, including this E) are merged and epic #13 can close — next
iteration: confirm merge, close #13, tag `vphase-12`, kick the release.
