# STATUS

## Current phase
phase:9 — Package Diagram. Just-in-time decomposed into four children (#154–#157) per AGENT.md Ralph loop step 6. Phase 8 closed at iter-66; vphase-8 tagged; PRs #150 / #152 / #153 from iter-66 still in CI on `main`.

## Current iteration
- Iteration #: 67
- Started: 2026-05-13
- Branch: chore/status-iter-67 (based on chore/status-iter-66 so iter-66 STATUS edits aren't double-applied).
- Working on: Phase 9 JIT decomposition. Opened four child issues following the established viewpoint template (cf. iter-49, iter-42, iter-28):
  - #154 — Package viewpoint registration + ADR 0009
  - #155 — Package node + palette + inspector PackageExtras
  - #156 — PackageImport edge + containment semantics (PackageImportEdge already exists in `src/model/edges.ts`)
  - #157 — Phase 9 gate spec (move-element-between-packages e2e)
  Phase 9 epic (#10) body updated with the four-item task list. Iter-66 PRs still in flight in CI; this iteration does not depend on them.

## Last test run
- Command: pnpm typecheck && pnpm lint && pnpm test:unit && pnpm build
- Result: PASS — 556 unit tests; lint warnings only (fast-refresh, 4 pre-existing); build 591 kB bundle.

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

- 2026-05-12: Iteration 60 — PR #140 (#135) merged at 55139d6 after extracting the missing `parametric-empty.{chromium,webkit}.png` baseline pair from a failing playwright-report (new-spec lesson). Iter-59 STATUS commit auto-ran iter-60 STATUS-only branch (chore/status-iter-60) which never merged.
- 2026-05-12: Iteration 61 — Shipped #136 implementation. ConstraintUsage carries a paired `ConstraintDefinition` (created in the same compound command) which holds the equation string — Inspector's `ConstraintUsageExtras` edits the linked definition's `expression`. ValueProperty edits via `select` (string/number/boolean) + free-text `defaultValue` with kind-aware parsing. **Lesson:** ValueProperty kindLabel "Value properties" was multi-word and broke the ProjectTree Home/End test's single-word regex once the palette item added the group to every project tree. Renamed to "Values" (singular: "Value") — the cleanest fix without touching the test's accessibility-name regex. Generalizes: keep new tree-group labels single-word so existing tree tests stay green.
- 2026-05-12: Iteration 62 — PR #142 (#136) baseline-refresh cycle: first CI red on three predicted visual baselines (one webkit color-comparison + two new-baseline writes). Recovery via iter-25 procedure with a twist — the new-baseline failures do NOT write a `trace.zip` to the playwright-report, so the trace-attachment lookup only resolved the IBD case. For the parametric actuals, decoded the report's embedded `window.playwrightReportBase64` zip and scanned per-project report JSONs to map sha1→browser. Baselines committed at b7d6bdc; CI 25746011271 went green and PR #142 merged at c935454.
- 2026-05-13: Iteration 63 — Shipped #137 (ParameterBinding edge). `ParameterBindingEdge` uses two `<marker>` defs with a `<circle>` glyph (filled binding dot) on each end — distinct from RequirementTrace's open-triangle. `linkParameterBinding(connection)` accepts a Connection (not source/target/kind) because the canonicalisation flips the connection itself before unpacking. Inspector's endpoint dl mirrors `InspectorIncludeEdge`'s pattern; describeParametricEndpoint falls back to `«kind»` for unnamed nodes. Lesson: jsdom doesn't render `EdgeLabelRenderer` children — the portal target isn't created without a real ReactFlow viewport, so label tests are e2e-only. PR #143 first CI green but went BEHIND main on a status-only commit — recovered via `gh pr update-branch --rebase`; second CI green and PR merged.
- 2026-05-13: Iteration 64 — Opened PR #145 for #138 (Phase 8 gate spec). Tracks phase-7-gate template: walkthrough + 3 @a11y. Chip drops use `parametric-${kind}-` testid prefix with `[data-element-id]` filter (matches existing parametric-nodes/binding spec patterns). ConstraintUsage chip compounds 2 elements (CD + CU) so final-state expectation is **3 elements + 1 edge**, not 2 + 1. Expression lives on the linked ConstraintDefinition (looked up via `kind === 'ConstraintDefinition'` rather than `definitionId` chase) — kept the redo-state check robust to definition id allocation.
- 2026-05-13: Iteration 65 — PR #145 first CI red on a literal-mismatch in the gate spec: assertion expected `'Value1'` but the default cascading name from `createValueProperty` is lowercase `value1` (src/workspace/store.ts:606-607). Iter-61 renamed the kindLabel singular to "Value" but the *default name* pattern was unchanged, so the test author over-applied the rename. Fix is test-side (870ecfc) — change expected to `'value1'`; downstream `inlineRename(..., 'mass')` is unaffected. **Lesson:** ValueProperty default-name capitalisation diverges from its kindLabel; same pattern likely true elsewhere (BlockUsage/PartUsage cascading defaults are lowercase prefixed: `part1`, `port1`, etc.), so test authors should grep `name${n}` / `name\${` in store.ts rather than infer from chip labels.
- 2026-05-13: Iteration 66 — PR #145 merged at e5ef448; phase 8 epic #9 closed and `vphase-8` tag published. Smoke walk script `scripts/smoke-vphase-8.mjs` landed on branch `issue/151-smoke-vphase-8` (PR #152, closes #151) seeding ConstraintDefinition + ConstraintUsage `newton` with `f = m * a`, two ValueProperty nodes (mass=12, accel=9.81), two ParameterBinding edges; 4 release PNGs captured. PR #150 carries the journal entry + epic close. Both PRs in CI (in_progress). Next iteration picks up post-merge: decompose Phase 9 (Package Diagram, epic #10), JIT.
- 2026-05-13: **Iteration 67 — Phase 9 (Package) JIT-decomposed.** Four children opened (#154 viewpoint+ADR 0009, #155 node+palette+inspector, #156 PackageImport edge + move-between-packages semantics, #157 gate spec) tracking the established four-child template (cf. Phase 6 / Phase 7 / Phase 8). Notable shape decisions deferred to ADR 0009 in #154: (a) whether Package containment renders as a group node enclosing members or a badge with no visual nesting; (b) whether move-between-packages is one atomic update over two memberId lists or a typed compound — current preference is the latter (single Cmd-Z, consistent with iter-17's `update-diagram-position` pattern). PackageElement (`memberIds: ElementId[]`) and `PackageImportEdge` already exist in the metamodel — no Phase 1 work is reopened.

## Next action
Next loop iteration: pick up #154 (Package viewpoint registration + ADR 0009) — highest priority `status:ready` in current phase. Create branch `issue/154-package-viewpoint`, write ADR 0009 first (it pins the open shape questions above), then register the viewpoint per the iter-29 / iter-50 / iter-60 template, then commit empty-canvas visual baselines under Linux renderer. If iter-66 PRs (#150 / #152 / #153) are still in flight, this iter-67 PR will stack behind them — its base is chore/status-iter-66 so it auto-rebases as that merges.
