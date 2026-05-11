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
