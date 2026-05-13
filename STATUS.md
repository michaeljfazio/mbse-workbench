# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C merged. Slice D (#220)
in flight on PR #227. Remaining: slice E (#221), slice F gate (#222).

## Current iteration
- Iteration #: 337
- Started: 2026-05-13T08:51:30Z
- Branch: issue/220-tool-dispatcher rev e6d8a60 (no changes this iter).
- Working on: idle-wait — CI run 25788507469 in_progress (~4.5m elapsed).

## Last test run
- Local `pnpm run build` green after fix. `pnpm exec vitest run tests/unit/llm`
  → 4 files / 13 tests pass.

## What changed this iteration
- PR #227 first CI run (25787838167) FAILED at 08:34:04Z with 2 TS errors:
  1. `src/llm/tools/critique-model.ts:78` — `definitionId` cast to `string`
     wouldn't satisfy `partDefinitionIds.has()` which expects `ElementId`.
  2. `tests/unit/llm/tools/explain-diagram.test.ts:32` — raw string keys
     `'el-1'`, `'el-2'` not assignable to `Record<ElementId, NodePosition>`.
- Fixed both:
  - critique-model.ts: import `ElementId`, cast `definitionId` to `ElementId`.
  - explain-diagram.test.ts: cast positions object literal
    `as unknown as Diagram['positions']`.
- Verified locally with build + vitest before push.
- Initial commit accidentally scooped a stray
  `docs/superpowers/plans/2026-05-13-tool-dispatcher.md` (2429 lines) from
  the untracked tree via `git add -A`. Reverted in follow-up commit
  `3b511e0`.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — deferred from slice C.
- Visual baselines for chat-tools.spec.ts not yet in repo; will be added
  by first CI green run on Linux.

## Decisions log
- 2026-05-13 (iter-311): **Slice B merged 07:44:12Z.** Slice C dispatched.
- 2026-05-13 (iter-312→320): Idle-wait on PR #226 CI (~13min E2E step).
- 2026-05-13 (iter-321): **PR #226 (slice C) merged 08:07:04Z.** Slice D
  delivered, PR #227 opened with auto-merge armed.
- 2026-05-13 (iter-322): PR #227 CI red on TS. Fixed two trivial typing
  bugs (branded `ElementId` mismatches) and pushed `3b511e0`. Lesson:
  prefer `git add <files>` over `git add -A` when working tree has
  untracked artefacts. Add to CONTEXT later if recurring.
- 2026-05-13 (iter-323): Idle-wait — CI run 25788009193 started 08:36:43Z,
  ~2m elapsed at iter start. No commit this iteration.
- 2026-05-13 (iter-324): Idle-wait — CI still in_progress (~3m elapsed,
  mergeStateStatus=BLOCKED). No commit.
- 2026-05-13 (iter-325): Idle-wait — CI still in_progress (~5m elapsed,
  mergeStateStatus=BLOCKED). No commit.
- 2026-05-13 (iter-326): Idle-wait — CI still in_progress (~6m elapsed,
  mergeStateStatus=BLOCKED). No commit.
- 2026-05-13 (iter-327): Idle-wait — CI still in_progress (~7m elapsed,
  mergeStateStatus=BLOCKED). No commit.
- 2026-05-13 (iter-328): Idle-wait — CI run 25788009193 in_progress (~5m
  elapsed at 08:41Z, started 08:36:43Z, mergeStateStatus=BLOCKED). No commit.
- 2026-05-13 (iter-329): Idle-wait — CI run 25788009193 in_progress (~6m
  elapsed at 08:42Z, mergeStateStatus=BLOCKED). No commit.
- 2026-05-13 (iter-330): Idle-wait — CI run 25788009193 in_progress (~7m
  elapsed at 08:43Z, mergeStateStatus=BLOCKED). No commit.
- 2026-05-13 (iter-331): Idle-wait — CI run 25788009193 in_progress (~8m
  elapsed at 08:44Z, mergeStateStatus=BLOCKED). No commit.
- 2026-05-13 (iter-333): Idle-wait — new CI run 25788507469 started
  08:47:12Z after baseline push, ~1m elapsed. No commit.
- 2026-05-13 (iter-334): Idle-wait — CI run 25788507469 in_progress
  (~1.5m elapsed at 08:48:36Z). No commit.
- 2026-05-13 (iter-335): Idle-wait — CI run 25788507469 in_progress
  (~2m elapsed at 08:49:22Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-336): Idle-wait — CI run 25788507469 in_progress
  (~3.5m elapsed at 08:50:30Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-337): Idle-wait — CI run 25788507469 in_progress
  (~4.5m elapsed at 08:51:30Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-332): CI run 25788009193 **FAILED** at 08:44:55Z — the
  2 chat-tool-cards `@visual` tests had no baselines on Linux. Extracted
  the Linux-rendered actual PNGs from the embedded playwright-report
  (`window.playwrightReportBase64`) for both chromium and webkit, dropped
  them into `tests/e2e/__screenshots__/chat-tools.spec.ts/`, and pushed
  as `e6d8a60`. CI re-running. Lesson for CONTEXT: future visual specs
  need a "first Linux run produces baselines" cycle; an alternative is
  running playwright in a Linux container locally before the PR opens.

## Next action
Wait for CI on PR #227 rev e6d8a60 to complete. If green, auto-merge fires
and slice E (#221, mutating tools + diff-preview) is next.
