# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D/E merged on main
(PR #228 squashed at fe4e90e). Slice F (#222) is the **Phase 11 gate** —
PR #229. iter-455 stabilises the @visual capture.

## Current iteration
- Iteration #: 455
- Started: 2026-05-14T00:00:00Z
- Branch: issue/222-phase-11-gate-e2e-recorded-fixture
- Working on: #222 slice F. iter-454 fix landed; CI (run
  25822991448) had functional + @a11y green but @visual failed with
  "snapshot doesn't exist" (expected — no Linux baseline yet). When
  I downloaded the playwright-report artifact and compared the two
  retry "actual" PNGs, they differed by ~22% of pixels (50398/225452).
  Diff overlay (`/tmp/iter455_diff_overlay.png`) showed every text row
  outlined and the Send button solid-red — i.e. content shifted by ~1px
  vertically AND the Send button's focus/disabled state varied. Two
  root causes:
  1. ChatPane's auto-scroll useEffect (`el.scrollTop = el.scrollHeight`)
     lands at sub-pixel-different positions across captures.
  2. The Send button's focus ring/disabled state isn't deterministic
     across consecutive captures.
  Committing either retry's PNG as baseline would fail next run.

## Fix in iter-455
- `src/workspace/chat/ChatPane.tsx`: added `data-testid="chat-scrollback"`
  on the scrollable div so a spec can target it directly.
- `tests/e2e/phase-11-gate.spec.ts` (@visual test only):
  1. Wait for the deterministic final text "Pump is now in the model
     and Mission satisfies Vessel." to be visible — this guarantees the
     dispatcher has finished appending its round-4 messages (the
     existing `data-streaming=true` count==0 check was trivially true
     since ChatPane never sets that flag on its own messages, so the
     snapshot could race the append).
  2. Before snapshot, `page.evaluate` to: blur active element +
     `chat-scrollback.scrollTop = 0`. Eliminates focus-state and
     scroll-offset nondeterminism.
  3. Snapshot `chat-scrollback` (not `chat-pane`) so the composer
     Send button is excluded entirely.
- `docs/CONTEXT.md`: added "@visual snapshots of the chat pane need a
  stable scroll position and blurred focus" entry with the mitigation
  pattern for future viewpoint @visuals that include the chat pane.

## Last test run
- Local (chromium): gate functional + @a11y both ✓ (2 passed in 2.5s).
- @visual is gated to Linux/CI by `playwright.config.ts:21`, so the
  baseline-generation run is deferred to CI per the iter-332/iter-436
  recipe.
- Typecheck ✓, lint ✓ (4 pre-existing fast-refresh warnings, zero
  errors).

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — filtered out of the gate's @a11y scan.

## Decisions log
- 2026-05-14 (iter-455): Stabilise the @visual capture by scoping to
  `chat-scrollback`, scrolling to top, and blurring focus before the
  snapshot. Reason: two retries of the same CI run produced PNGs that
  differed by 22% of pixels due to scroll-position and focus-state
  variance — committing either as baseline would fail next run.
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
  (Superseded by iter-455 → `chat-scrollback`.)
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
1. Push iter-455 (ChatPane testid + spec stabilisation + CONTEXT +
   STATUS) to PR #229 branch.
2. Watch CI. Expected: functional + @a11y green. @visual will fail
   first time (still no Linux baseline) — extract the new PNG from
   the playwright-report artifact and confirm the two retry PNGs
   are now byte-identical (or differ within 1%). If yes, commit
   the baseline. If not, dig further.
3. Push the baseline; CI greens; auto-merge fires.
4. After slice F merges: close epic #12, open `type:release` issue,
   push tag `vphase-11`, deploy smoke per Ralph loop step 17, then
   append the phase-11 journal entry.
