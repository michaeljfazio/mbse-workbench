# docs/CONTEXT.md — Discovered facts

Append-only, high-signal log of things about this codebase or its stack that
are **not obvious from reading the code**. Future iterations read this file
at the start of every loop, so add facts here instead of re-discovering them.

Each entry is one paragraph max, dated, and explains *why* it matters.

## Discovered facts

- **2026-05-11** — Repo name is exactly `mbse-workbench` (see AGENT.md
  "Phase 0 → Scaffold steps"). Pages base path is `/mbse-workbench/` in
  production builds; `vite.config.ts` already wires this. Any router /
  asset / link code must use `import.meta.env.BASE_URL`, never a
  hard-coded `/`.

- **2026-05-11** — React Flow v12 is imported from `@xyflow/react`, not
  `reactflow`. `nodeTypes` and `edgeTypes` must be module-scoped or
  memoized; passing inline objects re-renders the canvas every state
  change and looks broken even when correct.

- **2026-05-11** — `@xyflow/react` v12.3.x integration notes (verified
  against pinned docs via context7 before Phase 2):
  - **CSS import.** Must `import '@xyflow/react/dist/style.css'` once at
    app entry. Without it, edges, handles, and selection boxes silently
    don't render. The `<ReactFlow>` parent container also needs explicit
    `width`/`height` — RF reads container size directly.
  - **Zustand wiring.** Do NOT use `useNodesState`/`useEdgesState` (local
    state). Drive `nodes` and `edges` as props from the store and expose
    `onNodesChange` / `onEdgesChange` / `onConnect` from the store using
    `applyNodeChanges` / `applyEdgeChanges` / `addEdge`. **But** in this
    project every mutation goes through the command bus — RF's onChange
    handlers translate node/edge changes into command-bus dispatches,
    not direct state writes.
  - **`onConnect` signature** is `(connection: Connection) => void`
    where `Connection = { source, sourceHandle, target, targetHandle }`.
    Validate before applying via the `isValidConnection` prop (typed
    edge-kind compatibility check).
  - **Node dimensions.** Use top-level `node.width` / `node.height` (not
    `node.style.width/height`) — required for SSR and used by layout
    engines. Forgetting this breaks dagre offset math silently.
  - **Delete key.** Built-in. Default `deleteKeyCode` is `'Backspace'`;
    override to `'Delete'` if needed. `onNodesDelete` / `onEdgesDelete`
    fire on delete — wire them to command-bus delete commands.
  - **`nodrag` / `nopan` CSS classes.** Any interactive element inside a
    custom node or edge (input, button, handle) must carry `nodrag` (or
    `nopan` where appropriate) or React Flow intercepts pointer events.
  - **`ReactFlowProvider`.** `useReactFlow` (for `fitView`,
    `screenToFlowPosition`, etc.) requires the calling component to be
    a descendant of `<ReactFlowProvider>` *or* of `<ReactFlow>` itself.
    Sibling toolbars need an explicit provider wrap.
  - **Strict mode + dagre.** Construct a fresh `dagre.graphlib.Graph()`
    per layout call — React 18 strict-mode double-invocation will
    corrupt a reused graph instance.
  - **NodeProps generic.** Type custom node components as
    `NodeProps<MyNode>` where `MyNode = Node<DataShape, 'typeName'>`.
    v12 adds `selectable` / `deletable` / `draggable` / `parentId` to
    the props.

- **2026-05-11** — `npm run check` is the canonical CI gate and runs
  typecheck + lint + unit + build + e2e in that order. The Playwright
  suite contains the functional, visual (`@visual`-tagged), and
  accessibility (`@a11y`-tagged) specs in one invocation across the
  `chromium` and `webkit` projects.

- **2026-05-11** — Branch protection on `main` requires the `check` job
  to pass. The repo has auto-merge enabled at repo level; PRs land via
  `gh pr merge --auto --squash`. Never push directly to `main` and
  never use `--no-verify` / `--force`.

- **2026-05-11** — Metamodel is split: 19 element kinds in
  `src/model/elements.ts` (`ModelElement` discriminated union), 9 pure
  edge kinds in `src/model/edges.ts` (`ModelEdge`). `ConnectionUsage`,
  `ItemFlow`, `Transition` stay in elements (named, selectable) but
  carry `sourceId`/`targetId` directly — they render as edges without
  being in `ModelEdge`. To add a new kind, follow the checklist in
  `docs/adr/0002-metamodel-shape.md`. The exhaustive-switch tests in
  `tests/unit/model/{elements,edges}.test.ts` make missing-kind drift
  a compile-time error via `assertNever`.

- **2026-05-11** — IDs are branded strings (`ElementId`, `EdgeId`,
  `UserId`, `ProjectId`) defined in `src/model/id.ts`. The factory is
  intentionally absent in #17 — issue #18 (registry) introduces
  `crypto.randomUUID`-backed creators. Tests cast via
  `tests/unit/model/helpers.ts` (`mkElementId`, `mkEdgeId`,
  `mkUserId`); production `src/model/` code carries no `as` casts.

