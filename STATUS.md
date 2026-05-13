# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D/E merged on main
(PR #228 squashed at fe4e90e). Slice F (#222) is the **Phase 11 gate** —
PR #229. iter-454 fixes the gate spec assertions.

## Current iteration
- Iteration #: 454
- Started: 2026-05-13T19:55:00Z
- Branch: issue/222-phase-11-gate-e2e-recorded-fixture
- Working on: #222 slice F. iter-453 CI run was cancelled by the
  STATUS-only push (lesson logged in docs/CONTEXT.md). The replacement
  run 25822280615 went red on the gate spec: timed out waiting for the
  `tool-use-card[data-tool-name=explain_diagram]` mid-flow. Root cause:
  `ChatPane.handleSend` persists assistant messages **only after** the
  full dispatcher resolves (line ~175 of `ChatPane.tsx`,
  `result.appendedMessages.slice(1)`), so when a mutating tool pauses
  the dispatcher for proposal acceptance, prior assistant + tool cards
  are NOT visible — only the proposal queue is.

## Fix in iter-454
- Reordered gate spec assertions:
  - Skip the round-1 `explain_diagram` tool-use-card visibility check
    between user send and the first proposal — that card doesn't yet
    exist in the conversation.
  - After Round-4 final text streams and `data-streaming=true`
    disappears, assert `tool-use-card[data-tool-name=explain_diagram]`
    AND `tool-result-card[data-tool-use-id=tu_explain_1]` are visible.
    Both render at dispatcher resolution along with all intermediate
    assistant messages.
  - Dropped the `proposal-card`.toHaveCount(0) intermediate assertion
    after Accept — the dispatcher resumes into the next round and
    queues the next proposal with no observable empty state.
  - Locate the link_requirement proposal via `hasText: 'Link
    requirement'` so it does not race with teardown of the
    create_element card.
- Added two `docs/CONTEXT.md` entries:
  - "ChatPane streaming semantics" — why intermediate tool cards
    aren't visible mid-flow.
  - "CI auto-cancellation on STATUS pushes" — pushing STATUS-only
    commits to a PR branch with CI running cancels the run.

## Last test run
- Local (chromium): gate functional + @a11y both ✓ (2 passed).
- @visual is gated to Linux/CI by `playwright.config.ts:21`
  (`grepInvert: SKIP_VISUAL_LOCALLY ? /@visual/ : undefined`), so
  baseline generation deferred to CI per established recipe (Linux
  PNG extraction iter-332 / iter-436).
- Typecheck ✓, lint ✓ (4 pre-existing fast-refresh warnings, zero
  errors).

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — filtered out of the gate's @a11y scan.

## Decisions log
- 2026-05-13 (iter-454): Move round-1 tool-card assertions to after
  the dispatcher resolves. Reason: ChatPane appends messages only at
  resolution, not incrementally; rewriting the pane to stream
  incrementally is out of scope for the gate.
- 2026-05-13 (iter-454): Don't push STATUS-only commits to a PR
  branch while CI is running. Reason: triggers a new
  `pull_request` workflow that cancels the prior in-flight run.
- 2026-05-14 (iter-452): Place 4 rounds in one fixture
  (explain_diagram, create_element, link_requirement, end_turn).
- 2026-05-14 (iter-452): Seed the project rather than synthesise IDs.
- 2026-05-14 (iter-452): Scope @visual baseline to `chat-pane`.
- 2026-05-14 (iter-452): Filter pre-existing `text-muted-foreground`
  contrast violation from gate @a11y.
- 2026-05-14 (iter-452): Press Cmd-Z after dispatcher completes to
  verify atomic compound-revert.
- 2026-05-14 (iter-436): Commit Linux PNGs only.
- 2026-05-13 (iter-404): `memberIds` typing bound at command boundary.
- 2026-05-13 (iter-404): `input_schema` widened with
  `additionalProperties?: boolean`.
- 2026-05-13 (iter-394): Resolvers in a module-level Map.
- 2026-05-13 (iter-394): `acceptProposal` dispatches `compound`.
- 2026-05-13 (iter-332): `@visual` baselines from CI: extract Linux
  PNGs from playwright-report base64 blob and commit.

## Next action
1. Push iter-454 spec fix + STATUS + CONTEXT to PR #229 branch.
2. Watch CI. Expected: functional + a11y green. @visual will fail
   first time (missing Linux baseline) — extract PNGs from
   playwright-report artifact per iter-332/iter-436 recipe and
   commit. Then CI greens; auto-merge fires.
3. After slice F merges: close epic #12, open `type:release` issue,
   push tag `vphase-11`, deploy smoke per Ralph loop step 17, then
   append the phase-11 journal entry.
