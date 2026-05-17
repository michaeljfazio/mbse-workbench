# STATUS

## Current phase
phase:15 — Architect-driven UX & feature hardening

Iter-798 closed. Third Phase-15 engineer batch shipped: Cmd-Z fix
on the inline-rename input (closes #386, walk-2's discovery).
Walk-2 reported Cmd-Z NO-OP after a palette `+ New Part Definition`
click; iter-798's probe traced it to the rename input's
`onKeyDown` stopping propagation + the global handler skipping
text-input focus. Fix: special-case Cmd-Z on the UNTOUCHED rename
input (`value === initialValue`) to cancel + dispatch model undo.
Three Playwright tests cover the path.

Rubric advanced: dim 21 (Undo/redo) 1 → 2. Now 11 × score-2,
6 × score-1, 11 × unmeasured.

Five batches merged since `vphase-15.1` (#388, #389, #391, #392,
this close-out) AND rubric advanced → A.8 release conditions met
for `vphase-15.2`. Tagging after this close-out merges.

SemVer: `v1.2.0` (minor) — #389 (drag-coord overlay) is the
outward-facing feature; #392 (Cmd-Z) is a bug fix.

## Current iteration
- Iteration #: 798 (close-out)
- Started: 2026-05-17
- Branch: `chore/iter-798-closeout`
- Working on: this close-out PR

## Last test run
- Main green at `b8e7b12` (PR #391 iter-797 close-out merge).
- Close-out PR: doc-only, `pnpm run check` expected to pass.

## Known issues / blockers
- (none)

## Open phase:15 issues — distribution at iter-798 close

| Severity | Count | Issues |
|----------|-------|--------|
| p1 | 1 | #376 (4-way Block creation — design) |
| p2 | 6 | #368/#369/#370/#371 (discoverability), #372 (palette dynamic growth), #385 (IBD canvas) |
| p3 | 2 | #373 (usage no `+`), #377 (palette labels) |

9 open `phase:15` issues. Closed in iter-798: #386 (Cmd-Z fix).

## Decisions log

Iter-792..iter-797 entries preserved in commit history. Iter-798 entries:

- 2026-05-17 (iter-798 a): Engineer batch on #386. Probe (`/tmp/probe-cmdz.py`) reproduced walk-2's Cmd-Z NO-OP under controlled conditions and traced the root cause to the inline-rename input's `onKeyDown` (`e.stopPropagation()` for all keys except Enter/Escape) + the global Workspace handler's `isTextInputTarget()` exclusion. Fix: special-case Cmd-Z on UNTOUCHED rename input.
- 2026-05-17 (iter-798 b): PR #391 rebased on top of #392 — `docs/architect/in-flight.md` conflict (PR #392 added the cmd-z row; PR #391 wanted empty). Resolved by taking PR #391's empty version (which is correct now that #392 is merged).
- 2026-05-17 (iter-798 c): One additional visual baseline rebaseline rode on PR #391: `bdd-two-blocks-linked-webkit.png` (cascade from #382 — chromium version was rebaselined in iter-795; webkit lagged and surfaced now per JOURNAL iter-790's lesson).

## Next action

After this close-out merges:
1. Tag `v1.2.0` (SemVer minor — drag-coord overlay outward-facing feature) and `vphase-15.2` (Phase-15 release marker — conditions met) on the new main HEAD.
2. Watch release workflows; verify Pages deploy.
3. Iter-799: **walk-3 — regression walk on the vphase-15.2 deploy**, verifying #386 Cmd-Z fix end-to-end and scoring more rubric dimensions (likely 7 Requirements, 10 Use Case, 12 Package, 17 Edge editing, 22 Import/export).
