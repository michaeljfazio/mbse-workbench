Phase 13 — Functional polish & feature accessibility (post-v1.0.0)

Kickoff: 2026-05-14 (JOURNAL iter-528)

## Current phase
phase:13 — post-v1.0.0 polish + explorer rewrite

## Current iteration
- Iteration #: 755
- Started: 2026-05-15
- Branch: issue/311-cmdk-unified-ranked-list (PR pending; auto-merge --squash)
- Working on: #311 — T-13.05b Cmd-K unified ranked list (commands +
  elements in one section) + open-chat / show-inspector /
  rename-selection commands. PR #310 (T-13.05a) merged 44cd6df at
  11:29:14Z, closing the scaffold slice. Picked T-13.05b as the next
  slice per iter-754's Next-action plan — same lowest-numbered tier
  (P1 operator-UX), continuing T-13.05's a/b/c/d split.

  T-13.05b makes commands and elements first-class peers in the typed-
  query view. Empty-query behaviour is unchanged: the Actions header +
  enabled commands still render. With a non-empty query, both kinds
  share one ranked list — no per-group header, no separate panes —
  scored by a small substring scorer (exact 1.00 > prefix 0.80 >
  word-prefix 0.60 > substring 0.40), with a +0.05 bias on commands so
  that action keywords (e.g. typing "save", "chat", "undo") always put
  the matching command above any element whose name happens to share
  the same substring. The header changes from "Search elements" to
  "Commands and elements"; the empty-state copy from "No elements
  match …" to "No commands or elements match …".

  New built-in commands extend the registry from 4 to 7:
  - `workspace.open-chat` — `setInspectorTab('chat')` + requests the
    API-key modal if no key is stored. Enabled when a project is
    loaded.
  - `workspace.show-inspector` — `setInspectorTab('inspector')`.
    Enabled when a project is loaded.
  - `workspace.rename-selection` — `setPendingRename(selectedId)` so
    the project tree opens its inline rename for the single selected
    element. Enabled when exactly one element is selected on the
    active diagram (new context predicate
    `hasSingleDiagramSelection`).

  Implementation: `paletteCommands.ts` adds three pure scorer helpers
  (`scoreCommandMatch`, `scoreElementMatch`, `scoreSubstring` private)
  and the three new command entries; `PaletteCommandContext` grows
  three action callbacks (`openChat`, `showInspector`,
  `renameSelection`) and one new predicate
  (`hasSingleDiagramSelection`). `CommandPalette.tsx` builds a
  `{item, score}[]` from enabled commands and elements when the query
  is non-empty, sorts by score desc (insertion order breaks ties so
  commands keep registry order and elements keep document order), and
  drops the Actions header during a query. New `data-item-kind`
  attribute on each option row (`"command"` | `"element"`) so future
  recents/grouping slices can target rows without re-deriving from
  testid prefixes. All Phase-12 + T-13.05a behaviour preserved:
  active-row, ArrowUp/Down wrap-around, Enter, Tab focus trap, Esc,
  click-on-backdrop, all four T-13.05a commands.

  Tests: 17 new unit specs across `paletteCommands.test.ts` and
  `CommandPalette.test.tsx`. paletteCommands: registry includes the
  three new IDs; `isEnabled` predicates for each; `run()` delegations
  for each; filter `isEnabled` excludes rename-selection when no
  single selection; new T-13.05b commands match by keyword (`llm` →
  open-chat, `properties` → show-inspector); 6 scorer specs covering
  empty-query → 0, no-match → 0, exact > prefix > substring,
  word-prefix > substring, keyword match, element name+id match.
  CommandPalette: Actions section now lists 4 enabled commands
  (Undo / Save / OpenChat / ShowInspector) with no bus history + no
  selection; "without a project" hides every command; unified ranked
  list with query "save" puts the Save command at index 0 with the
  matching element below; Enter on the active "save" entry runs
  Save; Open chat click switches `inspectorTab`; Show inspector
  click switches it back; Rename selection invisible without
  selection but visible + sets `pendingRenameElementId` once a single
  element is selected via `setSelection`. New e2e specs in
  `command-palette.spec.ts` cover the unified-list "save" flow and
  the Open chat → sidebar tab switch. The pre-existing arrow-nav
  spec switched its query from "a" (now matches commands too) to
  "cp-block" (id-prefix, matches only the three seeded blocks).

  Local check green: 1172/1172 unit pass (was 1155; +17 net), tsc -b
  clean, lint clean (0 errors, 3 pre-existing warnings unchanged),
  vite build clean. New e2e specs pass on Chromium (full suite runs
  in CI). Agent visual inspection: captured Chromium screenshots at
  `artifacts/iteration-755/palette-{empty-actions, unified-save,
  unified-engine, empty-state}.png`. Confirms (a) empty-query view
  renders the new Open chat + Show inspector rows beneath Save with
  matching descriptions; (b) querying "save" puts the Save command
  with ⌘S kbd above SaverBlock element under the new "Commands and
  elements" header; (c) the new "No commands or elements match …"
  copy renders for misses. No committed visual baseline captures the
  modal palette so no baseline regen needed.

## Iter-754 archive
- Branch: issue/309-cmdk-command-palette-scaffold (PR #310 merged
  44cd6df at 11:29:14Z on 2026-05-15). Shipped T-13.05a — typed
  PaletteCommand registry + Actions section with the four already-
  keybound workspace actions (Undo / Redo / Save / Delete selection),
  rendered when the palette query is empty. Typing switched the
  palette back to the Phase-12 element-search view (replaced this
  iter by the T-13.05b unified ranked list). 1155/1155 unit pass
  (was 1131; +24 new specs), all checks clean.

## Iter-753 archive
- Branch: issue/307-tree-right-click-context-menu (PR #308 merged 3a5c22e
  at 10:53:04Z on 2026-05-15). Shipped T-13.02 — right-click context
  menu for the containment tree. Both `ContainmentTreeRowMenu` and
  `ContainmentTreeDiagramRowMenu` accept optional controlled-mode props
  (`open?`, `onOpenChange?`) layered over their existing
  `useState(false)`. ContainmentTree adds a single
  `contextMenuOpenKey: FocusKey | null` state slot, wires `onContextMenu`
  (preventDefault + stopPropagation + setContextMenuOpenKey(row.key))
  on every element row and diagram row, and passes
  `open={contextMenuOpenKey === row.key ? true : undefined}` +
  `onOpenChange` to each menu. Both rows guard against opening while in
  rename mode. Menu anchors at the row's kebab button position (deliberate
  simplification over open-at-cursor). 7 new unit specs cover
  open/preventDefault/no-select on right-click for both row kinds,
  Escape + outside-pointerdown close, row-swap, item-action wiring, and
  no-op during rename. 1131/1131 unit pass (was 1119; +7 here plus
  ItemFlowEdge specs from b2b7892), tsc/lint/build clean. With T-13.02
  + the T-13.01 "functionally complete via T-13.33c/d" attribution
  carried over from iter-752, the entire P0 "UI-unreachable features"
  tier (T-13.01 / .02 / .03 / .04) of Phase 13 closes. Combined with
  the P1 notation-conformance tier closed by T-13.26 (PR #306,
  b2b7892), the next live tier is P1 operator-UX (T-13.05 → T-13.10).

