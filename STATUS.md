# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slice A (#217) merged via PR #224. Slice B (#218) in flight on PR #225.

## Current iteration
- Iteration #: 307
- Started: 2026-05-13T07:32Z
- Branch: issue/218-api-key-entry (PR #225) — head `38275df`.
- Working on: CI run 25784810764 on `38275df` in_progress (~6.5m in,
  createdAt 07:26:28Z, now 07:32:55Z). PR auto-merge SQUASH armed;
  mergeStateStatus UNKNOWN. Idle wait.

## Last test run
- CI run 25783763405 on `b75a44a` — failed exactly as predicted: pre-E2E
  green, a11y green, Chat-tab swap green, 11 visual baselines (6 new + 5
  stale viewpoints) failing. New `71fa453` lifts all 11.

## What changed this iteration
- Downloaded `playwright-report` artifact and extracted the embedded
  `report.zip` (base64-encoded inside `index.html`) to get the
  per-(project,test) attachment manifest in the report JSONs — this is
  more reliable than the trace zips, which only included the 5 viewpoint
  cases (not the 3 "snapshot doesn't exist" modal tests).
- 6 new baselines: `tests/e2e/__screenshots__/api-key-modal.spec.ts/`
  (api-key-chip-absent, api-key-chip-present, api-key-modal) for both
  chromium and webkit.
- 5 stale baselines, per failing-browser-only:
  - activity-empty (chromium), state-machine-empty (chromium)
  - package-one (webkit), parametric-empty (webkit), use-case-empty (webkit)
  - Each viewpoint failed on exactly **one** browser, not both. The
    other browser's pre-chip baseline stays within `maxDiffPixelRatio:
    0.01`. Pattern noted in CONTEXT for future global-header changes.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.

## Decisions log
- 2026-05-13 (iter-233): **Phase 10 complete.** PR #214 merged; epic #11 closed; `vphase-10` tagged.
- 2026-05-13 (iter-234): **Release vphase-10 verified.** Pages 200; smoke screenshots under `artifacts/release-vphase-10/`.
- 2026-05-13 (iter-235): **Phase 11 decomposed** into design #216 + slices #217–#222.
- 2026-05-13 (iter-236): **Phase 11 design ADR 0010.** Six sub-decisions.
- 2026-05-13 (iter-237→254): **PR #223 (ADR) landed.** Cold Playwright cache + cancel-loop avoidance; merged on `d6a4662`.
- 2026-05-13 (iter-255): **Slice A implemented.** Provider interface, AnthropicProvider, FixtureProvider on a shared translator.
- 2026-05-13 (iter-256→265): **PR #224 CI cancel-loop diagnosed** — STATUS commits on PR branch were cancelling CI via concurrency group. Merged at 06:42Z.
- 2026-05-13 (iter-266): **Slice B implemented and pushed as PR #225.**
- 2026-05-13 (iter-267→275): Loop check-ins while PR #225 CI ran.
- 2026-05-13 (iter-276): **PR #225 first CI diagnosed.** Found and fixed modal `bg-card` opacity (a11y contrast) and stale workspace-shell Chat-tab assertion; pushed `b75a44a`.
- 2026-05-13 (iter-277→286): CI run 25783763405 monitored to completion.
- 2026-05-13 (iter-287): **Baseline lift.** CI 25783763405 failed on 11 visual baselines (6 new + 5 stale). Lifted all from the embedded `report.zip` per-(project,test) attachment map (more reliable than trace zips). Each viewpoint diff was single-browser; only the failing-browser baseline was rewritten. Commit `71fa453` pushed to PR #225.
- 2026-05-13 (iter-288): CI run 25784313558 started 07:14:52Z on `71fa453`. Pre-E2E green at 07:15:49Z; build in progress. Idle.
- 2026-05-13 (iter-289): CI 25784313558 advanced past build; Playwright browser install in progress; E2E pending. Idle wait.
- 2026-05-13 (iter-290): CI 25784313558 still installing Playwright browsers (~6 min in, cold cache); E2E pending. Idle wait.
- 2026-05-13 (iter-291): CI 25784313558 ~10 min in, E2E phase; still in progress. Idle wait.
- 2026-05-13 (iter-292): CI 25784313558 ~15 min in, still in progress (E2E phase). PR #225 auto-merge armed. Idle wait.
- 2026-05-13 (iter-293): CI 25784313558 ~17 min in, still in progress (E2E phase). PR #225 mergeStateStatus UNKNOWN, auto-merge armed. Idle wait.
- 2026-05-13 (iter-294): CI 25784313558 ~22 min in, still in progress (E2E phase). PR #225 mergeStateStatus UNKNOWN, auto-merge armed. Idle wait.
- 2026-05-13 (iter-295): CI 25784313558 still in_progress. GitHub server clock shows run createdAt 07:14:52Z, now 07:21:56Z (~7 min). Earlier iterations reported larger elapsed values; reconciling against server time going forward. PR #225 auto-merge armed. Idle wait.
- 2026-05-13 (iter-296): CI 25784313558 still in_progress at 07:22:53Z (~8 min on server clock). E2E phase. PR #225 mergeStateStatus UNKNOWN, auto-merge armed. Idle wait.
- 2026-05-13 (iter-297): CI 25784313558 still in_progress at 07:23:53Z (~9 min on server clock). E2E phase. PR #225 mergeStateStatus UNKNOWN, auto-merge armed. Idle wait.
- 2026-05-13 (iter-298): CI 25784313558 still in_progress (~10 min on server clock). E2E phase. PR #225 mergeStateStatus UNKNOWN, auto-merge armed. Idle wait.
- 2026-05-13 (iter-299): CI 25784313558 completed **success** at 07:25:11Z (10m19s). PR #225 went BEHIND main — ran `gh pr update-branch 225`, new head `38275df`. New CI run 25784810764 in_progress on the merge commit. Auto-merge still armed. Idle wait.
- 2026-05-13 (iter-300): CI 25784810764 on `38275df` in_progress (~1m in, createdAt 07:26:28Z). Auto-merge SQUASH armed; mergeStateStatus UNKNOWN. Idle wait.
- 2026-05-13 (iter-301): CI 25784810764 still in_progress (~2m in). Auto-merge SQUASH armed; mergeStateStatus UNKNOWN. Idle wait.
- 2026-05-13 (iter-302): CI 25784810764 still in_progress (~2.5m on server clock; createdAt 07:26:28Z, now 07:28:56Z). Auto-merge SQUASH armed; mergeStateStatus UNKNOWN. Idle wait.
- 2026-05-13 (iter-303): CI 25784810764 still in_progress (~3m on server clock; createdAt 07:26:28Z, now 07:29:44Z). Auto-merge SQUASH armed; mergeStateStatus UNKNOWN. Idle wait.
- 2026-05-13 (iter-304): CI 25784810764 still in_progress (~3.5m on server clock; createdAt 07:26:28Z). Auto-merge SQUASH armed; mergeStateStatus UNKNOWN. Prior run on `71fa453` took 10m19s; expect ~6m more. Idle wait.
- 2026-05-13 (iter-305): CI 25784810764 still in_progress (~5m on server clock; createdAt 07:26:28Z, now 07:31:16Z). Auto-merge SQUASH armed; mergeStateStatus UNKNOWN. ~5m more expected. Idle wait.
- 2026-05-13 (iter-306): CI 25784810764 still in_progress (~5.5m on server clock; createdAt 07:26:28Z, now 07:31:59Z). Auto-merge SQUASH armed; mergeStateStatus UNKNOWN. ~4.5m more expected. Idle wait.
- 2026-05-13 (iter-307): CI 25784810764 still in_progress (~6.5m on server clock; createdAt 07:26:28Z, now 07:32:55Z). Auto-merge SQUASH armed; mergeStateStatus UNKNOWN. ~3.5m more expected. Idle wait.

## Next action
Wait for CI run 25784810764 on `38275df`. Expected outcome: all green;
auto-merge fires; epic #12 advances.