- **2026-05-11** — Command bus events carry `{ command, payload }` where
  `payload` is the inverse of `command`. This makes the append-only event
  log self-undoable: replay any event's `payload` to undo it. The undo
  and redo stacks themselves hold `{ forward, inverse, actor }` triples;
  undo / redo just `applyOnly` (no re-capture) and swap stacks. Delete-
  element's inverse is a `compound` of `create-element` + one `link` per
  incident edge captured at apply time. Redo of delete re-applies the
  original forward command (registry cascades again).

- **2026-05-11** — `ModelRepository` is a thin async port:
  `load(projectId) / save(project) / list()` per AGENT.md directive § 3.
  `InMemorySessionRepository` in `src/repository/sessionStorage.ts`
  stores each project as plain JSON at `mbse:v1:project:<id>` and scans
  matching keys for `list()`; key prefix is versioned so future
  migrations bump `v1` → `v2`. `setItem` quota failures are detected by
  `err.name === 'QuotaExceededError'` (or Firefox's
  `NS_ERROR_DOM_QUOTA_REACHED`) and surfaced as `StorageQuotaError`.
  `load()` of a missing OR malformed entry rejects with
  `ProjectNotFoundError` — list() silently skips malformed entries so
  one bad project does not blind the picker. Dates are stored as ISO
  strings; the Repository never deals in live `Date` objects.

- **2026-05-11** — Collaboration seams live in `src/collab/`, split per
  responsibility: `user.ts` (`User = { id, displayName, color }` and
  `createSessionUser()` factory; deterministic color via hash of `id` into
  `USER_COLORS`), `presence.ts` (`PresenceStore` with set/get/all/subscribe
  — empty `setSelection` clears the presence so `allPresences()` omits
  cleared users), `provider.ts` (`CollaborationProvider` + `NoopCollaborationProvider`),
  `permissions.ts` (`PermissionAction` / `PermissionHook` / `allowAll` /
  `can`). `can` is the wired default: returns `true` unless `target.ownerId`
  is set and differs from `user.id`, which gives Phase 1 a real seam for
  future multi-user permissions even though single-user mode never sets
  `ownerId`. The command bus accepts `provider?: CollaborationProvider`
  (defaults to `NoopCollaborationProvider`) and publishes every successful
  dispatch/undo/redo event to it post-apply — denied permissions throw
  before publish, so the provider only sees committed events.

