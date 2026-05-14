Phase 13 — Functional polish & feature accessibility (post-v1.0.0)

Kickoff: 2026-05-14 (JOURNAL iter-528)

## Current phase
phase:13 — post-v1.0.0 polish + explorer rewrite

## Current iteration
- Iteration #: 701
- Started: 2026-05-14
- Branch: issue/253-card-tokens-square-ports
- Working on: PR #254 — prior CI run 25848479284 finished SUCCESS at
  07:59:33Z but mergeStateStatus was BEHIND. Ran `gh pr update-branch 254`
  this iteration; branch now merged with main, CI rerunning, state
  BLOCKED awaiting required check. Auto-merge SQUASH stays armed.

## Last test run
- Command: pnpm typecheck && pnpm lint && pnpm test:unit && pnpm build && pnpm test:e2e (visual skipped on darwin per playwright.config grepInvert)
- Result: PASS — 875 unit / 458 e2e
- Visual baselines: regenerated in podman/playwright:v1.48.2-jammy
  container (full suite via scripts/regen-baselines.sh +
  scripts/regen-chat-baselines.sh for the 8 chat specs that need the
  test-mode preview build).

## Known issues / blockers
- (none for this iteration)

Backlog (P0 — UI-unreachable features):
- T-13.01 Diagram lifecycle UI (create/rename/delete per viewpoint)
- T-13.02 Project-tree right-click context menu (Rename/Delete/New)
- T-13.03 Fix "New Requirement" empty-state dead-end (auto-create req diagram)
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
- T-13.34 Wire empty-state CTAs through the explorer (new leaf + inline rename).

Backlog (P1 — explorer features, JOURNAL iter-530):
- T-13.35 Token-based filter bar (reuse commandPaletteSearch scorer).
- T-13.36 Generalize drag-drop move semantics (any container, not just Package).
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
- 2026-05-14 (iter-532): Bundle T-13.16 + T-13.17 in PR #253 per AGENT.md.
  Chat @visual baselines regenerated against a `--mode test` preview build
  (production build strips the `window.__llm` seam; `vite dev` in the
  podman container trips ENOSPC on file watchers). Procedure recorded in
  scripts/regen-chat-baselines.sh and docs/CONTEXT.md.

## Next action
Wait for PR #254 CI rerun (triggered iter-641 after branch update).
On green + auto-merge, pick next P0 task (likely T-13.29 —
start of explorer foundation bundle: ownerId as single source of
truth, explicit root Package, registry parentOf/childrenOf, codemod
readers).
