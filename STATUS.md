# STATUS

## Current phase
phase:0 — Bootstrap

## Current iteration
- Iteration #: 1
- Started: 2026-05-11
- Branch: main (bootstrap commit goes direct on first push)
- Working on: Phase 0 scaffold — Vite/React/TS, CI/release workflows, GitHub repo, label taxonomy, phase epics

## Last test run
- Command: pnpm run typecheck && pnpm run lint && pnpm run test:unit && pnpm run build && pnpm exec playwright test
- Result: PASS (typecheck, lint, unit, build); e2e pending Playwright browser install during iteration 1
- Failures: none

## Known issues / blockers
- (none)

## Decisions log
- 2026-05-11: Bootstrap as a single committed scaffold, not iterative through child PRs. Reason: AGENT.md Phase 0 explicitly lists scaffold steps as the bootstrap and instructs iteration 1 to "run Phase 0 bootstrap" when STATUS.md is missing; opening child issues against an empty repo with no CI yet would be the wrong order. Child issues for any *remaining* Phase 0 polish are opened after the initial commit.
- 2026-05-11: Pinned minor versions per AGENT.md "Version pinning" rule. React 18.3.x, Vite 5.4.x, Tailwind 3.4.x, @xyflow/react 12.3.x, Vitest 2.1.x, Playwright 1.48.x, Anthropic SDK 0.32.x, ESLint 8.57.x. Tailwind 3 (not 4) avoids the PostCSS landmine.
- 2026-05-11: `pnpm run check` composes typecheck + lint + unit + build + e2e in that order; the Playwright suite is the single source of truth for functional, visual (`@visual`-tagged) and accessibility (`@a11y`-tagged) specs across `chromium` and `webkit` projects.
- 2026-05-11: Repo name fixed to `mbse-workbench`; Pages base path `/mbse-workbench/` in production via `vite.config.ts`.

## Next action
On iteration 2: query open issues, pick highest-priority `status:ready` Phase 0 child issue (or close phase 0 epic if all green and move to Phase 1 — typed metamodel + command bus + repository + collab seams).
