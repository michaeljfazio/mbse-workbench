# STATUS

## Current phase
phase:1 — Metamodel + command bus + repository + collaboration seams

## Current iteration
- Iteration #: 4
- Started: 2026-05-11
- Branch: issue/18-element-registry
- Working on: #18 — Element registry with stable IDs and integrity checks (PR #23, auto-merge enabled, CI pending)

## Last test run
- Command: pnpm run check (typecheck + lint + test:unit + build + test:e2e)
- Result: PASS — locally on `issue/18-element-registry` (33 unit tests, 4 e2e)
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

## Next action
On iteration 5: confirm PR #23 merged and #18 closed on `main`. If merged, pick #19 (typed command bus with events, inverse commands, undo/redo) — depends on the registry just landed and unblocks both the repository (#20) and collaboration seams (#21). The command bus is the load-bearing piece for Architectural directive § 2, so the implementing subagent should be Opus; routine work in #20 / #21 can run on Sonnet.
