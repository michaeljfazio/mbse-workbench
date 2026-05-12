# STATUS

## Current phase
phase:9 — Package Diagram. Children: #154 (closed), #155 (PR #163 open, auto-merge armed), #156 (PackageImport edge + cross-package import), #157 (move-between-packages compound).

## Current iteration
- Iteration #: 77
- Started: 2026-05-13
- Branch: main (this STATUS update goes on chore/status-iter-77 → PR). Implementation branch was `issue/155-package-node-palette-inspector`.
- Working on: monitor-and-extract for PR #163. PR #163 carries the full #155 vertical slice — PackageNode (tabbed-folder silhouette with "N members" subline), Package palette item, cascading `Package${n}` default name with gap reclamation, store actions (`createPackage` / `addPackageMember` / `removePackageMember`), Canvas palette-drop wiring, `PackageExtras` inspector with member picker + remove, unit tests (cascading-name initial + gap; create undo/redo; add/remove round-trip; no-op duplicate add; delete+undo preserves memberIds), and e2e `@visual package-one.png` seeded spec. CI's first cycle is expected to red on (a) two missing baselines `package-one.{chromium,webkit}.png`, AND (b) possibly stale baselines across all viewpoints because the new `Packages` tree-group surfaces in the project-tree chrome shared across screens (per the iter-37/iter-53 generalised lesson). Iter-78 extracts via the iter-39/iter-60/iter-62 procedure.

## Last test run
- Command: `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm build`
- Result: PASS locally — 575 unit tests / 53 files; tsc clean; eslint 0 errors (4 pre-existing react-refresh warnings); vite build 599 kB.
- Build initially failed on `update-element` patch type-inference: `{ memberIds: [...] }` collapses to `never` under the default `K extends ElementKind = ElementKind`. **Critical: tsc --noEmit does NOT catch this — only `pnpm build` (with `tsc -b`) does.** Fix mirrors `setPartUsageMultiplicity` at store.ts:1098: declare `const patch: ElementPatch<'Package'> = { memberIds: ... }` then dispatch.

## Known issues / blockers
- (none for #155 itself; awaiting CI to harvest baselines)

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
- 2026-05-13: **Iteration 77 — #155 PR #163 opened.** Full slice: PackageNode (tabbed-folder silhouette, "N members" subline), palette item, cascading `Package${n}` default name with gap reclamation, store actions (`createPackage` / `addPackageMember` / `removePackageMember`), canvas-drop wiring, PackageExtras inspector with picker dropdown. Two TS landmines documented inline:
  - **`update-element` patch generic landmine.** When the patch carries a kind-specific field, you MUST annotate `const patch: ElementPatch<'<Kind>'> = { ... }` before dispatch — inline literals collapse to `never` under the default `K extends ElementKind = ElementKind`. **`tsc --noEmit` does NOT catch this; only `tsc -b` / `pnpm build` does.** Add `pnpm build` to the smoke gate when touching `update-element` dispatch sites.
  - **Adding a palette kind shuffles the tree group order.** New `Package` palette entry pushed the Packages tree-group above Blocks in the `ELEMENT_KINDS` traversal order, breaking 5 keyboard-nav tests in `ProjectTree.test.tsx` that anchored on Blocks being first. Fix is mechanical (step past one empty group via ArrowDown), but watch for it on every future palette-kind addition.

## Next action
Iter-78 monitors PR #163 CI. On first red (expected), download `playwright-report`, decode `window.playwrightReportBase64`, map sha1→browser, and copy each `*-actual.png` over the failing baseline path (new: `package-one.{chromium,webkit}.png`; possibly stale: any baselines that include the project-tree chrome). Push same branch. On green CI, auto-merge fires; then JIT-decompose what remains of phase 9 — #156 (PackageImport edge + cross-package drop semantics for the 18 member kinds via `addPackageMember` reuse) and #157 (move-between-packages compound command per ADR 0009 § 4). Periodic health check due at iter-80.
