# STATUS

## Current phase
phase:2 — BDD vertical slice (template for all viewpoints)

## Current iteration
- Iteration #: 9
- Started: 2026-05-11
- Branch: issue/29-decompose-phase-2
- Working on: #29 — chore(phase-2): decompose Phase 2 + record @xyflow/react v12.3.x research findings

## Last test run
- Command: release.yml workflow on tag vphase-1 (build + deploy-pages + github-release)
- Result: PASS — run #25670869402, all three jobs green; Pages returns HTTP 200 with "MBSE Workbench"
- Failures: (none)

## Known issues / blockers
- (none)

## Decisions log
- 2026-05-11: Bootstrap as a single committed scaffold, not iterative through child PRs. Reason: AGENT.md Phase 0 explicitly lists scaffold steps as the bootstrap and instructs iteration 1 to "run Phase 0 bootstrap" when STATUS.md is missing; opening child issues against an empty repo with no CI yet would be the wrong order. Child issues for any *remaining* Phase 0 polish are opened after the initial commit.
- 2026-05-11: Pinned minor versions per AGENT.md "Version pinning" rule. React 18.3.x, Vite 5.4.x, Tailwind 3.4.x, @xyflow/react 12.3.x, Vitest 2.1.x, Playwright 1.48.x, Anthropic SDK 0.32.x, ESLint 8.57.x. Tailwind 3 (not 4) avoids the PostCSS landmine.
- 2026-05-11: `pnpm run check` composes typecheck + lint + unit + build + e2e in that order; the Playwright suite is the single source of truth for functional, visual (`@visual`-tagged) and accessibility (`@a11y`-tagged) specs across `chromium` and `webkit` projects.
- 2026-05-11: Repo name fixed to `mbse-workbench`; Pages base path `/mbse-workbench/` in production via `vite.config.ts`.
- 2026-05-11: Allow `vphase-*` and `v*.*.*` tags to deploy to the `github-pages` environment via environment deployment-branch-policies (type: tag). Reason: protection rule blocked the first vphase-0 deploy with a tag policy error; documented in `docs/CONTEXT.md` so future phases skip this.
- 2026-05-11: Phase 1 decomposed into 5 child issues (#17 metamodel, #18 registry, #19 command bus, #20 repository, #21 collaboration seams). Reason: AGENT.md Ralph loop step 6 — just-in-time decomposition when the phase becomes current. Linked from epic #2's task list.
- 2026-05-11: Metamodel split — 19 element kinds in `ModelElement` discriminated union; 9 pure structural relationships in `ModelEdge`. `ConnectionUsage` / `ItemFlow` / `Transition` are elements (named, selectable) with `sourceId`/`targetId` baked in; the diagram renderer derives edge geometry from either source. Recorded in [ADR 0002](docs/adr/0002-metamodel-shape.md) (links: #17).
- 2026-05-11: Registry `update<K>` replaces the stored element with a new object rather than mutating in place, so a `readonly ModelElement[]` snapshot taken before `update` is unaffected. Reason: command-bus undo/redo and future event-sourcing will rely on snapshot stability; in-place mutation would silently corrupt history. Runtime kind-check guards the case where the caller-chosen `K` does not match the stored element's `kind` (TS cannot infer K from a runtime id). Records dangling refs for the three element-kinds that carry `sourceId`/`targetId` directly (links: #18).
- 2026-05-11: Command bus shape — `Command` is a discriminated union of `create-element` / `update-element` / `delete-element` / `link` / `unlink` / `compound`. Generic over `ElementKind` and `EdgeKind` rather than 75 per-kind command types, because the metamodel is already a discriminated union and the registry validates kind via the existing `update<K>` runtime guard. ModelEvent payload = inverse command, so the append-only event log is self-undoable. Undo/redo stacks hold `{ forward, inverse, actor }` and just `applyOnly` (no re-capture). Delete-element's inverse is a `compound` of `create-element` + one `link` per incident edge captured at apply time (links: #19).
- 2026-05-11: Repository is a thin async port: one key per project at `mbse:v1:project:<id>`, ISO-string dates, `ProjectNotFoundError` covers both missing-key and malformed-JSON cases (caller treats them identically), `list()` silently skips malformed entries so one bad entry does not blind the picker, and `StorageQuotaError` wraps the underlying `QuotaExceededError` (and Firefox's `NS_ERROR_DOM_QUOTA_REACHED`). `Project` keeps `elements` / `edges` as readonly arrays so the consumer cannot mutate the cached value behind the registry's back (links: #20).
- 2026-05-11: Collab module split per responsibility (`user` / `presence` / `provider` / `permissions`) instead of one `types.ts` grab-bag. `User = { id, displayName, color }`; deterministic per-session color picked from `USER_COLORS` by hashing the id so the same id always renders identically across reloads. `can` (single-user default) returns true unless `target.ownerId` differs from `user.id`, giving Phase 1 a real ownership seam even though single-user mode never sets `ownerId`. Command bus accepts `provider?: CollaborationProvider` (defaults to Noop) and publishes every committed dispatch/undo/redo event post-apply — denied permissions throw *before* publish, so the provider only ever sees committed events (links: #21).
- 2026-05-11: Phase 1 closed and vphase-1 tagged at c1214db. Release workflow #25670869402 green; Pages HTTP 200; screenshot uploaded as `app-shell.png` release asset. Phase 1 shipped data layer only — deployed UI unchanged from vphase-0 (links: #27).
- 2026-05-11: Phase 2 decomposed into 7 child issues (#30 workspace shell + viewpoint registry, #31 BDD React Flow canvas + Block/Composition/Generalization, #32 inspector, #33 project tree + drag-from-tree, #34 dagre auto-layout + per-view positions, #35 PNG/SVG export, #36 Phase 2 gate e2e). Reason: AGENT.md Ralph loop step 6 — just-in-time decomposition. Sequencing: #30 unblocks #31; #31 unblocks #32-#35 (independent of each other); #36 depends on all. Linked from epic #3's task list (links: #29).
- 2026-05-11: `@xyflow/react` v12.3.x research findings recorded in `docs/CONTEXT.md` ahead of Phase 2 first use — Zustand wiring (drive via props + applyNodeChanges/applyEdgeChanges, route through command bus), required CSS import, `node.width`/`node.height` (not `style`), `nodrag`/`nopan` classes on interactive children, fresh `dagre.graphlib.Graph()` per layout call for strict-mode safety, built-in delete key. Reason: AGENT.md directive 11 — version pinning + library currency. Verified via context7-fetched authoritative v12 docs (links: #29).

## Next action
On iteration 10: pick #30 (workspace shell + viewpoint registry + workspace store), relabel `status:in-progress`, branch `issue/30-workspace-shell`, implement. This is the load-bearing foundation issue for Phase 2 — directive 12 recommends Opus for the first issue in a phase whose result becomes the template for subsequent issues. Build the three-pane resizable shell, Zustand workspace store, `Viewpoint<T>` registry per AGENT.md directive 5, project bootstrap via `InMemorySessionRepository`, BDD placeholder. Visual baseline `workspace-empty-bdd.png` on Chromium + WebKit; a11y scan; resize-handle persistence test with real mouse events.
