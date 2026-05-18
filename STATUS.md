# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-859: walk-27 (IBD deep-dive) executed on `vphase-15.7` Pages → 5/8 PCs PASS, 2 issues filed.** First dim-6 score-3 attempt. PC1 (parts nest in enclosing frame), PC2 (12×12 square ports, 0 px radius), PC4 (`out` direction glyph `◀` via Inspector), PC6 (only v2-default `port` surfaced — acceptable per `ibd.md` §D, informational), PC8 (0 page / 0 console errors) all PASS. PC3 (drag-create `ConnectionUsage`) + PC5 (Shift+drag → `ItemFlow`) silently FAIL — root-caused: `HANDLE_TYPE_BY_DIRECTION.inout = 'source'` + React Flow's default `connectionMode` rejects source→source drags before the typed `isValidIbdConnection` validator (which accepts `inout:inout` per ADR 0003) runs. PC7 cascade-fails on conns/flows persistence; parts + names + cmd direction persist correctly. Filed #499 (`p1`, `area:viewpoint:ibd` + `area:routing`) for the connection-mode root cause, #500 (`p2`, `area:viewpoint:ibd`) for `PFC → pFC` acronym auto-name. Convergence chain[2] → **chain[0 / 3]** (reset).

🎯 **Iter-858 was consumed by the CI-stuck retrigger inside PR #498** (no new architect-walk work performed). PR #498 merged at 2026-05-18T17:37:34Z as `d6d2720`.

