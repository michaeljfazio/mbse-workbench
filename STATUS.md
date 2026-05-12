# STATUS

## Current phase
phase:9 — Package Diagram. JIT-decomposed into four children (#154–#157) by iter-67 (PR #158 in flight off chore/status-iter-67). This iteration picks up #154 directly from main; if iter-67's status PR lands afterward, it's a no-op for the decomposition record.

## Current iteration
- Iteration #: 76
- Started: 2026-05-13
- Branch: issue/155-package-node-palette-inspector → PR #163 (phase:9 — Package node + palette + inspector PackageExtras). Auto-merge --squash armed; was BEHIND main after #160 landed.
- Working on: #155 baseline-from-CI extraction. Run 25758491542 failed on exactly one visual: `[chromium] @visual package-one canvas baseline` (webkit baseline already committed in a prior cycle). Extracted the chromium actual from the embedded playwright-report base64 (sha1 `b75b2fc1…`, 1280×720 PNG, 48 820 bytes) and pushed it as `tests/e2e/__screenshots__/package-empty.spec.ts/package-one-chromium.png` on the issue branch. Per iter-39/iter-60/iter-62 procedure.

## Last test run
- Command: CI run 25758491542 (chromium + webkit @visual + @a11y + functional, 432 specs)
- Result: 431 passed, 1 failed — only failure was the missing chromium `package-one.png` baseline (now committed at bf61668). Next CI cycle on PR #163 expected green.

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
- 2026-05-13: **Iteration 75 — #154 Package viewpoint registered + ADR 0009 published.** PR #159 opened (auto-merge --squash). Eighth viewpoint slot wired into the registry alongside Parametric. Four ADR-9 decisions pinned ahead of #155–#157: free-form scope, memberIds-not-edge containment, Package→Package directional imports, move-between-packages as two-command compound. Member list (18 kinds, every member-capable ElementKind) exported as `PACKAGE_MEMBER_ELEMENT_KINDS` so #156 drop semantics can iterate it without re-deriving.
- 2026-05-13: **Iteration 76 — #155 chromium baseline extracted.** PR #163 first CI cycle (run 25758491542) failed exactly once: missing `package-one-chromium.png` baseline (webkit had landed earlier). Decoded `window.playwrightReportBase64` from the index.html artifact; only one PNG in `data/` so the sha1→browser map was trivially singular. Pushed bf61668 with the baseline file. Next cycle expected green → squash-merge by auto-merge.

## Next action
Await PR #163 next CI cycle (triggered by bf61668). On green, auto-merge --squash lands #155 and closes the issue. Then pick up #156 (palette drop semantics — drop on Package node = set drop target's `memberIds` ⊇ {dropped.id}; drop on canvas = clear membership; iterate `PACKAGE_MEMBER_ELEMENT_KINDS`) and #157 (PackageImport edge type with Package→Package endpoint guard, directional arrow, no self-imports). On any red beyond a new-baseline diff, diagnose per iter-62 procedure (decode playwright-report base64, map sha1→browser via report JSON walk). Periodic health check still due at the iter-80 boundary (4 iterations away).
