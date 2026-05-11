# STATUS

## Current phase
phase:1 — Metamodel + command bus + repository + collaboration seams

## Current iteration
- Iteration #: 2
- Started: 2026-05-11
- Branch: issue/14-release-vphase-0
- Working on: #14 — Release vphase-0 and verify Pages deploys (closing Phase 0)

## Last test run
- Command: Release workflow (build → deploy-pages → github-release)
- Result: PASS — https://github.com/michaeljfazio/mbse-workbench/actions/runs/25668816928
- Failures: First attempt failed at `deploy-pages` with "Tag vphase-0 is not allowed to deploy to github-pages due to environment protection rules". Fixed by registering `vphase-*` and `v*.*.*` as `deployment-branch-policies` of type `tag` on the `github-pages` environment; rerun green. Captured in `docs/CONTEXT.md`.

## Known issues / blockers
- (none)

## Decisions log
- 2026-05-11: Bootstrap as a single committed scaffold, not iterative through child PRs. Reason: AGENT.md Phase 0 explicitly lists scaffold steps as the bootstrap and instructs iteration 1 to "run Phase 0 bootstrap" when STATUS.md is missing; opening child issues against an empty repo with no CI yet would be the wrong order. Child issues for any *remaining* Phase 0 polish are opened after the initial commit.
- 2026-05-11: Pinned minor versions per AGENT.md "Version pinning" rule. React 18.3.x, Vite 5.4.x, Tailwind 3.4.x, @xyflow/react 12.3.x, Vitest 2.1.x, Playwright 1.48.x, Anthropic SDK 0.32.x, ESLint 8.57.x. Tailwind 3 (not 4) avoids the PostCSS landmine.
- 2026-05-11: `pnpm run check` composes typecheck + lint + unit + build + e2e in that order; the Playwright suite is the single source of truth for functional, visual (`@visual`-tagged) and accessibility (`@a11y`-tagged) specs across `chromium` and `webkit` projects.
- 2026-05-11: Repo name fixed to `mbse-workbench`; Pages base path `/mbse-workbench/` in production via `vite.config.ts`.
- 2026-05-11: Allow `vphase-*` and `v*.*.*` tags to deploy to the `github-pages` environment via environment deployment-branch-policies (type: tag). Reason: protection rule blocked the first vphase-0 deploy with a tag policy error; documented in `docs/CONTEXT.md` so future phases skip this.

## Next action
On iteration 3: Phase 0 is closed. Open Phase 1 child issues just-in-time (metamodel discriminated unions per element kind, element registry, typed command bus + inverse commands, event log + undo/redo, `InMemorySessionRepository`, `CollaborationProvider` no-op + `User` + `PresenceStore` + `can()` permission hook). Pick the highest-priority `status:ready` Phase 1 issue and start.
