# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-865: walk-29 EXECUTED** against `vphase-15.8` Pages (`95fb6c2` deploy, Pages `last-modified: Mon, 18 May 2026 18:32:43 GMT` re-verified before launch — unchanged from walk-28; no new release tag between walks). **7/8 PCs PASS automated; 8/8 visually.** The #505 settle-wait fix specified in walk-29.md DID work end-to-end: between the inspector-item-type `Enter` press and the marker probe, `page.wait_for_function` correctly waited until the edge `<g>` AND the label `<div>` were both reattached AND `label.textContent.trim() === 'FlightCommand'` — getting past the React commit-phase race that broke walk-28's PC5. **PC5 still FAIL automated for a different reason** that the #505 fix exposed: `g.querySelector('path')` returns the FIRST `<path>` in document order inside `<g data-testid="ibd-edge-${id}">`, which is the marker's interior triangle path inside `<defs>` (no `marker-end` attribute) — not `BaseEdge`'s visible `<path>` with `marker-end="url(#…)"`. Visual evidence in `09-itemflow-created.png` (filled-triangle arrowhead at `ADIRU_1.data`, `FlightCommand` label committed) confirms the product is correct in every measurable way. Filed **#508** (`p3 type:chore area:cross-cutting`) with the one-line probe-selector fix recipe. Dim 6 (IBD) promotion 2 → 3 **deferred again** to walk-30 regression after #508 lands. Convergence chain stays `chain[0] / 3`.

🎯 **Iter-864: walk-29 plan SEALED + #505 closed.** Walk-29 inherits walk-28's eight PCs verbatim; the `page.wait_for_function` settle-wait pattern is specified in `docs/architect/walks/walk-29.md` § "Tool & environment". Closes #505. No new release tag — driver-side fix only.

🎯 **Iter-863: walk-28 EXECUTED** against `vphase-15.8` Pages. **7/8 PCs PASS automated; 8/8 visually.** Both #499 (`ConnectionMode.Loose`) + #500 (acronym auto-name) fixes verified on Pages. PC5 automated probe returned `null` due to inspector-edit re-render unmounting the edge `<g>` transiently. Filed #505 (`p3 type:chore`) — closed in iter-864.

