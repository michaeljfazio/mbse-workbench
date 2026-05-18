# 0016 — CI: skip e2e on doc-only PRs via step-level paths-filter

**Status:** Accepted (iter-840)

## Context

Most Phase 15 PRs are doc-only: walk close-outs (`docs/architect/walks/walk-N.md`), `JOURNAL.md` entries, `STATUS.md` syncs, ADRs, `docs/CONTEXT.md` updates. Full CI takes ~30–40 minutes because the `check` job runs Playwright e2e on Chromium + WebKit. With at least one doc-only PR per architect walk and additional close-outs / status syncs, the cumulative wall-clock cost across the autonomous loop is large and gates the in-flight pipeline (A.8 soft cap = 5).

Issue #453 specified the "always-running summary check" pattern — split `check` into a `fast` job and an `e2e` job, add a new `ci-summary` aggregator job, and re-point branch protection from `check` to `ci-summary`. That pattern is correct when the heavy work lives in a separate job; with a separate `e2e` job and `paths-ignore` on the trigger, a required `e2e` check would never report on doc-only PRs and the PR would hang.

## Decision

Use **step-level `if:` conditions** on the e2e-related steps inside the existing single `check` job, gated by a `dorny/paths-filter@v3` step earlier in the same job. The `check` job always runs and always reports its status; branch protection continues to require `check`.

Filter:

```yaml
filters: |
  code:
    - '**'
    - '!**/*.md'
    - '!LICENSE'
```

Conservative "everything is code unless explicitly excluded" — a non-`.md` file added at any path (e.g., a future `NOTICE`) triggers full e2e by default. `.github/workflows/**` is intentionally `code` so CI changes self-test.

Conditional steps (skipped when `code == 'false'`):
- Cache Playwright browsers
- Install Playwright browsers (with system deps)
- E2E tests
- Upload Playwright report
- Upload Playwright test-results

Typecheck / lint / unit / build run unconditionally — they are cheap and provide a smoke signal that the runner is healthy.

## Rationale

- Step-level `if:` matches the current single-job structure; introducing a new aggregator job + branch-protection rewrite carries more risk than the saving justifies.
- Branch protection rewrite is destructive (`#453` halting-safety note): a typo or classifier bug strands every PR. This approach avoids that landmine entirely.
- Self-tests on the PR that introduces it: the change itself touches `.github/workflows/ci.yml` → matches `**` → `code = true` → full e2e runs, validating the conditional plumbing without skipping.

## Consequences

- Doc-only PRs report `check` green in ~2–3 min (typecheck + lint + unit + build only).
- Post-merge `check` on `main` also skips e2e for doc-only commits — fine because the PR already gated.
- The first natural validation of the skip path is the next doc-only walk close-out PR after this lands.
- If a future regression shows a doc-only PR escaping a required e2e (classifier false negative), expand the `code` filter or add a positive include for the offending path; do **not** widen blanket-then-narrow.
- Sibling #452 (Playwright sharding) remains independent and compounds: when sharding lands, code PRs get the sharded e2e benefit while doc PRs already skip entirely.

## Correction (iter-849)

The `'**' + '!**/*.md' + '!LICENSE'` filter above **never excluded anything in practice**. Root cause: `dorny/paths-filter@v3` uses `patterns.some(aPredicate)` semantics by default (`src/filter.ts`); each rule is its own picomatch matcher with no shared state, so a bang rule like `'!**/*.md'` becomes "match files that don't match `**/*.md`," not "exclude `.md` files from a result set." With the `'**'` catch-all present, the first rule always matches and `some` short-circuits to `true`, making every negation a no-op.

Empirical proof:
- `docs/CONTEXT.md`-only PR #487 (iter-848): `Filter code = true / Matching files: docs/CONTEXT.md [modified]`.
- Local picomatch replica of dorny's exact matcher chain returns `true` for every file, including `LICENSE` itself.

The iter-847 attempt (PR #485, closed) added a sibling `'!*.md'` rule hypothesising a picomatch depth-0 quirk. That hypothesis was empirically falsified — depth-1 `.md` files were also misclassified, so depth was never the issue. PR #485 closed as no-op.

**Corrected filter (option 3 of three viable directions documented in #490):** drop the `'**'` catch-all and enumerate code-bearing paths positively. New filter (see `.github/workflows/ci.yml`):

```yaml
code:
  - 'src/**'
  - 'tests/**'
  - 'scripts/**'
  - '.github/workflows/**'
  - 'index.html'
  - 'package.json'
  - 'pnpm-lock.yaml'
  - 'vite.config.ts'
  - 'vitest.config.ts'
  - 'playwright.config.ts'
  - 'tsconfig*.json'
  - 'tailwind.config.ts'
  - 'postcss.config.js'
  - '.eslintrc.cjs'
```

This inverts the conservative default. Under the original ADR, "everything is code unless excluded" meant a new top-level `NOTICE` file would trigger full e2e. Under the corrected filter, a new top-level file is treated as doc-only by default until added to the list. The trade-off is acceptable because (a) new top-level code-bearing files are rare and arrive with PRs that already touch the filter, and (b) the cost of the original conservative-default was zero before the dorny landmine was understood — now it's a non-functional default that pretended to skip docs.

Alternatives considered and **not** taken:
1. **`predicate-quantifier: every`** action input + inverted rules — works under dorny's `every` semantics but the rule rewrite is fiddly.
2. **Per-rule `any:`/`every:` YAML quantifier** — verbose; spreads quantifier state across the filter.

This PR's own CI is the regression self-test: touching `.github/workflows/**` matches the new filter → `code = true` → full e2e runs. The first doc-only PR after this lands is the empirical validation that `.md`-only diffs now classify as `code = false`.

Cross-references: `docs/CONTEXT.md` iter-848 entry (dorny `some`-predicate landmine), #483 (original symptom), #485 (closed no-op attempt), #488/#489 (CONTEXT.md correction), #490 (this fix).