- **2026-05-11** — Workspace shell architecture (issue #30): the three-pane
  shell lives under `src/workspace/` (Workspace + Header + ProjectTreePane +
  CanvasPane + SidebarPane + Divider). State sits in a Zustand store
  (`src/workspace/store.ts`); `useWorkspaceStore.getState().bootstrap({
  repository, user })` is called once from `main.tsx` before render. The
  store owns the `ElementRegistry`, `CommandBus`, `CollaborationProvider`,
  the active `Project`, the in-memory `Diagram[]` (one per open tab), the
  pane widths, and the inspector-tab selection. Pane widths are persisted
  to sessionStorage under `mbse:v1:workspace:layout` so resize survives
  reload. `resetWorkspaceStoreForTests()` wipes data fields back to the
  initial snapshot without touching the action closures — call it in
  `beforeEach`/`afterEach`. The `Viewpoint<T>` interface and
  `ViewpointRegistry` live in `src/viewpoints/`; the BDD stub registers
  there but renderNode/renderEdge are no-ops until #31.

- **2026-05-11** — Visual snapshot baselines (Playwright
  `toHaveScreenshot`) are pinned to the **Linux** renderer used by GitHub
  Actions `ubuntu-latest`. Local agents on darwin would diff against the
  Linux baselines and flap on font hinting differences, so
  `playwright.config.ts` sets `grepInvert: /@visual/` whenever
  `!CI && platform !== 'linux'`. The visual gate still runs in CI. The
  snapshot path template moves all baselines under
  `tests/e2e/__screenshots__/{testFileName}/{arg}-{projectName}.png` so
  diffs live in a single committed tree (no per-spec sibling
  `*-snapshots/` folders). Generating new baselines locally on darwin
  requires a Linux container: `mcr.microsoft.com/playwright:v1.48.2-jammy`
  via `podman run --platform linux/arm64` (amd64 emulation flakes esbuild
  on Apple Silicon — arm64 native works, font rendering matches CI within
  the configured `maxDiffPixelRatio: 0.01` tolerance). Inside the
  container, **`rm -rf node_modules dist` and reinstall fresh**, build,
  then `vite preview --host 0.0.0.0 --port 5173` (NOT `vite dev` — Vite's
  file watcher hits `ENOSPC` in the container). Point Playwright at the
  preview via `PLAYWRIGHT_BASE_URL=http://localhost:5173 pnpm exec
  playwright test --update-snapshots --grep @visual`. After the container
  exits, `rm -rf node_modules && pnpm install --frozen-lockfile` to
  restore the host's darwin-arm64 binaries.

- **2026-05-11** — `Viewpoint<T>` is the typed seam every viewpoint plugs
  into in `src/viewpoints/types.ts`. After issue #31 the interface
  uses `nodeTypes: NodeTypes` and `edgeTypes: EdgeTypes` (the exact
  ReactFlow upstream types) plus two mappers `nodeTypeFor(element)`
  and `edgeTypeFor(edge)` that translate from model `kind` to the
  ReactFlow type string. The previous `renderNode` / `renderEdge`
  hooks are gone — they were a placeholder that ReactFlow's typed
  custom-node/edge approach replaces cleanly. Module-scope the
  `nodeTypes`/`edgeTypes` records (or freeze them at module load)
  per docs/CONTEXT.md's earlier stability note. `CanvasPane` reads
  the active viewpoint and passes its `nodeTypes`/`edgeTypes` straight
  to `<ReactFlow>`. Future viewpoints just register a new `Viewpoint`
  config — no core changes needed.

- **2026-05-11** — Avoid circular imports between `@/workspace/store`
  and `@/viewpoints/bdd`: BlockNode (under viewpoints) cannot import
  `useWorkspaceStore` at module load, because the store itself
  imports viewpoints during its own module init, creating a cycle
  that leaves the BDD `Viewpoint` const undefined at the moment the
  store's singleton registry tries to register it. Solution: the
  store passes per-element callbacks (e.g. `onRename`) through the
  ReactFlow node `data` field. Custom nodes consume only their
  `NodeProps<T>['data']` and never reach back into the store
  directly. Pattern applies to every viewpoint, not just BDD.

- **2026-05-11** — `vite preview` re-reads `vite.config.ts` to
  determine the base path it serves under, even when serving a build
  that already has `--base=/` baked in. Without that, preview mounts
  at `/mbse-workbench/` and `page.goto('/')` from Playwright 404s,
  producing blank screenshots. The visual-baseline run-script in the
  Linux container therefore sets `VITE_BASE_OVERRIDE=/` on both the
  `vite build` and `vite preview` invocations. `vite.config.ts` honors
  `process.env.VITE_BASE_OVERRIDE` ahead of its `mode` check so the
  override is the single switch. (Production CI builds for GitHub
  Pages do **not** set the override, so they keep
  `base: '/mbse-workbench/'`.)

- **2026-05-11** — Per-diagram positions: each `Diagram` (per
  `src/workspace/diagram.ts`) carries a `positions:
  Record<ElementId, {x, y}>` map. The same element can therefore sit
  at different coordinates in BDD and IBD (or in two BDDs) without
  duplicating the element in the registry. The workspace store's
  `setNodePosition(diagramId, elementId, pos)` is a direct state
  update — not a command-bus dispatch — because moves are
  presentation-only and shouldn't pollute the model event log. Undo
  of a *create-block* via the command bus cascades through the
  registry's `remove(id)` which also frees the position entry from
  the next snapshot pass. #34 (dagre + manual position persistence)
  will keep positions on `Diagram` but add a serializer when
  positions need to round-trip through the repository.

- **2026-05-11** — Edge markers (composition diamond, generalization
  triangle) are rendered as per-edge SVG `<marker>` defs inside each
  custom edge component (`CompositionEdge`, `GeneralizationEdge`),
  not via ReactFlow's built-in `MarkerType`. ReactFlow's built-ins
  only cover open/closed arrows. Each marker uses a unique id
  (`bdd-{kind}-{shape}-${edgeId}`) and is referenced by `<BaseEdge
  markerStart|markerEnd={"url(#...)"}>`. `markerStart` for
  composition (diamond on the *whole* side) and `markerEnd` for
  generalization (hollow triangle on the *parent* side). Use
  `orient="auto-start-reverse"` so the marker rotates with the edge
  direction.

- **2026-05-11** — Block-node label was originally a `<button>` so
  double-click could open the inline editor. That triggers
  axe-core's `nested-interactive` (serious) because ReactFlow's
  outer node wrapper already has `role="button" tabindex="0"`. Fix:
  the label is a non-interactive `<div onDoubleClick=...>`. Inline
  editor is still reachable via double-click (mouse) and remains
  keyboard-friendly: focusing the node and pressing F2 will hook in
  during #32 (inspector). DO NOT make custom-node children
  interactive (button/link/input outside of explicit editor mode) —
  they'll all hit nested-interactive.

- **2026-05-11** — Drag-create gotchas for ReactFlow handles in
  Playwright tests:
  1. **CSS test-id collisions.** `data-testid="bdd-block-${id}"`
     plus `bdd-block-label-${id}` plus `bdd-block-input-${id}`
     means a `^=bdd-block-` selector matches the outer block AND
     its children. Use a more discriminating selector like
     `[data-testid^="bdd-block-"][data-element-id]` to count
     blocks.
  2. **Cascade overlap blocks handles.** A small cascade offset
     between newly-created blocks leaves the source's bottom
     handle hidden under the next block. Cascade horizontally by
     `block_width + margin` (40 px), and vertically by
     `block_height + margin` (60 px) so handles are always
     reachable.
  3. **`nodrag` on the label intercepts node drags.** The drag-to-
     move helper must grab the node by a non-nodrag area (the
     stereotype band at the top of the block works). Otherwise
     the click hits the label and Playwright's actionability
     check fails after retries.
  4. **Handle z-index.** Tailwind class `!z-10` on the handle
     ensures it sits above the block's own children so a click on
     the very top edge actually hits the handle, not the content.

- **2026-05-11** — `ElementRegistry.update<K>(id, patch)` whitelists the
  optional ElementBase fields (`ownerId`, `documentation`) so a patch can
  set them on an instance that was created without those properties. The
  kind-mismatch guard intentionally checks `key in existing OR key in
  ELEMENT_BASE_OPTIONAL_FIELDS` — without the whitelist, the first
  documentation edit on a block would throw because the property literally
  doesn't exist on the freshly-created object. Inverse capture in the
  command bus still works: it reads `previousValues[key] = source[key]`,
  which is `undefined` for unset optional fields, and undo applies that
  undefined back. Adding a new optional base field in the future requires
  adding its name to `ELEMENT_BASE_OPTIONAL_FIELDS`.

- **2026-05-11** — Workspace autosave: after every committed `bus.dispatch`
  / `bus.undo` / `bus.redo` event, the store's `bus.subscribe` handler
  calls `get().saveProject()`. The repository is sessionStorage-backed so
  the call is effectively synchronous; failures are swallowed in the
  repository layer. Tests that spy on `repository.save` should attach the
  spy AFTER `bootstrap()` returns, because bootstrap itself calls
  `repository.save` once when creating a fresh "Untitled Project" and
  that call happens before the spy is in place.

- **2026-05-11** — Global Cmd/Ctrl+Z (undo) and Cmd/Ctrl+Shift+Z (redo)
  are wired in `Workspace.tsx` via a `window.addEventListener('keydown')`
  effect that checks `metaKey || ctrlKey`. Shortcuts are suppressed when
  `document.activeElement` is an `INPUT`/`TEXTAREA`/`SELECT` or any
  `contentEditable` host so that the browser's native input-undo handles
  in-place text edits. The Inspector's name field and description
  textarea therefore get native-undo for keystrokes; once focus leaves,
  Cmd-Z falls through to the workspace's model undo stack. Cmd-Y is
  treated as an alias for redo.

- **2026-05-11** — Node position changes are first-class **command-bus
  commands** (`update-diagram-position`), not direct state writes. This
  supersedes the earlier "direct mutation" decision so drag and auto-layout
  both undo with a single Cmd-Z. The bus reads/writes positions via the
  `DiagramPositionStore` port (`src/commands/diagramPositions.ts`); the
  workspace store implements it on top of its `diagrams` array via a
  closure-bound `getPosition`/`setPosition`. `delete-element` deliberately
  does NOT clear the position entry — its inverse therefore doesn't need
  to restore it, and undo of a delete brings the element back to where
  it was. `createBlock` wraps create-element + initial position in a
  compound so create-and-place is one undo step. The "no-op if unchanged"
  guard in `setNodePosition` keeps mouse-up-without-move drags out of
  the undo stack.

- **2026-05-11** — The Inspector container stamps `data-element-id` on its
  outer div when a block is selected, so the bare attribute selector
  `[data-element-id="..."]` matches two elements (the BDD node AND the
  inspector). Always scope by the BDD-block test id in Playwright
  selectors: `[data-testid="bdd-block-${id}"]`. Recorded after a strict-
  mode locator violation in the #34 spec.

- **2026-05-11** — `Project.diagrams` is the new persistence anchor for
  per-view positions (`Diagram.positions: Record<ElementId,{x,y}>` round-
  trips through the `InMemorySessionRepository`). On `load()`, missing
  `diagrams` is normalised to `[]` for forward-compat with pre-#34
  persisted entries; the workspace `bootstrap` then seeds a default Main
  BDD diagram if the array is empty. ElementId branding is compile-time
  only, so JSON.parse keeping the keys as plain strings is harmless for
  lookups.

- **2026-05-11** — Project tree (issue #33): kind groups are computed from
  the union of (a) kinds present in the registry's elements and (b)
  `paletteItems[].elementKind` across **all** registered viewpoints, so an
  empty BDD project still shows the "Blocks" group as a drop affordance.
  A group is `draggable` only when its kind belongs to the **active**
  viewpoint's `paletteItems`. The drag payload uses the custom MIME type
  `application/x-mbse-element-kind` (exported as `PROJECT_TREE_DRAG_TYPE`
  from `@/workspace/tree/ProjectTree`); the canvas drop target reads it
  in `onDragOver` to call `event.preventDefault()` (without this the
  browser refuses to fire `drop`), validates the kind against the
  viewpoint's `acceptedElementKinds`, and translates the screen-space
  drop coordinates via `reactFlow.screenToFlowPosition` before centering
  the new node on the cursor (offset by `BDD_BLOCK_WIDTH/2` and
  `BDD_BLOCK_HEIGHT/2`). The drop also auto-selects the new element so
  the inspector reflects it immediately.

- **2026-05-11** — `ProjectTree` uses a derived-not-state focus key
  (`explicitFocusKey ?? visibleKeys[0]`) so the roving tabindex always
  has a valid landing spot without a state-syncing `useEffect`. The pane
  wrapper (`ProjectTreePane`, `aria-label="Project tree pane"`) is just
  the chrome; the inner `<div role="tree" aria-label="Project tree">`
  is the actual a11y tree node. Anything in tests looking for
  `getByRole('tree', { name: 'Project tree' })` resolves to the inner
  element — keep these names in sync if either changes.

- **2026-05-11** — Diagram export (`src/workspace/export/`): single source of
  truth is `buildDiagramSvg` (pure function over `{elements, edges, positions,
  viewpoint, nodeWidth, nodeHeight}`). PNG export rasterises that SVG through
  a `<canvas>` at 2× pixel ratio via `URL.createObjectURL` + `Image.onload` →
  `canvas.drawImage` → `canvas.toBlob`. The path is browser-only — jsdom
  can't rasterise SVG so the unit suite covers only the SVG builder and the
  slug helper. The Playwright spec (`tests/e2e/bdd-export.spec.ts`) is the
  end-to-end gate; it intercepts the download and asserts PNG signature plus
  SVG parse. Class names `mbse-node` / `mbse-edge` are the contract for the
  spec's node/edge counts — do NOT rename without updating both ends. The
  toolbar split-button (`ExportMenu`) closes on outside-pointerdown and
  Escape; menuitems trigger the download then close the menu. Filenames go
  through `slugifyDiagramName` (ASCII-only, dashes, ≤64 chars, falls back
  to `diagram`).

- **2026-05-11** — Visual-baseline tolerance is forgiving enough that
  adding a single toolbar button does not require a baseline refresh —
  the new ~80 px button width over the 1280×800 viewport is well under
  the configured `maxDiffPixelRatio: 0.01` (≈10 240 allowed px). Verified
  by running the visual suite in the Linux container after the Export
  button landed: all 12 baselines passed unchanged. Larger UI changes
  (whole-panel layout, new diagram regions, font/color tweaks) still
  need a deliberate baseline refresh per the recorded procedure.

- **2026-05-11** — Command-bus undo/redo history survives `page.reload()`.
  `Project.history: { undo: UndoEntry[]; redo: UndoEntry[] }` (in
  `src/repository/types.ts`) round-trips through `InMemorySessionRepository`;
  the workspace `saveProject()` snapshots `bus.getHistory()` on every
  autosave, and `bootstrap()` passes the loaded stacks to `createCommandBus`
  via `initialUndoStack` / `initialRedoStack`. `EMPTY_COMMAND_HISTORY` is
  the exported default. Legacy persisted entries that pre-date the field —
  and entries with a malformed `history` shape — normalise to empty stacks
  on load. `UndoEntry`s are plain JSON (`{ actor, forward, inverse }`) so
  no custom serialization is needed. Brand types like `ElementId` are
  compile-time only; JSON parse → plain string keys still match registry
  lookups by string equality. The Phase 2 gate (#36) depends on this so
  that "refresh → Cmd-Z → link gone" works per AGENT.md.

- **2026-05-11** — The `github-pages` environment has a `branch_policy`
  protection rule with `custom_branch_policies: true`. Out of the box
  only the `main` branch is in the allow-list, so the release workflow
  (which triggers on `vphase-*` / `v*.*.*` tags) is blocked at the
  `deploy-pages` step with "Tag X is not allowed to deploy to
  github-pages". Both tag patterns are now registered as
  `deployment-branch-policies` of type `tag` (vphase-* and v*.*.*) via
  the environments REST API. Adding a new release tag pattern in the
  future means adding it here too, or the deploy will silently fail
  with that exact error.

- **2026-05-12** — Axe `color-contrast` is computed against the page's
  *live* computed styles, which means it can sample a tab/button mid-CSS-
  transition immediately after a click and report a phantom "insufficient
  contrast" that doesn't reflect the final colour pair. Workaround in any
  `@a11y` spec that switches state right before the scan: wait for
  animations/transitions to settle with
  `await page.evaluate(async () => { await Promise.all(document.getAnimations().map((a) => a.finished)); });`
  before calling `AxeBuilder.analyze()`. Playwright's `animations: 'disabled'`
  only fires for screenshot capture — axe is not gated by it. Discovered
  while landing #49 (clicking an inactive tab to make IBD active flagged
  the active tab as 3.32:1 because the bg/text were still transitioning).

- **2026-05-12** — `PartUsageElement.portUsageIds: ElementId[]` was added in
  #50 to mirror `PartDefinition.portIds`. Without it there was no way to
  link a PartUsage instance to the PortUsage children it owns (PortUsages
  only know their PortDefinition type via `definitionId`). At creation
  time the workspace's `createPartUsage` action materialises one PortUsage
  per `PortDefinition` on the type and records their ids on
  `portUsageIds`. ADR 0003's "PortUsages as Handles" decision relies on
  this link: the IBD canvas renders one `<Handle>` per PortUsage with
  `id = PortUsage.id`. Future #51 (ConnectionUsage) will read
  `Connection.sourceHandle`/`targetHandle` as PortUsage ids.

- **2026-05-12** — Registry `update<K>` guard accepts patches for
  kind-specific optional fields via `KIND_OPTIONAL_FIELDS` table in
  `src/model/registry.ts`. Same pattern as `ELEMENT_BASE_OPTIONAL_FIELDS`
  but per-kind, so a first-time `multiplicity` (on PartUsage) or
  `direction` patch on a freshly-created element doesn't trip the
  kind-mismatch error. Add new optional kind fields to that table when
  introducing them. Discovered while landing #50.

- **2026-05-12** — When `setPartUsageMultiplicity`, `setPortDirection`, or
  any `update-element` command sets a per-kind field (not on
  `ElementBase`), the patch literal must be assigned through a typed
  `ElementPatch<'KindName'>` variable. The default `Command` union has
  `UpdateElementCommand<ElementKind>` where the patch is `Partial` over
  only the union-common fields. Inline object literals fail
  excess-property checks (TS 2353). Pattern:
  `const patch: ElementPatch<'PartUsage'> = { multiplicity: next };`
  then `bus.dispatch({ kind: 'update-element', id, patch }, user)`.

- **2026-05-12** — Visual baseline regen via the Linux container is
  scripted at `scripts/regen-baselines.sh` and runs inside
  `mcr.microsoft.com/playwright:v1.48.2-jammy` via `podman --platform
  linux/arm64`. The container's bundled Node 20.18 corepack has stale
  signing keys and rejects `corepack enable`; the script bypasses with
  `npm install --global pnpm@<packageManager-pinned-version>`. **Gotcha:**
  Playwright's `--update-snapshots` only rewrites a baseline when it
  detects a diff. If a stale dist or build cache survives between runs,
  the test can "pass" against the OLD baseline and silently skip the
  rewrite. Symptom: file mtime stays at the prior commit. Fix: delete the
  specific baseline files you intend to regenerate before invoking the
  container — then Playwright logs "A snapshot doesn't exist, writing
  actual" and the new file is written.

- **2026-05-12** — **arm64 podman emulation is NOT reliable for visual
  baselines on text-heavy screens.** Apple-Silicon-native arm64 rendering
  of the Playwright Jammy image produces fonts with subtly different
  hinting/anti-aliasing from the amd64 GitHub Actions runner. The
  per-glyph delta is small enough to stay under `maxDiffPixelRatio: 0.01`
  for screens with little text (the BDD baselines all passed), but the
  IBD screen with two PartUsage cards + port labels + a connection-edge
  label accumulates 9394 px of difference (ratio 0.02 — 2× the threshold).
  The earlier "matches CI within tolerance" note was over-confident; it
  only held for the screens that existed at the time. **Preferred
  baseline-generation workflow going forward:**
  1. First-time generation: regenerate in the arm64 container as before,
     commit, push.
  2. If CI fails on the new baseline, **do not retry the container
     regen** — instead, download the Playwright HTML report from the
     failed CI run (`gh run download <run-id> --name playwright-report
     --dir /tmp/...`) and lift the per-browser **actual** PNGs out of
     `data/`. The reliable name→sha1 map lives in `test.trace` inside
     the report's `data/<trace-hash>.zip`:
     ```bash
     unzip -p /tmp/<report>/data/<trace-hash>.zip test.trace \
       | python3 -c "import json,sys
     for line in sys.stdin:
         atts=json.loads(line).get('attachments')
         if atts:
             for a in atts: print(a.get('name'),'->',a.get('sha1'))"
     ```
     The `*-actual.png` row's sha1 is the file under `data/` to copy
     over the baseline. **Do NOT identify by file size** — the actual
     can be either larger or smaller than the expected (anti-aliasing
     differences sometimes compress worse, sometimes better). The
     expected sha1 *does* match the committed baseline bit-exactly,
     which is a useful cross-check.
  Both the chromium and webkit actuals from a single failed run are
  bit-exact representations of what CI will produce on the next run, so
  the second push will match within tolerance. Recorded after #51 PR
  #59's first CI run produced a 0.02-ratio diff that the arm64-regen
  procedure had silently green-lit; refined after #52 PR #61's webkit-
  only failure where the actual (54759 B) was 4KB *larger* than the
  expected (50572 B), invalidating the original size-based heuristic.

- **2026-05-12** — IBD ConnectionUsage (#51) wiring lessons:
  - **Element-as-edge layer.** `Viewpoint` gained
    `acceptedEdgeElementKinds: readonly ElementKind[]` and
    `edgeTypeForElement(element)` so per-viewpoint elements that render
    as ReactFlow edges (ConnectionUsage in IBD, ItemFlow next phase,
    Transition in state-machine) plug in without core changes. BDD's
    `acceptedEdgeElementKinds = []`. `CanvasPane.toFlowEdges` iterates
    `elements` and emits one Edge per matching kind, with `sourceHandle`
    / `targetHandle` set to the PortUsage ids. The PortUsage → PartUsage
    lookup uses `buildPortUsageOwnership(elements)` (O(N+ports)) called
    once per memo recompute.
  - **Spurious `select=true` from React Flow after onConnect.** When the
    user drags from a handle and drops on another handle, RF emits a
    stray `{type:'select', selected:true}` for the SOURCE PartUsage a
    few render ticks after onConnect. Without guarding, this leaks into
    the workspace store via `onNodesChange` and Backspace then deletes
    BOTH the new edge AND the source PartUsage. Fix: track
    `isConnectingRef` via `onConnectStart` / `onConnectEnd`, and in
    `onNodesChange` skip the select-diff branch while the ref is true.
    The ref is reset on a `setTimeout(…, 100)` from `onConnectEnd` —
    `queueMicrotask` is too short; RF fires the spurious select after
    the first reconciliation tick. The next drag flips it back to true
    synchronously, so the 100ms window is harmless.
  - **`onNodesChange` / `onEdgesChange` selection diffs gated by
    `hasSelectChange`.** Previously we computed `next.filter(selected)`
    on EVERY change (positions, dimensions). When something else set
    selection (e.g. `setSelection` from onConnect), the next
    position/dimension change would clobber it back to `[]`. Now both
    handlers only run the diff branch when `changes.some(c => c.type
    === 'select')`. Preserves element-as-edge selections set from
    outside RF.
  - **`isValidIbdConnection` + canonicalisation.** `isValidIbdConnection`
    enforces ADR-0003 typing (out↔in, inout↔anything, never in↔in or
    out↔out). `canonicalizeIbdConnection` flips `in→out` drags into the
    canonical `out→in` form before saving so persisted ConnectionUsage
    elements always have `sourceId` on the providing port.
  - **Workspace.tsx undo handler fires on metaKey OR ctrlKey.** Don't
    press BOTH `Meta+z` and `Control+z` in a test unless you want two
    undos. Pick `Control+z` for cross-platform single-undo tests.
  - **Edge `click({force:true})` doesn't select edges in RF v12.** The
    `BaseEdge` exposes a 1.5px stroke as its only hit target. Clicking
    the path with `force` lands on whatever's behind (typically the
    source node). For e2e selection of edges, rely on the auto-select
    set by `onConnect` rather than synthesising clicks. If a click is
    needed, add an `interactionWidth`-style wider invisible path to the
    custom edge component.

- **2026-05-12** — IBD ItemFlow (#52) wiring notes:
  - **Shift-modifier discrimination.** `IbdItemFlowEdge` rides the same
    `Connection`/handle plumbing as `ConnectionUsage`. The choice between
    the two is made in `CanvasPane.onConnect`: a `shiftHeldRef` (updated
    by a window-level `keydown`/`keyup` listener AND seeded from the
    `onConnectStart` native-event `shiftKey`) routes the drop to
    `connectItemFlow` instead of `connectPorts`. **`onConnectStart`'s
    event arg is a native DOM `MouseEvent | TouchEvent`, not React's
    synthetic** — typing it as `ReactMouseEvent` fails the
    `OnConnectStart` signature.
  - **Same typing rules as ConnectionUsage.** ItemFlow validity is
    enforced by the existing `canonicalizeIbdConnection`/`isValidIbdConnection`
    pair — the model fork happens after the canonicalisation step.
    `in` ↔ `in` and `out` ↔ `out` are still rejected; `in` → `out` is
    normalised so the stored ItemFlow's `sourceId` is the out/inout side.
  - **Edge visual: dashed stroke + arrowhead.** ItemFlow uses
    `strokeDasharray: '6 4'` and a per-edge `<marker>` triangle
    (`refX=11, refY=6, orient="auto-start-reverse"`, fill = stroke
    colour). ConnectionUsage stays solid + unmarkered, so the two are
    unambiguous on the canvas.
  - **Label preference: itemType > name.** The edge label renders
    `itemType` when set, falling back to the cascading default `flow1`,
    `flow2`, … name. Inspector's `ItemFlowExtras` section lets the user
    edit `itemType` (commits on blur or Enter). The Project tree
    automatically groups ItemFlow elements under an "Item flows" header.
  - **Registry already covers `itemType`.** `KIND_OPTIONAL_FIELDS.ItemFlow
    = {'itemType'}` was in place from the metamodel split; no registry
    change was needed for first-time itemType edits.

- **2026-05-12** — `@xyflow/react` v12.3.x multi-handle-per-node
  integration notes (verified via context7 against authoritative docs
  ahead of Phase 3 IBD first use, per AGENT.md directive 11):
  - **Multiple handles per side.** No special API. Render several
    `<Handle>` components on the same node; each carries the same
    `position={Position.Left|Right|Top|Bottom}` but a unique `id` and
    is positioned with inline CSS `style={{ top: '<pct>%' }}` (or
    `left` for top/bottom positions). React Flow centers each handle
    by default, so the CSS percentage override is the canonical
    placement mechanism. Example:
    `<Handle type="target" position={Position.Left} id="port-a" style={{ top: '30%' }} />`
  - **`Connection` shape with handle ids.** `onConnect` receives
    `{ source, sourceHandle, target, targetHandle }`. When handles
    carry an `id`, that string flows into `sourceHandle`/`targetHandle`
    on `Connection`. Use this to identify port endpoints in IBD's
    `ConnectionUsage`/`ItemFlow` creation — both edge-element kinds
    carry `sourceId`/`targetId` of the **PortUsage**, not the
    PartUsage, so the handle id should be the PortUsage id.
  - **No built-in label on `<Handle>`.** Render a label as a sibling
    `<span>` positioned next to the handle, OR pass children into the
    `<Handle>` itself (docs show this pattern for icon handles).
    Either works; the sibling approach keeps the handle's hit area
    pure.
  - **`isConnectable` and `isValidConnection` compose independently.**
    `isConnectable={false}` on a `<Handle>` blocks drag initiation
    from that handle entirely (handle still renders). `isValidConnection`
    (per-Handle or per-`<ReactFlow>`) fires during the drag and can
    block specific source/target pairs. Use `isConnectable` to
    permanently disable a port; use `isValidConnection` for
    direction-based typing.
  - **Edge creation flow unchanged in v12.** `onConnect(connection)`
    is still where new edges are added; the project's command bus
    intercepts this rather than calling `addEdge` directly. No v12.3-
    specific divergence found in docs.

- **2026-05-12** — IBD Cmd-Z cascade after tab-switch needs an explicit
  edge-layer wait. Reproducing the Phase 3 gate (#54) revealed that React
  Flow rebuilds the edge layer **one render tick after** the parts mount
  when you switch tabs: `[data-testid^="ibd-part-..."]` is in the DOM
  before `[data-testid^="ibd-edge-..."]` shows up. Querying counts in
  between (e.g. inside a tight Cmd-Z `undoUntilCount` loop) reports zero
  edges even though the model still has them, and the loop returns early
  thinking nothing is left to undo. Fix: after `await page.getByRole('tab', ...).click()`,
  assert `expect(parts).toHaveCount(n)`, `expect(connectionEdges).toHaveCount(m)`,
  AND `expect(itemFlowEdges).toHaveCount(k)` before starting any
  count-driven loop. This is specifically a tab-switch concern; first-time
  renders (e.g. after `page.goto('/')`) wait on the same Playwright
  `expect` polling cycle and don't show the gap.

- **2026-05-12** — PartUsage's PortUsage list is materialised at
  `createPartUsage`-time and is NOT propagated when ports are later added
  to the PartDefinition. So in workflows like "create the Cylinder block
  → drop two Cylinder PartUsages → add a port to Cylinder", the existing
  PartUsages do not gain a handle for the new port. The wiring step
  `isValidIbdConnection` then rejects connections to that PortUsage
  because the handle id isn't in either parent's `portUsageIds`. Tests
  that exercise this slice should add ports BEFORE the parts that need
  them. A future enhancement could either (a) extend
  `addPortToDefinition` to cascade a PortUsage create into every existing
  PartUsage typed by the definition, or (b) compute the PartUsage's port
  list dynamically from the definition's `portIds` rather than caching it
  — either would let the gate run in its literal order.

- **2026-05-12** — Cross-diagram context menu (#53) wiring notes:
  - **ReactFlow context-menu hooks.** `<ReactFlow onNodeContextMenu>` and
    `onEdgeContextMenu` fire with `(event: React.MouseEvent, node|edge)`
    on right-click. Always call `event.preventDefault()` on the path
    that opens the app menu, or the browser-native context menu also
    shows. Skip `preventDefault()` when the menu has zero nav targets
    so the user still gets the browser default (copy/search/etc.).
  - **`text-muted-foreground` on `bg-card` fails WCAG AA at normal
    weight.** Computed contrast is 4.34:1 vs the 4.5:1 threshold. Any
    popover/menu description text scanned by axe-core must use a
    darker shade — `text-foreground/75` (≈75% opacity of near-black on
    `--card`) clears the bar with margin. The existing
    `EdgeKindPopover` and `PartUsageTypePopover` share the same
    pattern and are not yet axe-scanned in open state; if/when they
    are, swap their description spans to the same opacity-based class.
    Bold + uppercase headers (`text-xs font-semibold uppercase`) are
    exempt because axe treats them as "large/bold" needing only 3:1.
  - **Context menu nav targets are derived, not stored.** The pure
    `deriveNavTargets({ element, diagrams, activeDiagramId, elements,
    viewpoints, actions })` in `src/workspace/contextMenu/navTargets.ts`
    returns ordered `NavTarget[]` with cross-kind hops first
    (BDD PartDefinition → IBD, IBD PartUsage → BDD), then same-element
    nav for every other diagram where the element's id is an own key
    in `Diagram.positions`. Use `Object.prototype.hasOwnProperty.call`
    so prototype-inherited keys don't accidentally match.
  - **Store seam.** `showDefinitionOnBdd(partUsageId)` switches active
    diagram to the first BDD and selects the typing PartDefinition;
    `navigateToElementOnDiagram(elementId, diagramId)` is the generic
    same-element form. Both are direct `set()` updates — no command
    bus dispatch — because navigation is presentation state, not
    model state.
