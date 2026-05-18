# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

🎯 **Iter-832: walk-21 (round-trip integrity re-verification, dim 14) executed against local `pnpm dev` @ `9578f3d`. JSON round-trip — fully lossless. SysML round-trip — `<…>` quoted-identifier emission landed cleanly (5 distinct `<…>` tokens in `baseline.sysml`); all 6 elements + kinds + names + structure preserved; BUT diagrams are silently dropped (`diagram_total: 2 → 1` — explicit user-authored `Flight Control System BDD` lost). Source confirms: serializer + parser have no view/representation knowledge. Filed #449 (p2, area:import-export, type:bug) — citation OMG SysMLv2 §10. Rubric dim 14: 1 → 2 (advances to 3 once #449 lands). Convergence chain (A.12 #3) stays at 0 — walk-21 filed an issue, so no chain has begun.**

🎯 **Iter-831: PR #448 merged at 06:54:58Z (squash `9578f3d`) — #446 closed. Serializer + parser now emit/parse OMG-§4.4.1 `<…>` quoted identifiers, and `final-gate.spec.ts` `canonicalize` aligned with `phase-12-gate.spec.ts` + an `import-error-banner.toBeHidden()` guard against silent-fail imports landed in the same PR. Main fast-forwarded to `9578f3d`. A.12 #2 satisfied.**

🎯 **Iter-830: Closed #446 via PR #448 — quoted-identifier emission/parse + silent-import-failure-mask fix in `final-gate.spec.ts`. Second commit on the same branch.**

🎯 **Iter-829: walk-20 (round-trip integrity, dim 14). JSON lossless. SysML BROKEN by default project name (`Untitled Project`) → filed #446. Dim 14: 0 → 1.**

🎯 **Iter-826: walks 14 + 19 merged on main → rubric dim 5 (BDD) at score 3 = FIRST score-3 dimension. JOURNAL entry written per A.14. Sweep history in #443.**

## Phase 15 termination conditions

| # | Condition | Status |
|---|-----------|--------|
| A.12 #1 | Every rubric dim at 3 | **1 of 28** at 3 (dim 5 — BDD); **dim 14 at 2** (JSON ✓ both legs; SysML elements ✓; diagrams ✗ per #449 — advances to 3 once #449 lands and walk-22 re-verifies); 20 at 2, 3 at 1, 4 at 0 |
| A.12 #2 | Zero open phase:15 issues | **VIOLATED** (transient) — #449 open after walk-21; expected to drain via next engineer batch |
| A.12 #3 | Three consecutive convergence walks | **at 0** (walk-21 filed #449; no chain has begun since the walk-19 = 6 chain was reset at walk-20) |
| A.12 #4 | FBW example shipped + loadable | partial — A320 skeleton + PartDefinitions + ports + BDD composition edge validated under real authoring; round-trip dim 14 element-side validated; `examples/flight-control-system/` not yet committed |

## Current iteration
- Iteration #: 832
- Started: 2026-05-18
- Branch: `phase-15/walk-21-roundtrip-reverify` (walk close-out PR pending)
- Working on: walk-21 close-out — committing walk-21.md + rubric delta + STATUS

## Last test run
- Local `pnpm dev` @ `9578f3d`. Walk-21 exec: 0 page errors, 0 console errors, JSON round-trip ✓, SysML element round-trip ✓, SysML diagram round-trip ✗.
- **Releases tagged in this push:** `vphase-15.4` / `v1.3.0` (iter-811), `vphase-15.5` / `v1.4.0` (iter-815). Pages deploys live for both. **#448 not yet in a release tag** — deployed Pages bundle is still pre-fix.

## Known issues / blockers
- #449 (p2, area:import-export, type:bug) — SysMLv2 text round-trip silently drops diagrams. Holds dim 14 below 3.

## Open phase:15 issues at iter-832 close
- #449 — SysMLv2 text round-trip silently drops diagrams (representations / views)

## Decisions log

**Iter-808..iter-820 entries preserved in earlier commits.**

