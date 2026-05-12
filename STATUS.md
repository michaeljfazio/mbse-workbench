# STATUS

## Current phase
phase:9 — Package Diagram. Children: #154 (closed), #155 (PR #163 open, fix pushed), #156 (PackageImport edge + cross-package import), #157 (move-between-packages compound).

## Current iteration
- Iteration #: 78
- Started: 2026-05-13
- Branch: chore/status-iter-78 (this STATUS update). PR #163 fix lives on `issue/155-package-node-palette-inspector` (commit 14ef1b3).
- Working on: Diagnosed and pushed two functional fixes for PR #163's first red CI cycle. CI was masking BOTH a real render crash and a real focus regression behind what initially looked like routine baseline drift.
  - **Fix 1 (package render crash):** Package viewpoint had `acceptedElementKinds: ['Package', ...PACKAGE_MEMBER_ELEMENT_KINDS]` (19 kinds). CanvasPane.toFlowNodes filters by `acceptedElementKinds` then calls `viewpoint.nodeTypeFor(el)` on each — and `nodeTypeFor` throws for any non-Package kind. Seeding even one PartDefinition alongside a Package crashed the whole canvas render, so `getByTestId('package-node-pkg-1')` never appeared (4 failures across `package-empty.spec.ts` × chromium+webkit). Narrowed to `acceptedElementKinds: ['Package']`; the 18-kind constant `PACKAGE_MEMBER_ELEMENT_KINDS` stays exported for #156's cross-package drop affordance.
  - **Fix 2 (project-tree focus desync):** ProjectTree's roving-tabindex state was set only by `focusItem()` (click/keyboard). External DOM-focus (`el.focus()` from tests, Tab key from real users) didn't update `explicitFocusKey`, so it stayed anchored at `visibleKeys[0]` — now the new empty Packages group. Pressing ArrowDown from the visibly-focused PartDefinition group navigated *from the stale Package anchor*, advancing to PartDefinition instead of into a leaf. Fix: `onFocus` handlers on group and leaf treeitems call `syncFocus(key)` to mirror DOM-focus into state.
- Iter-79 monitors the re-run. After fix-1 lands, the package-empty visual specs will produce real actual.pngs (the test was timing out *before* the screenshot assertion). After fix-2 lands, project-tree e2e arrow-keys passes. Remaining first-red category — shared-tree-chrome baseline drift across context-menu / ibd-parts / ibd-connection — will surface cleanly for the iter-39/iter-60/iter-62 sha1→browser extraction.

## Last test run
- Command: `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm build` (local, on fix branch)
- Result: PASS — 575 unit tests / 53 files; tsc clean; eslint 0 errors (4 pre-existing react-refresh warnings); vite build 599 kB.
- One unit test required adjustment in lock-step with fix-1: `tests/unit/viewpoints/package.test.ts:18` asserted the wide `acceptedElementKinds`. Updated to assert `['Package']` only.

## Known issues / blockers
- PR #163 CI re-run pending after 14ef1b3. Expected to still red on baseline drift (context-menu, ibd-parts, ibd-connection — shared tree chrome) and on the two new package-one baselines. Iter-79 harvests them via the sha1→browser procedure.

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

## Next action
Iter-79 monitors PR #163 CI re-run on 14ef1b3. Expected outcomes: (a) `package-empty.spec.ts` 4 failures → now produce real `package-one-actual.{chromium,webkit}.png` (extractable via the iter-62 sha1→browser procedure); (b) `project-tree.spec.ts` arrow-keys → passes outright; (c) `context-menu.spec.ts` / `ibd-parts.spec.ts` / `ibd-connection.spec.ts` baseline drift (already had actuals in this CI run) — copy the `*-actual.png` payloads over the matching baselines. Push same branch; auto-merge fires on green. After #155 lands, JIT-decompose what remains of phase 9 — #156 (PackageImport edge + cross-package drop semantics; this is the slot where `PACKAGE_MEMBER_ELEMENT_KINDS` finally pays off) and #157 (move-between-packages compound command per ADR 0009 § 4). Periodic health check due at iter-80.
