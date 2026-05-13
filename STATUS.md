# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D merged. Slice E (#221)
in flight on branch `issue/221-mutating-tools-diff-preview`. Remaining
after E: slice F gate (#222).

## Current iteration
- Iteration #: 392
- Started: 2026-05-13T09:51:00Z
- Branch: issue/221-mutating-tools-diff-preview
- Working on: #221 slice E foundation — dispatcher ProposalResolver hook.

## Last test run
- `pnpm exec vitest run tests/unit/llm/dispatcher.test.ts` → 7 tests pass
  (4 prior + 3 new for proposal accept/reject/no-resolver fallback).
- `pnpm exec tsc --noEmit` → clean.

## What changed this iteration
- PR #227 merged 09:39Z (slice D done). Synced main locally.
- Started slice E branch `issue/221-mutating-tools-diff-preview`,
  relabeled #221 status:in-progress.
- Added `ProposalResolver` / `ProposalResolution` types to
  `src/llm/dispatcher.ts`.
- Threaded an optional `resolveProposal` callback through
  `createDispatcher`. When a tool returns `kind:'proposed-change'`:
  - With resolver: await user accept/reject, serialise
    `{accepted:true,appliedSummary}` or `{accepted:false,reason}` as
    the tool_result content. Neither path is `is_error`.
  - Without resolver: existing summary-only fallback preserved.
- Three new dispatcher tests cover all three paths.

## What changed prior iteration (PR #227)
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
- 2026-05-13 (iter-338): Idle-wait — CI run 25788507469 in_progress
  (~5.5m elapsed at 08:52:45Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-339): Idle-wait — CI run 25788507469 in_progress
  (~6.5m elapsed at 08:53:45Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-340): Idle-wait — CI run 25788507469 in_progress
  (~7.5m elapsed at 08:54:50Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-341): Idle-wait — CI run 25788507469 in_progress
  (~7m elapsed at 08:54:03Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-342): Idle-wait — CI run 25788507469 in_progress
  (~8m elapsed at 08:54:55Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-343): Idle-wait — CI run 25788507469 in_progress
  (~9m elapsed at 08:56:00Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-345): Idle-wait — new CI run 25788984946 started
  08:56:52Z (post update-branch), ~1m elapsed at 08:57:50Z,
  mergeStateStatus=UNKNOWN. No commit.
- 2026-05-13 (iter-346): Idle-wait — CI run 25788984946 in_progress
  (~1.5m elapsed at 08:58:27Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-347): Idle-wait — CI run 25788984946 in_progress
  (~2.5m elapsed at 08:59:14Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-348): Idle-wait — CI run 25788984946 in_progress
  (~3.5m elapsed at 09:00:20Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-349): Idle-wait — CI run 25788984946 in_progress
  (~4.5m elapsed at 09:01:30Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-350): Idle-wait — CI run 25788984946 in_progress
  (~4.5m elapsed at 09:01:34Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-351): Idle-wait — CI run 25788984946 in_progress
  (~5.5m elapsed at 09:02:24Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-352): Idle-wait — CI run 25788984946 in_progress
  (~6.5m elapsed at 09:03:20Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-353): Idle-wait — CI run 25788984946 in_progress
  (~7.5m elapsed at 09:04:30Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-354): Idle-wait — CI run 25788984946 in_progress
  (~8.5m elapsed at 09:05:30Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-355): CI run 25788984946 **SUCCESS** at 09:05:08Z but
  PR BEHIND main again. Ran `gh pr update-branch 227` (2nd time); new CI
  run 25789413513 queued at 09:05:34Z. Lesson: main is advancing faster
  than our ~8m CI cycle — slice E may need to coordinate or rebase
  multiple times. Auto-merge remains armed.
- 2026-05-13 (iter-356): Idle-wait — CI run 25789413513 in_progress
  (~1m elapsed at 09:06:26Z, mergeStateStatus=BEHIND/MERGEABLE). No commit.
- 2026-05-13 (iter-357): Idle-wait — CI run 25789413513 in_progress
  (~1.5m elapsed at 09:07:18Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-358): Idle-wait — CI run 25789413513 in_progress
  (~2.5m elapsed at 09:08:11Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-359): Idle-wait — CI run 25789413513 in_progress
  (~3.5m elapsed at 09:09:05Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-360): Idle-wait — CI run 25789413513 in_progress
  (~4.5m elapsed at 09:09:50Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-361): Idle-wait — CI run 25789413513 in_progress
  (~5.5m elapsed at 09:11:00Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-362): Idle-wait — CI run 25789413513 in_progress
  (~6.5m elapsed at 09:12:00Z, mergeable=MERGEABLE, mergeStateStatus=BEHIND).
  No commit.
- 2026-05-13 (iter-363): Idle-wait — CI run 25789413513 in_progress
  (~7.5m elapsed at 09:13:00Z, mergeable=UNKNOWN, mergeStateStatus=UNKNOWN).
  No commit.
- 2026-05-13 (iter-364): Idle-wait — CI run 25789413513 in_progress
  (~7.4m elapsed at 09:12:56Z, mergeable=UNKNOWN, mergeStateStatus=UNKNOWN).
  No commit.
- 2026-05-13 (iter-365): Idle-wait — CI run 25789413513 in_progress
  (~8.2m elapsed at 09:13:43Z, mergeable=UNKNOWN, mergeStateStatus=UNKNOWN).
  No commit.
- 2026-05-13 (iter-366): Idle-wait — CI run 25789413513 in_progress
  (~8.9m elapsed at 09:14:29Z, mergeable=UNKNOWN, mergeStateStatus=UNKNOWN).
  No commit.
- 2026-05-13 (iter-367): Idle-wait — CI run 25789413513 in_progress
  (~9.6m elapsed at 09:15:11Z, mergeable=UNKNOWN, mergeStateStatus=UNKNOWN).
  No commit.
- 2026-05-13 (iter-368): Idle-wait — CI run 25789413513 in_progress
  (~10.5m elapsed at 09:16:00Z, mergeable=UNKNOWN, mergeStateStatus=UNKNOWN).
  No commit.
- 2026-05-13 (iter-369): Idle-wait — CI run 25789413513 in_progress
  (~11.3m elapsed at 09:17:00Z, mergeable=UNKNOWN, mergeStateStatus=UNKNOWN).
  No commit.
- 2026-05-13 (iter-370): Idle-wait — CI run 25789413513 in_progress
  (~12.3m elapsed at 09:17:50Z, mergeable=UNKNOWN, mergeStateStatus=UNKNOWN).
  No commit.
- 2026-05-13 (iter-371): Idle-wait — CI run 25789413513 in_progress
  (~13.1m elapsed at 09:18:40Z, mergeable=UNKNOWN, mergeStateStatus=UNKNOWN).
  No commit.
- 2026-05-13 (iter-372): Idle-wait — CI run 25789413513 in_progress
  (~13.2m elapsed at 09:18:53Z). Step 11 "Install Playwright browsers"
  stuck in_progress for ~12.1m despite cache-hit success on step 10.
  E2E step not yet started. No commit.
- 2026-05-13 (iter-373): Idle-wait — CI run 25789413513 in_progress (~13.8m
  elapsed at 09:19:30Z). Step 11 still in_progress (~12.7m). No commit.
- 2026-05-13 (iter-374): Idle-wait — CI run 25789413513 in_progress (~14.8m
  elapsed at 09:20:30Z). Step 11 Install Playwright browsers completed
  success at 09:20:12Z (13.4m duration). Step 12 E2E tests now in_progress.
  No commit.
- 2026-05-13 (iter-375): Idle-wait — CI run 25789413513 in_progress. Step 12
  E2E tests in_progress (~1.3m elapsed at 09:21:30Z). No commit.
- 2026-05-13 (iter-376): Idle-wait — CI run 25789413513 in_progress. Step 12
  E2E tests in_progress (~2.7m elapsed at 09:22:50Z). No commit.
- 2026-05-13 (iter-377): Idle-wait — CI run 25789413513 in_progress. Step 12
  E2E tests in_progress (~3.8m elapsed at 09:24:00Z). No commit.
- 2026-05-13 (iter-378): Idle-wait — CI run 25789413513 in_progress. Step 12
  E2E tests in_progress (~4.8m elapsed at 09:24:57Z). No commit.
- 2026-05-13 (iter-379): Idle-wait — CI run 25789413513 in_progress. Step 12
  E2E tests in_progress (~5.8m elapsed at 09:26:00Z). No commit.
- 2026-05-13 (iter-380): Idle-wait — CI run 25789413513 in_progress. Step 12
  E2E tests in_progress (~6.5m elapsed at 09:26:40Z). No commit.
- 2026-05-13 (iter-381): CI run 25789413513 **SUCCESS** at 09:26:57Z but
  PR BEHIND main again (3rd update). Ran `gh pr update-branch 227`; new CI
  run 25790513200 queued at 09:28:02Z (sha 2619bdbe). Auto-merge armed.
- 2026-05-13 (iter-382): Idle-wait — CI run 25790513200 in_progress (~1.5m
  elapsed at 09:29:30Z, mergeStateStatus=BEHIND/MERGEABLE). No commit.
- 2026-05-13 (iter-383): Idle-wait — CI run 25790513200 in_progress (~1.9m
  elapsed at 09:29:53Z, mergeStateStatus=UNKNOWN). No commit.
- 2026-05-13 (iter-384): Idle-wait — CI run 25790513200 in_progress (~2.5m
  elapsed at 09:30:35Z, mergeStateStatus=BEHIND/MERGEABLE). No commit.
- 2026-05-13 (iter-385): Idle-wait — CI run 25790513200 in_progress (~3.3m
  elapsed at 09:31:21Z). E2E step in_progress (~1.7m in, started 09:29:39Z).
  mergeStateStatus=BEHIND/MERGEABLE. No commit.
- 2026-05-13 (iter-386): Idle-wait — CI run 25790513200 in_progress (~4.2m
  elapsed at 09:32:11Z). E2E step in_progress (~2.5m in). No commit.
- 2026-05-13 (iter-387): Idle-wait — CI run 25790513200 in_progress (~4.9m
  elapsed at 09:33:08Z). E2E step in_progress (~3.5m in). No commit.
- 2026-05-13 (iter-388): Idle-wait — CI run 25790513200 in_progress (~5.8m
  elapsed at 09:34:01Z). E2E step in_progress (~4.4m in). No commit.
- 2026-05-13 (iter-389): Idle-wait — CI run 25790513200 in_progress (~6.8m
  elapsed at 09:35:00Z). E2E step in_progress (~5.4m in). No commit.
- 2026-05-13 (iter-390): Idle-wait — CI run 25790513200 in_progress (~7.9m
  elapsed at 09:36:05Z). E2E step in_progress (~6.4m in). No commit.
- 2026-05-13 (iter-344): CI run 25788507469 **SUCCESS** at 08:56:34Z but
  PR mergeStateStatus=BEHIND (main advanced while we waited). Ran
  `gh pr update-branch 227` which fast-forwarded the branch and queued
  a new CI run. Auto-merge remains armed (squash). Lesson: when a long
  idle-wait completes green but doesn't merge, check mergeStateStatus
  for BEHIND and update the branch.
- 2026-05-13 (iter-332): CI run 25788009193 **FAILED** at 08:44:55Z — the
  2 chat-tool-cards `@visual` tests had no baselines on Linux. Extracted
  the Linux-rendered actual PNGs from the embedded playwright-report
  (`window.playwrightReportBase64`) for both chromium and webkit, dropped
  them into `tests/e2e/__screenshots__/chat-tools.spec.ts/`, and pushed
  as `e6d8a60`. CI re-running. Lesson for CONTEXT: future visual specs
  need a "first Linux run produces baselines" cycle; an alternative is
  running playwright in a Linux container locally before the PR opens.

## Next action
Continue slice E on `issue/221-mutating-tools-diff-preview`: add a
`PendingProposal` store slice with accept/reject actions, then implement
the first mutating tool `create_element` returning a `ProposedChange`.
Defer opening PR until all five mutating tools + diff-preview UI + e2e
fixture are in place per slice E acceptance criteria.