## Iter-752 archive
- Branch: issue/303-state-pseudostate-markers (PR #304 merged eb64a79)
- Working on: #303 — T-13.24 State pseudostate glyph review + uniform
  `data-pseudostate-shape` markers. PR #302 (T-13.23 Activity decision/merge
  SVG diamond) merged green at f90e39c with the visual baselines drifting
  exactly as iter-751 predicted on `activity-with-pseudostates-*` — but CI's
  `maxDiffPixelRatio: 0.01` tolerance absorbed it (the SVG-vs-CSS-rotated
  antialiasing delta on a 70px diamond is well under the threshold) so no
  baseline refresh was needed. Issue #301 closed. Picked T-13.24 from the
  iter-751 next-actions list. Reviewed all three state-machine shapes
  against SysMLv2/UML: initial (28×28 `rounded-full bg-foreground` disk) ✓
  matches "filled circle"; final (28×28 outer `border-foreground bg-card
  rounded-full` + 14×14 inner `bg-foreground rounded-full`) ✓ matches
  "bullseye"; state (160×72 `rounded-2xl border-2 bg-card` with horizontal
  `border-t border-border/60` separator above entry/do/exit action rows) ✓
  matches "rounded rectangle with action compartment". No rotated-CSS hacks
  exist — unlike the T-13.23 diamond, the CSS circles fit exactly within
  their 28px bounding boxes, so SVG conversion would add complexity without
  improving geometry. Composite region is out of scope: `StateNodeType` is
  exactly `'state' | 'initial' | 'final'` in the metamodel, with no
  region/choice/junction/history pseudostates planned. The remaining
  deliverable was DOM uniformity: generalize the
  `data-pseudostate-shape="diamond"` marker T-13.23 introduced on activity
  decision/merge into a shared convention across both pseudostate viewpoints
  so the Phase-13 visual-fidelity gate has one query
  (`[data-pseudostate-shape="<name>"]`) instead of per-viewpoint testid +
  class contracts. Added markers on activity Initial (`circle-filled`),
  Final (`bullseye`), Bar (`bar`, covers fork + join), and on state-machine
  Initial (`circle-filled`), Final (`bullseye`). Activity Diamond keeps its
  T-13.23 `diamond` marker unchanged. 4 new ActionUsageNode specs assert the
  new markers; new file `tests/unit/viewpoints/stateMachine/StateUsageNode.test.tsx`
  (9 specs) covers state render + rename + action compartment, initial /
  final handle counts (1 each — initial has only source, final only
  target), final concentric `rounded-full bg-foreground` disks, both new
  pseudostate-shape markers, and the existing `data-state-node-type`
  markers preserved on all three shapes. 1119/1119 unit pass (was 1106,
  +13 net), tsc -b clean, lint clean (0 errors, 3 pre-existing warnings
  unchanged), vite build clean. No visual baseline drift expected — only
  `data-*` attributes added, zero pixels changed.
- Iter-751 archive: Shipped T-13.23 — activity decision/merge as inline
  SVG polygon. PR #302 (after re-numbering during open) merged f90e39c
  with no baseline regen needed; the SVG-vs-CSS-rotated antialiasing
  delta on a 70px diamond stayed inside the 0.01 tolerance. New
  `data-pseudostate-shape="diamond"` marker introduced as a Phase-13
  visual-fidelity gate hook (generalized to all pseudostates this iter).
  Reviewed all six activity pseudostates:
  initial (filled `bg-foreground` disk), final (bullseye = outer
  `border-foreground bg-card` ring + 14px inner `bg-foreground` span),
  fork/join (solid `bg-foreground` 80×8 bar), all match SysMLv2/UML
  convention as-is — no change. The exception is decision/merge: a 78%-
  sized `<span>` was rotated 45° via CSS transform inside a 70px React
  Flow box. The rotated span's bounding rectangle is
  `0.78 × 70 × √2 ≈ 77.2px`, i.e. the visible diamond extended ~3-4px
  outside the node frame on every side. The selection ring drew around
  the 70×70 container instead of the visible diamond, the handles at
  Position.Top/Bottom sat at the box-edge midpoints (which happen to
  coincide with the inscribed diamond's vertices, so functional, but
  not geometrically tight to the rotated-78% shape), and dagre fed the
  70×70 dimensions to layout while neighbouring nodes saw the diamond
  bleed beyond that. Fix: replaced the rotated-div with an inline
  `<svg viewBox="0 0 70 70"><polygon points="35,inset MAX,35 35,MAX inset,35">`
  where `inset = strokeWidth/2`, fill `hsl(var(--card))`, stroke
  `hsl(var(--border))` or `hsl(var(--primary))` (selected). Stroke width
  thickens 2→3 px on select, matching the T-13.22 ellipse pattern.
  Polygon is `pointer-events-none` so click-to-select still hits the
  outer container div. Selection ring (`ring-2 ring-primary/40
  ring-offset-2 ring-offset-muted`) kept on the container — same as the
  other pseudostates. New `data-pseudostate-shape="diamond"` attribute
  surfaces the shape for the Phase-13 visual fidelity gate. All
  testids preserved (`activity-{decision,merge}-{id}`,
  `-label-{id}`, `-input-{id}`, `data-action-node-type`); inline-rename
  input still sits absolutely positioned above the SVG. 3 new unit
  specs: decision polygon-with-4-points, merge polygon-with-4-points,
  selected-stroke-thicker-than-unselected. 1 new e2e
  (activity-create-and-edit.spec.ts) drags decision+merge from the
  palette and asserts each contains exactly one `<svg><polygon>` with
  a 4-point `points` attribute. 1106/1106 unit pass (was 1103, +3 net),
  tsc -b clean, lint clean (0 errors, 3 pre-existing warnings unchanged),
  vite build clean. Visual baseline drift expected on
  `activity-with-pseudostates-{chromium,webkit}.png` (diamond pixel
  rendering changes from CSS-rotated antialiasing to native SVG
  polygon antialiasing) and possibly `inspector-action-selected-*.png`
  (also features a decision diamond). If CI flags either, refresh per
  the docs/CONTEXT.md 2026-05-12 lift-from-trace procedure.
- Iter-749 archive: Shipped T-13.25 — parametric value/constraint
  SysMLv2 notation conformance. PR #300 merged 95d1b38. New module
  `src/model/notation.ts` exports three pure helpers:
  `formatValueLiteral`, `formatValuePropertySignature`,
  `formatConstraintExpression`. ValuePropertyNode meta line now
  reads `: Real` (no default) or `: Real = 9.8` (with default), no
  longer `: Real = —`. ConstraintUsageNode preserves the
  `— no equation —` placeholder for blank expressions. 13 new unit
  specs covered string/numeric/boolean/zero/negative/empty literals,
  with-default vs without-default signatures, trimmed/empty/whitespace
  expressions. CI green with no visual drift.
- Iter-748 archive: PR #298 (T-13.19 BDD block compartments) first CI run
  25909168804 on the rebased branch to completion — `success`; auto-merge
  squashed at 09:03:55Z (merge commit 4873e74). Issue #297 closed.
  Started T-13.25 — parametric value/constraint SysMLv2 notation
  conformance. New module `src/model/notation.ts` exports three pure
  helpers: `formatValueLiteral(value)` quotes string literals + stringifies
  numbers/booleans; `formatValuePropertySignature(valueType, defaultValue)`
  returns `: <type>` when default is undefined and `: <type> = <literal>`
  otherwise; `formatConstraintExpression(expression)` trims whitespace and
  returns null when blank. `ValuePropertyNode.tsx` meta line now renders
  via `formatValuePropertySignature` — previously always rendered
  `: Real = formatValueDefault(...)` where `formatValueDefault(undefined)`
  emitted `—`, so a no-default property read `: Real = —`. Now it reads
  `: Real`, matching SysMLv2 textual notation. Removed the local
  `formatValueDefault` helper (no external callers; was contributing to a
  react-refresh lint warning). `ConstraintUsageNode.tsx` uses
  `formatConstraintExpression` for both the rendered text and the title
  tooltip; the `— no equation —` placeholder is preserved for empty /
  whitespace-only expressions. `src/viewpoints/bdd/blockCompartments.ts`
  `formatValuePropertyLabel` + `formatConstraintUsageLabel` now delegate
  to the shared helpers — output text is identical, so the existing
  blockCompartments unit specs (T-13.19) and the BDD compartment visual
  baselines should hold. 13 new unit specs in `tests/unit/model/notation.test.ts`
  cover the three pure helpers: string / numeric / boolean / zero /
  negative / empty-string literals, with-default vs. without-default
  signatures, trimmed / empty / whitespace-only expressions. 1103/1103
  unit pass (was 1090, +13 net), tsc -b clean, lint clean (0 errors, 3
  pre-existing warnings — down from 4 after the `formatValueDefault`
  removal), vite build clean. Visual baseline drift possible on the 4
  parametric-with-* specs (chromium + webkit) since the meta-line DOM
  changed from two `<span>` with `ml-1` to one text node — if CI flags
  these, refresh per the docs/CONTEXT.md 2026-05-12 lift-from-trace
  procedure (phase-8 gate uses a `9.8` default, so the rendered string
  is `: number = 9.8` in both old and new code — drift would be small
  whitespace-positioning only).
