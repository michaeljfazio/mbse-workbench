# 0017 — Tag-cutting cadence: agent-cut tags per AGENT.md step 17 / A.8

**Status:** Accepted (iter-885)

## Context

`AGENT.md` step 17 of the Ralph-loop protocol prescribes:

> *Tag `vphase-<N>` on `main` — the release workflow handles the rest.*

`AGENT.md` A.8 SemVer tagging directive prescribes the agent bumps the
`v1.X.Y` line per its A.8 rules. `AGENT.md` anti-patterns include
*"Asking a human for input. There is no human. Open a design issue and
decide."*

`JOURNAL.md` iter-876 (and iter-861 / iter-853 implicitly) records release
tags as having been cut *by the operator* (the human watching the loop).
That phrasing established a session-level convention that the agent
inferred and followed. The convention diverges from `AGENT.md`.

After PR #531 (the `#528` Use-Case `ConnectionMode.Loose` fix) merged at
iter-879, iter-880 → iter-884 each shipped thin doc-only STATUS-sync
close-out PRs (#533 / #535 / #537 / #539 / #541) maintaining cadence
while awaiting an operator-cut `vphase-15.10` / `v1.6.1`. Five
consecutive blocked-tick iterations exposed the cost of the
operator-gate convention without a corresponding benefit recorded
anywhere. Issue #542 surfaced the discrepancy as a `type:design` per
the iter-881 slack-window escalation plan.

## Decision

**The agent cuts both `vphase-15.N` and `v1.X.Y` tags on `main`** when
A.8's release-window checklist is satisfied. The operator-cut path
remains opt-in (an externally-cut tag is detected at iteration start
via `git fetch --tags` and treated identically downstream) but is no
longer the default.

**A.8 release-window checklist (formalised):**

1. Rubric advanced on at least one dimension by ≥1 point **OR** ≥5
   batches have merged since the last `vphase-15.N` tag.
2. Most recent CI run on the target `main` commit is GREEN.
3. SemVer line bump decided per A.8 (minor for user-visible new
   capability, patch for bug fix / visual polish).
4. No `status:emergency-stop` open, no `STOP` file.

When all four hold, the agent cuts the tags on the relevant commit and
pushes them. The existing release workflow handles build / deploy /
release-notes.

## Rationale

- AGENT.md is the constitution. Session conventions inferred from
  JOURNAL phrasing do not override it.
- Five blocked-tick iterations (iter-880 → iter-884) is concrete
  evidence the operator-gate has nonzero cost; the pattern is
  unbounded without this resolution.
- Convergence (A.12 #3) gates on regression walks against the
  *deployed* bundle. Release cadence outside the loop means walks
  also sit outside the loop's control. Agent-cut tags re-internalise
  release cadence.
- A.8's checklist already raises the bar above casual tag-pushing —
  CI must be green, the rubric/batch threshold must hold, SemVer
  must be decided. The decision-quality safeguards are already in
  the constitution; only the *who* changes.

## Consequences

- iter-886 (or the first iteration after this ADR's PR merges) re-runs
  the A.8 release-window checklist on post-#531 `main`. If the four
  gates hold, it cuts `vphase-15.10` / `v1.6.1` and pushes them. The
  release workflow handles the rest; walk-34 plan-seal becomes
  un-blocked on the iteration after deploy headers settle.
- Future Phase-15 release windows close without iteration-stall
  latency. The slack-window mechanism (iter-881 → iter-885)
  retires; if the agent stalls on a release window despite the
  four-gate checklist passing, that itself is a `type:design`
  issue, not a routine blocked-tick.
- Operator override remains: if the operator pushes a tag
  externally, the agent's `git fetch --tags` at iteration start
  picks it up; downstream code paths (Pages-header verification,
  release-issue creation, walk plan-seal) don't care which path
  cut the tag.
- The release workflow's permissions (`contents: write`,
  `pages: write`, `id-token: write` per `.github/workflows/release.yml`
  + `AGENT.md` "Permissions" section) already cover agent-cut tags
  pushed from a session with `repo` scope. No CI / branch-protection
  changes needed.

## Out of scope

- Whether to bump SemVer to `v1.6.1` vs `v1.7.0` for the post-#531
  release. A.8 says patch for bug fixes; `#528` was a bug
  (re-broke A.12 #2 between #519 and #531). Patch is correct.
- Combining the operator-cut and agent-cut paths into a single
  state machine. They already converge at `git fetch --tags`.

## Halting safety

- If an agent-cut tag produces a broken deploy: revert via the
  GitHub Releases UI (delete release + delete tag), reopen #542
  with the failure mode documented, and do not silently retry.
- `STOP` file / `status:emergency-stop` label continue to halt the
  loop unconditionally; this ADR does not affect halting safety.
- A bad SemVer choice (e.g. patch when minor was warranted) is
  recoverable by a subsequent tag at the corrected level on a
  later commit; the bad tag stays in history as a no-op.
