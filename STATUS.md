# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Design issue #216 resolved this iteration (ADR 0010 + type-only skeletons). Slice A (#217) is unblocked next iteration.

## Current iteration
- Iteration #: 236
- Started: 2026-05-13T13:30Z
- Branch: issue/216-llm-architecture-adr
- Working on: #216 — phase:11 design ADR (PR pending merge)

## Last test run
- Command: pnpm typecheck && pnpm lint
- Result: PASS (4 pre-existing react-refresh warnings, 0 errors)

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred; pick up as background work during phase-11 implementation.

## Decisions log
- 2026-05-13 (iter-233): **Phase 10 complete.** PR #214 merged at `b46d61a`. Closed epic #11; opened release issue #215; pushed tag `vphase-10`; appended phase-completion entry to JOURNAL.md.
- 2026-05-13 (iter-234): **Release vphase-10 verified.** Pages 200. Wrote `scripts/smoke-vphase-10.mjs` (seeded R-001 Mission + Engine block + Brake action + two satisfy edges). Captured 7 screenshots under `artifacts/release-vphase-10/`. Confirmed matrix glyphs, coverage panel, and impact-active banner render correctly on the deployed build. Commented evidence on #215 and closed it. Phase:11 decomposition starts next iteration.
- 2026-05-13 (iter-235): **Phase 11 decomposed.** Verified `@anthropic-ai/sdk@~0.32.1` tool-use & streaming shape via context7 (recorded in `docs/CONTEXT.md`). Opened design issue #216 (provider interface, dispatcher loop, tool registry, diff-preview seam, conversation persistence, API key handling). Opened six slice issues #217–#222 (scaffolding → API key → chat sidebar → dispatcher+read tools → mutating tools+diff preview → gate e2e). Updated epic #12 with the task list. No code changes; design resolution lands next iteration before any slice is started.
- 2026-05-13 (iter-236): **Phase 11 design ADR.** Dispatched a Plan/Opus subagent to draft ADR 0010 resolving #216. Six sub-decisions: (1) `LLMProvider.stream(req) -> AsyncIterable<LLMEvent>` with `AnthropicProvider` + `FixtureProvider` (tests pin against the interface, never the real client); (2) dispatcher loop per CONTEXT iter-235 streaming shape, **8 round-trip cap** per user turn, handler-throw → `tool_result is_error: true`; (3) tool registry = `Map<string, ToolEntry>` with structural `ToolInputSchema` (zod-compatible, deferred dep until slice D); (4) `ProposedChange = { id, summary, commands: Command[] }` reusing the existing command union — mutating tool handlers never mutate state, only the accept path dispatches; (5) `Project.conversations` field (not sibling store) so persistence reuses `InMemorySessionRepository` and chat stays out of undo/redo — `readProject` will default to `[]` following the existing diagrams/history forward-compat pattern; (6) API key in `sessionStorage[mbse-workbench:anthropic-api-key]`, never logged. Skeleton type-only files committed: `src/llm/{types,provider,registry,dispatcher}.ts` (no logic). PR will close #216.

## Next action
Land the design PR (Closes #216). After merge, start slice A (#217 — repo scaffolding: install `@anthropic-ai/sdk@~0.32.1`, add `LLMProvider` impl stubs `AnthropicProvider`/`FixtureProvider` returning `throw new Error('not implemented')`, extend `Project.conversations` with the schema-tolerant load default, no UI yet).
