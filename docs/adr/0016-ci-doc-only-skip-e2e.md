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

## Correction (iter-847) — top-level `*.md` exclusion

Empirical regression observed iter-846 (issue #483): PR #482 modified only `STATUS.md` and the `fast` classifier logged `code = true`, triggering all four e2e shards (~10 min wasted wallclock). Root cause: `dorny/paths-filter@v3` uses picomatch semantics where `**/*.md` requires at least one path segment before `*.md`. Root-level `STATUS.md`, `JOURNAL.md`, `README.md`, `AGENT.md` do not match the exclusion, fall through to `**`, and classify as code.

Filter updated to include a sibling exclusion for root-level `.md` files:

```yaml
filters: |
  code:
    - '**'
    - '!**/*.md'
    - '!*.md'        # root-level .md — STATUS.md, JOURNAL.md, README.md, AGENT.md
    - '!LICENSE'
```

The conservative-default rationale from the original decision still holds: a non-`.md` file added at any path triggers full e2e. The new exclusion is narrowly scoped to `*.md` at depth-0 only.

Self-test: this ADR + ci.yml change is itself a code change (`.github/workflows/**`) → classifier sees `code = true` → full e2e runs and exercises the unchanged-positive path. Empirical validation of the new exclusion path is the next doc-only PR after this lands (a `STATUS.md`-only iteration sync).