- Iter-748 archive: PR #298 (T-13.19 BDD block compartments) first CI run
  25908534051 on aaff339 came back red at 08:48:08Z with exactly the
  drift profile iter-747 anticipated — 9 @visual baselines crossed
  the `maxDiffPixelRatio: 0.01` threshold from BlockNode's new
  compartment DOM (header + parts + ports + values + constraints
  rows expand vertical span ~25-30%): bdd-three-blocks-autolayout
  (chromium + webkit), bdd-two-blocks-linked (chromium only —
  webkit edge-of-tolerance was already refreshed iter-745),
  cross-diagram-trace inspector-block-with-trace-link + trace-link-popover
  (chromium only — both popover-overlay-on-block specs),
  inspector-block-selected (chromium + webkit), and
  project-tree-populated (chromium + webkit — explorer kind badge
  + block-row width co-shift). One flaky non-gating phase-6-gate
  state-machine inspector-transition timeout (chromium only,
  unrelated). Refreshed all 9 baselines from CI run 25908534051
  actuals using the docs/CONTEXT.md 2026-05-12 lift-from-trace
  procedure: downloaded `playwright-report` via `gh run download
  --name playwright-report`, walked `data/*.zip` test.trace files
  to extract per-name {actual,expected} sha1s, cross-checked
  expected sha1 against committed PNG via `shasum` to disambiguate
  chromium vs webkit traces, copied 9 `data/<actual-sha1>.png`
  files over the baselines. Commit pushed; after iter-747's STATUS
  commit landed on main (80107a2), branch was CONFLICTING — rebased
  onto origin/main this iter and force-pushed to re-arm CI.
