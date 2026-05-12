# STATUS

## Current phase
phase:9 — Package Diagram. JIT-decomposed into four children (#154–#157) by iter-67 (PR #158 in flight off chore/status-iter-67). This iteration picks up #154 directly from main; if iter-67's status PR lands afterward, it's a no-op for the decomposition record.

## Current iteration
- Iteration #: 75
- Started: 2026-05-13
- Branch: issue/154-package-viewpoint → PR #159 opened with auto-merge --squash. STATUS update on chore/status-iter-75 follow-on.
- Working on: #154 — Package viewpoint registration + ADR 0009. Shipped:
  - `src/viewpoints/package/index.ts` — placeholder viewpoint (empty palette/nodes/edges). `acceptedElementKinds` = `Package` + 18 member kinds; `acceptedEdgeKinds: ['PackageImport']`; `acceptedEdgeElementKinds: []` per ADR 0009 § 2.
  - `docs/adr/0009-package-diagram-shape.md` pins four decisions: (1) free-form scope (no Diagram.context, multiple per project); (2) containment as `memberIds` list NOT element-as-edge — group-node vs. badge render deferred to #155 (data model unchanged either way); (3) PackageImport endpoint typing Package→Package, directional, no self-imports; (4) move-between-packages as typed compound of two `update-element` commands so single Cmd-Z reverts both halves (mirrors iter-17 update-diagram-position precedent).
  - `tests/unit/viewpoints/package.test.ts` (10 cases) + 2 cases in `tests/unit/workspace/store.test.ts`.
  - `tests/e2e/package-empty.spec.ts` — 3 specs (tab switch, @a11y, @visual `package-empty.png`). Linux baselines pending first CI cycle per iter-39 / iter-60 procedure.

## Last test run
- Command: pnpm typecheck && pnpm lint && pnpm test:unit && pnpm build
- Result: PASS — 567 unit tests; lint warnings only (4 pre-existing fast-refresh); build 592 kB bundle.

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
- 2026-05-13: **Iteration 74 — Phase 8 closed, vphase-8 tagged at e5ef448.** Release workflow 25750784828 queued. Stale PR #148 (5-deep STATUS stack) closed as superseded. Live deploy on workflow green will demonstrate **six of eight viewpoints**.
- 2026-05-13: **Iteration 75 — #154 Package viewpoint registered + ADR 0009 published.** PR #159 opened (auto-merge --squash). Eighth viewpoint slot wired into the registry alongside Parametric. Four ADR-9 decisions pinned ahead of #155–#157: free-form scope, memberIds-not-edge containment, Package→Package directional imports, move-between-packages as two-command compound. Member list (18 kinds, every member-capable ElementKind) exported as `PACKAGE_MEMBER_ELEMENT_KINDS` so #156 drop semantics can iterate it without re-deriving. New @visual spec — `package-empty.{chromium,webkit}.png` baselines will be extracted from first CI playwright-report per iter-39/iter-60.

## Next action
Next iteration: await PR #159 CI. On red @visual (expected — new baseline pair), extract the two `package-empty-actual.png` files from the playwright-report per iter-62 procedure (decode `window.playwrightReportBase64`, map sha1→browser) and commit as baselines on the same branch. On green merge, pick up #155 (Package custom node + palette + inspector `PackageExtras`) — ADR 0009 § 2 leaves the group-node vs. badge render choice to that PR; current preference is group-node (matches SysMLv2 mental model and the SysMLv2 textual notation Phase 12 will serialize). Periodic health check still due at the iter-80 boundary.
