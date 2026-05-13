# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slice A (#217) merged via PR #224. Slice B (#218) in flight on PR #225.

## Current iteration
- Iteration #: 287
- Started: 2026-05-13T07:11Z
- Branch: issue/218-api-key-entry (PR #225) — head `71fa453` (baseline lift).
- Working on: Lifted 11 visual baselines from CI run 25783763405. Pushed; awaiting next CI run.

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

## Next action
Wait for next CI run on PR #225 head `71fa453`. Expected outcome: all
green; auto-merge fires; epic #12 advances.
