# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-860: #499 + #500 engineer batch shipped as PR #502.** Theme: `phase-15/fix-ibd-connection-mode`. Closes #499 (p1, IBD connection-mode root cause from walk-27) and #500 (p2, PartUsage acronym auto-name). Code change is surgical: 11 lines in `CanvasPane.tsx` (import `ConnectionMode`, per-viewpoint ternary on `<ReactFlow>`) + 14 lines in `store.ts` (`nextPartUsageName` acronym branch via `^[A-Z][A-Z0-9_]*$`). Test additions: 2 unit tests (acronym naming `PFC` → `PFC_1`; `ADIRU_3` → `ADIRU_3_1`), 1 e2e (inout↔inout drag → `ConnectionUsage`), 1 e2e (inout↔inout Shift+drag → `ItemFlow`). All 1481 unit + 304 chromium e2e + 12 webkit IBD tests pass locally. `docs/CONTEXT.md` records the `ConnectionMode.Strict` vs `Loose` learning. Pre-PR Sonnet review: APPROVE, two non-blocking nits.

🎯 **Iter-859: walk-27 (IBD deep-dive) executed on `vphase-15.7` Pages → 5/8 PCs PASS, 2 issues filed.** First dim-6 score-3 attempt. PC3 (drag-create `ConnectionUsage`) + PC5 (Shift+drag → `ItemFlow`) silently FAIL — root-caused: `HANDLE_TYPE_BY_DIRECTION.inout = 'source'` + React Flow's default `connectionMode` rejects source→source drags before the typed `isValidIbdConnection` validator. Filed #499 (`p1`) + #500 (`p2`). Convergence chain[2] → **chain[0 / 3]** (reset). Walk-27 PR #501 squash-merged at 18:05:28Z as `633436a`.

🎯 **Iter-858 was consumed by the CI-stuck retrigger inside PR #498** (no new architect-walk work performed). PR #498 merged 2026-05-18T17:37:34Z as `d6d2720`.

