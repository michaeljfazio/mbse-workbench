# MBSE Workbench

Browser-based Model-Based Systems Engineering workbench backed by SysMLv2
semantics. Built end-to-end by an autonomous agent operating a Ralph loop
against this GitHub repository.

- **Constitution:** [`AGENT.md`](./AGENT.md)
- **Working memory:** [`STATUS.md`](./STATUS.md) — overwritten each iteration
- **Demo narrative:** [`JOURNAL.md`](./JOURNAL.md) — append-only
- **Decision log:** [`docs/adr/`](./docs/adr/)
- **Discovered facts:** [`docs/CONTEXT.md`](./docs/CONTEXT.md)

## Stack

Vite + React 18 + TypeScript (strict, `noUncheckedIndexedAccess`), Tailwind
+ shadcn/ui, Zustand, `@xyflow/react` (React Flow v12), dagre layout,
Vitest, Playwright (Chromium + WebKit), `@axe-core/playwright`,
`@anthropic-ai/sdk`.

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm run check    # typecheck + lint + unit + build + e2e (matches CI)
```

## Deployment

Production builds publish to GitHub Pages on each `vphase-*` and `v*.*.*`
tag via `.github/workflows/release.yml`. The live deploy is at
<https://michaeljfazio.github.io/mbse-workbench/>.
