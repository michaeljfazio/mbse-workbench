# docs/CONTEXT.md — Discovered facts

Append-only, high-signal log of things about this codebase or its stack that
are **not obvious from reading the code**. Future iterations read this file
at the start of every loop, so add facts here instead of re-discovering them.

Each entry is one paragraph max, dated, and explains *why* it matters.

## Discovered facts

- **2026-05-16 (iter-774, #161 root cause)** — When `onConnect` in
  `CanvasPane.tsx` creates an edge-element (Transition / ConnectionUsage /
  ItemFlow / ControlFlow / ObjectFlow / RequirementTrace) and immediately
  calls `setSelection([newId])`, React Flow v12 asynchronously emits a
  stray `{type:'select', id:<newEdge>, selected:false}` change a few
  render ticks later — its internal edge state hasn't propagated the
  externally-driven `selected:true` we put on the edges prop. Without a
  guard, `onEdgesChange` runs that change through `applyEdgeChanges` and
  `setSelection([])` clobbers the auto-selection. The fix mirrors the
  existing `isConnectingRef` guard from `onNodesChange` (which prevents
  the symmetric stray source-node-select from breaking Backspace
  semantics) into `onEdgesChange`, AND bumps the `onConnectEnd` cooldown
  from 100ms → 250ms because under workers=4 CI load the late emission
  lands past 100ms. Manifested as the long-running phase-6-gate
  `inspector-transition` flake (issue #161); iter-773 misdiagnosed it as
  a timing race and added a 15s wait that the actual clobber rendered
  inert. Always: imperative `setSelection` after `onConnect` MUST be
  protected by a connection-window guard, or auto-select silently
  evaporates.

- **2026-05-16 (iter-769, T-13.37 regression)** — `readLayout(storage)` in
  `src/workspace/store.ts` now returns `LayoutSnapshot | null`; null means
  the storage key was absent, i.e. this is a cold load (first session
  opening this project). The null vs non-null distinction is load-bearing:
  bootstrap opens *every* project diagram on cold load (the "open tabs"
  working set is meaningful only after the user curates it; before that
  the legacy "all diagrams are tabs" behavior matches expectations and
  keeps e2e seed patterns working), but with a persisted snapshot whose
  filtered open set is empty (user closed everything, or every formerly-
  open diagram was deleted) it falls back to the project's first diagram
  so the user is not stuck on the empty state across a reload. The
  triggering regression: T-13.37 (commit 35f9554) shipped a fallback that
  opened only `diagrams[0]` on cold load. Every e2e test that seeded a
  project with multiple diagrams (~159 specs) then hung 30s on
  `getByRole('tab', { name: '<second diagram>' })`. CI cancelled at the
  60-min cap; the "lift visual baselines from actuals" thread on iter-767
  and -768 was diagnosing the wrong symptom — `playwright-test-results`
  contained 471 `test-failed-1.png` screenshots but ZERO `-actual.png`
  files, meaning none of the failures were visual-snapshot drift. They
  were all functional `locator.click` timeouts cascading from the tabs
  regression. Fix in `bootstrap()` around line 1054.

- **2026-05-16 (iter-766, T-13.37)** — Playwright projects are split into
  functional + visual pairs (`chromium`, `webkit`, `chromium-visual`,
  `webkit-visual`) so visual specs can run with `retries: 0` while functional
  specs keep the global `retries: 2`. A baseline storm previously tripled
  the visual-spec wallclock on each retry and blew past both the 30- and
  60-min job caps (cancellations on runs 25933515121 and 25935089963 for
  PR #331). Retries don't help deterministic visual diffs — a real
  regression diffs identically every time, so retrying is pure waste.
  `snapshotPathTemplate` is overridden on each `-visual` project to keep
  baseline file names `{arg}-chromium.png` / `{arg}-webkit.png` (rather
  than `{arg}-chromium-visual.png`), so the existing committed baselines
  remain valid. `SKIP_VISUAL_LOCALLY` (config-level `grepInvert`) still
  drains the `-visual` projects entirely on non-CI macOS hosts; gate
  fires only in CI.

- **2026-05-14 (iter-705, #255)** — `pnpm typecheck` is a SILENT NO-OP.
  The root `tsconfig.json` declares `"files": []` plus `references` to
  `tsconfig.app.json` and `tsconfig.node.json`. Plain `tsc --noEmit`
  with `files: []` typechecks zero files and exits 0; project references
  only get walked under `tsc -b` / `tsc --build`. To see real errors,
  run `npx tsc -p tsconfig.app.json --noEmit` directly. This means
  every PR's CI typecheck step has been green by tautology. Fix the
  script (`"typecheck": "tsc -b"`) only when the in-flight explorer
  cascade clears, so the branch can land before CI starts enforcing.

- **2026-05-14 (iter-532, T-13.16+17)** — Chat @visual baselines need a
  test-mode preview build to regen. The default
  `scripts/regen-baselines.sh` does `pnpm build` (production mode), which
  strips the `window.__llm` test seam in `src/main.tsx` (gated on
  `import.meta.env.DEV || import.meta.env.MODE === 'test'`). Chat specs
  inject fixture providers through that seam, so they fail with `__llm
  seam not found on window`. Trying `vite dev` inside the podman container
  trips `ENOSPC` on Vite's file-watcher (`.pnpm-store` is huge).
  Workaround: `scripts/regen-chat-baselines.sh` builds with `--mode test`
  and serves via `vite preview --mode test` — keeps the seam, avoids the
  watcher. Apply this trick for any future @visual that needs the LLM
  fixture pipeline.

- **2026-05-14** — **Chat scrollback @visual flake** (iter-456). After
  iter-455's stabilisation (testid scoping + scrollTop=0 + blur focus),
  two consecutive CI retry captures of the phase-11 gate's
  `chat-scrollback` snapshot *still* differed by 23% of pixels. Diff
  overlay showed every text glyph outlined — classic anti-aliasing /
  sub-pixel font-hinting variance, not a layout regression. Headless
  Chromium does not produce deterministic text rendering for tall
  scrollable panels across runs. Decision: do not commit an @visual
  baseline for the chat scrollback's multi-message end-state. Existing
  `chat-proposal-accept.spec.ts` (proposal-card-pending) and
  `api-key-modal.spec.ts` provide @visual coverage for individual chat
  components; the multi-round end-state is covered functionally and by
  @a11y in `phase-11-gate.spec.ts`. If a future iteration needs a
  multi-message visual baseline, scope it to a *single* message bubble
  rather than the whole scrollback.

- **2026-05-14** — **@visual snapshots of the chat pane need a stable
  scroll position and blurred focus** (iter-455). Two consecutive retries
  of the phase-11 gate's @visual capture in the same CI run produced
  Linux PNGs that differed in ~22% of pixels — every text row was shifted
  by ~1px and the Send button changed colour. Two root causes: (a) the
  scrollback's auto-scroll-to-bottom (`scrollTop = scrollHeight` in
  `ChatPane.tsx`) lands at sub-pixel-different positions depending on
  exactly when the final message is appended, and (b) the Send button's
  focus / disabled state lingers across captures. Mitigation pattern for
  any future @visual that includes the chat pane:
  1. Wait for the *final assistant text content* to be visible (don't
     rely on `data-streaming=true` going to 0 — ChatPane never sets that
     flag on its own messages; see "ChatPane streaming semantics" below).
  2. Before `toHaveScreenshot`, run `await page.evaluate(() => { ... })`
     to blur active element and set the scrollback's `scrollTop = 0`.
  3. Scope the screenshot to `data-testid="chat-scrollback"` (added to
     ChatPane's scrollable div) rather than `chat-pane`, so the composer
     button states are excluded.

- **2026-05-14** — **ChatPane streaming semantics** (iter-454). The chat
  pane in `src/workspace/chat/ChatPane.tsx` persists assistant messages
  to the conversation **only after the dispatcher promise resolves**
  (see `handleSend` line ~175, `result.appendedMessages.slice(1)`).
  Consequences for e2e specs that drive multi-round tool flows with
  mutating tools that pause for proposal acceptance: the round-N
  assistant text + tool_use + tool_result cards are NOT visible mid-
  flow — only the live proposal queue is. Assert tool-use/tool-result
  cards after the full dispatcher returns (no streaming message).
  Also: do NOT assert `proposal-card` count == 0 between sequential
  mutating proposals — the dispatcher resumes immediately into the
  next round and re-fills the queue with no observable empty state.

- **2026-05-14** — **CI auto-cancellation on STATUS pushes** (iter-454).
  Pushing a docs-only `STATUS.md` commit to a PR branch with CI in
  flight triggers a new `pull_request` workflow run that cancels the
  prior in-progress run. Don't push STATUS-only commits while CI is
  running on the same branch — either wait for it to complete, or
  amend STATUS.md into the next code commit. Keeping STATUS off the
  PR branch entirely (committing on main only) is the cleanest fix
  but currently we co-locate it for resume context.

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

- **2026-05-12** — `scripts/regen-baselines.sh` runs Playwright with
  `--update-snapshots --grep @visual` against the **full** visual suite,
  so it will rewrite **every** baseline whose actual bit-diffs from the
  expected — not just the new one you're trying to add. This matters when
  earlier baselines were manually extracted from a failed CI run (per the
  iteration-25 procedure above): the arm64 podman renderer will produce
  *different* bytes than the amd64 CI runner, and `--update-snapshots`
  happily overwrites the CI-extracted baseline with the arm64 one — which
  then fails CI next push. Workflow when adding a new viewpoint baseline:
  (a) run the container regen; (b) `git status` and identify any
  *previously-committed* baselines that got rewritten besides the new
  one(s) you wanted; (c) `git checkout -- <those paths>` to revert them
  back to their main-committed forms; (d) only stage the genuinely-new
  baseline files. Discovered while landing #70 (the regen pass rewrote
  three iteration-24/25 CI-extracted IBD baselines that would have failed
  CI on the next push).

- **2026-05-12** — Playwright `page.addInitScript` runs on **every** page
  load — including `page.reload()`. If the script unconditionally seeds
  sessionStorage with a fixed project, every reload wipes out the
  workspace's autosaved changes. Symptom: an e2e test that creates an
  element, reloads, and asserts persistence sees an empty project after
  the reload. Fix: gate the seed on
  `if (sessionStorage.getItem(key)) return;` so addInitScript is a no-op
  on reloads. Tests that don't reload (most `*-empty.spec.ts`,
  `ibd-*.spec.ts`) don't hit this; the round-trip Phase 2/3 gate specs
  used `expect`-driven UI assertions instead of seed reads after reload,
  so they sidestepped it too. Discovered while landing #71.

- **2026-05-12** — Edge mutation goes through a first-class `update-edge`
  command (mirrors `update-element`). Added in #72 so a RequirementTrace's
  `label` can be edited from the inspector with single-step undo. Shape:
  `{ kind: 'update-edge', id: EdgeId, patch: EdgePatch<K> }`. `EdgePatch<K>`
  forbids id/kind/sourceId/targetId — rewriting endpoints is structurally
  unlink+relink, not an update. Registry `updateEdge` mirrors `update<K>`:
  same kind-mismatch guard, same `EDGE_BASE_OPTIONAL_FIELDS` whitelist
  (currently just `label`) plus a per-kind table for fields like
  `ControlFlow.guard`, `ObjectFlow.itemType`, `Extend.extensionPoint`. Bus
  inverse captures `previousValues` by key — replaying restores or clears
  the prior label on undo.

- **2026-05-12** — `Inspector` looks up the selected id in BOTH
  `elements` and `edges`. `selectedElementIds` is typed `readonly
  ElementId[]` but at runtime carries any id-shaped string; pushing an
  `EdgeId` onto it for a ModelEdge selection works because brands are
  compile-time only. `<Inspector />` returns `<InspectorTraceEdge edge=...
  />` for `RequirementTrace`; other ModelEdge kinds fall through to
  "Selected element no longer exists." (until a future inspector covers
  Composition/Generalization/etc.). Pattern keeps the inspector
  presentational and the element-vs-edge dispatch at the top.

- **2026-05-12** — `CanvasPane.onEdgesChange` now selects ModelEdges into
  `selectedElementIds` (alongside element-as-edge ids). The diff branch
  partitions flow edges into `elementEdgeIds` (id resolves in registry)
  vs `modelEdgeIds` (everything else — the BDD/Requirements
  ModelEdge layer). Selection merges both lists with the preserved
  non-edge ids. Required for RequirementTrace edges to surface in the
  inspector after click. The `remove` change branch still routes
  registry-resolving ids to `deleteElement` and the rest to `unlinkEdge`
  — that contract is unchanged.

- **2026-05-12** — RequirementNode (#71) shipped without React Flow
  `<Handle>` components — perfectly fine for Phase 1 but blocked
  drag-create of trace edges in #72. Added `Handle type="target"
  position={Position.Top} id="top"` and `Handle type="source"
  position={Position.Bottom} id="bottom"` with the same Tailwind classes
  as BDD's BlockNode (`!z-10 !h-3 !w-3 !rounded-full !border-2
  !border-card !bg-primary`). Lesson for future viewpoints: add the
  Handles in the node component during the *node* phase even if the
  *edges* phase is still pending — the e2e drag tests in the edge
  phase need a real handle to grab via Playwright `mouse.down/move/up`,
  and skipping it forces the edge-phase PR to also touch the node
  component, slightly muddying the diff.

- **2026-05-12** — Playwright locator gotcha for `EdgeLabelRenderer`
  edges: the React Flow `<EdgeLabelRenderer>` portals its children
  OUT of the inner `<svg>` and into a sibling absolute-positioned
  `<div class="react-flow__renderer">` next to it. Anything with
  `data-testid` inside the renderer surfaces in `document.querySelector`
  alongside the SVG `<g>` that holds the rest of the edge. A naive
  `[data-testid^="req-trace-edge-"]` selector matches the `<g>` AND the
  portaled stereotype label div AND the (optional) user-label span —
  three hits per edge. Use a SVG-side discriminator like
  `g[data-trace-kind]` for edge counts. Discovered while writing #72's
  e2e specs.

- **2026-05-12** — `EdgeProps<MyEdge>` (v12.3) does NOT include
  `labelX` / `labelY` in its public typing even though some
  `getXxxPath` helpers return them. Don't destructure `labelX`/`labelY`
  from props; instead pull them from `getSmoothStepPath(...)` and pass
  to the EdgeLabelRenderer transform string yourself. Caught by `tsc -b`
  during #72 — TS 2339 on `labelX` / `labelY` properties.

- **2026-05-12** — Requirement palette item + Requirement-aware drop /
  toolbar wiring (#71): the Requirements viewpoint now ships a
  `paletteItems` entry so the project tree always exposes the
  "Requirements" group, even in projects with zero Requirements
  (matches the Blocks/Parts affordance pattern). `CanvasPane.handleDrop`
  branches on `viewpoint.id === REQUIREMENTS_VIEWPOINT_ID && kind === 'Requirement'`
  to call `createRequirement(diagram.id, position)`. A new
  `+ Requirement` toolbar button mirrors BDD's `+ Block`. The workspace
  store action `createRequirement` wraps `create-element` + an initial
  `update-diagram-position` in a compound command — one Cmd-Z reverts
  the whole step. Cascading defaults: name `Req1`/`Req2`/… picks the
  next free `Req${size+1}` index; reqId scans `R-001`, `R-002`, …
  **from 1 upwards** to fill gaps from custom-reqId imports or
  out-of-order creation. Defaults: `priority: 'medium'`,
  `status: 'draft'`, `text: ''`. KIND_OPTIONAL_FIELDS.Requirement
  already covered `reqId` + `rationale` from the metamodel split, so no
  registry change was needed. The project tree now renders a
  `font-mono text-[10px]` reqId subtitle (right-aligned) for any
  Requirement with `reqId` set — pinned to `text-foreground/75` rather
  than `text-muted-foreground` for WCAG AA contrast on the card
  background (the muted shade failed at 3.88:1, same as the
  earlier-discovered popover description pattern).

- **2026-05-12** — `<ul role="radiogroup">` with `<li>` children fails axe
  `listitem` (serious) because the `role` override removes the implicit list
  semantics, so the `<li>` parent is no longer inside a `role=list`. Use
  `<div role="radiogroup">` with `<button role="radio">` siblings (no
  intermediate `<li>`) for the popover's requirements picker. The same trap
  applies to any custom-roled `<ul>` list. Discovered while landing #73.

- **2026-05-12** — Playwright's `toContainText` reads `textContent`, which
  does NOT include `<input value="...">` attribute values. The inspector's
  `inspector-name` field is an `<input>`, so an assertion like
  `expect(getByTestId('inspector-single')).toContainText('Stop on red')` will
  fail even when the inspector clearly shows that name — the text is the
  input's value, not its text. Assert with
  `expect(getByTestId('inspector-name')).toHaveValue('Stop on red')` instead.
  Discovered while landing #73.

- **2026-05-12** — Selection is workspace-global; `CanvasPane.onNodesChange`
  MERGES new node-selects with the existing `selectedElementIds` (line ~310:
  `preserved = selectedElementIds.filter(id => !nodeIds.has(id))`). Clicking
  a node on the BDD canvas right after a Requirement (or any element on a
  different diagram) was selected leaves the inspector in its
  multi-select state ("N elements selected") because the cross-diagram
  selection isn't covered by any node on the current canvas. Tests that
  cross diagram boundaries and then need a single-element inspector should
  use the **project tree leaf** (`project-tree-leaf-${id}` → `setSelection([id])`)
  to REPLACE selection rather than the canvas node. Discovered while
  landing the Phase 4 gate (#74) where a derive trace was selected on
  Requirements and then `+ Block` on BDD followed by `block.click()` left
  the inspector in 2-element state, so `inspector-name` never appeared.

- **2026-05-12** — Activity Diagram pseudostate sizes are per-element, not
  per-viewpoint (#88). The `Viewpoint` interface gained
  `nodeSizeFor(element: ModelElement)`; BDD/IBD/Requirements all return a
  viewpoint-wide constant, but Activity returns one of four per-`nodeType`
  sizes (action 180×80, initial/final 28×28 circle, fork/join 80×8 bar,
  decision/merge 70×70 diamond). `CanvasPane.toFlowNodes` now calls
  `viewpoint.nodeSizeFor(el)` per element instead of one size per viewpoint.
  The export builder (`buildDiagramSvg`) still takes a single
  `(nodeWidth, nodeHeight)` per call — Activity export will need a follow-up
  to honour per-element sizing if the demo grows that path. The four
  visible shapes share one custom-node component (`ActionUsageNode`)
  registered under all seven node-type strings; the component branches on
  `data.nodeType` to render the right shape. Selection rings on
  initial/final/diamond use `ring-* ring-offset-*` on the bounding box (not
  the visible shape) — clean enough at 28×28/70×70 but worth noting if a
  designer asks why the ring is square around a circle.

- **2026-05-12** — Activity palette UI is a horizontal chip strip rendered
  *below* the canvas toolbar by `CanvasPane`, only when the active viewpoint
  is Activity (`<ActivityPalette />`). Each of the seven chips is a
  `draggable` div that sets two `dataTransfer` MIME types: the existing
  `PROJECT_TREE_DRAG_TYPE` carrying the kind (`'ActionUsage'`) and a new
  `PROJECT_TREE_DRAG_NODE_TYPE` (`application/x-mbse-action-node-type`)
  carrying the `ActionNodeType` discriminator. `CanvasPane.handleDrop`
  reads both: kind to validate against `acceptedElementKinds`, nodeType to
  pick the correct `createActionUsage` variant. Drops via the project
  tree's "Actions" group (which only sets the kind MIME) fall back to the
  default `'action'` nodeType. Pattern transfers to State Machine Phase 6:
  add a `StateMachinePalette` chip strip with the same two-MIME pattern.

- **2026-05-12** — `ActionUsage` initial/final pseudostates are intentionally
  created with `name: ''` (`createActionUsage` skips the cascading default
  for those two nodeTypes). Project tree leaf renderer falls back to a
  placeholder display name `«${nodeType}»` whenever an ActionUsage's name is
  empty — without that, the tree leaf row would be visually blank.
  Inspector NameField still renders the empty input (the field has
  `required` for accessibility but the workspace store's `renameElement`
  guard rejects empty strings, so the field stays empty until the user
  types something). Default cascading uses `Action${size+1}` for
  action/decision/merge/fork/join.

- **2026-05-12** — `ActionDefinition.parameterIds` is mutated via two store
  actions: `addActionDefinitionParameter(defId, valuePropertyId)` and
  `removeActionDefinitionParameter(defId, valuePropertyId)`. Both replace
  the array via `update-element` patch with a fresh `parameterIds` value
  (registry's snapshot-stable `update<K>` semantics). Duplicate add is a
  no-op; remove of a missing id is a no-op. There is no UI yet for
  *creating* ValueProperty elements; the inspector's "Add parameter"
  picker exposes ValueProperty elements that exist in the project but
  have no other UI affordance — Phase 8 (Parametric Diagram) introduces
  the creator path.

- **2026-05-12** — Cross-diagram traceability via inspector (#73): a
  `TraceLinksExtras` section appears in the Inspector for any element kind
  in `TRACE_TARGET_KINDS` (PartDefinition / PartUsage / ActionDefinition /
  ActionUsage / StateDefinition / StateUsage / UseCase / Requirement). The
  set is exported from `@/viewpoints` (`isTraceTargetKind(kind)` helper).
  The section lists every `RequirementTraceEdge` where the selected element
  is the **target**, with `«kind»` + source Requirement name (+ optional
  reqId) + trash to unlink. A "+ Link requirement" button opens
  `LinkRequirementPopover` (search + radio list of all Requirements + four
  trace-kind buttons; satisfy/verify enabled for non-Requirement targets,
  all four for Requirement targets per ADR 0004 § 3). The popover uses
  `position: fixed` so it escapes the inspector pane's overflow. Per ADR
  0004 § 4, trace edges are NOT rendered on BDD/IBD canvases in Phase 4 —
  the cross-diagram visibility seam is the inspector list plus the context
  menu's new "Show requirement traces" entry, which calls
  `showRequirementTracesFor(elementId)` to switch to the first Requirements
  diagram and select the first incoming trace's source Requirement. The
  context menu entry is omitted when the element has zero incoming traces
  or when no Requirements diagram exists yet.

- **2026-05-12** — Testing model Cmd-Z after an inspector text-field edit:
  pressing **Tab** after `fill()` moves focus to the *next* INPUT inside the
  inspector, and the workspace's global Cmd-Z handler in `Workspace.tsx`
  suppresses model undo whenever `document.activeElement` is INPUT /
  TEXTAREA / SELECT (so the browser's native input-undo handles the
  in-place text). The keypress then no-ops on the model, the next field
  still has its committed value, and the assertion fails with a
  misleading "expected '' got 'turnOn()'". Fix: press **Enter** instead
  of Tab — the field's onKeyDown calls `blur()`, focus leaves all
  inputs, and Ctrl+Z routes to the model undo stack as intended.
  Discovered while landing #105's `Cmd-Z reverts an action-field edit`
  spec.

- **2026-05-12** — Clearing `mergeStateStatus: BEHIND` on a feature branch
  under AGENT.md's hard-constraint ban on `--force` to push is **push-first,
  then rebase via GitHub**, NOT rebase-locally-then-push. Concretely: any
  new commits (e.g. baseline refreshes) must land as fast-forward additions
  on top of the **remote** branch tip first (`git push` accepted), then run
  `gh pr update-branch --rebase` to rebase onto main from GitHub's side.
  Doing `git rebase origin/main` locally first rewrites history (the
  commits get new parents → new SHAs) and the subsequent push is rejected;
  `--force-with-lease` would clear it but the hard constraint forbids
  `--force` to push. Recovery if the wrong order has already happened:
  `git reset --hard origin/<branch>` to drop the local rebase, re-apply
  the new files / changes as commits on top of the (unrebased) remote
  tip, fast-forward push, then `gh pr update-branch --rebase`. Discovered
  while landing #106 in iteration 46.

- **2026-05-12** — Declaring `paletteItems` for a new element kind in any
  viewpoint stales baselines on **every** viewpoint's canvas, not just the
  declaring viewpoint's. Reason: `ProjectTree` (`src/workspace/tree/ProjectTree.tsx:52`)
  computes its kind-group list from the union of `paletteItems[].elementKind`
  across all registered viewpoints, so adding `Actor` + `UseCase` palette
  items in the Use Case viewpoint surfaces "ACTORS" and "USE CASES" groups
  in the project tree pane on BDD, IBD, Requirements, Activity, and State
  Machine canvases too. The added rows shift downstream layout enough to
  push marginal baselines past `maxDiffPixelRatio: 0.01`. Caught in
  iter-53: PR #125 failed CI on BDD inspector + IBD two-parts baselines
  (which had been quietly accumulating drift since #82/#88/#94/#109/#117)
  in addition to the new use-case baselines. **Generalization of the
  iter-37 "chip strip stales sibling baseline" rule:** when a viewpoint
  declares a new palette kind, audit every committed baseline that
  screenshots ANY canvas — they may all need a CI-extracted refresh in
  the same PR. Fix workflow is the standard iter-25 procedure (download
  the failing CI's playwright-report and copy `*-actual.png` over the
  baselines).

- **2026-05-12** — When a viewpoint phase ships persistent canvas chrome
  (a palette chip strip, a toolbar overlay, a header band, etc.) that is
  visible *whenever that viewpoint is active*, the previously-committed
  `<viewpoint>-empty` baseline becomes stale too — not just the new
  spec's baselines. Caught in iteration 37: #88 added the
  `ActivityPalette` chip strip under the Activity toolbar, which pushed
  ~9k pixels of difference into the existing `activity-empty.spec.ts`
  baseline (committed in #87 before the strip existed). The first three
  CI runs failed on a moving target: run 1 failed on the six new #88
  baselines (arm64↔amd64 divergence — refreshed via the iter-25 CI
  extract); run 2 still failed on the *pre-existing* activity-empty
  baseline; run 3 finally cleared after refreshing it too. Lesson for
  future viewpoint phases: when the node/palette PR introduces canvas
  chrome, plan the baseline-refresh step to cover **every** committed
  baseline that screenshots the same viewpoint, not only the new
  spec's. The diff PNG in the failed run's `playwright-report` makes
  the call obvious — wholesale text-region red overlay = anti-aliasing
  divergence; localized red overlay over the new chrome region = stale
  layout. Both are routine; both are fixed by copying CI's `*-actual.png`
  over the baseline.
- **2026-05-13** — `data-testid` prefix collisions across React Flow
  edge sub-elements: a custom edge component renders both an outer `<g>`
  and (when present) an `EdgeLabelRenderer`-portaled `<div>`. If both
  carry testids that share a prefix used in `[data-testid^="..."]`
  selectors, the locator count flips from 1 → 2 the moment the label
  appears. Caught iteration 64: `parametric-binding-edge-${id}` on the
  `<g>` + `parametric-binding-edge-label-${id}` on the label `<div>`
  both matched the parametric-binding count selector in the
  reload-persistence e2e — so the test passed pre-label-edit and failed
  after. Fix: pick disjoint prefixes per sub-element (e.g. `<g>` →
  `parametric-binding-edge-${id}`, label → `parametric-binding-label-${id}`).
  Generalizes to all custom edge components with `EdgeLabelRenderer`
  children.
- **2026-05-13** — `pnpm typecheck` (`tsc --noEmit` from root) and
  `pnpm run build` (`tsc -b` with project references) disagree on
  readonly-property assignability. A `Partial<WorkspaceState>` local
  whose properties are declared `readonly` is silently accepted by
  `tsc --noEmit` but rejected by `tsc -b` with TS2540 ("Cannot assign
  to '<prop>' because it is a read-only property"). Iteration 86 caught
  this on PR #186: local typecheck green, CI build red. Fix: declare
  patch locals as `{ -readonly [K in keyof T]?: T[K] }` so the
  mapped-type strips readonly. Pre-PR: prefer `pnpm run build` over
  bare `pnpm typecheck` when adding store-state patches via locals.

- **2026-05-13 (iter-96)** — **`aria-controls` ⇄ panel `id` symmetry crosses
  files.** Tab JSX (typically in a shell component like `CanvasPane.tsx`)
  declares `aria-controls="some-panel-id"`; the matching `id` lives on the
  panel component (here `RequirementsSurface.tsx`), often in a different
  source file. A single-file mental review misses the dangle and only
  axe (or a follow-up `@a11y` spec) catches it. When introducing a new
  `role="tab"` element, also: (a) confirm the panel section has the
  matching `id`, `role="tabpanel"`, and `aria-labelledby="<tab id>"`;
  (b) include both files in the same PR diff so review surfaces them
  together. Caught by a sonnet pre-merge review subagent on PR #191
  before the slice 3 a11y scan would have flagged it.

- **2026-05-13 (iter-90): Playwright `--update-snapshots` is conditional,
  not unconditional, in v1.48.** If an existing baseline already matches
  the new render within `maxDiffPixelRatio` (we use 0.01), `--update-
  snapshots` will NOT overwrite it. This means a stale baseline that
  happens to fall within tolerance survives regen runs, accumulating
  semantic drift until one more small change pushes total diff over
  threshold and CI goes red on a seemingly-unrelated PR. Symptom on
  iter-90: PR #189 added a single new menu item; CI failed on a baseline
  that had been visually wrong for several phases (still showed the
  pre-tree-groups project tree). Fix pattern when regenerating a known-
  stale baseline: `rm -f tests/e2e/__screenshots__/.../<file>.png` BEFORE
  running `playwright test --update-snapshots`. "Snapshot doesn't
  exist, writing actual" is the line you want; an unannotated `✓
  passed` under `--update-snapshots` means the file was NOT rewritten.

- **2026-05-13** — **Chrome changes drift ~all canvas baselines.** Adding
  or removing a row in shared chrome (tablist, toolbar, header) shifts
  the canvas region vertically and pushes every `@visual` spec that
  captures the canvas over `maxDiffPixelRatio: 0.01` on the amd64 CI
  runner — typically ~80 baselines (40 specs × 2 browsers), not 1.
  Budget for a full bulk-refresh round in the same PR that lands the
  chrome change. Recovery is scripted (iter-92 / iter-97): pull
  `playwright-report` artifact, base64-extract `index.html`'s
  `window.playwrightReportBase64` into `report.zip`, unzip, parse each
  spec's JSON for `attachments[]` (path → `resources/<sha1>.png`),
  bucket by `(spec,title,project,base)`, take `failed`-status results
  only, copy each `actual` SHA1 over the matching baseline. Verify
  `missing=0` (no accidental new baselines).

- **2026-05-13 (iter-101): shadcn `bg-destructive` fails WCAG AA at small
  text.** The default shadcn destructive token resolves to red-500
  (#ef4444) for `bg-destructive` and near-white (#f8fafc) for
  `text-destructive-foreground` — contrast 3.59:1, below the 4.5:1 AA
  threshold for text under 18pt/24px. Same trap with `text-destructive`
  on `bg-destructive/10` (3.29). For any destructive button rendered at
  `text-xs` or `text-sm`, use `bg-red-700` (#b91c1c, 7.3:1 vs white) or
  `bg-red-800` instead. Don't trust the token name as a stand-in for
  AA compliance — it's tuned for visual emphasis, not contrast.

- **2026-05-13 (iter-127): Never push STATUS.md commits to a feature
  branch with an open PR.** GitHub Actions cancels the in-flight CI run
  on every new push to the head ref, so iteration-by-iteration STATUS
  updates keep the `check` job permanently in `queued` — `gh pr merge
  --auto` then hangs forever and the loop appears stuck even though the
  underlying code is fine. iter-124..126 burned three iterations on
  this. The loop protocol step 18 says STATUS belongs on `main` via a
  fast-forward PR when working from a branch, or as part of the
  iteration PR itself — *not* as a separate `docs: iteration N` commit
  pushed to the open feature branch. When mid-PR, hold STATUS edits
  local-only (don't even commit them) and push them to main after the
  feature PR squashes, in a tiny docs-only follow-up PR.

- **2026-05-13 (iter-235): `@anthropic-ai/sdk@~0.32.1` tool-use & streaming
  shape (verified via context7).** Tool def keys are snake_case
  (`name`, `description`, `input_schema` with `type: "object"`). Streaming
  via `client.messages.stream({ model, max_tokens, messages, tools })`:
  iterate with `for await (const event of stream)` — `content_block_start`
  carries `{ type: "tool_use", id, name }`; `content_block_delta` with
  `delta.type === "input_json_delta"` carries `partial_json` chunks to
  accumulate; `JSON.parse` at `content_block_stop`. Send `tool_result`
  blocks as a `user`-role follow-up message:
  `{ type: "tool_result", tool_use_id, content, is_error? }`. Loop until
  `finalMessage().stop_reason === "end_turn"`; `"tool_use"` means another
  round-trip. **There is no `.on("tool_use", ...)` event** — training-data
  examples sometimes show it; ignore them. Browser-side construction
  requires `dangerouslyAllowBrowser: true` (the key lands in the bundle —
  that's why phase-11 stores it in sessionStorage only and never logs).
  Fixture replay should emit raw streaming events matching this schema —
  the `tests/fixtures/llm/README.md` format already aligns.

- 2026-05-13: `pnpm exec tsc --noEmit` (root tsconfig) does NOT catch the
  same errors as CI's `pnpm build` which runs `tsc -b`. The latter builds
  every project ref (`tsconfig.app.json`, `tsconfig.node.json`,
  tests project) and is the authoritative type check. Always run
  `pnpm exec tsc -b` locally before declaring "types clean", not bare
  `tsc --noEmit`. Discovered on PR #228 where `additionalProperties` on
  `LLMToolDefinition.input_schema` and `memberIds` on union-Partial
  `update-element` patches passed `--noEmit` but failed `-b`.

- 2026-05-15 (iter-747, PR #295): **`Upload Playwright report` infra
  flakes are NOT test failures.** Symptom: the `check` job's final step
  fails with `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
  across all 5 upload retries, but the preceding `E2E tests` step
  reports `N passed` cleanly. This is GitHub's artifact-storage backend
  returning an HTML error page in place of JSON during `FinalizeArtifact`
  — entirely a GitHub Actions infrastructure problem, unrelated to the
  PR's code. Action: `gh run rerun <run-id> --failed` to rerun the
  failed job at the same SHA; do NOT refresh visual baselines as if a
  test failed. The tests already passed once. (Auto-merge will fire on
  the green rerun without further commits.)

- 2026-05-15 (iter-759, PR #320 fix-up commit e5050f6): **Adding buttons
  to the canvas-toolbar can silently break split-view.** The diagram-panel
  has `flex flex-1 flex-col` with no `min-w-0`, so its min-width is its
  toolbar's min-content (sum of each button's longest-word width). Two
  extra buttons (Undo + Redo, ~80–100px of min-content together) pushed
  the panel's min-width above half of the available canvas-area width
  in split-view at the default 1280×720 viewport, squeezing the
  secondary pane to ~110px — narrow enough that the right-pane divider
  intercepts pointer events at `close-split`'s coordinates and the
  click never lands. **Rule:** any PR adding a persistent canvas-
  toolbar button must verify the split-view e2e specs locally before
  pushing, OR keep `min-w-0` on `diagram-panel` + `overflow-x-auto` on
  `canvas-toolbar` so the panel can shrink and the toolbar scrolls
  when squeezed. The visual baselines drift on every browser (chromium
  + webkit) when the toolbar grows, which is *expected* and refreshed
  via the lift-from-CI procedure — but split-view failures are
  *functional* regressions and not OK to ride out via baseline regen.

- 2026-05-16 (iter-767, PR #331): **`playwright-report/` does NOT survive
  a job-cancelled timeout — `test-results/` does.** Iter-766 split visual
  specs into `retries:0` projects (worth keeping) and bumped the job cap
  to 60min, but run 25937962140 still cancelled at exactly 60min with
  ~412/612 specs done; the upload step then logged
  `No files were found with the provided path: playwright-report` and
  produced an empty artifact list. The HTML reporter only flushes
  `playwright-report/` once the run completes, so cancellation eats it.
  Two fixes shipped together in this iter: (1) bumped Playwright
  `workers` from 2 → 4 in `playwright.config.ts` — ubuntu-latest has
  4 vCPU/16 GB and the conservative `cores/2` default was the bottleneck;
  (2) added a second `upload-artifact` step for `test-results/` in
  `.github/workflows/ci.yml`. `test-results/` is written incrementally
  per test and contains `<arg>-actual.png` for every failing
  `toHaveScreenshot` assertion — that's the actual input the lift-from-
  trace rebaseline procedure needs, and it survives cancellation. The
  procedure documented earlier (lift from `data/<trace-hash>.zip` in the
  HTML report) still works when the report does flush; otherwise lift
  from the `playwright-test-results` artifact's per-test subdirectory.

- **2026-05-16 (iter-770, T-13.37 spec fix)** — The T-13.37 e2e spec
  (`tests/e2e/diagram-tabs-open-close.spec.ts`) was originally written
  assuming "cold-load opens only the first/bootstrap diagram" and asserts
  `tab-d-bdd-two` has count 0 immediately after seeding two diagrams.
  That assertion is incompatible with the iter-769 cold-load-all default
  (which 40+ pre-existing e2e seed patterns depend on — they
  `sessionStorage.setItem('mbse:v1:project:<id>', ...)` with multiple
  diagrams and click tabs by name without first opening them). The
  resolution kept the cold-load-all behavior (single-load-bearing
  default; matches user mental model "no curation yet → all open") and
  rewrote the three failing T-13.37 tests to first close a tab before
  asserting closure/persistence behavior. The T-13.37 *feature* (close
  removes from strip + tree row persists + reload persists curation +
  tree-row re-opens) is still fully covered — the tests now reach the
  closed state via explicit `close-X` click rather than relying on a
  cold-load default. **Rule:** when a spec was written before a
  behavior change, prefer adapting the spec to the new behavior (if
  the change is correct and load-bearing) over reverting the behavior
  — but verify the *underlying feature* is still covered end-to-end
  before declaring done.
