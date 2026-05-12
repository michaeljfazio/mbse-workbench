# STATUS

## Current phase
phase:10 — Requirements traceability. Phase 9 closed (epic #10) and `vphase-9` tagged at 82b8262 (release workflow run 25762425334 queued). Phase 10 not yet decomposed — JIT child issues open next iteration per AGENT.md Ralph loop step 6.

## Current iteration
- Iteration #: 84
- Started: 2026-05-13
- Branch: chore/status-iter-84 (this STATUS update).
- Working on: #177 slice 1/N — PR #186 (computeImpactSet pure helper) opened, labelled `phase:10,type:feature,p1`, auto-merge --squash enabled. Awaiting CI.

## Last health check
- Date: 2026-05-13 (iter-80)
- Pages deploy: `https://michaeljfazio.github.io/mbse-workbench/` returns HTTP 200 ✓
- Last 5 merged PRs (#165 #164 #160 #159 #152): all show merged status with referenced issues closed ✓
- `status:needs-human` open issues: 0 (well under threshold of 3) ✓
- Most recent 5 CI runs on `main`: all green ✓
- Result: PASS. Next health check due at iter-90.

## Last test run
- Command: `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm build` (local, on PR #186's branch, iter-84)
- Result: PASS — 637 unit tests / 57 files; tsc clean; eslint 0 errors / 4 warnings (pre-existing react-refresh); vite build 602 kB. No UI surface in this slice → no Playwright run required locally; CI Playwright matrix runs on the PR.

## Known issues / blockers
- None functional. Release workflow run 25762425334 queued on tag `vphase-9` push — watch for deploy green then exercise live URL in Playwright walkthrough (eight viewpoints) and save screenshots under `artifacts/release-vphase-9/` per AGENT.md Ralph loop step 17.

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
- 2026-05-11: Visual snapshot baselines pinned to **Linux** renderer. Generation via `mcr.microsoft.com/playwright:v1.48.2-jammy` + `vite preview` (procedure in `docs/CONTEXT.md`).
- 2026-05-11: Custom nodes must NEVER import `@/workspace/store` at module load — callbacks pass through ReactFlow node `data`.
- 2026-05-11: **Position-as-command-bus** (#34) — `update-diagram-position` is a first-class `Command`.
- 2026-05-12: **Phase 2 closed, vphase-2 tagged at 0f93af0.**
- 2026-05-12: **Phase 3 closed, vphase-3 tagged at f14d6a1.**
- 2026-05-12: **Phase 4 closed, vphase-4 tagged at 4b69312.**
- 2026-05-12: **Phase 5 closed, vphase-5 tagged at ea62765.**
- 2026-05-12: **Phase 6 closed, vphase-6 tagged at 845918d.**
- 2026-05-12: **Phase 7 closed, vphase-7 tagged.**
- 2026-05-12: Iter-37 / iter-53 generalised lesson: viewpoint palette declarations live in shared project-tree chrome; any new palette item may stale baselines across ALL viewpoints, not just the one being changed.
- 2026-05-12: Iter-61: keep new tree-group `kindLabel`s single-word so existing tree tests (Home/End regex) stay green; ValueProperty kindLabel singular "Value".
- 2026-05-12: Iter-62 baseline-refresh: new-baseline failures do NOT write `trace.zip` — decode `window.playwrightReportBase64` and scan per-project report JSONs to map sha1→browser.
- 2026-05-13: Iter-63 ParameterBinding edge — `<marker>` defs with `<circle>` glyph for filled binding dot; `linkParameterBinding(connection)` canonicalises by flipping the Connection.
- 2026-05-13: Iter-65 ValueProperty default-name capitalisation lesson — default name is lowercase `value1` while kindLabel is "Value". Grep `name${n}` / `name\${` in `store.ts` rather than infer from chip labels.
- 2026-05-13: Iter-73 STATUS-stacking lesson: stacking one STATUS commit per idle iteration cascades CI cancellations on the status PR. Hold STATUS commits until CI lands or a real signal arrives.
- 2026-05-13: **Iteration 74 — Phase 8 closed, vphase-8 tagged at e5ef448.** Release workflow 25750784828 queued. Stale PR #148 (5-deep STATUS stack) closed as superseded. Live deploy on workflow green demonstrates six viewpoints.
- 2026-05-13: **Iteration 75 — #154 Package viewpoint registered + ADR 0009 published.** PR #159 opened (auto-merge --squash). Eighth viewpoint slot wired into the registry alongside Parametric.
- 2026-05-13: **Iteration 76 — #159 auto-merged green; #155 surface survey recorded.** Implementation landmarks digest produced by Explore subagent for iter-77 pickup (no re-survey needed).
- 2026-05-13: **Iteration 77 — #155 PR #163 opened** with full slice (PackageNode, palette, cascading default name, store actions, canvas-drop wiring, PackageExtras inspector, unit tests, @visual seeded spec).
- 2026-05-13: **Iteration 78 — TWO real bugs uncovered in #163's first CI red, both fixed in 14ef1b3.**
  - **`acceptedElementKinds` overreach landmine.** A viewpoint's `acceptedElementKinds` doubles as the *render set* (CanvasPane filters by it then calls `nodeTypeFor`, which throws for unsupported kinds). It is NOT a drop-affordance list. Future viewpoints with palettes broader than their renderers must keep these two concerns separate — list only renderable kinds in `acceptedElementKinds`, track drop-only kinds in a viewpoint-private constant. ADR 0009 § 1's "accepts the Package element plus every member kind" was the trap.
  - **Roving-tabindex without DOM-focus sync.** ProjectTree's `explicitFocusKey` was only written by `focusItem()` — not by native focus events. Any caller that bypasses React (test `el.focus()`, real Tab from outside the tree) puts DOM and state out of sync, and ArrowDown navigates from the stale state anchor. The fix is a 1-line `onFocus={() => syncFocus(key)}` on every focusable treeitem. Apply this pattern to any new roving-tabindex widget. Sympathetic with iter-37/iter-53 generalised lesson: shared chrome changes (new tree groups) move `visibleKeys[0]`, which is the *implicit* focus default, surfacing latent focus-sync gaps.
- 2026-05-13: **Iteration 79 — PR #163 `DIRTY` → cleared by merging `origin/main` into the feature branch.** Iter-77 + iter-78 STATUS PRs (#164/#165) had landed on main while #163 was idle, conflicting on STATUS.md. Took main's STATUS verbatim (theirs), merged forward (no rebase, no `--force`). Per iter-46: clearing `BEHIND`/`DIRTY` on a feature branch under the no-`--force` constraint = merge main IN (or `gh pr update-branch`), not rebase-then-force. The 5 functional commits on the branch are unchanged.
- 2026-05-13: **Iteration 80 — periodic health check PASS.** Pages 200, last 5 merged PRs clean, 0 `status:needs-human`, last 5 main CI runs green. PR #163 merged (auto-merge --squash) before iter-81 started.
- 2026-05-13: **Iteration 81 — #156 PackageImport edge + move-between-packages compound landed in PR #167.** Single-PR slice: dashed-arrow «import» edge renderer, `isValidPackageConnection` (Package→Package, no self-loops, no same-direction duplicates, reverse allowed), `linkPackageImport` (round-trip with undo), `moveElementBetweenPackages` typed compound (single Cmd-Z reverts), CanvasPane wiring for onConnect + isValidConnection, new `PROJECT_TREE_DRAG_ELEMENT_ID` MIME making tree leaves draggable, drop-on-Package-node detection via `elementFromPoint`. +11 unit tests, all 586 green.
- 2026-05-13: **Iteration 82 — #157 Phase 9 gate spec landed in PR #169.** Single Playwright walkthrough covers drop-2-packages → drag-leaf-to-P1 → move-to-P2 → Cmd-Z restore → draw-import-edge → final shape. Three `@a11y` scans (empty / populated / inspector); the inspector scan is scoped to `[data-testid="inspector-single"]` because a selected Package node's aria-hidden «package» tab still trips axe color-contrast — pre-existing tab style, not a regression. `@visual` baseline `phase-9-final.png` regenerated via `scripts/regen-baselines.sh`; all other modified baselines reverted (arm64 → amd64 hinting drift, per docs/CONTEXT.md 2026-05-12 lesson).
- 2026-05-13: **Iteration 83 — Phase 9 closed, vphase-9 tagged at 82b8262.** Epic #10 closed with all four child checkboxes ticked; release issue #171 opened; release workflow run 25762425334 queued on tag push. JOURNAL.md appended with phase-completion entry. Eight of eight viewpoints in the live deploy on workflow green; remaining phases are 10 (Requirements traceability), 11 (LLM), 12 (export/import + polish).
- 2026-05-13: **Iteration 84 — #177 slice 1/N PR #186 opened.** Pure `computeImpactSet(rootElementId, elements, edges)` helper under `src/workspace/impact/` plus 9 unit cases (empty, single root, outgoing composition, incoming RequirementTrace, mixed, cycle-safety, disconnected components, malformed map guard, edge-type filtering). Pure module → no UI surface, no visual/a11y delta this slice. Phase 10 decomposition is already in flight (PRs #182 matrix-helpers slice and #185 tree-drag-trace merged on main; #179 editor-helpers merged); ladder is: impact helpers → context-menu + store flag → node-ring + banner UI → Phase 10 gate spec.

## Next action
Watch PR #186 CI to green and let auto-merge land it on main. Then next iteration: pick up slice 2/N of #177 — store wiring (`impactHighlightedIds: Set<ElementId>` on the workspace store) + a `runImpactAnalysis(rootId)` action that populates it via `computeImpactSet`, with unit coverage for the action. UI surface (context menu, ring rendering, banner, cross-tab persistence) follows in slice 3/N. Release workflow run 25762425334 (vphase-9) still pending live walkthrough — `artifacts/release-vphase-9/` capture is deferred but not blocking Phase 10.
