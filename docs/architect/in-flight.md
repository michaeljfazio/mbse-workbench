# Phase 15 in-flight claim board

Per A.8, this is the live registry of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent — refuse to dispatch if the new branch's touched-files set overlaps with an open branch's. Soft cap: 5 in-flight branches.

When a branch merges (or is abandoned), remove its row.

| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|--------------------------|-------|--------|-----------------------|---------|--------|
| `phase-15/iter-869-walk-31-execute` | main agent | walk-31 execute (broad-sweep against `vphase-15.8` Pages — 19/24 PCs PASS automated + visually; #513 filed for V-B failures across BDD/Req/Package/UseCase; chain reset 1 → 0 / 3 per plan acceptance) | #513 | `artifacts/phase-15/walk-31/walk-31-exec.py` (new), `artifacts/phase-15/walk-31/walk-31.json` (new), `artifacts/phase-15/walk-31/screenshots/` (new, gitignored), `docs/architect/walks/walk-31.md` (Execution+Findings+Rubric deltas+Convergence+Decide next appended), `docs/architect/in-flight.md`, `docs/architect/quality-rubric.md`, `STATUS.md` | 2026-05-19 | PR #514 open, awaiting auto-merge |
| `phase-15/iter-870-disambiguate-513` | main agent | iter-870 disambiguation of #513 — code-only triage concluded BOTH halves are driver artefacts (UC handle drag had reversed direction; tree-group V-B used lowercase kind strings vs PascalCase V-A); #513 closes wontfix; iter-871 will amend driver + re-run walk-31 as walk-32 → chain[1] candidate | #513 (close, not new PR) | `docs/architect/walks/walk-31.md` (`## Iter-870 disambiguation` section appended), `docs/CONTEXT.md` (walk-finding triage heuristic appended), `docs/architect/in-flight.md`, `STATUS.md` | 2026-05-19 | PR pending — stacked on iter-869 branch |
