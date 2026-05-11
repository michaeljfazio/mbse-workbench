# STATUS

## Current phase
phase:1 — Metamodel + command bus + repository + collaboration seams

## Current iteration
- Iteration #: 6
- Started: 2026-05-11
- Branch: issue/20-repository
- Working on: #20 — InMemorySessionRepository (PR pending push)

## Last test run
- Command: pnpm run check (typecheck + lint + test:unit + build + test:e2e)
- Result: PASS — locally on `issue/20-repository` (65 unit tests, 4 e2e)
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

## Next action
On iteration 7: confirm PR for #20 merged on `main`. If merged, pick #21 (collaboration seams) — the last Phase 1 child issue. After #21 lands, close phase epic #2, open a `type:release` issue, tag `vphase-1`, then exercise the deployed Pages URL in Playwright per Ralph loop step 17.
