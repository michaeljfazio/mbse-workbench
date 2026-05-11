# docs/CONTEXT.md — Discovered facts

Append-only, high-signal log of things about this codebase or its stack that
are **not obvious from reading the code**. Future iterations read this file
at the start of every loop, so add facts here instead of re-discovering them.

Each entry is one paragraph max, dated, and explains *why* it matters.

## Discovered facts

- **2026-05-11** — Repo name is exactly `mbse-workbench` (see AGENT.md
  "Phase 0 → Scaffold steps"). Pages base path is `/mbse-workbench/` in
  production builds; `vite.config.ts` already wires this. Any router /
  asset / link code must use `import.meta.env.BASE_URL`, never a
  hard-coded `/`.

- **2026-05-11** — React Flow v12 is imported from `@xyflow/react`, not
  `reactflow`. `nodeTypes` and `edgeTypes` must be module-scoped or
  memoized; passing inline objects re-renders the canvas every state
  change and looks broken even when correct.

- **2026-05-11** — `npm run check` is the canonical CI gate and runs
  typecheck + lint + unit + build + e2e in that order. The Playwright
  suite contains the functional, visual (`@visual`-tagged), and
  accessibility (`@a11y`-tagged) specs in one invocation across the
  `chromium` and `webkit` projects.

- **2026-05-11** — Branch protection on `main` requires the `check` job
  to pass. The repo has auto-merge enabled at repo level; PRs land via
  `gh pr merge --auto --squash`. Never push directly to `main` and
  never use `--no-verify` / `--force`.

- **2026-05-11** — The `github-pages` environment has a `branch_policy`
  protection rule with `custom_branch_policies: true`. Out of the box
  only the `main` branch is in the allow-list, so the release workflow
  (which triggers on `vphase-*` / `v*.*.*` tags) is blocked at the
  `deploy-pages` step with "Tag X is not allowed to deploy to
  github-pages". Both tag patterns are now registered as
  `deployment-branch-policies` of type `tag` (vphase-* and v*.*.*) via
  the environments REST API. Adding a new release tag pattern in the
  future means adding it here too, or the deploy will silently fail
  with that exact error.