- Iter-747 archive: shipped T-13.20 — IBD enclosing-block frame
  (PR #295 → squash 63a910a). Notable: first CI run on 80b34aa had
  all 578 e2e green (frame z-index:-1 + small pixel footprint stayed
  inside `maxDiffPixelRatio: 0.01` on every IBD spec on chromium AND
  webkit), but the `Upload Playwright report` step failed with a
  GitHub artifact-storage flake — `Unexpected token '<', "<!DOCTYPE
  "... is not valid JSON` across 5 retries (GitHub's upload backend
  returned an HTML error page). `gh run rerun 25906574923 --failed`
  cleared it; second run finished `success` and auto-merge --squash
  landed the PR. Lesson recorded in docs/CONTEXT.md: artifact upload
  flakes are transient infra; rerun rather than refreshing baselines
  that aren't actually drifting. New module
  `src/viewpoints/ibd/enclosingFrame.ts` exposes two pure helpers:
  `computeEnclosingFrameBounds(rects, { padding?, headerHeight? })`
  returns the union bbox of all PartUsage rects + default 48px padding
  on every side + 32px header strip above (or `null` for empty input);
  `resolveIbdEnclosingFrameLabel(diagram, registry)` returns
  `{ id, name }` of the PartDefinition pointed at by
  `diagram.context.partDefinition.id`, or `null` if context is missing,
  wrong kind, unresolved, or points at a non-PartDefinition. New
  React-Flow node component `IbdEnclosingFrameNode` renders the frame
  as a labeled rectangle (`«block»` stereotype + name in a top-left
  header stripe), `pointer-events-none`, `selectable: false`,
  `draggable: false`, `focusable: false`, `zIndex: -1` so the frame
  sits behind the PartUsage nodes. Registered on the IBD viewpoint via
  `src/viewpoints/ibd/index.ts` and the barrel at
  `src/viewpoints/index.ts`. `src/workspace/flowGraph.ts` `toFlowNodes`
  now injects exactly one frame node at the head of the returned array
  when (a) `viewpoint.id === 'ibd'`, (b) `diagram.context` resolves to
  a PartDefinition, AND (c) at least one PartUsage rect is in the
  diagram. The frame node id is `ibd-enclosing-frame:<partDefinitionId>`
  for stability. 11 enclosingFrame helper specs + 4 IbdEnclosingFrameNode
  component specs + 6 flowGraph injection specs (1 positive, 5 negative
  paths: no context, wrong context kind, no PartUsages, unresolved
  definition, non-IBD viewpoint). 1065/1065 unit pass (was 1042, +21
  net), tsc -b clean, lint clean (0 errors, 4 pre-existing warnings),
  vite build clean. Visual baseline drift expected on all 7 IBD specs
  (`ibd-empty`, `ibd-one-part-no-ports`, `ibd-one-part-two-ports`,
  `ibd-two-parts`, `ibd-two-parts-one-connection`,
  `ibd-two-parts-one-itemflow`) on both chromium + webkit — but the
  CI rerun came back green within tolerance, so no refresh needed.
  Out of scope: per-Part drag-into-frame containment, frame resize
  handles, manual frame repositioning.

## Current iteration (archived 745 → 746 → 747)
- Iteration #: 745
- Started: 2026-05-15
- Branch: issue/292-requirement-compartments (PR #293 merged 5f90513)
- Working on: #292 — T-13.21 Requirement compartments. CI run 25904814805
  on 0a1619f went green (the 11 requirement/trace baselines from iter-744
  held). Auto-merge then synced main (merge commit 2d1ad21) and kicked
  off CI run 25905256286. That run failed on exactly ONE baseline:
  `bdd-two-blocks-linked-webkit.png` (3/3 attempts, all beyond
  `maxDiffPixelRatio: 0.01`). This is the pre-existing edge-of-tolerance
  baseline iter-742 flagged when T-13.18 landed (`STATUS.md` "Next
  action" listed it as a non-gating follow-up). Unrelated to T-13.21 —
  the BDD viewpoint does not render RequirementNode. The drift comes
  from the post-T-13.16-contrast iter-721 baseline finally crossing the
  threshold on this particular runner; iter-742 caught it as 2/4 flaky,
  but the merge-with-main run was 0/3 stable beyond tolerance. Refreshed
  the single webkit baseline from CI run 25905256286 actuals using the
  docs/CONTEXT.md 2026-05-12 procedure:
  - Downloaded `playwright-report` artifact via
    `gh run download 25905256286 --name playwright-report --dir ...`
  - Unzipped the single trace `data/178d2d4a….zip`, parsed `test.trace`
    for `bdd-two-blocks-linked-{actual,expected,diff}.png` sha1s
  - Cross-checked expected sha1 `cbe31ff…` against committed
    `bdd-two-blocks-linked-webkit.png` (matched) — confirms the trace
    belongs to webkit
  - Copied `data/dbbf1b1….png` over the webkit baseline
  Notable: this is the only failure this CI run. Chromium passed within
  tolerance (no trace produced). The iter-744 prediction held for all
  11 requirements/trace baselines (no further regen needed). Next iter:
  push baseline-refresh commit, wait for CI to land PR #293, then move
  to the next Phase-13 task.

## Current iteration (archived 744 → 745)
- Iteration #: 744
- Branch: issue/292-requirement-compartments (CI re-run 25904814805 on
  0a1619f passed; auto-merge synced main to 2d1ad21)
- Iter-744: First CI run 25904289966 failed exactly as iter-743 predicted:
  11 visual baselines drifted from the RequirementNode compartment
  restructure. Lifted actuals from the Playwright HTML report
  (`playwright-report` artifact, `data/<trace>.zip` → `test.trace` →
  `*-actual.png` sha1, cross-checked expected sha1 against
  `sha1sum tests/e2e/__screenshots__/...png`). The 11 refreshed:
  - requirements-create-and-edit.spec.ts:
    requirements-one-requirement-{chromium,webkit},
    requirements-three-requirements-{chromium,webkit},
    inspector-requirement-selected-{chromium,webkit}
  - requirements-trace-create.spec.ts:
    requirements-four-traces-{chromium,webkit},
    requirements-trace-kind-popover-chromium (webkit within tolerance),
    inspector-trace-edge-selected-{chromium,webkit}
  Predicted phase-4/10/12 + final-gate baselines did NOT drift — the
  0.01 tolerance absorbed the small viewport-scale deltas. Commit
  0a1619f pushed; CI re-run 25904814805 green.

## Current iteration (archived 743 → 744)
- Iteration #: 743
- Started: 2026-05-15
- Branch: issue/292-requirement-compartments (PR #293)
- Iter-743: PR #293 pushed with auto-merge --squash. Restructured
  RequirementNode from its prior header/footer mix into the
  SysMLv2-conventional rectangle-with-stacked-compartments form:
  «requirement» stereotype above the editable name in the header,
  then explicit labeled compartments separated by `border-t
  border-border` for id, text, and a priority/status meta row.
  `REQUIREMENT_NODE_HEIGHT` 140 → 180 to fit four compartments; width
  unchanged at 240. All existing testids (requirements-req-*,
  -req-id-*, -req-name-*, -req-input-*, -req-text-*, -priority-*,
  -status-*, -handle-top/bottom-*) kept stable so the 8 phase-gate +
  cross-diagram e2e specs that reference them keep passing. New
  testids requirements-req-stereotype-* and
  requirements-compartment-label-{id,text,priority,status}-* surface
  the new structure. 2 new unit specs cover the stereotype + label
  set. Local check green; visual drift expected on CI.

## Current iteration (archived 742 → 743)
- Iteration #: 742
- Started: 2026-05-15
- Branch: main (idle — PR #291 merged 7408b05)
- Iter-742: PR #291 (T-13.18 IBD port direction glyphs) merged green on CI
  run 25903598018; issue #290 closed. Notable: the IBD visual baselines
  did NOT drift as iter-741 anticipated — the per-side label/glyph DOM
  composition kept pixel diff within `maxDiffPixelRatio: 0.01` tolerance
  on both chromium and webkit. So no baseline-refresh push was needed;
  auto-merge landed the PR as-is. One incidental observation: the BDD
  `bdd-two-blocks-linked.png` spec went 2/4 flaky on this run (11543 px
  chromium, 13432 px webkit on first attempts, then stable on retries).
  This is a pre-existing edge-of-tolerance baseline (last refreshed
  iter-721 for the contrast fix, not touched by T-13.18) — Playwright's
  built-in retries masked it as flaky rather than failing. Worth a
  follow-up baseline refresh when convenient, but not gating. No code
  work this iter beyond CI monitoring + main sync.

## Current iteration (archived 741 → 742)
- Iteration #: 741
- Branch: issue/290-ibd-port-direction-glyphs (PR #291 merged 7408b05)
- Iter-741: PR #289 (T-13.33e-b row-menu Duplicate + Move) merged aaf2ded;
  closed umbrella issue #270 (T-13.33e fully done). Shipped T-13.18 — port
  direction glyphs (SysMLv2 notation conformance). New pure helper
  `directionGlyph(direction, position)` in `src/viewpoints/ibd/partUsageHelpers.ts`
  resolves to one of {▶, ◀, ↔} so the arrow always points along the data-flow
  direction across the part boundary regardless of which edge the port lands
  on: `in` → into the part body, `out` → away from the part body, `inout` →
  bidirectional. Exported through `src/viewpoints/ibd/index.ts` and the
  barrel at `src/viewpoints/index.ts`. PartUsageNode.tsx renders the glyph
  as a new `<span data-testid="ibd-port-direction-<portUsageId>"
  aria-hidden="true">` inside the existing port label container. On the
  LEFT side the glyph follows the name (so the glyph hugs the part body);
  on the RIGHT side the glyph precedes the name (same effect, mirrored).
  Glyph is `aria-hidden` because the name carries semantic meaning; the
  existing `data-direction` attribute already exposes direction to a11y
  consumers. 6 new pure unit specs in `partUsageHelpers.test.ts` cover the
  full 3×2 matrix; 6 new PartUsageNode integration specs cover in-left,
  out-left, inout, in-on-both-sides (orientation flip), DOM child ordering
  per side, and the aria-hidden marker. 1042/1042 unit pass (was 1030,
  +12), tsc -b clean, lint clean (0 errors, 4 pre-existing warnings),
  vite build clean.

## Current iteration (archived 740 → 741)
- Iteration #: 740
- Branch: issue/286-tree-menu-duplicate-move (merged aaf2ded)
- Iter-740: PR #288 (T-13.22 UseCase ellipse) merged 06d5d49. Shipped
  T-13.33e-b — `ContainmentTreeRowMenu` gains "Duplicate" and
  "Move to package…" entries on every element row (hidden on the project
  root via `canDelete = ownerId !== null`). Duplicate dispatches
  `store.duplicateElement(id)` and, on a non-null return, calls
  `setPendingRename(newId)` so the cloned subtree's root lands in inline
  rename — reusing the T-13.34 `pendingRenameElementId` slot. The clone's
  default name is `"<orig> copy"` per the store action. "Move to package…"
  opens a nested submenu (same outside-pointerdown / Escape close as
  Create-child / Create-representation) listing every `Package` in the
  project EXCEPT the element's current owner; the picker entry itself is
  shown disabled when no valid target exists (no enabled rows). Pure
  helper `computePackageTargets({element, elements})` in new
  `src/workspace/tree/packageTargets.ts` returns
  `{ id, label, disabled, disabledReason? }`, with `disabledReason` set
  to `'cycle'` for Packages that are descendants of the row element
  (matches the store's cycle guard) and `'kind-not-accepted'` for rows
  whose kind is not in `acceptedChildKinds('Package')` (e.g.
  ValueProperty, PartUsage). Disabled rows render with
  `aria-disabled`, `disabled`, `data-disabled-reason`, and a `title`
  tooltip from `packageTargetDisabledTitle`. Self is always omitted; the
  current owner is always omitted; results sort alphabetically (case-
  insensitive). The successful-click path calls
  `store.moveElement(elementId, packageId)`; the store stays
  authoritative (cycle / kind / no-op / unknown rejects still happen
  there). 7 new pure unit specs in `packageTargets.test.ts`; 8 new
  integration specs in `ContainmentTree.test.tsx` covering: Duplicate
  dispatches + pendingRename, Duplicate hidden on root, Move hidden on
  root, picker lists every-Package-except-current-owner, trigger
  disabled when no Package accepts the kind, descendant Packages
  flagged with `cycle`, valid click dispatches moveElement, disabled
  click is a no-op. 1 new Playwright e2e
  (`tests/e2e/containment-tree-duplicate-move.spec.ts`) on chromium +
  webkit: creates Package "Sub" + PartDefinition "Pump" under root via
  row menu, Duplicates Pump → assert "Pump copy" rename input is
  visible + focused, commits rename ("Vessel"), Moves Vessel → "Sub"
  via row menu, asserts depth 1→2 reorder, reloads, asserts
  persistence + original Pump unchanged. Full check green: 1030 unit
  pass (was 1015, +15 new), tsc -b clean, lint clean (0 errors,
  4 pre-existing warnings), vite build clean, 4/4 containment-tree
  e2e specs pass on chromium + webkit. No visual baseline impact —
  menu is closed by default; static screens unchanged.
- Iter-739: PR #285 (T-13.33e-a duplicateElement) merged 48d8a02 — the
  store-side half of T-13.33e is in. Shipped T-13.22 — UseCase node
  body is now an inline `<svg><ellipse/>` instead of a div with
  `borderRadius:50%`. Fill / stroke read from existing
  `hsl(var(--card))` and `hsl(var(--border))` / `hsl(var(--primary))`
  tokens, so light + dark themes still look right. Selected state
  thickens stroke 2→3 px on top of the existing `ring-primary/30`
  outer ring. Ellipse is inset by half the SELECTED stroke width
  (1.5 px on each axis) so the React Flow bounding rectangle does
  not shift between selected and unselected — handles, testids,
  inline-rename, and acceptable-edge plumbing are unchanged.
  Satisfies Phase-13 visual fidelity gate invariant #2 ("use-case
  node is an SVG ellipse"). A new tests/e2e/use-case-nodes.spec.ts
  asserts the use-case-usecase-* DOM contains an `<svg><ellipse>`
  with non-zero `rx`/`ry` on chromium + webkit — exactly the shape
  the Phase-13 gate will assert at close. The webkit @visual baseline
  `use-case-with-actor-and-usecase-webkit.png` was refreshed from CI
  run 25901671748 actual after the first run flagged drift on the
  unselected stroke colour. Full check green on the merged HEAD: CI
  run 25902364822 — typecheck, lint, 1015 unit, build, e2e chromium +
  webkit all clean.

## Current iteration (archived 738 → 739)
- Iteration #: 738
- Branch: issue/284-duplicate-element-store (PR #285 merged 48d8a02)
- Iter-738: PR #283 (T-13.36b drag-drop UI) merged 4155856 — Phase-13
  gate item 4 (drag-drop move for any container) now fully shipped via
  T-13.36a + T-13.36b. Filed #284 and opened PR #285 for T-13.33e-a, the
  store-side foundation of T-13.33e. New `src/workspace/subtreeClone.ts`
  exposes a pure `cloneSubtree(rootId, { registry, edges })` that
  BFS-walks descendants by ownerId, allocates fresh ids, and emits
  clones in topological order. Field-based ElementId refs
  (`definitionId` on PartUsage / PortUsage / ActionUsage / StateUsage /
  ConstraintUsage, `interfaceId` on PortDefinition, embedded
  sourceId/targetId on ConnectionUsage / ItemFlow / Transition) are
  remapped only when the target is itself in the subtree; refs that
  point outside are preserved verbatim. Element-edges whose embedded
  endpoint(s) leave the subtree are dropped entirely. Real ModelEdges
  (Composition / Generalization / RequirementTrace / …) are cloned only
  when BOTH endpoints fall in the subtree, with fresh EdgeIds. New
  store action `duplicateElement(id): ElementId | null` rejects unknown
  ids and the project root (`ownerId === null`), places the root clone
  as a sibling of the original (next `nextOwnerIndex` under the
  original's `ownerId`/`ownerRole`) with a `" copy"` name suffix, and
  dispatches a single compound command so undo is one step. 11 new
  unit specs cover: leaf clone with sibling slot, multi-kind
  descendants with role-correct remap, intra-subtree edge clone,
  cross-subtree edge drop, internal definitionId remap, external
  definitionId preserved, project-root rejected, unknown-id rejected,
  single-step undo + redo, unrelated edges untouched, cross-subtree
  ItemFlow dropped. Full check green: 1015 unit + 458 e2e (chromium +
  webkit) + tsc -b + lint + build. UI wiring (the "Duplicate" and
  "Move to package…" menu items in `ContainmentTreeRowMenu`) is
  deferred to T-13.33e-b — kept out of this slice so the contract is
  test-isolated.

## Current iteration (archived 737 → 738)
- Iteration #: 737
- Branch: issue/282-tree-drag-drop (PR #283 merged 4155856)
- Iter-737: PR #281 (T-13.36a) merged dd9957d. Shipped T-13.36b —
  ContainmentTree drag source + drop target wired to the store's
  generalized moveElement. Element rows (except the project root)
  become drag sources via `draggable=true` + onDragStart that writes
  the element id to dataTransfer under PROJECT_TREE_DRAG_ELEMENT_ID
  (reuses the existing MIME from ProjectTree leaves; distinct from
  the `application/x-mbse-element-kind` palette slot). A
  `dragStateRef` captures `{ id, kind }` synchronously at dragStart
  because `dataTransfer.getData()` is unreadable during dragOver for
  security reasons. dragOver runs the same `acceptedChildKinds(rowKind)`
  pre-check the row menu uses, plus a cycle pre-check walking the
  target's ownerId chain; accepted targets call preventDefault, set
  `dropEffect='move'`, and toggle `data-droptarget='true'` +
  `bg-primary/20 ring-1 ring-primary`. Drop dispatches
  store.moveElement; the store stays authoritative (cycle / kind /
  self / no-op / unknown rejects still happen there). Root row is
  not draggable but IS a drop target so elements can return to top
  level. Diagram rows are not drop targets. 11 new unit specs cover
  draggable attribute + payload, root not-draggable, dragOver
  accept/reject markers, drop variants (PortDefinition→PartDefinition
  ownerRole=port, ValueProperty→ActionDefinition ownerRole=parameter,
  child→root ownerRole=member), self/cycle/non-accepting no-ops,
  diagram-row reject, dragEnd indicator reset, single-step undo.
  1 new Playwright e2e (`tests/e2e/containment-tree-dnd.spec.ts`) walks
  a real-mouse drag on chromium + webkit: creates Pump (PartDefinition)
  and Port1 (PortDefinition) under root via the row menu, drags Port1
  onto Pump with `dragTo`, asserts depth 1→2, reloads, asserts
  persistence. 1004/1004 unit pass, tsc -b clean, lint clean
  (0 errors, 4 pre-existing warnings), build clean, e2e green on
  both projects. No static visual baseline impact (the indicator
  only renders during an in-progress drag).

## Current iteration (archived 736 → 737)
- Iteration #: 736
- Branch: issue/280-store-move-element (PR #281 merged dd9957d)
- Iter-736: PR #277 (T-13.34) merged 1d2fdda; PR #279 (T-13.04 per-section
  "+" affordances) merged 67642fc. Started T-13.36 (P0 gate item: drag-drop
  move semantics for any container) — filed #280 + opened PR #281 for
  the first slice, T-13.36a. Adds `moveElement(elementId, targetOwnerId):
  boolean` to the workspace store. Resolves new `ownerRole` from the
  same `acceptedChildKinds` table that powers the tree's Create-child
  submenu; cycle guard up the ownerId chain; rejects unaccepted kinds,
  no-op moves, and unknown ids; dispatches a single `update-element`
  so undo is one step. Kept `moveElementBetweenPackages` distinct (ADR
  0009 § 2 Package-in-Package rejection still wanted for the Package
  canvas drop target).

## Current iteration (archived 735 → 736)
- Iteration #: 735
- Branch: issue/276-empty-state-explorer-cta (PR #277 merged 1d2fdda;
  follow-on PR #279 T-13.04 merged 67642fc)
- Iter-735: Shipped T-13.34 (empty-state CTAs → explorer create-child +
  pending-rename store slot). Side-effect: closed T-13.03. 977/977 unit
  at the time of write. (Note: also covers iter-735→736 baseline drift —
  bdd-empty.png on chromium + webkit refreshed in the PR #277 review pass.)

## Current iteration (archived 734 → 735)
- Iteration #: 734
- Branch: issue/274-tree-filter-bar (PR #275 merged 65b464c)
- Iter-734: PR #275 merged green at 03:20:18Z after iter-733 baseline
  refresh. No code work this iter.

## Current iteration (archived 731 → 734)
- Iteration #: 731
- Started: 2026-05-15
- Branch: issue/274-tree-filter-bar (PR open, auto-merge enabled)
- Iter-731: PR #273 (T-13.33d) merged 6a04fe8. Shipped T-13.35 — token
  filter bar for ContainmentTree. New treeFilter.ts: `tokenizeFilter`
  (whitespace split + lowercase) and `computeFilteredKeys(root, tokens)`
  which returns the set of FocusKeys to keep (matches + ancestors).
  Element haystack = `"<name> <kind>".toLowerCase()`; diagram haystack =
  `name.toLowerCase()`. AND semantics across tokens. ContainmentTree
  gains an `<input type="search" testid="containment-tree-filter">`
  above the tree; when active, every element key is force-expanded so
  flatten descends to matches regardless of user-toggled collapse
  state. Rows are post-filtered against the visible-key set. Empty
  filter restores the unfiltered tree. New
  `containment-tree-no-matches` empty-state when nothing matches.
  9 new treeFilter unit specs + 8 new ContainmentTree integration
  specs. 969/969 unit, tsc -b clean, lint clean (0 errors,
  4 pre-existing warnings), build clean.

## Current iteration (archived 730 → 731)
- Iteration #: 730
- Iter-730: No code work. Waited for PR #273 (T-13.33d) CI to land.

## Current iteration (archived 729 → 730)
- Iteration #: 729
- Started: 2026-05-15
- Branch: issue/269-tree-diagram-row-rename-delete (PR open, auto-merge)
- Iter-729: PR #272 (T-13.33c Create representation) merged 2724929.
  Shipped T-13.33d — diagram-row three-dots menu with Rename + Delete.
  New store actions renameDiagram(id, name) and deleteDiagram(id):
  rename trims, no-op on empty/identical; delete removes from diagrams
  array, falls back activeDiagramId to next diagram (or null if none),
  clears secondaryDiagramId + secondarySelectedElementIds + persists
  layout when the deleted diagram was the secondary. Both call
  saveProject. New ContainmentTreeDiagramRowMenu.tsx component reuses
  the same outside-pointerdown / Escape close semantics as the element
  row menu. Diagram rows now host the menu + an inline rename input
  (Enter/blur commits, Escape cancels). 10 new unit specs covering:
  trigger render, rename round-trip, Escape cancel, delete-active
  fallback, delete-non-active, delete-last clears, kebab opens without
  activating diagram, renameDiagram store action, renameDiagram empty
  no-op, deleteDiagram clears secondary. 951/951 unit, tsc -b clean,
  lint clean (0 errors), build clean.

## Current iteration (archived 728 → 729)
- Iteration #: 728
- Iter-728: No code work. Held for PR #272 (T-13.33c) CI to land.

## Current iteration (archived 727 → 728)
- Iteration #: 727
- Started: 2026-05-15
- Branch: issue/268-tree-create-representation (PR #272 auto-merge enabled)
- Iter-727: PR #271 (T-13.33b Create-child submenu) merged fe5a62e.
  Shipped T-13.33c — Create representation submenu. New
  representationAcceptance.ts encodes the viewpoint × context-kind
  table: Package → BDD/Requirements/Use Case/Package (context.kind=
  'package'); PartDefinition → BDD/IBD/Parametric (context.kind=
  'partDefinition'); ActionDefinition → Activity; StateDefinition →
  State Machine. ContainmentTreeRowMenu gains a second nested submenu
  with the same close-on-outside-pointerdown semantics as Create-child.
  ContainmentTree wires `requestCreateRepresentation` which calls
  `createDiagram(viewpointId, { name, context })` with default name
  `<element.name> <ViewpointLabel>` and switches to the new diagram via
  setActiveDiagram. The diagram nests under its owner via
  buildContainmentTree's representations sort (no tree-builder change).
  6 new representationAcceptance unit specs + 6 new ContainmentTree
  integration specs. 941/941 unit, tsc -b clean, lint clean, build
  clean. Next iter: #269 (T-13.33d diagram-row Rename/Delete — adds
  renameDiagram/deleteDiagram store actions, folds into T-13.01).

## Current iteration (archived 726 → 727)
- Iteration #: 726
- Branch: issue/267-tree-create-child (PR #271 merged fe5a62e)
- Iter-726: PR #266 (T-13.33a) merged 7982c42. PR #271 (T-13.33b
  Create-child submenu) opened with commit 34c08ec from a prior
  iteration; CI ran green on 25862173369 and the PR auto-merged to
  fe5a62e. No code work this iter; waited on the `check` job.

## Current iteration (archived 725 → 726)
- Iteration #: 725
- Branch: main (PR #266 CI in progress; no code work this iter)
- Iter-725: PR #266 (T-13.33a) still has `check` in_progress. Used the
  iteration to file the deferred T-13.33 follow-ups so the backlog is
  explicit: #267 T-13.33b Create child, #268 T-13.33c Create
  representation, #269 T-13.33d diagram-row Rename/Delete (folds into
  T-13.01), #270 T-13.33e Move to package / Duplicate (P2, depends on
  T-13.36). No code changes this iter. Next iter resumes once #266
  merges.

## Current iteration (archived 724 → 725)
- Iteration #: 724
- Started: 2026-05-14
- Branch: issue/265-tree-row-menu-rename-delete (PR #266 auto-merge)
- Iter-724: PR #264 (T-13.32 reveal-in-tree) merged dc353e7. Started
  T-13.33a — first reviewable slice of the three-dots row menu.
  Added ContainmentTreeRowMenu.tsx (kebab trigger + popover; close on
  outside pointerdown/Escape) and wired Rename + Delete into element
  rows of ContainmentTree. Rename swaps the name span for an `<input>`
  (Enter/blur commit via renameElement, Escape cancels). Delete invokes
  deleteElement and is hidden for the project root (ownerId === null).
  Diagram-row actions and Create-child / Create-representation / Move /
  Duplicate deferred to follow-ups — the diagram ops need new store
  actions that don't exist yet. 7 new unit specs; 912/912 unit, tsc -b
  clean, lint clean, build clean.

## Current iteration (archived 723 → 724)
- Iteration #: 723
- Started: 2026-05-14
- Branch: issue/263-tree-canvas-selection-sync (merged dc353e7)
- Iter-723: PR #262 merged green (CI 25860078819). Started T-13.32:
  reveal-in-tree on canvas selection / diagram activation. Two
  useEffects in ContainmentTree.tsx: one watches selectedElementIds[0],
  walks ownerId chain to compute ancestors, drops them from `collapsed`
  set, and queues scrollIntoView({block:'nearest'}) on the row ref.
  The second mirrors the same for activeDiagramId via diagram.context.id.
  Ancestor walker is cycle-guarded. expandAncestors returns prev unchanged
  when no ancestors are collapsed (no needless rerender). 3 new unit
  specs (auto-expand, scrollIntoView for element, scrollIntoView for
  diagram); 905/905 unit, tsc -b clean, lint clean.

## Current iteration (archived 722 → 723)
- Iteration #: 722
- Started: 2026-05-14
- Branch: issue/261-containment-tree-renderer (PR #262 auto-merge enabled)
- Iter-722: CI on 7479c9a came back with the contrast fix succeeding
  (all a11y/color-contrast failures cleared) but 20 surviving
  @visual baseline drifts (~9-11k px each, ratio 0.02). The drift
  set was larger than iter-721 anticipated: not just the 5 chromium
  canvases I'd flagged, but also their webkit twins plus webkit-only
  specs in ibd-*, cross-diagram-trace, requirements-{coverage,trace-create},
  state-machine-transitions, and use-case-edges. The bd48f4d→d1fda56
  contrast iterations masked these because a11y failures fired first.
  Refreshed all 21 baselines from CI run 25859487382 actuals using
  the docs/CONTEXT.md 2026-05-12 lift-from-trace procedure (commit
  9c23534). Waiting for CI to re-run with green visuals.
- Iter-721: CI on d1fda56 came back red with 57 failures. ~50 are
  `color-contrast` axe violations against the kind-badge span inside
  selected Explorer rows: `text-muted-foreground` (#64748b) on
  `bg-primary/10` (~#e7e8ea) = 3.88:1, below the 4.5:1 AA threshold.
  Fix this iter: switch the kind badge from `text-muted-foreground`
  to `text-foreground/75` so contrast holds on both bg-card and the
  selected `bg-primary/10` tint (computed ~#3b404c on the selected
  tint ≈ 7.5:1). The remaining ~5 failures are @visual baseline drift
  on bdd-two-blocks-linked / package-empty / parametric-with-binding /
  parametric-with-constraint-and-value / use-case-empty — they capture
  fullPage:false, so the new Explorer section in the project-tree pane
  shifts pixels. Plan: push contrast fix, let CI run, then regen those
  baselines from CI actuals next iteration.
- Iter-720 summary (prior): CI on bd48f4d came back red — 119 @a11y
  failures from the new Explorer section: `text-muted-foreground/80`
  on the section <h2>s (3.24:1) and `text-muted-foreground/70` on the
  kind badge (2.71:1) at 10px font size, both below 4.5:1. Fix d1fda56
  dropped the opacity modifiers so the full muted-foreground token
  (~4.83:1) was used. That cut the a11y count from 119 to ~50 but
  didn't address the selected-row case (bg-primary/10 background).
- Working on: #261 — T-13.31 renderer. New ContainmentTree.tsx user-facing
  component driven by buildContainmentTree. Mounted as new "Explorer"
  section in ProjectTreePane above the existing palette ProjectTree
  ("Palette" section) — additive to preserve the 13+ e2e specs that
  depend on `project-tree-group-<Kind>` drag-source testids. Renderer
  behaviours: rooted at project.rootId; element rows aria-selected from
  store + click→setSelection; diagram rows aria-current=page from
  activeDiagramId + click→setActiveDiagram; expand/collapse via
  disclosure caret; keyboard nav (ArrowUp/Down/Left/Right, Home/End,
  Enter) with roving tabindex; depth-indented; per-row testids
  containment-tree-element-<id> / containment-tree-diagram-<id>.
  10 unit tests added. Suite: 902/902 unit, tsc -b clean, lint clean,
  build clean. Follow-ups: T-13.32 reveal-in-tree (likely deferred to
  the explorer-becomes-primary cutover), T-13.33 three-dots menu,
  T-13.35 filter bar, T-13.36 drag-drop generalization, plus the
  palette-affordance migration (T-13.04) and flat-tree retirement.
- Iter-718 summary (prior): PR #260 merged f6e0ae0 — pure
  buildContainmentTree foundation (13 unit tests). Tree-builder
  returns a ContainmentElementNode|null with element children sorted
  by ownerIndex (id tiebreak) and representations sorted by name,
  appended after element children of each parent. Orphan-tolerant
  for both missing-owner elements and missing-context diagrams.

## Current iteration (archived 716 → 717)
- Iteration #: 716
- Branch: issue/255-explorer-foundation-ownerid-context (PR #256 merged)
- Working on: #255 — CI run 25854947120 on c7b83f6 came back red with
  exactly 2 failures: phase-12-gate.spec.ts:332 round-trip+smoke on
  both chromium and webkit. Diff was ownerIndex shifts after
  SysMLv2 text re-import (Pump↔Vessel swap by alphabetic emit order;
  Actor 0→9 same cause). The serializer emits in canonical sorted
  order, so parse-order indices differ from pre-export indices even
  when the model is structurally identical.
- Fix this iter (c66cc37): canonicalize() in phase-12-gate.spec.ts
  now strips ownerIndex before structural compare. The Phase-12
  contract is "structurally identical modulo IDs" — ownerIndex is a
  derived sibling-ordering hint, not a semantic property, so it's
  outside that contract. ownerId / ownerRole / kind / name still
  asserted exactly.
- Iter-715 summary (prior): second CI run (b2426f3) cut the failure count
  34 → 6. Surviving failures resolved this iter (commit d3a6e32):
    A. phase-5-gate.spec.ts readProject now filters elements by
       `ownerId !== null` before returning, so the gate's
       `elements.toHaveLength(7)` assertion matches user-authored
       ActionUsages (was over-counting by 1 root Package).
    B. phase-12-gate.spec.ts round-trip poll compares against the
       post-migration pre-export count instead of SEED_ELEMENTS.length.
       The seed's p12-pkg-root has no ownerId and so the migrator
       promotes it to project root, dropping the user-element count
       from 13 to 12. Expected was 13+4=17; actual was 12+4=16.
    C. Visual baselines refreshed from CI run 25854230466 actuals
       (package-empty-webkit.png, package-one-chromium.png) via the
       docs/CONTEXT.md 2026-05-12 procedure (lift `*-actual.png` sha1
       from `data/<trace-hash>.zip` test.trace). amd64 CI is ground
       truth — local arm64 podman regen is unreliable for text-heavy
       canvases (delta sits right at the 0.02 tolerance band).
- Iter-714 summary (prior): pushed 192d420 — element-count helpers in
  phase-4/5/6/7/8/12, final, json-import-export specs filter the
  synthesized root Package; phase-9 derives Package membership via
  ownerId scan; CanvasPane.elementCount filters root so the
  Export-disabled and empty-state surfaces re-engage.
- Iter-713 summary (prior): closed out the 10 residual unit failures
  from the ownerId schema migration. Suite is 877/877 green; tsc -b 0
  errors; pnpm build clean. Pushed and opened PR #256.
  Fixes landed this iter:
    - runAutoLayout filters elements by viewpoint.acceptedElementKinds
      before feeding dagre (was including the implicit root Package).
    - ProjectTree hides the project-root Package from the flat-by-kind
      view (T-13.31 will replace this view wholesale).
    - 4 unit tests re-anchored: parametric undo, store rehydrate, and
      the two LLM tool tests (RequirementTrace via ownerId; owning-pkg
      ownerId on create-element instead of trailing update-element).
  Specific failures to handle:
    - workspace/bddActions.test.ts: runAutoLayout-on-empty diagram is
      bumping modelVersion — root Package is now an element.
    - workspace/parametric-actions.test.ts: undo of compound
      ConstraintUsage+ConstraintDefinition no longer single-step.
    - workspace/store.test.ts: command-bus history persist + rehydrate.
    - llm/tools/critique-model.test.ts: summary text for
      RequirementTrace assertion shifted.
    - llm/tools/generate-requirements-from-text.test.ts: "appends
      update-element for owning package" — handler no longer does this.
    - workspace/tree/ProjectTree.test.tsx (5 specs): asserts flat-by-
      kind shape that T-13.31 will replace. Treat as superseded by
      T-13.31 — likely re-author against the new containment tree.

## Last test run
- Command: pnpm typecheck && pnpm lint && pnpm test:unit && pnpm build
- Result: PASS — 1155 unit (was 1131; +24 new specs across
  `paletteCommands.test.ts` and `CommandPalette.test.tsx`), tsc clean,
  lint clean (0 errors, 3 pre-existing warnings unchanged), build clean
- (e2e deferred to CI on PR #310; only the empty-query branch of the
  palette grows new DOM, and no committed visual baseline captures the
  palette open, so no visual drift is expected on any baseline)
- Visual baselines: not touched this iter. The new Actions section
  renders only when palette is open + query is empty; baselines never
  capture that state.

## Last health check
- Iteration: 750 (every-10th periodic check per AGENT.md directive 13)
- Date: 2026-05-15
- Pages reachable: ✓ https://michaeljfazio.github.io/mbse-workbench/ → HTTP 200
- Recent merged PRs (5/5): ✓ #298, #296, #295, #293, #291 — all squashed
  to main; every feature PR closed its referenced issue (#297, #294, #292,
  #290; #296 was a status-only chore with no linked issue)
- `status:needs-human` issue count: 0 (threshold for design-issue
  escalation is >3)
- Most-recent CI runs on `main` (5/5 completed): all `success` — most
  recent is run 25909603627 on 4873e74 (T-13.19 merge), completed
  2026-05-15T09:14:39Z, duration 10m 37s
- In-flight CI on PR #300 (f102640) is `in_progress`; non-blocking for
  the health check itself (the check evaluates `main`, not feature
  branches)
- Verdict: all green. No `p0`/`type:bug` issue filed.

## Known issues / blockers
- (none for this iteration)

Backlog (P0 — UI-unreachable features):
- [x] T-13.01 Diagram lifecycle UI (create/rename/delete per viewpoint) —
      CLOSED functionally by T-13.33c (Create representation submenu,
      iter-727 PR #272) for create-per-viewpoint and T-13.33d (diagram-row
      Rename + Delete, iter-729 PR #273). No standalone PR; marked done
      iter-753 during T-13.02 audit.
- [x] T-13.02 Project-tree right-click context menu (Rename/Delete/New).
      Shipped iter-753 (#307, PR #308 → 3a5c22e). Closes the P0
      "UI-unreachable features" tier.
- [x] T-13.03 Fix "New Requirement" empty-state dead-end — CLOSED by T-13.34
      (#276): CTA now creates a Requirement under root + queues inline rename.
- [x] T-13.04 Per-section "+" affordances on project-tree categories.
      Shipped iter-736 (PR #279, 67642fc).

Backlog (P1 — discoverability/workflow):
- T-13.05 Cmd-K → true command palette (actions, not just search). Split
  into slices following the T-13.33 / T-13.36 precedent:
  - [x] T-13.05a Scaffold: typed `PaletteCommand` registry, Actions
    section, initial four built-in commands (Undo / Redo / Save /
    Delete selection). Shipped iter-754 (PR #310, 44cd6df).
  - T-13.05b Unified ranked list (commands + elements in one section);
    more command groups (open chat, show inspector, rename selection
    so far). In flight iter-755 (#311). Remaining ideas (create
    diagram, focus pane, …) deferred to T-13.05c/d.
  - T-13.05c Inspector / surface-scoped actions.
  - T-13.05d Recently-used commands at the top.
- T-13.06 Tooltip reasons on disabled toolbar buttons
- T-13.07 Inspector contextual "+ New …" panel when nothing selected
- T-13.08 Inline project-name rename in header
- T-13.09 Dirty-state + "saved at" indicator
- T-13.10 Undo/redo toolbar buttons

Backlog (P0 — visual rendering / transparency, JOURNAL iter-529):
- [x] T-13.16 Add `card` + `card-foreground` to tailwind.config.ts + define
      `--card`/`--card-foreground` HSL tokens (light + dark) in index.css.
      Shipped iter-532 (#253). 94 visual baselines regenerated.
- [x] T-13.17 Replace circular port glyphs with square port glyphs in
      PartUsageNode.tsx (rounded-full → rounded-none). Shipped iter-532 (#253).

Backlog (P1 — SysMLv2 notation conformance, JOURNAL iter-529):
- [x] T-13.18 Port direction glyphs (in/out/inout). Shipped iter-741 (#291).
- T-13.19 BDD block compartments (parts/ports/values/constraints).
- [x] T-13.20 IBD enclosing-block frame — shipped iter-747 (PR #294).
- [x] T-13.21 Requirement compartments (reqId/text/priority/status rows). Shipped iter-744 (#293).
- [x] T-13.22 Use-case true ellipse shape (SVG, not rectangle). Shipped iter-739 (#288).
- [x] T-13.23 Activity pseudostate glyph review (initial/final/fork/join/dec/merge).
      Decision/merge diamond → inline SVG polygon shipped iter-751 (#302,
      merged f90e39c). Initial/final/fork/join confirmed conformant as-is
      — no further change planned under this task.
- [x] T-13.24 State pseudostate glyph review (initial/final/composite region).
      Shipped iter-752 (#304). All three shapes conformant as-is; no SVG
      conversion needed. Composite region out of scope (not in metamodel).
      Generalized `data-pseudostate-shape` marker convention from T-13.23
      across both pseudostate viewpoints for the Phase-13 visual-fidelity
      gate's uniform DOM query.
- [x] T-13.25 Parametric: constraint-expression + value-property `: type = value`.
      In flight — PR #300 (iter-749), auto-merge enabled, awaiting CI.
- T-13.26 Edge style audit (Gen hollow-triangle, Comp filled-diamond,
  Trace family dashed + stereotype, ItemFlow open-arrow + item-type label).

Backlog (P0 — hierarchical Project Explorer foundations, decisions locked iter-531):
- T-13.29 Make `ownerId` + `ownerRole` + `ownerIndex` the SINGLE source of
  truth on ElementBase. Drop all parent-side child arrays (Package.memberIds,
  PartDefinition.portIds/propertyIds, PartUsage.portUsageIds,
  ActionDefinition.parameterIds, InterfaceDefinition.portDefinitionIds).
  Repository.load() backfills + synthesizes an explicit root Package equal to
  Project.name; Project gains `rootId: ElementId`. Registry exposes
  `parentOf` and `childrenOf(id, role?)` as O(1) lookups. Codemod readers.
- T-13.30 Widen `DiagramContext` to a discriminated union over four kinds
  { package | partDefinition | actionDefinition | stateDefinition } and
  make it REQUIRED on every Diagram. Each viewpoint declares accepted
  context kinds; the "Create representation…" menu reads from that table.
  Migrate orphan diagrams to { kind: 'package', id: rootId }.
- T-13.31 Replace flat-by-kind ProjectTree with containment-driven tree
  rooted at the project package, with representations nested under owners.
- T-13.32 Bidirectional tree↔canvas selection sync + reveal-in-tree action.
- T-13.33 Three-dots context menu per node (Rename / Delete / Create child /
  Create representation / Expand-all / Move to package / Duplicate). Split:
  - [x] T-13.33a Rename + Delete — PR #266 (iter-724).
  - [x] T-13.33b Create-child submenu — PR #271 (iter-727).
  - [x] T-13.33c Create-representation submenu — PR #272 (iter-727).
  - [x] T-13.33d Diagram-row Rename + Delete — PR #273 (iter-729).
  - T-13.33e Move to package / Duplicate (#270). Split:
    - PR #285 (iter-738) — `duplicateElement` store action + `cloneSubtree`
      helper (T-13.33e-a, #284).
    - PR for #286 (iter-740) — `ContainmentTreeRowMenu` "Duplicate" +
      "Move to package…" menu items + e2e (T-13.33e-b).
- [x] T-13.34 Wire empty-state CTAs through the explorer (new leaf + inline rename).
      Shipped iter-735 (#276): pendingRenameElementId store slot, ContainmentTree
      useEffect picks it up; EmptyState routes New Block / New Requirement
      through createChildElement(rootId, …) + setPendingRename.

Backlog (P1 — explorer features, JOURNAL iter-530):
- [x] T-13.35 Token-based filter bar — shipped iter-731 (#275).
- T-13.36 Generalize drag-drop move semantics (any container, not just
  Package). Promoted to P0 — gate item 4. Split into:
  - [x] T-13.36a store action `moveElement` — PR #281 (iter-736).
  - [x] T-13.36b ContainmentTree drag source + drop target + visual
    feedback + e2e — PR #283 (iter-737).
- T-13.37 Diagrams as representations (⌬ leaves under owning element).
- T-13.38 Per-kind stereotype icons (lucide-react).
- T-13.39 Stable URL fragments: #/element/<id>, #/diagram/<id>.

Backlog (P2 — explorer polish):
- T-13.40 Breadcrumb above the canvas (Project / Package / Element / Diagram).
- T-13.41 Multi-select in the tree (Shift/Cmd-click) + batched ops.
- T-13.42 Lazy-load very large branches (>200 children).

Backlog (P2 — original completeness):
- T-13.11 SysMLv2 text import/export surfaced in UI menus
- T-13.12 Multi-project management
- T-13.13 Diagrams section in project tree   (superseded by T-13.37)
- T-13.14 API-key first-run nudge on Open Chat
- T-13.15 Keyboard-shortcut help dialog
- T-13.27 Handle-stroke colour (restore visible outline once `card` lands).
- T-13.28 Selection-ring contrast (bump `ring-primary/30` → `/50`).

Gate (must pass before Phase 13 closes):
- Playwright spec that opens the app cold and, using ONLY user-facing
  affordances, creates a diagram per viewpoint, authors one element per
  viewpoint, saves, reloads, and asserts all eight viewpoints populated.
- Per-element-kind computed-style invariants: each node body has
  `backgroundColor !== 'rgba(0,0,0,0)'`; each popover dialog same.
- Per-element-kind shape invariants: IBD port DOM has square geometry
  (not `border-radius: 9999px`); use-case node is an SVG ellipse.

QA capture artifacts: /tmp/qa_walkthrough/ + /tmp/qa_visual/ (screenshots +
computed-style JSON + button/input/testid inventories).

Invariants enforced by the Phase 13 gate (iter-531):
- exactly one element has ownerId === null and equals project.rootId
- every other element's ownerId resolves to an existing element
- every diagram has a context whose target element exists and whose kind
  is in the active viewpoint's acceptedContextKinds
- persisted schema contains no parent-side child arrays

Phase 14 (deferred from Phase 13, iter-531):
- Standard library import (KerML / SysML) using the Phase-13 hooks
  Package.isReadOnly and Project.libraryRootIds
- Namespace resolution + `import` directive in SysMLv2 text round-trip

## Decisions log
- 2026-05-14 (iter-705): Discovered `pnpm typecheck` (= `tsc --noEmit` on
  root tsconfig.json with files=[] + references) is a no-op; real errors
  only surface via `tsc -p tsconfig.app.json` or `tsc -b`. Defer fixing
  the npm script until the explorer-foundation cascade clears, otherwise
  CI on this branch would block before the migration completes. Recorded
  in docs/CONTEXT.md.
- 2026-05-14 (iter-532): Bundle T-13.16 + T-13.17 in PR #253 per AGENT.md.
  Chat @visual baselines regenerated against a `--mode test` preview build
  (production build strips the `window.__llm` seam; `vite dev` in the
  podman container trips ENOSPC on file watchers). Procedure recorded in
  scripts/regen-chat-baselines.sh and docs/CONTEXT.md.

## Next action
Wait for PR (T-13.05b Cmd-K unified ranked list, #311) CI. No
committed visual baseline captures the modal palette so no baseline
regen is anticipated. After this merges, the natural next slice is
**T-13.05c** (inspector / surface-scoped actions — e.g. "Create
representation" only on a Block when active surface is the project
tree, "Add port" only on a PartUsage on IBD, etc.) — that's where
the registry's typed-context approach starts paying real
discoverability dividends. Alternatives if a quick win is desired
instead:
- T-13.06 (disabled-toolbar-button reason tooltips, P1) — small,
  self-contained; good for a quick iteration.
- T-13.10 (undo/redo toolbar buttons, P1) — buttons already work via
  keyboard; this surfaces the same actions in the toolbar.

Backlog (P1 notation conformance) status after T-13.26:
- T-13.18 ✓, T-13.19 ✓, T-13.20 ✓, T-13.21 ✓, T-13.22 ✓,
  T-13.23 ✓, T-13.24 ✓, T-13.25 ✓, T-13.26 ✓. Tier CLOSED.
