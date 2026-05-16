# Phase 15 architect knowledge tree

This directory is the architect's working knowledge base for Phase 15. It accretes as architect walks happen — it is **not** pre-populated. Research subagents populate viewpoint-specific files before each viewpoint is exercised in depth; the rubric file (`quality-rubric.md`) is updated each walk that informs a dimension.

The kickoff prompt at `docs/superpowers/specs/2026-05-16-phase-15-architect-kickoff.md` is the historical record of Phase 15's start; it is **not** re-read each iteration (per kickoff A.15). AGENT.md carries the Phase 15 constitution verbatim (Section A); the Ralph loop reads AGENT.md, STATUS.md, `docs/CONTEXT.md`, `docs/adr/README.md`, and the relevant `docs/architect/*.md` files.

## Files

- [`sysml-conventions.md`](sysml-conventions.md) — SysML v2 visual & semantic conventions, with citations. Populated by research subagents on first reference.
- [`visual-standards.md`](visual-standards.md) — node geometry, port placement, line styles, color semantics.
- [`quality-rubric.md`](quality-rubric.md) — the 28-dimension production-quality rubric of A.10. Scores updated each walk; rubric changes require a `type:design` issue and ADR.
- [`in-flight.md`](in-flight.md) — claim board of in-flight `phase-15/*` branches. Read before dispatching a parallel subagent.
- [`diagram-types/`](diagram-types/) — per-viewpoint convention notes (eight files). Populated by research subagents before each deep-dive walk.
- [`walks/`](walks/) — per-walk logs. One file per architect walk (`walk-<n>.md`). Plan / Snapshot / Execute / Triage / Score / Close-out lifecycle per A.5.

## How this tree accretes

- **Per walk:** the walk log under `walks/` is the primary artifact. It plans, captures findings, triages into issues, and records rubric deltas.
- **Per viewpoint exercise:** the relevant `diagram-types/<type>.md` is populated/refined by a research subagent before any deep dive.
- **Per dimension change:** the rubric file's score for that dimension is updated, with a one-line explanation of the score delta.
- **Per parallel batch dispatch:** the claim board is updated with the new branch's row before subagent dispatch.

## Source priority for citations

Per A.9, every claim recorded here cites at least one source by URL or document name + section. Source priority:

1. OMG SysML v2 specification (highest authority).
2. OMG SysML v1.x specification (fallback for under-specified v2 notation).
3. OMG UML 2.x (foundational notation for activity, state machine, use case).
4. ISO/IEC/IEEE 42010 (architecture description).
5. INCOSE SE Handbook (modelling guidance).
6. ARP 4754A and DO-178C (FCS-domain context).
7. Vendor documentation (Cameo, MagicDraw, Capella, Eclipse Papyrus) for widely-adopted non-standard conventions.

## Label taxonomy colour mapping

Per A.13, the bootstrap agent chooses colours per semantic category and records the mapping here. Created via `gh label create` during the bootstrap iteration (iter-793).

**Category palette** — colour family signals what kind of work a label tags:

- **Meta — violet (`#7057ff`)**: phase markers.
- **Visual / interaction — warm (oranges, golds, peaches)**: visual fidelity, routing, ports, palette, interaction.
- **Viewpoints — cool (greens, blues, teals)**: one shade per viewpoint, eight total.
- **Workspace surfaces — purples**: explorer, inspector, search, undo.
- **Infrastructure & cross-cutting — greys / slate / soft violet**: import/export, LLM, empty state, accessibility, performance, persistence, cross-cutting.

**Concrete mapping:**

| Label | Colour | Category |
|-------|--------|----------|
| `phase:15` | `#7057ff` | meta — medium violet |
| `area:visual-fidelity` | `#ff8c00` | visual — dark orange |
| `area:routing` | `#ffa500` | visual — orange |
| `area:ports` | `#ffd700` | visual — gold |
| `area:palette` | `#fad8c7` | visual — peach |
| `area:interaction` | `#f9d0c4` | visual — light pink-peach |
| `area:viewpoint:bdd` | `#006b3c` | viewpoint — dark green |
| `area:viewpoint:ibd` | `#0052cc` | viewpoint — deep blue |
| `area:viewpoint:req` | `#4682b4` | viewpoint — steel blue |
| `area:viewpoint:act` | `#006b75` | viewpoint — teal (darker) |
| `area:viewpoint:stm` | `#008080` | viewpoint — teal |
| `area:viewpoint:uc` | `#4a90a4` | viewpoint — medium teal |
| `area:viewpoint:par` | `#6495ed` | viewpoint — cornflower blue |
| `area:viewpoint:pkg` | `#87ceeb` | viewpoint — sky blue |
| `area:explorer` | `#8a2be2` | workspace — blue-violet |
| `area:inspector` | `#9b59b6` | workspace — purple |
| `area:search` | `#ba55d3` | workspace — medium orchid |
| `area:undo` | `#c084d2` | workspace — light orchid |
| `area:import-export` | `#808080` | infrastructure — grey |
| `area:llm` | `#696969` | infrastructure — dim grey |
| `area:empty-state` | `#c0c0c0` | infrastructure — silver |
| `area:a11y` | `#b4a7d6` | infrastructure — light violet |
| `area:perf` | `#a9a9a9` | infrastructure — dark grey |
| `area:persistence` | `#778899` | infrastructure — light slate grey |
| `area:cross-cutting` | `#4f4f4f` | infrastructure — very dark grey |