- **Iter-821..828 (sweep + flake-fix series):** see #443 (sweep log PR — deferred), #445 (flake-threshold-bump PR closing #444), #437/#442 merged (walk-14 / walk-19 → first dim-3 = dim 5 BDD), JOURNAL iter-826 entry (first dim-3 milestone).
- **Iter-829 — walk-20:** JSON round-trip lossless; SysML round-trip broken on default project name. Filed #446. Dim 14: 0 → 1.
- **Iter-830 — PR #448 implementation:** OMG-§4.4.1 `<…>` quoted-ident emission/parse + silent-import-mask fix in `final-gate.spec.ts`.
- **Iter-831 — #448 lands:** main fast-forwarded to `9578f3d`; A.12 #2 satisfied (transiently).
- **Iter-832 — walk-21 (dim-14 re-verification):** Re-authored a small structured project with deliberate whitespace in names (`Flight Control System` root pkg + `Primary Flight Computer` + `SEC` + `Engage Autopilot` + `High Reliability` + 1 BDD repr — 5/6 names contain whitespace) against local `pnpm dev @ 9578f3d`. `baseline.sysml` contains 5 distinct `<…>` tokens — confirms #448 path was exercised. JSON round-trip: structural signature equal. SysML round-trip: all 6 elements + kinds + names + structure preserved, BUT `diagram_total: 2 → 1` (explicit `Flight Control System BDD` lost; only the default-seeded `Main BDD` remained). Source inspection: `grep -iE 'diagram|view|representation' src/serializer/sysml.ts src/parser/sysml.ts` returns no matches — serializer + parser have no view knowledge. **Filed #449** (p2, area:import-export, type:bug) with citation to OMG SysMLv2 §10 (`view def` / `view` / `expose`) and a resolution sketch using a `// @viewpoint <kind>` workbench decorator for viewpoint hints (cross-tool-compatible). Rubric dim 14: 1 → 2 (element-side lossless on both legs; views are a recognised rough edge; score 2 = "competent user can work around" — diagrams recreatable via UI; JSON path preserves everything). Convergence chain stays at 0 — walk-21 filed an issue. Walk-21 close-out PR pending.

## Session checkpoint summary

This session (iter-793 → iter-832) executed **40 iterations** spanning bootstrap, **10 architect walks** (6-10 FBW + 14-21 viewpoints + round-trip ×2), **15 engineer batches** (incl. #448 quoted-ident fix), **5 release tags**, **2 ADRs**. Cumulative delivery:

| Tag | Date | What |
|-----|------|------|
| vphase-15.1 / v1.1.0 | 2026-05-16 | Bootstrap + BDD resize |
| vphase-15.2 / v1.2.0 | 2026-05-17 | Drag-coord overlay + Cmd-Z rename fix |
| vphase-15.3 / v1.2.1 | 2026-05-17 | Palette show-all-kinds + label consistency |
| vphase-15.4 / v1.3.0 | 2026-05-17 | IBD palette, usage hints, implicit-owner Package row, bus-dispatched diagrams, ADR 0014/0015 step 1 |
| vphase-15.5 / v1.4.0 | 2026-05-18 | ADR 0015 steps 2/3/4 (empty-state click-shortcut, inspector contextual, toolbar `+` retires) |

Rubric: **1 × score-3** (dim 5 BDD) + 20 × score-2 (dim 14 promoted) + 3 × score-1 + 4 × score-0. First A.12 #1 dimension crossed at iter-826; dim 14 advanced 1 → 2 at iter-832; dim 14 → 3 within reach pending #449.

## Next action

**Iter-833 — engineer batch closing #449 (`phase-15/import-export-view-roundtrip`):** Implement `view <name> { expose <pathToContext>; }` emission in `src/serializer/sysml.ts` (after the structural block, one per persisted `Diagram` reachable from root) with the `// @viewpoint <bdd|ibd|req|act|stm|uc|par|pkg>` workbench decorator comment. Implement reciprocal parser tolerance in `src/parser/sysml.ts`. Drop the default-diagram seeding's silent creation when imported SysML already contains views (so we don't end up with an extra Main BDD beside imported ones). Tests:
- `src/serializer/__tests__/sysml-diagrams.test.ts`: one diagram, two diagrams same package different names, whitespace name (quoted-ident interplay), round-trip preserves the diagram set.
- `src/parser/__tests__/sysml-diagrams.test.ts`: parses `view`, ignores missing `// @viewpoint` (defaults to bdd), rejects malformed `expose`.
Acceptance: deterministic re-run of `walk-21-exec.py` shows ctx3's `diagram_total` equal.

**Walk-22 (after #449 lands):** deterministic re-run of `walk-21-exec.py` against patched code. If both legs structurally identical (including diagrams), promote dim 14: 2 → 3 directly. Walk-22 = chain[1] if zero issues filed.

**After #449 lands, also tag `vphase-15.6` / `v1.4.1`** (patch — pure bug fix per the SemVer rule in A.8) so the deployed Pages bundle picks up #448 + #449. Then run a Pages-side regression walk for dim 14.

**Parallel-eligible engineer batches** (no overlap with #449's files):
- **Dim 13 walk** (cross-diagram coherence, score 0): doesn't touch serializer/parser.
- **Dim 17 walk** (edge editing): doesn't touch serializer/parser.
- **Dim 27 walk** (persistence reload): doesn't touch serializer/parser.

**FBW example (A.12 #4):** still gated by the multi-walk authoring effort for A.6 coverage. Round-trip integrity at dim 14 = 3 is a precondition for the example commit, so #449 sits in the critical path.

**Halting safety:** STOP file / `status:emergency-stop` label unchanged; Phase-15 iter-count at 40, well under the 300 churn ceiling.
