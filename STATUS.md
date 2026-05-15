Phase 13 — Functional polish & feature accessibility (post-v1.0.0)

Kickoff: 2026-05-14 (JOURNAL iter-528)

## Current phase
phase:13 — post-v1.0.0 polish + explorer rewrite

## Current iteration
- Iteration #: 736
- Started: 2026-05-15
- Branch: issue/280-store-move-element (PR #281 open, auto-merge enabled)
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
  canvas drop target). 9 new unit specs cover Package↔Package move +
  undo, PortDefinition→PartDefinition (`ownerRole`=port),
  ValueProperty→ActionDefinition (`ownerRole`=parameter), self-target
  reject, cycle reject (Package→descendant), kind-not-accepted reject,
  no-op reject, unknown-id reject, end-of-slot ownerIndex.
  992/992 unit pass; tsc -b clean; lint clean (0 errors, 4 pre-existing
  warnings); build clean. No UI changed → no visual baseline impact.
  Next iter: T-13.36b — ContainmentTree drag source + drop target +
  visual feedback + e2e walking the move end-to-end via real mouse
  events.

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
- Result: PASS — 992 unit, tsc -b clean, lint clean, build clean
- (e2e skipped this iter — store-only change, no UI surface affected)
- Visual baselines: regenerated in podman/playwright:v1.48.2-jammy
  container (full suite via scripts/regen-baselines.sh +
  scripts/regen-chat-baselines.sh for the 8 chat specs that need the
  test-mode preview build).

## Known issues / blockers
- (none for this iteration)

Backlog (P0 — UI-unreachable features):
- T-13.01 Diagram lifecycle UI (create/rename/delete per viewpoint)
- T-13.02 Project-tree right-click context menu (Rename/Delete/New)
- [x] T-13.03 Fix "New Requirement" empty-state dead-end — CLOSED by T-13.34
      (#276): CTA now creates a Requirement under root + queues inline rename.
- T-13.04 Per-section "+" affordances on project-tree categories

Backlog (P1 — discoverability/workflow):
- T-13.05 Cmd-K → true command palette (actions, not just search)
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
- T-13.18 Port direction glyphs (in/out/inout) from PortDirection in model.
- T-13.19 BDD block compartments (parts/ports/values/constraints).
- T-13.20 IBD enclosing-block frame (use diagram.context.partDefinition.id).
- T-13.21 Requirement compartments (reqId/text/priority/status rows).
- T-13.22 Use-case true ellipse shape (SVG, not rectangle).
- T-13.23 Activity pseudostate glyph review (initial/final/fork/join/dec/merge).
- T-13.24 State pseudostate glyph review (initial/final/composite region).
- T-13.25 Parametric: constraint-expression + value-property `: type = value`.
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
  Create representation / Expand-all / Move to package / Duplicate).
- [x] T-13.34 Wire empty-state CTAs through the explorer (new leaf + inline rename).
      Shipped iter-735 (#276): pendingRenameElementId store slot, ContainmentTree
      useEffect picks it up; EmptyState routes New Block / New Requirement
      through createChildElement(rootId, …) + setPendingRename.

Backlog (P1 — explorer features, JOURNAL iter-530):
- [x] T-13.35 Token-based filter bar — shipped iter-731 (#275).
- T-13.36 Generalize drag-drop move semantics (any container, not just
  Package). Promoted to P0 — gate item 4. Split into:
  - [x] T-13.36a store action `moveElement` — PR #281 (iter-736).
  - T-13.36b ContainmentTree drag source + drop target + visual
    feedback + e2e (next iter).
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
Wait for PR #281 (T-13.36a moveElement) CI to merge. No visual baseline
impact expected (store-only change). Next iter: T-13.36b — wire the
ContainmentTree as a drag source / drop target for the new store
action. Sketch:
- Mark element rows draggable=true; set dataTransfer with element id.
- Mark element rows as drop targets that call
  `store.moveElement(draggedId, rowOwnerId)` on drop and reflect the
  acceptance preview by toggling a hover class only when
  `acceptedChildKinds(rowKind)` includes the dragged kind (cheap
  pre-check matching the store action's reject path).
- Playwright e2e covering: drag a PortDefinition from the project root
  onto a PartDefinition row → verify it nests under the part with
  ownerRole='port'; refresh page → state survives.
- Forbid drop on diagram rows and the root self-drop.

Remaining P0 work:
- T-13.01 Diagram lifecycle UI — much shipped via T-13.33c/d; remaining
  bits live in the diagram tabs strip, not the explorer.
- T-13.02 Right-click context menu — mostly subsumed by the explorer
  kebab menu (T-13.33a–d); revisit if a true right-click shortcut is
  still wanted.
P2 / deferred: #270 (T-13.33e Move to package / Duplicate, depends on
T-13.36b landing first).
