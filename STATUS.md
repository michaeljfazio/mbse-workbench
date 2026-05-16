Phase 13 — Functional polish & feature accessibility (post-v1.0.0): COMPLETE
Phase 14 — Standard library import (KerML / SysML): kickoff pending

## Current phase
phase:14 — Standard library import (post-v1.0.0 follow-on)

Phase 13 closed at iter-779. Tag `vphase-13` placed at 83018f9 (T-13.44
merge, 2026-05-16 06:46:56Z); release workflow `queued` against
`headBranch: vphase-13` at 06:50:00Z. Release issue #340 open. JOURNAL
phase-completion entry appended for iter-779.

## Current iteration
- Iteration #: 779
- Started: 2026-05-16
- Branch: issue/340-release-vphase-13
- Working on: #340 — release: vphase-13 (Functional polish & feature
  accessibility, post-v1.0.0). This PR closes the release issue, lands the
  JOURNAL phase-completion entry, and rewrites STATUS.md to the canonical
  AGENT.md format (the iter-history archive that had accumulated through
  the Phase-13 cascade is dropped per AGENT.md "The file is overwritten
  each iteration").

## Phase 13 closure summary
- Tag pushed: `vphase-13` at 83018f9 (T-13.44 merge, 2026-05-16 06:46:56Z).
- Release workflow: queued at 06:50:00Z on the tag (run on `vphase-13`).
- Release issue: #340.
- All five Phase-13 gate items pass:
  - **#1 Cold-start UI walkthrough** — `tests/e2e/phase-13-cold-start.spec.ts`
    (T-13.44, iter-778, PR #339).
  - **#2 Visual fidelity invariants** — `tests/e2e/phase-13-visual-fidelity.spec.ts`
    (T-13.43, iter-777, PR #337).
  - **#3 Containment invariants on the persisted schema** —
    `tests/unit/workspace/phase13GateInvariants.test.ts` (iter-531).
  - **#4 Explorer affordances** — covered by the explorer cascade
    (T-13.29..38 unit + e2e suites).
  - **#5 CI green + check passes** — every PR landed under the standard
    `pnpm run check` gate; the most recent main CI on commit 83018f9 was
    SUCCESS (run 25955165404, completed 06:46:54Z).
- P0 + P1 backlog tiers fully shipped (52 tasks across UI-reachability,
  visual rendering, SysMLv2 notation conformance, hierarchical explorer
  foundations, discoverability, and gate specs).

## Carry-forward to Phase 14

Reserved metamodel hooks (already in place per iter-531 / ADR 0011):
- `PackageElement.isReadOnly?: boolean`
- `Project.libraryRootIds?: ElementId[]`

Phase 14 scope (from AGENT.md Phase 14 spec):
- Standard library import (KerML + SysML)
- `import` directive in SysMLv2 text round-trip
- Namespace resolution
- Read-only-subtree enforcement at the command bus
- Explorer renders library roots as siblings of the user root under a
  "Libraries" header; lock badge on read-only subtrees

P2 items carried forward from Phase 13:
- T-13.40 — Breadcrumb above the canvas (Project / Package / Element / Diagram)
- T-13.41 — Multi-select in the tree (Shift/Cmd-click) + batched ops
- T-13.42 — Lazy-load very large branches (>200 children)
- T-13.11 — SysMLv2 text import/export surfaced in UI menus
- T-13.12 — Multi-project management
- T-13.14 — API-key first-run nudge on Open Chat
- T-13.15 — Keyboard-shortcut help dialog
- T-13.27 — Handle-stroke colour (restore visible outline now that `card` is in place)
- T-13.28 — Selection-ring contrast (bump `ring-primary/30` → `/50`)

## Last test run
- Command: `pnpm run check` (proxy: PR #339 main CI run on commit 83018f9)
- Result: PASS
- Run: 25955165404, completed 2026-05-16 06:46:54Z
- Coverage: 1334/1334 unit pass, e2e green (including the two new
  Phase-13 gate specs), `tsc -b` clean, eslint 0 errors (3 pre-existing
  react-refresh warnings unchanged), `vite build` clean.

## Known issues / blockers
- (none — release workflow in flight; post-deploy smoke is the next iteration)

## Decisions log
- 2026-05-16 (iter-779): Tag `vphase-13` placed at the last functional
  commit (T-13.44 merge, 83018f9) rather than at the release-issue PR.
  Mirrors the vphase-12 convention (tag at last feature commit, journal
  entry appended after). STATUS.md rewritten to canonical AGENT.md format,
  dropping the iter-archive accretion that had grown across the Phase-13
  cascade — per AGENT.md "The file is overwritten each iteration."
- 2026-05-14 (iter-705): Discovered `pnpm typecheck` (= `tsc --noEmit` on
  root tsconfig.json with files=[] + references) is a no-op; real errors
  only surface via `tsc -p tsconfig.app.json` or `tsc -b`. Recorded in
  docs/CONTEXT.md.
- 2026-05-14 (iter-532): Bundle T-13.16 + T-13.17 in PR #253 per AGENT.md.
  Chat @visual baselines regenerated against a `--mode test` preview build
  (production build strips the `window.__llm` seam; `vite dev` in the
  podman container trips ENOSPC on file watchers). Procedure recorded in
  scripts/regen-chat-baselines.sh and docs/CONTEXT.md.

## Next action
Once this status-reset PR merges, the next iteration:

1. Confirm the `vphase-13` release workflow run is green and the Pages
   deploy at `https://michaeljfazio.github.io/mbse-workbench/` serves the
   new build (HTTP 200 + the Phase-13 feature surface — opaque nodes,
   square IBD ports, hierarchical containment tree, command palette, etc.).
2. Run a Playwright smoke against the deployed URL covering all eight
   viewpoints; save screenshots under `artifacts/release-vphase-13/` and
   link them on release issue #340 before closing it.
3. Decompose Phase 14 just-in-time per AGENT.md — open child issues with
   `phase:14`, `type:feature`, `status:ready`, `pX`. Recommended first
   slices (just-in-time picks subject to revision when implementation
   begins):
   - **P0** — Library seam: command-bus enforcement of
     `PackageElement.isReadOnly` on destructive ops, with a `LibraryViolationError`
     and a toast on rejection. Smallest possible vertical slice; unblocks
     everything downstream.
   - **P0** — Repository load surfaces `Project.libraryRootIds` as
     read-only sibling roots in the containment tree, behind a "Libraries"
     header, with a lock badge on each library subtree. UI-only; depends
     on the seam.
   - **P0** — Standard library content sourcing decision: vendor a
     minimal KerML core (`Base`, `Anything`, `Item`, `Part`, `Port`,
     `Connection`, `Action`, `Performance`, `Definition`, `Usage`) as a
     pre-built JSON fixture committed under `src/library/kerml/`. Defer
     full SysML library to a follow-up slice.
   - **P0** — SysMLv2 text `import` directive: parser accepts
     `import Pkg::*`, serializer emits it when the project references
     library elements. Round-trip identity preserved.
   - **P1** — Namespace resolution for unqualified names against imported
     packages with a precedence table (local → imported → root).
4. Pick the lowest-numbered P0 child issue and start the slice.

A `docs/adr/0012-phase-14-library-seam.md` is the natural design
artifact for the seam decision once Phase 14 starts — defer authoring
until the seam slice begins implementation.
