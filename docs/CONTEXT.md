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