🎯 **Iter-857: walk-27 plan SEALED + IBD deep-dive conventions research-populated** (PR #498 merged).

🎯 **Iter-856: walk-26 executed clean on `vphase-15.7` Pages (4/4 PCs PASS, 0 issues filed)** — chain[1] → chain[2] / 3.

🎯 **Iter-855: `vphase-15.7` / `v1.5.1` released.**

🎯 **Iter-853: walk-25 executed → CLEAN REGRESSION on local dev** (dim 6 1 → 2, dim 13 0 → 2).

🎯 **Iter-826: walks 14 + 19 merged → rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451).**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **2 of 28** at 3 (dim 5 BDD, dim 14 Round-trip integrity); **22** at 2; 1 at 1 (dim 17 Edge editing — confirmed blocked by #499 same root cause); 3 at 0 (dim 23 LLM + others). Walk-27 measured dim 3 (Ports), dim 6 (IBD), dim 17, dim 27 — all hold at prior score; dim 6 score-3 promotion now gated on #499. |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **2 open `type:bug`**: #499 (`p1`, IBD connection-mode root cause), #500 (`p2`, PartUsage auto-name acronym). **2 open `type:design`**: #452 (CI velocity epic step 3 — `status:needs-human` via #469), #454 (raise A.8 cap — blocked on #469). **1 open `type:chore` `status:needs-human`**: #469. |
| A.12 #3 | Three consecutive convergence walks | **chain[0 / 3] (RESET)** — walk-27 filed 2 issues. Walk-28 (regression of walk-27 after #499 lands) is the next chain[1] candidate. |
| A.12 #4 | FBW example shipped + loadable | still blocked on dim-6 score-3 (cannot author A.6-coverage FBW IBDs without `ConnectionUsage` / `ItemFlow` creation from default port directions). Bottleneck = #499 fix → walk-28 regression → dim 6 → 3. |

## Current iteration
- Iteration #: 859
- Started: 2026-05-19
- Branch: `phase-15/iter-859-walk-27-execute`
- Working on: iter-859 walk-27 execute. Drove `artifacts/phase-15/walk-27/walk-27-exec.py` against deployed `vphase-15.7` Pages. 10 screenshots captured. 2 issues filed (#499 + #500). `walk-27.md` appended with `## Execution`, `## Findings — workbench`, `## Findings — informational (not filed)`, `## Findings — strong positive`, `## Rubric score deltas`, `## Convergence chain (A.12 #3)`, `## Decide next` sections. `quality-rubric.md` appended with 4 score-delta rows (dim 3, 6, 17, 27 — all hold at prior score).

## Last test run
- Local: this PR touches only `docs/architect/walks/walk-27.md`, `docs/architect/quality-rubric.md`, `STATUS.md`, and `docs/architect/in-flight.md` — no code, no tests. CI-self-test: should classify `code = false`, skip all e2e shards, aggregate doc-only-branch `check` SUCCESS in ~1m 30s. Eighth consecutive doc-only-skip observation since the ADR 0016 path-filter correction (#491) shipped.

## Last PR sweep
- Iter-859 open: 0 open PRs (iter-857's #498 squash-merged at 17:37:34Z as `d6d2720`; main now at `d6d2720`).
- This iter-859 PR opens as the only in-flight PR (1/5 of A.8 cap).

## Known issues / blockers
- **#499 (`p1`, IBD connection-mode root cause):** filed iter-859. Blocks dim-6 score-3 promote. Next engineer batch — small, well-scoped fix (`connectionMode="loose"` on IBD `<ReactFlow>` + Playwright e2e for `inout↔inout` drag).
- **#500 (`p2`, acronym auto-name):** cosmetic. Bundle into the #499 PR if scope is small; otherwise separate batch.
- **#469 (CI step 3, merge queue) BLOCKED:** `status:needs-human` pending operator decision.

## Open phase:15 issues at iter-859 close
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Steps 1+2 done; step 3 (#469) blocked.
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap. Blocked behind #469.
- **#499 (p1, type:bug, status:ready, area:viewpoint:ibd + area:routing)** — Drag between two default-direction (inout) port handles silently fails to create a ConnectionUsage.
- **#500 (p2, type:bug, status:ready, area:viewpoint:ibd)** — PartUsage auto-name awkward for acronym PartDefinitions ("PFC" → "pFC").

## Decisions log

**Iter-808..iter-858 entries preserved in earlier commits.**

- **Iter-859 — walk-27 executed with expected risk-balance outcome.** Walk-26's decide-next called out the risk-balance explicitly: a clean walk-27 would have triggered both dim-6 score-3 promote AND A.12 #3 convergence, but a finding-walk would still gain useful measurement data on dim 3 / dim 6 / dim 17. Walk-27 took the finding-walk path. Two root-cause issues filed (#499 + #500); dim 6 + dim 17 score-3 paths now have a concrete blocking issue with a small-PR resolution sketch. Chain resets to 0 — expected outcome of the chosen risk balance. Next engineer batch is #499 (small fix, high rubric leverage).

## Session checkpoint summary

This session (iter-793 → iter-859) executed **67 iterations** spanning bootstrap, **15 architect walks** + **walks 26 + 27 executed against deployed Pages**, **~23 engineer batches**, **7 release tags**, **3 ADRs** (0014/0015/0016), CI-velocity steps 1+2 (#472, #475) shipped + step 3 (#469) blocked, the iter-847..851 ADR 0016 path-filter correction trail, and the iter-859 IBD deep-dive surfacing #499 + #500.

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 | Palette show-all-kinds + label consistency |
| vphase-15.4 / v1.3.0 | 2026-05-17 | IBD palette, usage hints, implicit-owner Package row, bus-dispatched diagrams, ADR 0014/0015 step 1 |
| vphase-15.5 / v1.4.0 | 2026-05-17 | ADR 0015 steps 2/3/4 (empty-state click-shortcut, inspector contextual, toolbar `+` retires) |
| vphase-15.6 / v1.5.0 | 2026-05-18 | #448 quoted-ident + #451 SysML view-block round-trip → dim 14 to 3 |
| vphase-15.7 / v1.5.1 | 2026-05-18 | #464 IBD enclosing-frame seed (closes #461) + #465 tree-row activates diagram tab (closes #462) → dim 6 → 2, dim 13 → 2 |

Rubric: **2 × score-3** (dim 5 BDD, dim 14 Round-trip integrity) + **22 × score-2** (incl. dim 6 + dim 13 + dim 3 + dim 27 Pages-confirmed) + **1 × score-1** (dim 17 Edge editing — blocked on #499) + **3 × score-0** (incl. dim 23).

## Next action

**Iter-860 — open the #499 engineer batch.** Theme: `phase-15/fix-ibd-connection-mode`. Closes #499 (and #500 if scope is small — both touch IBD code). Implementation sketch:

1. Set `connectionMode={ConnectionMode.Loose}` on the IBD `<ReactFlow>` in `src/workspace/CanvasPane.tsx`. The typed `isValidIbdConnection` (already wired to the ReactFlow `isValidConnection` prop) becomes the single source of truth — it already rejects the genuinely invalid pairs (`in:in`, `out:out`).
2. Add Playwright e2e covering `inout ↔ inout` drag → `ConnectionUsage` created; `inout ↔ inout` Shift+drag → `ItemFlow` created.
3. (If bundled) Update `nextPartUsageName()` in `src/workspace/store.ts:752` to handle all-uppercase PartDefinition names with a numeric-suffix convention (`PFC` → `PFC_1`).
4. Pre-PR code review subagent before opening the PR.

**Walk-28 (regression of walk-27) — after #499 / #500 batch lands.** Re-run the same eight PCs against the post-fix `vphase-15.8` Pages. Clean outcome → dim 6 promotes to 3 (third score-3 dim) AND chain advances to chain[1] / 3.

**#469 (CI step 3, merge queue):** no further loop work. `status:needs-human` until operator decides.

**ADR for raising A.8 cap (#454):** indefinitely blocked behind #469.

**FBW example (A.12 #4):** further unblocked once #499 closes + dim 6 reaches 3 — that is the precondition for authoring an A.6-coverage FBW IBD via UI.

**In-flight at iter-859 close (1/5 of A.8 cap):** this PR (`phase-15/iter-859-walk-27-execute`).

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 67, well under the 300 churn ceiling.