🎯 **Iter-862: walk-28 plan SEALED** (PR #504 squash-merged at 18:45:09Z as `d8e3d4c`) — plan/execute boundary preserved.

🎯 **Iter-861: `vphase-15.8` / `v1.5.2` released.** PR #502 (squash `95fb6c2`) closed #499 + #500. Tags `vphase-15.8` + `v1.5.2` deployed. Pages last-modified `Mon, 18 May 2026 18:32:43 GMT`.

🎯 **Iter-860: #499 + #500 engineer batch shipped as PR #502.**

🎯 **Iter-859: walk-27 (IBD deep-dive) executed → 5/8 PCs PASS, 2 issues filed (#499 + #500).**

🎯 **Iter-826: walk-14 + 19 → rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451) = SECOND score-3 dimension.**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **2 of 28** at 3 (dim 5 BDD, dim 14 Round-trip integrity); **23** at 2; 0 at 1; 3 at 0. Dim 6 (IBD) promotion 2 → 3 **deferred for the SECOND consecutive walk** (28 → #505, 29 → #508). Walk-30 (regression after #508 fix) is the next promotion attempt. |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **0 open `type:bug`/`type:feature`**. **2 open `type:design`**: #452 (`status:needs-human` via #469), #454 (blocked behind #469). **1 open `type:chore` `status:ready`**: #508 (driver-probe fix; closes via walk-30 plan-seal). **1 open `type:chore` `status:needs-human`**: #469. |
| A.12 #3 | Three consecutive convergence walks | **chain[0 / 3]** (walk-29 surfaced a finding — driver-side per A.5 strict reading). Walk-30 (regression after #508 fix) is the next chain[0] candidate. |
| A.12 #4 | FBW example shipped + loadable | Unblocks once dim 6 reaches 3. Two consecutive driver-side findings on the same PC have now deferred this twice; if walk-30 also fails for a third driver-side reason, will file a `type:design` issue for a stable edge-probe helper (`tests/e2e/__helpers__/edge-probe.ts` or equivalent). |

## Current iteration
- Iteration #: 865
- Started: 2026-05-19 (UTC)
- Branch: `phase-15/iter-865-walk-29-exec`
- Working on: walk-29 execution close-out + #508 filing.

## Last test run
- iter-865 is a docs-only change (`docs/architect/walks/walk-29.md` append, `docs/architect/quality-rubric.md`, `docs/architect/in-flight.md`, `STATUS.md`). Per ADR 0016 the doc-only paths-filter skips e2e on this PR; only the fast lane runs.
- Walk-29 driver outcome `walk-29.json` measurements: `item_flow_marker = {markerEnd: null, markerExists: true, markerPathD: 'M0 0 L12 6 L0 12 Z', markerPathFill: 'hsl(var(--primary))'}` — the marker is correctly defined in the DOM; the probe just reads `marker-end` from the wrong `<path>`.
- iter-864 walk-29-plan-seal PR #507 merged at 19:07:07Z as `423bca2`.
- iter-863 walk-28-exec PR #506 merged at 18:59:00Z as `822c8d3`.

## Last PR sweep
- Iter-865 open: this walk-29-exec PR. **In-flight 1/5 of A.8 cap.**
- Per AGENT.md PR-sweep protocol: no other PRs open.

## Known issues / blockers
- **#469 (CI step 3, merge queue) BLOCKED:** `status:needs-human` pending operator decision.
- **#452 (CI velocity epic step 3):** blocked behind #469.
- **#454 (raise A.8 cap):** blocked behind #469.
- **#508 (PC5 driver probe selector):** `status:ready`, `p3 type:chore`; closes via walk-30 plan-seal (forward-fix in `walk-30-exec.py` per gitignore policy + spec'd in walk-30.md § "Tool & environment").

## Open phase:15 issues at iter-865 close (expected)
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Steps 1+2 done; step 3 (#469) blocked.
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap. Blocked behind #469.
- #508 (p3, type:chore, status:ready, area:cross-cutting) — PC5 driver probe queries wrong `<path>`. Acceptance: corrected probe shape in walk-30.md § "Tool & environment".

## Decisions log

**Iter-808..iter-864 entries preserved in earlier commits.**

- **Iter-865 — #508 priority is `p3`, not the plan-prescribed `p2`.** The walk-29 plan's acceptance table mapped "PC5 still FAIL automated" to a `p2 type:chore` follow-up scoped at "stronger settle-wait." The actual root cause is different: the settle-wait DID work; the probe selects the wrong `<path>` element. One-line CSS-selector fix; no architect modeling blocked; visual + structural evidence both confirm product correctness. `p3` matches the realistic severity. A.5's "scores honesty over throughput" cuts both ways: severity inflation to chase the plan's letter would itself be dishonest.

- **Iter-865 — walk-30 is BOTH the next chain[0] candidate AND a regression of walk-29.** Originally walk-30 was reserved as the broad-sweep chain[2] candidate (per iter-864 STATUS). Two consecutive driver-side findings on dim-6 PC5 have consumed that slot — walks 30/31/32 now collectively form the convergence chain (each a regression). The broad-sweep walk is deferred until dim 6 lands at 3 (per A.6 reflection: until parts/ports/connections/itemflow are fully verified, a broad sweep across other viewpoints can wait — the dim-6 saga is the active risk).

- **Iter-865 — if walk-30 fails for a third driver-side reason, file a `type:design` issue for a stable edge-probe helper.** The pattern would warrant a shared `tests/e2e/__helpers__/edge-probe.ts` (or similar in the architect walk infrastructure) — but only if the cost has actually been paid three times. Not pre-emptively.

## Session checkpoint summary

This session (iter-793 → iter-865) executed **73 iterations** spanning bootstrap, **15 architect walks** + **walks 26 + 27 + 28 + 29 against deployed Pages** + **walks 28 + 29 plan-sealed**, **~25 engineer batches**, **8 release tags**, **3 ADRs** (0014/0015/0016), and the iter-859 → iter-865 IBD ConnectionMode arc (walk-27 finding → #499/#500 batch → `vphase-15.8` ship → walk-28 verifies fix + dim 17 advance → walk-29 plan-seal closes #505 → walk-29 exec verifies #505 fix + surfaces #508).

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 | Palette show-all-kinds + label consistency |
| vphase-15.4 / v1.3.0 | 2026-05-17 | IBD palette, usage hints, implicit-owner Package row, bus-dispatched diagrams, ADR 0014/0015 step 1 |
| vphase-15.5 / v1.4.0 | 2026-05-17 | ADR 0015 steps 2/3/4 (empty-state click-shortcut, inspector contextual, toolbar `+` retires) |
| vphase-15.6 / v1.5.0 | 2026-05-18 | #448 quoted-ident + #451 SysML view-block round-trip → dim 14 to 3 |
| vphase-15.7 / v1.5.1 | 2026-05-18 | #464 IBD enclosing-frame seed + #465 tree-row activates diagram tab → dim 6 → 2, dim 13 → 2 |
| vphase-15.8 / v1.5.2 | 2026-05-18 | #499 IBD `ConnectionMode.Loose` for inout↔inout drag + #500 acronym auto-name |

Rubric: **2 × score-3** (dim 5 BDD, dim 14 Round-trip integrity) + **23 × score-2** + **0 × score-1** + **3 × score-0** (incl. dim 23).

## Next action

**Iter-866 — seal walk-30 plan.** Walk-30 inherits walk-29's eight PCs verbatim (PC5 probe-selector fix is on the driver side, bundle unchanged). The driver delta is a single CSS-selector change in the PC5 marker probe: `g.querySelector('path')` → `g.querySelector('path[marker-end]')` (with `[...g.querySelectorAll('path')].find(p => p.hasAttribute('marker-end'))` as fallback for browser-quirks tolerance). Specify this in walk-30.md § "Tool & environment" with a verbatim JavaScript snippet of the corrected probe body, mirroring the iter-864 pattern that closed #505. **Closes #508 via plan-seal** per the gitignore policy (drivers live under `artifacts/` which is gitignored except for `release-*`).

**Iter-867 — execute walk-30.** Run `walk-30-exec.py` against `vphase-15.8` Pages (no new release tag required — driver-side fix only). Expected: 8/8 PCs PASS automated. Clean outcome → dim 6 promotion (2 → **3**, THIRD score-3 dimension) + chain[0] → chain[1] / 3.

**Iter-868+ — broad-sweep walk-31 OR FBW example.** Once dim 6 reaches 3, the FBW example commit (A.12 #4) unblocks. The broad-sweep walk should happen first to confirm no broad-coverage regressions before the example commit, per A.6.

**If walk-30 finds new product issues (or a third driver-side issue):** chain stays at 0; file each finding per A.7; dim 6 stays at 2; FBW example deferral continues. A third driver-side issue triggers the `type:design` for a stable edge-probe helper.

**#469 (CI step 3, merge queue):** no further loop work. `status:needs-human` until operator decides.

**ADR for raising A.8 cap (#454):** indefinitely blocked behind #469.

**FBW example (A.12 #4):** unblocks the iteration after dim 6 reaches 3 — currently expected iter-868 or iter-869 (post-walk-30 clean).

**In-flight at iter-865 open (1/5 of A.8 cap):** this walk-29-exec PR.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 73, well under the 300 churn ceiling.
