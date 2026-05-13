# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Design issue #216 resolved via ADR 0010 + type-only skeletons (PR #223 landing). Slice A (#217) unblocked once #223 merges.

## Current iteration
- Iteration #: 246
- Started: 2026-05-13T05:50Z
- Branch: issue/216-llm-architecture-adr (rebased)
- Working on: #216 — unwedged merge conflict, force-pushed, awaiting CI rerun + auto-merge

## Last test run
- Command: CI run 25780570646 on PR #223
- Result: **success** — full check job green (typecheck, lint, unit, build, Playwright E2E all passed). After conclusion the PR went `mergeable: CONFLICTING` because iter-237→245 STATUS.md commits on `main` diverged from the branch. Rebased onto `origin/main` (resolved STATUS.md by taking the branch version, since this iteration rewrites it anyway), force-pushed `89a7f65`. New CI run will start; auto-merge remains enabled.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred; pick up as background work during phase-11 implementation.
- CI infrastructure: GitHub Actions run 25780570646 hung 8h on Playwright browser install on first attempt, cleared on rerun. If recurs, inspect the Playwright browser cache key in `.github/workflows/ci.yml`.
- Process note: don't push STATUS.md commits to `main` while a long-running PR is open — it guarantees a STATUS.md rebase conflict on merge. Future: keep monitoring-only iterations as STATUS.md-on-branch updates, or skip the monitoring commit entirely and just schedule a wakeup.

## Decisions log
- 2026-05-13 (iter-233): **Phase 10 complete.** PR #214 merged at `b46d61a`. Closed epic #11; opened release issue #215; pushed tag `vphase-10`; appended phase-completion entry to JOURNAL.md.
- 2026-05-13 (iter-234): **Release vphase-10 verified.** Pages 200. Wrote `scripts/smoke-vphase-10.mjs` (seeded R-001 Mission + Engine block + Brake action + two satisfy edges). Captured 7 screenshots under `artifacts/release-vphase-10/`. Confirmed matrix glyphs, coverage panel, and impact-active banner render correctly on the deployed build. Commented evidence on #215 and closed it. Phase:11 decomposition starts next iteration.
- 2026-05-13 (iter-235): **Phase 11 decomposed.** Verified `@anthropic-ai/sdk@~0.32.1` tool-use & streaming shape via context7 (recorded in `docs/CONTEXT.md`). Opened design issue #216 and six slice issues #217–#222. Updated epic #12 with the task list.
- 2026-05-13 (iter-236): **Phase 11 design ADR.** Dispatched a Plan/Opus subagent to draft ADR 0010 resolving #216. Six sub-decisions: (1) `LLMProvider.stream(req) -> AsyncIterable<LLMEvent>` with `AnthropicProvider` + `FixtureProvider`; (2) dispatcher loop with **8 round-trip cap** per user turn, handler-throw → `tool_result is_error: true`; (3) tool registry = `Map<string, ToolEntry>` with structural `ToolInputSchema` (zod deferred until slice D); (4) `ProposedChange = { id, summary, commands: Command[] }` — mutating tool handlers never mutate state, only the accept path dispatches; (5) `Project.conversations` field with schema-tolerant default `[]`; (6) API key in `sessionStorage[mbse-workbench:anthropic-api-key]`, never logged. Skeleton type-only files committed: `src/llm/{types,provider,registry,dispatcher}.ts`. PR #223 closes #216.
- 2026-05-13 (iter-237→245): **CI rerun on PR #223.** First run wedged on Playwright browser install for ~8h. Cancelled + rerun cleared the hang (cache-related transient). Monitored E2E to completion across multiple short-wakeup iterations.
- 2026-05-13 (iter-246): **CI green, PR conflict resolved.** Run 25780570646 succeeded. PR went `CONFLICTING` due to STATUS.md drift on `main` during the long wait. Rebased PR branch onto `origin/main` (kept branch STATUS.md since this iteration rewrites it), force-pushed `89a7f65`. Auto-merge still enabled. New CI run will trigger; on green, #223 lands and slice A (#217) starts next.

## Next action
Wait for CI on the rebased PR #223 (force-push triggers a new run). On green, auto-merge lands #216. Then start slice A (#217 — repo scaffolding: install `@anthropic-ai/sdk@~0.32.1`, add `LLMProvider` impl stubs `AnthropicProvider`/`FixtureProvider` returning `throw new Error('not implemented')`, extend `Project.conversations` with the schema-tolerant load default, no UI yet).