🎯 **Iter-857: walk-27 plan SEALED + IBD deep-dive conventions research-populated** (PR #498 merged).

🎯 **Iter-856: walk-26 executed clean on `vphase-15.7` Pages** — chain[1] → chain[2] / 3.

🎯 **Iter-855: `vphase-15.7` / `v1.5.1` released.**

🎯 **Iter-853: walk-25 executed → CLEAN REGRESSION on local dev** (dim 6 1 → 2, dim 13 0 → 2).

🎯 **Iter-826: walks 14 + 19 merged → rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension.**
🎯 **Iter-834: rubric dim 14 (Round-trip integrity) → score 3 via SysML view-block round-trip (#451).**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **2 of 28** at 3 (dim 5 BDD, dim 14 Round-trip integrity); **22** at 2; 1 at 1 (dim 17 Edge editing — blocked on PR #502); 3 at 0. PR #502 lands the precondition for promoting dim 6 (IBD) to 3 and advancing dim 17 (Edge editing) from 1 to 2/3. Promotion is gated on **walk-28** (regression of walk-27) re-running PC3 + PC5 clean on post-fix `vphase-15.8` Pages. |
| A.12 #2 | Zero open `phase:15` issues labelled `type:bug/feature/design` | **0 open `type:bug`** once PR #502 merges (closes #499 + #500). **2 open `type:design`**: #452 (`status:needs-human` via #469), #454 (blocked behind #469). **1 open `type:chore` `status:needs-human`**: #469. |
| A.12 #3 | Three consecutive convergence walks | **chain[0 / 3]** (reset by walk-27). Walk-28 (regression) is the next chain[1] candidate; clean outcome → chain[1] AND dim 6 → 3 simultaneously. |
| A.12 #4 | FBW example shipped + loadable | unblocks once dim 6 reaches 3 (precondition for authoring A.6-coverage FBW IBDs via UI). |

## Current iteration
- Iteration #: 860
- Started: 2026-05-19
- Branch: `phase-15/fix-ibd-connection-mode`
- Working on: PR #502 (auto-merge SQUASH armed; mergeStateStatus BLOCKED on `fast` check QUEUED — normal on a fresh code-path PR; full CI shards run, including visual baselines on Linux runners).

## Last test run
- Local: `pnpm typecheck` clean; `pnpm lint` clean (3 pre-existing react-refresh warnings); `pnpm test:unit` 1481/1481 passed; `pnpm exec playwright test --project=chromium` 304/304 passed; `pnpm exec playwright test tests/e2e/ibd-{connection,itemflow}.spec.ts --project=webkit` 12/12 passed; `pnpm build` clean (920 kB main bundle, unchanged).

## Last PR sweep
- Iter-860 open: PR #502 (this batch). No other PRs open.
- PR #501 (walk-27 doc) squash-merged 2026-05-18T18:05:28Z as `633436a` between iter-859 close and iter-860 open. Doc-only `check` ran in expected ~1m 30s.

## Known issues / blockers
- **PR #502** (this iter): awaits CI green to auto-merge. Closes #499 + #500.
- **#469 (CI step 3, merge queue) BLOCKED:** `status:needs-human` pending operator decision.
- **#452 (CI velocity epic step 3):** blocked behind #469.
- **#454 (raise A.8 cap):** blocked behind #469.

## Open phase:15 issues at iter-860 close
- #452 (p1, type:design, status:ready, area:cross-cutting) — Speed up PR-gate CI. Steps 1+2 done; step 3 (#469) blocked.
- #454 (p2, type:design, status:blocked, area:cross-cutting) — ADR: raise A.8 in-flight branch soft cap. Blocked behind #469.
- #499 + #500 — closed-by-PR #502, will auto-close on merge.

## Decisions log

**Iter-808..iter-859 entries preserved in earlier commits.**

- **Iter-859 — walk-27 executed with expected risk-balance outcome.** Walk-26's decide-next called out the risk-balance explicitly: a clean walk-27 would have triggered both dim-6 score-3 promote AND A.12 #3 convergence, but a finding-walk would still gain useful measurement data. Walk-27 took the finding-walk path. Two root-cause issues filed (#499 + #500); dim 6 + dim 17 score-3 paths now have a concrete blocking issue with a small-PR resolution sketch.
- **Iter-860 — chose per-viewpoint `connectionMode` ternary over global Loose.** The architect-recommended fix in #499 said "set `connectionMode='loose'` on the IBD's `<ReactFlow>` (and any other viewpoint whose typed validator allows non-canonical source/target roles)." Other viewpoints (BDD, Activity, State Machine, Use Case, Parametric, Package) use distinct nodes for source vs target — their typed validators would still pass under Loose, but keeping them at Strict gives defence-in-depth at zero cost and isolates the regression surface to IBD where the actual semantic is symmetric. Future viewpoints that map symmetric semantics onto same-role handles must explicitly opt into Loose; do not flip the global default. Recorded as a non-obvious fact in `docs/CONTEXT.md`.
- **Iter-860 — bundled #500 (p2 acronym auto-name) into the #499 PR.** Both touch IBD code; the scope-overlap with #499 made bundling cheaper than splitting. Acceptance criterion: keep `Engine` → `engine`, `engine2` behaviour for mixed-case names (the existing test stays green); promote acronyms `PFC` → `PFC_1`, `PFC_2`.

## Session checkpoint summary

This session (iter-793 → iter-860) executed **68 iterations** spanning bootstrap, **15 architect walks** + **walks 26 + 27 executed against deployed Pages**, **~24 engineer batches**, **7 release tags**, **3 ADRs** (0014/0015/0016), CI-velocity steps 1+2 (#472, #475) shipped + step 3 (#469) blocked, the iter-847..851 ADR 0016 path-filter correction trail, and the iter-859 IBD deep-dive surfacing #499 + #500 — now closed by iter-860's PR #502.

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 | Palette show-all-kinds + label consistency |
| vphase-15.4 / v1.3.0 | 2026-05-17 | IBD palette, usage hints, implicit-owner Package row, bus-dispatched diagrams, ADR 0014/0015 step 1 |
| vphase-15.5 / v1.4.0 | 2026-05-17 | ADR 0015 steps 2/3/4 (empty-state click-shortcut, inspector contextual, toolbar `+` retires) |
| vphase-15.6 / v1.5.0 | 2026-05-18 | #448 quoted-ident + #451 SysML view-block round-trip → dim 14 to 3 |
| vphase-15.7 / v1.5.1 | 2026-05-18 | #464 IBD enclosing-frame seed + #465 tree-row activates diagram tab → dim 6 → 2, dim 13 → 2 |

Rubric: **2 × score-3** (dim 5 BDD, dim 14 Round-trip integrity) + **22 × score-2** + **1 × score-1** (dim 17 Edge editing — about to advance once #502 + walk-28 clean) + **3 × score-0** (incl. dim 23).

## Next action

**Iter-861 — once PR #502 merges, release `vphase-15.8` / `v1.5.2`** (patch release: bug fixes only — `ConnectionMode.Loose` for IBD + acronym auto-name). Then **walk-28** (regression of walk-27) against the post-fix Pages: re-run the same eight PCs from walk-27. Clean outcome → dim 6 promotes to 3 (third score-3 dimension) AND chain advances to chain[1] / 3.

**If PR #502 CI blocks** (visual baseline drift on Linux runners — none expected, but visual baselines are pixel-fragile): inspect the failing diff, refresh baselines deliberately if the change is intentional, push to the same branch.

**#469 (CI step 3, merge queue):** no further loop work. `status:needs-human` until operator decides.

**ADR for raising A.8 cap (#454):** indefinitely blocked behind #469.

**FBW example (A.12 #4):** unblocks the iteration after walk-28 promotes dim 6 to 3.

**In-flight at iter-860 close (1/5 of A.8 cap):** PR #502 (`phase-15/fix-ibd-connection-mode`).

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 68, well under the 300 churn ceiling.
