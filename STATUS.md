# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slice A (#217) merged via PR #224. Slice B (#218) in flight on PR #225.

## Current iteration
- Iteration #: 266
- Started: 2026-05-13T14:50Z
- Branch: issue/218-api-key-entry (PR #225)
- Working on: PR #225 (closes #218) — open with auto-merge SQUASH. Visual baselines NOT pushed yet; CI expected to fail @visual on first run per `docs/CONTEXT.md` L435–488 baseline-lift workflow.

## Last test run
- Command: pnpm run typecheck && pnpm run test:unit && pnpm run lint && pnpm run build
- Result: **PASS** — 716 unit tests green (4 pre-existing react-refresh warnings), typecheck clean, build clean. `@visual` skipped locally on macOS per `playwright.config.ts` SKIP_VISUAL_LOCALLY.

## What this PR lands
- `src/llm/api-key.ts` — `readApiKey`/`writeApiKey`/`clearApiKey`/`useApiKey` hook + `requestApiKeyModal`/`subscribeApiKeyModal` window-event bus. Canonical key `mbse-workbench:anthropic-api-key` per ADR 0010 §6. Helpers never touch `console.*`.
- `src/workspace/ApiKeyChip.tsx` — header chip; `data-state` present/absent; click to open modal.
- `src/workspace/ApiKeyModal.tsx` — `role="dialog" aria-modal`; focus on mount; Escape closes; Enter saves; Save / Clear / Cancel buttons.
- `src/workspace/Workspace.tsx` — owns modal-open state; subscribes to modal-request event.
- `src/workspace/SidebarPane.tsx` — chat-tab activation without a key auto-opens modal; renders a needs-key panel with a re-open button while no key is set.

## Tests added
- `src/llm/__tests__/api-key.test.ts` — round-trip, empty→null, canonical key constant, **no `console.*` call** during write/read/clear.
- `tests/e2e/api-key-modal.spec.ts` — modal-flow + clear + Escape + chip-as-trigger + fresh-context "new tab" check + `@a11y` axe scan + 3 `@visual` baselines (chip absent, chip present, modal layout).

## Known issues / blockers
- PR #225 first CI run will be red on `@visual` (3 baselines × 2 browsers = 6 missing). Next iteration will lift actuals from the failed run per `docs/CONTEXT.md` L435–488 and commit them as baselines.
- #161 — p2 inspector-transition flake. Deferred.

## Decisions log
- 2026-05-13 (iter-233): **Phase 10 complete.** PR #214 merged; epic #11 closed; `vphase-10` tagged.
- 2026-05-13 (iter-234): **Release vphase-10 verified.** Pages 200; smoke screenshots under `artifacts/release-vphase-10/`.
- 2026-05-13 (iter-235): **Phase 11 decomposed** into design #216 + slices #217–#222.
- 2026-05-13 (iter-236): **Phase 11 design ADR 0010.** Six sub-decisions.
- 2026-05-13 (iter-237→254): **PR #223 (ADR) landed.** Cold Playwright cache + cancel-loop avoidance; merged on `d6a4662`.
- 2026-05-13 (iter-255): **Slice A implemented.** Provider interface, AnthropicProvider, FixtureProvider on a shared translator. Fixture format aligned with raw SDK events so tests exercise the production translation path. Conversation persistence wired through repository with schema-tolerant defaults.
- 2026-05-13 (iter-256→265): **PR #224 CI cancel-loop diagnosed** — STATUS commits on the PR branch were cancelling CI via the concurrency group. Stopped committing STATUS to PR branches mid-CI from iter-264; run 25782664520 completed and PR #224 merged at 06:42Z (commit 37896d3).
- 2026-05-13 (iter-266): **Slice B implemented and pushed as PR #225.** Storage helper + hook + chip + modal + wiring. Followed iter-264 lesson: STATUS goes on main directly, not the PR branch. First CI run expected red on `@visual` — baselines to be lifted from the failed run.

## Next action
Wait for PR #225 CI to finish first run. If visual tests fail with missing-baseline (expected), download the report and lift chromium+webkit actuals into `tests/e2e/__screenshots__/api-key-modal.spec.ts/` and push a second commit to the PR branch. Then back to await CI green.
