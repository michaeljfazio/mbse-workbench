# STATUS

## Current phase
phase:8 — Parametric Diagram (epic #9 open; decomposed into #135 viewpoint+ADR / #136 nodes+palette+inspector / #137 ParameterBinding edge / #138 gate spec)

## Current iteration
- Iteration #: 59
- Started: 2026-05-12
- Branch: chore/status-iter-59 (STATUS-only) opened from main after Phase 7 close
- Working on: idle — Phase 7 closed and vphase-7 tagged; Phase 8 ready to begin next iteration starting with **#135** (viewpoint registration + ADR 0008)

## Last test run
- Command: GitHub Actions release workflow 25740684928 (vphase-7 tag)
- Result: SUCCESS. Pages HTTP 200 at https://michaeljfazio.github.io/mbse-workbench/. Smoke walkthrough via scripts/smoke-vphase-7.mjs captured 4 PNGs under artifacts/release-vphase-7/.

## Known issues / blockers
- (none)

## Decisions log
- 2026-05-11: Bootstrap as a single committed scaffold, not iterative through child PRs. Reason: AGENT.md Phase 0 explicitly lists scaffold steps as the bootstrap and instructs iteration 1 to "run Phase 0 bootstrap" when STATUS.md is missing; opening child issues against an empty repo with no CI yet would be the wrong order. Child issues for any *remaining* Phase 0 polish are opened after the initial commit.
- 2026-05-11: Pinned minor versions per AGENT.md "Version pinning" rule. React 18.3.x, Vite 5.4.x, Tailwind 3.4.x, @xyflow/react 12.3.x, Vitest 2.1.x, Playwright 1.48.x, Anthropic SDK 0.32.x, ESLint 8.57.x. Tailwind 3 (not 4) avoids the PostCSS landmine.
- 2026-05-11: `pnpm run check` composes typecheck + lint + unit + build + e2e in that order; the Playwright suite is the single source of truth for functional, visual (`@visual`-tagged) and accessibility (`@a11y`-tagged) specs across `chromium` and `webkit` projects.
- 2026-05-11: Repo name fixed to `mbse-workbench`; Pages base path `/mbse-workbench/` in production via `vite.config.ts`.
- 2026-05-11: Allow `vphase-*` and `v*.*.*` tags to deploy to the `github-pages` environment via environment deployment-branch-policies (type: tag).
- 2026-05-11: Phase 1 decomposed into 5 child issues (#17–#21); JIT decomposition per AGENT.md Ralph loop step 6.
- 2026-05-11: Metamodel split — 19 element kinds in `ModelElement`; 9 structural relationships in `ModelEdge`. `ConnectionUsage` / `ItemFlow` / `Transition` are elements (named, selectable) with `sourceId`/`targetId` (ADR 0002).
- 2026-05-11: Registry `update<K>` replaces stored element with new object rather than in-place mutation, preserving snapshot stability for undo/redo.
- 2026-05-11: Command bus shape — `Command` is a discriminated union (`create-element` / `update-element` / `delete-element` / `link` / `unlink` / `compound`). ModelEvent payload = inverse command. Extended 2026-05-12 by #72 with `update-edge` for edge-label round-trips.
- 2026-05-11: Repository is a thin async port — one key per project at `mbse:v1:project:<id>`, `ProjectNotFoundError` covers missing-key and malformed-JSON, `StorageQuotaError` wraps `QuotaExceededError`.
- 2026-05-11: Collab module split per responsibility (`user` / `presence` / `provider` / `permissions`). Permissions throw *before* publish so providers only see committed events.
- 2026-05-11: Phase 1 closed and vphase-1 tagged at c1214db.
- 2026-05-11: Phase 2 decomposed into 7 child issues (#30–#36).
- 2026-05-11: `@xyflow/react` v12.3.x research recorded in `docs/CONTEXT.md` ahead of Phase 2.
- 2026-05-11: Workspace shell foundation (#30) at daa7c6f — three-pane resizable layout, Zustand `useWorkspaceStore`, `Viewpoint<T>` registry, project bootstrap via `InMemorySessionRepository`.
- 2026-05-11: Visual snapshot baselines pinned to **Linux** renderer. Generation via `mcr.microsoft.com/playwright:v1.48.2-jammy` + `vite preview` (procedure in `docs/CONTEXT.md`).
- 2026-05-11: `Viewpoint<T>` interface replaces placeholder `renderNode`/`renderEdge` with ReactFlow-native `nodeTypes` / `edgeTypes` (frozen module-scope).
- 2026-05-11: Per-view positions live on `Diagram` (superseded by #34: positions are first-class commands).
- 2026-05-11: Custom nodes must NEVER import `@/workspace/store` at module load — callbacks pass through ReactFlow node `data`.
- 2026-05-11: Edge markers rendered as per-edge SVG `<marker>` defs with unique ids; ReactFlow's built-in `MarkerType` only covers open/closed arrows.
- 2026-05-11: Block-node label uses non-interactive `<div onDoubleClick=...>` rather than `<button>` (axe nested-interactive rule).
- 2026-05-11: `vite.config.ts` honors `VITE_BASE_OVERRIDE` for baseline regen.
- 2026-05-11: Inspector (#32) ships the canvas → inspector → edit → reflect loop; autosave on every bus event.
- 2026-05-11: PR #40 needed `gh pr update-branch --rebase` before auto-merge — STATUS.md on main between PR open and CI completion puts strict-protection PRs in BEHIND.
- 2026-05-11: **Position-as-command-bus** (#34) — `update-diagram-position` is a first-class `Command`. `createBlock` wraps create+initial-position in a compound.
- 2026-05-11: Auto-layout (#34) is a single compound command of N `update-diagram-position` sub-commands; one Cmd-Z reverts the whole layout.
- 2026-05-11: Project tree (#33) — kind groups from union of (registry kinds, palette items across viewpoints); MIME `application/x-mbse-element-kind`; canvas drop validates against `acceptedElementKinds`.
- 2026-05-11: Export (#35) — `src/workspace/export/` ships pure `buildDiagramSvg` + thin PNG rasteriser at 2× DPR.
- 2026-05-11: Iteration 17 — `Project.history` round-trips through repository; CommandBus accepts `initialUndoStack` / `initialRedoStack`.
- 2026-05-12: **Phase 2 closed, vphase-2 tagged at 0f93af0.**
- 2026-05-12: Phase 3 decomposed into six children (#49–#54).
- 2026-05-12: `@xyflow/react` v12.3.x multi-handle research recorded — multiple `<Handle>` per side with unique `id` + inline `style`.
- 2026-05-12: IBD viewpoint (#49) — `Diagram.context?: { kind: 'partDefinition'; id }` per ADR 0003.
- 2026-05-12: Axe `color-contrast` can sample tabs mid-CSS-transition — wait for `document.getAnimations().finished` before `AxeBuilder.analyze()`.
- 2026-05-12: Iteration 21 — Shipped #50 (PartUsage node + PortUsage handles + port management). `KIND_OPTIONAL_FIELDS` whitelist table.
- 2026-05-12: Iteration 22 — Shipped #51 (ConnectionUsage edge with typed compatibility). `acceptedEdgeElementKinds` + `edgeTypeForElement` on Viewpoint. Two RF selection-handling fixes.
- 2026-05-12: Iteration 23 — arm64-podman emulation produces font hinting that diverges from amd64 GitHub Actions runner beyond `maxDiffPixelRatio: 0.01`. Recovery: copy CI `*-actual.png` over committed baselines via trace-metadata mapping.
- 2026-05-12: Iteration 24 — Shipped #52 (ItemFlow edge variant). Shift-modifier discriminates two element-as-edge kinds via `shiftHeldRef` seeded by `onConnectStart`'s native event.
- 2026-05-12: Iteration 26 — Shipped #53 (cross-diagram navigation — Show in BDD/IBD). Pure `navTargets.ts` + presentational `ContextMenu.tsx`.
- 2026-05-12: Iteration 27 — **Phase 3 closed, vphase-3 tagged at f14d6a1.** Two findings: `addPortToDefinition` does NOT cascade to existing PartUsages; React Flow rebuilds edge layer one render tick AFTER parts mount.
- 2026-05-12: **Phase 4 decomposed into five children** (#70–#74).
- 2026-05-12: **ADR 0004** — free-form Requirements diagrams; RequirementTrace stays in `ModelEdge`; endpoint typing per kind; cross-diagram visibility via the #73 inspector seam.
- 2026-05-12: Iteration 29 — Shipped #70 (Requirements viewpoint registration + ADR 0004). `scripts/regen-baselines.sh` rewrites ANY changed baseline — revert unintended modifications before staging.
- 2026-05-12: Iteration 30 — Shipped #71 (Requirement custom node + palette + RequirementExtras). reqId gap-fill scan from `R-001` upwards.
- 2026-05-12: Iteration 31 — Shipped #72 (RequirementTrace edges + traceKind picker). Added `update-edge` command. `EdgeLabelRenderer` portals labels — use SVG-side discriminator like `g[data-trace-kind]` for counts.
- 2026-05-12: Iteration 32 — Shipped #73 (inspector "+ Link requirement"). Two gotchas: `<ul role="radiogroup">` + `<li>` fails axe `listitem`; Playwright's `toContainText` does not include `<input value="...">`.
- 2026-05-12: Iteration 33 — Shipped #74 (Phase 4 gate spec). Selection-merge gotcha: project-tree-leaf REPLACES selection vs canvas-node-click MERGES.
- 2026-05-12: **Phase 4 closed, vphase-4 tagged at 4b69312.**
- 2026-05-12: **Phase 5 decomposed into four children** (#87–#90).
- 2026-05-12: Iteration 35 — Shipped #87 (Activity viewpoint + ADR 0005). `PaletteItem.defaultData` field added.
- 2026-05-12: Iteration 37 — Shipped #88. **Lesson:** viewpoint palette chip strip stales the earlier `*-empty` baseline on the same canvas.
- 2026-05-12: Iteration 39 — Shipped #89. **Lesson:** brand-new spec file with @visual specs needs its parallel `tests/e2e/__screenshots__/<spec>.spec.ts/` directory created and populated.
- 2026-05-12: Iteration 40 — Opened PR #100 for #90. (a) redo termination on 4 signals not 2; (b) Canvas drop target ~540 px tall on 1280×800.
- 2026-05-12: **Phase 5 closed, vphase-5 tagged at ea62765.**
- 2026-05-12: Iteration 42 — Phase 6 decomposed into four children (#104–#107). UI-layer only.
- 2026-05-12: #104 merged — first viewpoint with `acceptedEdgeElementKinds` set without `acceptedEdgeKinds` (Transitions are elements-as-edge).
- 2026-05-12: Iteration 45 — #105 merged (StateUsage + pseudostate nodes + palette + inspector StateExtras).
- 2026-05-12: Iteration 46 — #106 merged (Transition element-as-edge + isValidStateMachineConnection). Push-then-rebase workflow for clearing BEHIND under AGENT.md's no-force constraint.
- 2026-05-12: Iteration 47 — PR #113 opened for #107 (Phase 6 gate spec).
- 2026-05-12: **Iteration 48 — Phase 6 closed, vphase-6 tagged at 845918d.** PR #113 went BEHIND main twice; recovery via push-then-rebase. Live deploy demonstrates four of eight viewpoints.
- 2026-05-12: **Iteration 49 — Phase 7 decomposed into four children** (#117–#120). Key decision: three accepted edge kinds means a popover picker at drop, NOT shift-modifier discrimination.
- 2026-05-12: Iteration 50 — #117 merged at PR #122 (Use Case viewpoint registered + ADR 0007).
- 2026-05-12: Iteration 52 — #118 implemented (Actor + UseCase custom nodes + palette).
- 2026-05-12: Iteration 53 — #118 PR #125 merged at 29aef6a after baseline fix. **Generalized lesson:** any change to viewpoint palette declarations may stale baselines across ALL viewpoints, because the project-tree pane is shared chrome — iter-37 chip-strip rule generalizes (recorded in `docs/CONTEXT.md`).
- 2026-05-12: Iteration 54 — #119 merged at PR #127 (Include + Extend + Generalization edges). ActorNode handle-direction bug caught: flipped to top=target/bottom=source to match UseCaseNode.
- 2026-05-12: Iteration 57 — #120 PR #131 opened (Phase 7 gate spec, 545 lines, 8 tests).
- 2026-05-12: Iteration 58 — PR #131 rebased after iter-56 STATUS PR #130 landed during first CI; iter-57 STATUS PR #132 was DIRTY (branched pre-#130) so closed and reopened fresh chore/status-iter-58 from updated main.
- 2026-05-12: **Iteration 59 — Phase 7 closed, vphase-7 tagged.** Release workflow 25740684928 green; Pages HTTP 200; smoke walkthrough scripts/smoke-vphase-7.mjs seeded 2 Actors + 3 Use Cases with Include/Extend/Generalization — captured 4 PNGs in artifacts/release-vphase-7/. Live deploy demonstrates **five of eight viewpoints** (BDD/IBD/Requirements/Activity/State Machine/Use Case). Phase 8 (Parametric Diagram) decomposed into four children (#135 viewpoint+ADR 0008, #136 ConstraintUsage+ValueProperty nodes+palette+inspector, #137 ParameterBinding edge, #138 gate spec). Phase 8 metamodel pre-exists (links: #8 epic closed, #134 release closed, vphase-7 tag, #9 / #135-#138).

## Next action
Start Phase 8 by picking up **#135** (viewpoint registration + ADR 0008). Follow iter-29/35/43/49 template: register `parametricViewpoint` with frozen module-scope empty `nodeTypes`/`edgeTypes`, author ADR 0008 (free-form scope; accepted element kinds ConstraintUsage + ValueProperty; ParameterBinding stays in `ModelEdge`; equations as plain strings, no evaluator), commit empty `parametric-empty.{chromium,webkit}.png` baseline pair.
