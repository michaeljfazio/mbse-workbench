# STATUS

## Current phase
phase:11 — LLM integration (epic #12). #216 merged. Slice A (#217) in flight on `issue/217-llm-scaffolding`.

## Current iteration
- Iteration #: 262
- Started: 2026-05-13T07:15Z
- Branch: issue/217-llm-scaffolding
- Working on: PR #224 (closes #217) — open, auto-merge SQUASH on, CI `check` QUEUED on run 25782640942 (prior 25782605240 auto-cancelled by concurrency group)

## Last test run
- Command: pnpm run typecheck && pnpm run test:unit && pnpm run lint && pnpm run build
- Result: **PASS** — 712 unit tests green (4 pre-existing react-refresh warnings only), typecheck clean, build clean. E2E deferred to CI.

## What this PR lands
- `src/llm/anthropic.ts` — `createAnthropicProvider` using `@anthropic-ai/sdk@~0.32.1` with `dangerouslyAllowBrowser: true`. Maps internal `LLMRequest` → SDK params; translates SDK stream → `LLMEvent` via shared translator.
- `src/llm/fixture.ts` — `createFixtureProvider(fixture)` replays recorded SDK-shape events through the same translator AnthropicProvider uses, so fixtures exercise the production translation path.
- `src/llm/stream-translate.ts` — `translateAnthropicEvent`/`translateAnthropicEvents` — single source of truth for SDK→LLMEvent mapping.
- `src/llm/index.ts` — barrel re-exports for the slice.
- `Project.conversations: readonly Conversation[]` added; sessionStorage repo defaults to `[]` when missing or malformed; `newEmptyProject` seeds `[]`.
- `tests/fixtures/llm/no-tool-greeting.json` — first seeded fixture. README updated to canonical raw-SDK-event format.

## Tests added
- `src/llm/__tests__/fixture.test.ts` — fixture round-trip (text + tool-use + idempotent replay + shape guard).
- `src/llm/__tests__/anthropic.test.ts` — type-only smoke; provider instantiates without network.
- `src/repository/__tests__/conversations.test.ts` — multi-block conversation round-trip; legacy-missing and malformed defaults.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- CI flake (iter-237→253): cold Playwright browser cache adds 8–12min; revisit cache key when phase:11 stabilises.

## Decisions log
- 2026-05-13 (iter-233): **Phase 10 complete.** PR #214 merged; epic #11 closed; `vphase-10` tagged.
- 2026-05-13 (iter-234): **Release vphase-10 verified.** Pages 200; smoke screenshots under `artifacts/release-vphase-10/`.
- 2026-05-13 (iter-235): **Phase 11 decomposed** into design #216 + slices #217–#222.
- 2026-05-13 (iter-236): **Phase 11 design ADR 0010.** Six sub-decisions.
- 2026-05-13 (iter-237→254): **PR #223 (ADR) landed.** Cold Playwright cache + cancel-loop avoidance; merged on `d6a4662`.
- 2026-05-13 (iter-255): **Slice A implemented.** Provider interface, AnthropicProvider, FixtureProvider on a shared translator. Fixture format aligned with raw SDK events so tests exercise the production translation path. Conversation persistence wired through repository with schema-tolerant defaults.
- 2026-05-13 (iter-256): **PR #224 open** with auto-merge SQUASH; CI `check` in progress. Awaiting green.
- 2026-05-13 (iter-257): PR #224 CI still QUEUED. Mid-PR; no new work started. Longer wakeup.
- 2026-05-13 (iter-258): PR #224 CI IN_PROGRESS (~8min in). Mid-PR; awaiting green.
- 2026-05-13 (iter-259): PR #224 CI IN_PROGRESS on run 25782539942 (older runs auto-cancelled by concurrency group). Mid-PR; no new work.
- 2026-05-13 (iter-260): PR #224 CI still IN_PROGRESS on run 25782568569 (~24min in — likely cold Playwright cache). Mid-PR; no new work.
- 2026-05-13 (iter-261): PR #224 CI IN_PROGRESS on run 25782605240 (prior cancelled by concurrency). Mid-PR; no new work.
- 2026-05-13 (iter-262): PR #224 CI QUEUED on run 25782640942 (prior 25782605240 auto-cancelled by concurrency). Mid-PR; no new work.

## Next action
Await PR #224 CI green → auto-merge closes #217. Then start slice B (dispatcher loop #218).
