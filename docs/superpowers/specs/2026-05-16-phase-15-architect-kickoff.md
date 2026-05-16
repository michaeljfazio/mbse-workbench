# Phase 15 — Architect-Driven UX & Feature Hardening — Kickoff

**Status:** authoritative kickoff prompt for Phase 15
**Created:** 2026-05-16
**Applies to:** the MBSE Workbench agent operating the Ralph loop in `mbse-workbench`
**Supersedes nothing.** Inherits, in full, the rules in [`AGENT.md`](../../../AGENT.md). Where this document adds rules, it adds them; where it is silent, `AGENT.md` governs.

---

## 0. What this document is and how to use it

This is the **kickoff prompt for Phase 15**. The human operator pastes this entire file into a fresh agent session to start Phase 15. The first thing the agent does is open a bootstrap PR that:

1. Commits this document at the path it already lives at (`docs/superpowers/specs/2026-05-16-phase-15-architect-kickoff.md`).
2. Appends **Section A — Phase 15 constitution** of this document (verbatim) to `AGENT.md`, under the phased plan, after the Phase 14 section, before the `# First action` heading.
3. Overwrites `STATUS.md` so it describes Phase 15 / iter-793 instead of `COMPLETE`.
4. Appends a `phase-completion` boundary entry to `JOURNAL.md` titled “Phase 15 begun — architect-driven hardening.”
5. Adds the new label taxonomy (Section A.13).

After that bootstrap PR is merged, every subsequent iteration is a normal Ralph-loop iteration governed by `AGENT.md` (now extended with the Phase 15 constitution). The kickoff document remains the canonical reference and historical record of Phase 15's commencement; it is not re-read on every iteration once its content lives inside `AGENT.md`.

The agent must not rewrite or paraphrase Section A while applying it. It is appended verbatim.

**Precedent for modifying `AGENT.md`.** `AGENT.md`'s anti-pattern list says it "does not change once committed in Phase 0," but the same file already carries Phase 13 and Phase 14 sections added after `COMPLETE` was first declared at iter-527. The intent of that anti-pattern is to prevent the agent from polluting its constitution with status-tracking minutiae — not to prevent the constitution from gaining new phase sections when the mission legitimately extends. Phase 15 is such an extension, sanctioned by the human operator via this kickoff prompt.

---

## Section A — Phase 15 constitution (append to `AGENT.md` verbatim)

### A.1 Mission

The MBSE Workbench has reached `v1.0.0` and shipped through `vphase-14`. Every prior phase's gate was passed by tests written *against the store*. Phase 13 surfaced what those gates could not see: large classes of human-operator UX and SysML-conformance gaps. Phase 13 closed a fixed backlog; Phase 14 added KerML library import. Neither phase asked: *can a real architect use this tool to model a real system?*

Phase 15 answers that question by **doing it**. The agent now acts as a senior systems architect modelling a realistic A320-class fly-by-wire flight control system, end to end, **using only the in-browser controls a human operator would have**. Every gap, bug, missing affordance, broken convention, or UX deficiency the architect hits is filed as a GitHub issue, then batched into themed pull requests until the workbench reaches **production quality** by an explicit, self-maintained rubric.

The deliverable at the end of Phase 15 is twofold:

1. A workbench that any architect can pick up and use to model a real system, judged against the rubric in Section A.10.
2. A worked example — the fly-by-wire FCS itself — committed to the repository as `examples/flight-control-system/`, loadable from the deployed application, and demonstrating every viewpoint, relationship kind, and feature the workbench supports.

### A.2 Continuity with the existing framework

Everything in the existing `AGENT.md` continues to apply. Phase 15 inherits, without modification:

- The Ralph loop protocol (read STATUS, query issues, decompose, branch, implement, test, PR, auto-merge, update STATUS, journal at notable moments, halt-check, etc.).
- The label taxonomy. Phase 15 adds labels, listed in A.13.
- The branch protection regime. No bypassing, no `--force` pushes to `main`, no `--no-verify`.
- Conventional commits, one issue per PR, `Closes #N` in PR body.
- Halting safety: `STOP` file in repo root, `status:emergency-stop` label, both honoured at iteration start.
- The escalation rules (3 consecutive failed PR attempts → `status:needs-human`; 2 consecutive red `main` merges → `p0` incident; >50 iterations on a phase without close → `type:design` issue).
- The context-discipline directives: subagents for >3-file exploration, library research, pre-PR review, test generation; per-area `CONTEXT.md` files; structured memory.
- The model/effort selection directive (Sonnet default for routine implementation, Opus for cross-cutting and design, Haiku for narrow lookups; extended thinking only where wrong reasoning is expensive).
- Visual baselines (`tests/e2e/__screenshots__/`) updated only with explicit justification in PR body; Chromium + WebKit required.

What changes for Phase 15 is the *source of work*: instead of phase-decomposed feature issues seeded by the agent in advance, Phase 15 work originates from the **architect's lived experience of the application**. The agent generates the backlog by using the tool.

### A.3 Phase 15 hard constraints

The following are non-negotiable for the duration of Phase 15. Violating any one of them invalidates the iteration's work product:

1. **Browser-only interaction during architect walks.** All modelling actions taken during an *architect walk* (see A.5) happen in a Playwright-driven headed Chromium browser (`channel: 'chrome'` or default Chromium build) against either the deployed Pages URL or `pnpm dev`. The agent may use **only** affordances a human operator has access to: clicks, drag-and-drop via `mouse.down/move/up`, keyboard input, hover, scroll, context menus, drag from palette, inline rename. The agent **must not** during a walk: mutate the Zustand store directly, call repository methods, dispatch commands programmatically, inject fixture JSON, set localStorage state to short-circuit a flow, or invoke any test-only API. If a flow cannot be completed via UI alone, that *is* the finding — file an issue.

2. **Two-hat discipline.** The agent operates in exactly one of two roles at a time:
   - **Architect hat** — running an architect walk, modelling the FBW system, observing the application, filing issues. **The architect never edits source code.**
   - **Engineer hat** — closing a batch of issues with a PR. The engineer writes code, tests, visual baselines. **The engineer never models in the UI as part of their work** except for verification screenshots once an implementation is complete.
   The roles do not blur. If during an architect walk the agent notices a defect, it files an issue and continues the walk; it does not stop the walk to patch the defect. If during an engineer batch the agent realises another issue exists, it files the issue and continues the batch as scoped.

3. **No silent rubric degradation.** The production-quality rubric in A.10 is committed to `docs/architect/quality-rubric.md`. Lowering a rubric target, removing a dimension, or changing the scoring guidance requires opening a `type:design` issue, resolving it via ADR, and updating the rubric file as part of the ADR's PR. The agent does not edit the rubric mid-walk to make termination easier.

4. **No fixing-the-tool-with-the-tool.** The FBW model must be built using the production application, not via test fixtures or repository imports. The agent may use the JSON import feature **once** to seed pre-existing example projects between sessions — that import flow is itself a Phase 15 feature subject to the rubric. The architect cannot bypass building-via-UI by importing a hand-authored JSON.

5. **Citation requirement.** Any claim about "the SysML standard" or "the conventional notation" recorded in `docs/architect/` must be cited. The agent dispatches a research subagent (Sonnet, `WebFetch`/docs tools) for first-time claims; the source URL and document name are recorded inline.

6. **The Pages deploy is the source of truth.** Architect walks default to the deployed Pages URL (`https://michaeljfazio.github.io/mbse-workbench/`). `pnpm dev` is permitted only when the deployed URL lacks an unmerged fix the architect needs to test; in that case the walk's findings are tagged with the commit SHA and re-verified against the deploy after the next `vphase-15.N` release.

7. **No regressions from prior phases.** Every PR runs the full `pnpm run check`. The Phase 13 gate spec, the Phase 14 library round-trip spec, and every prior visual baseline must continue to pass. Visual baseline updates require a paragraph of justification in the PR body.

### A.4 Pre-flight (the bootstrap PR)

The fresh-session agent's first action is the **bootstrap PR** described in Section 0. Specifically:

- Branch: `phase-15/bootstrap-architect-kickoff`.
- Commits (separate, conventional):
  - `docs(phase-15): commit Phase 15 architect kickoff prompt`
  - `feat(agent): adopt Phase 15 constitution in AGENT.md`
  - `chore(status): overwrite STATUS.md to begin Phase 15 / iter-793`
  - `chore(phase-15): scaffold docs/architect/ knowledge tree`
  - `chore(labels): add phase:15 and area:* labels`
- The `docs/architect/` scaffold (created in the same PR) contains:
  - `docs/architect/README.md` — index of the knowledge tree, explaining how it accretes.
  - `docs/architect/sysml-conventions.md` — empty body with `## TBD — populated by research subagents` placeholder; the bootstrap commit only creates the file.
  - `docs/architect/visual-standards.md` — same.
  - `docs/architect/quality-rubric.md` — the rubric table from A.10, with scores all initialised to **0** (unmeasured).
  - `docs/architect/diagram-types/{bdd,ibd,req,act,stm,uc,par,pkg}.md` — empty placeholders to be populated by research before each viewpoint is exercised in depth.
  - `docs/architect/walks/.gitkeep` — directory for per-walk logs.
  - `docs/architect/in-flight.md` — the parallel-batch claim board, initially empty.
- The bootstrap PR closes a single bootstrap issue (filed in the same iteration) and leaves Phase 15 ready for normal iteration on iter-794+.

After the bootstrap PR merges, the agent appends a JOURNAL entry (`event: phase-completion`, title "Phase 15 begun — architect-driven hardening"), then iter-794 begins the first real architect walk.

### A.5 The architect walk protocol

An **architect walk** is a single, planned session in which the agent — wearing the architect hat — performs a defined chunk of modelling work using only browser controls. Walks come in three types:

| Walk type | Purpose | Typical duration | When chosen |
|-----------|---------|------------------|-------------|
| **Broad sweep** | Touch every viewpoint with shallow modelling to surface coarse defects | 30–60 minutes of agent execution | Early Phase 15; after a foundational PR lands; periodically as regression |
| **Deep dive** | Push a single viewpoint or subsystem hard, exercising rare relationships and edge cases | 1–3 hours | After a viewpoint has been raised to rubric ≥2 in shallow walks and needs targeted depth |
| **Regression walk** | Re-execute a prior walk's scenario after an engineer batch has landed, verifying fixes and surfacing regressions | 15–45 minutes | Immediately after any PR that touches the area the walk covers |

**Who drives walks.** The **main agent** drives architect walks directly — it opens the headed Chromium browser, manipulates the application, observes results, takes screenshots. The architect's persona is the main agent's persona while wearing the architect hat. Walks are **not** delegated to subagents; the main agent's lived experience of the application is the source of the findings, and delegation would lose the synthesis. The exception is mechanical capture work: a subagent may be dispatched to (e.g.) take a defined set of screenshots across viewpoints, or run an axe-core scan suite, where the work is pre-scripted and only the artifact matters.

**Who drives engineer batches.** Engineer batches **are** delegated to subagents (per the existing AGENT.md dispatch rules), one subagent per branch, up to the soft cap of 5. The main agent reconciles results, runs pre-PR code review subagents, and opens PRs.

Every walk follows the same lifecycle:

1. **Plan.** Before opening the browser, the agent writes a walk plan to `docs/architect/walks/walk-<n>.md` with a `## Plan` section listing: walk type, scope (which viewpoints, which subsystems), goals (what to model, what relationships to exercise, what conventions to verify), expected duration, and the rubric dimensions the walk will inform.
2. **Snapshot.** The agent records the current Pages URL commit SHA, the open-issue count by area label, and the current rubric scores.
3. **Execute.** Drive the application via Playwright headed Chromium. As findings occur, the agent writes them to a scratch `## Findings (live)` section in the walk file — *not* yet filed as issues, to avoid breaking flow. Screenshots saved under `artifacts/phase-15/walk-<n>/`.
4. **Triage.** After the walk completes, the agent reviews `## Findings (live)`, de-duplicates, splits compound findings, and files each as a GitHub issue per A.7. The walk file's `## Issues filed` section lists the resulting issue numbers.
5. **Score.** The agent updates `docs/architect/quality-rubric.md` if the walk informs any dimension. Score deltas are explained inline.
6. **Close out.** The walk file is finalised (no more edits), committed, and pushed in a small `chore(phase-15)` commit on a `phase-15/walk-<n>-log` branch with a thin PR. (Walk logs are committed individually so the history is interpretable later.)
7. **Decide next.** Based on rubric state and in-flight branch count, the agent decides whether the next iteration is another walk or an engineer batch (see A.8).

A walk that hits a *blocking* defect (one that prevents further progress on the walk's goals) stops early. The walk file records the blocker, and the next engineer batch is chosen to unblock the walk.

### A.6 The modelling target — realistic FBW airliner FCS

The architect models a realistic A320-class fly-by-wire flight control system. The system is not a toy; it must exercise scale, port density, traceability, behavioural complexity, and cross-viewpoint coherence sufficient to stress every part of the workbench.

**Coverage targets** (the FBW model is not "complete" until these all hold):

| Element category | Minimum count |
|------------------|---------------|
| `PartDefinition` | ≥ 50 |
| `PartUsage` | ≥ 100 |
| `PortDefinition` | ≥ 20 |
| `PortUsage` on parts | ≥ 80 |
| `InterfaceDefinition` | ≥ 8 |
| `ConnectionUsage` (in IBDs) | ≥ 60 |
| `ItemFlow` | ≥ 30 |
| `Requirement` | ≥ 60 |
| `ActionDefinition` / `ActionUsage` (across activities) | ≥ 40 |
| `StateDefinition` / `StateUsage` (across state machines) | ≥ 20 |
| `Transition` | ≥ 40 |
| `UseCase` | ≥ 15 |
| `Actor` | ≥ 6 |
| `ConstraintDefinition` / `ConstraintUsage` | ≥ 8 |
| `ValueProperty` | ≥ 30 |
| Distinct `BDD` diagrams | ≥ 6 |
| Distinct `IBD` diagrams | ≥ 5 |
| Distinct `Activity` diagrams | ≥ 4 |
| Distinct `State Machine` diagrams | ≥ 3 |
| `Use Case` diagrams | ≥ 2 |
| `Parametric` diagrams | ≥ 1 |
| `Package` diagrams | ≥ 2 |
| Requirements diagrams | ≥ 3 |
| `derive`/`satisfy`/`verify`/`refine` traceability edges | ≥ 100 |
| Cross-viewpoint references (same element appearing in ≥2 diagrams) | ≥ 30 |

**Starting decomposition skeleton.** The architect begins with the following top-level package structure (refining as walks proceed):

```
FBW Airliner FCS
├── 00 — Context
│   ├── Mission and stakeholders
│   ├── Operating environment
│   └── External actors (Pilot, Copilot, Maintenance, ATC, GroundCrew)
├── 22 — Auto Flight (ATA 22)
│   ├── Autopilot
│   ├── Autothrust
│   └── Flight Management
├── 27 — Flight Controls (ATA 27)
│   ├── PrimaryFlightControlComputers (PRIM 1..3)
│   ├── SecondaryFlightControlComputers (SEC 1..2)
│   ├── FlightControlDataConcentrators
│   ├── ElevatorChannel
│   ├── AileronChannel
│   ├── RudderChannel
│   ├── SpoilerChannel
│   ├── TrimmableHorizontalStabilizer
│   └── SlatsFlapsControl
├── 29 — Hydraulics (ATA 29)
│   ├── GreenSystem
│   ├── BlueSystem
│   └── YellowSystem
├── 31 — Indicating/Recording (ATA 31)
│   ├── PrimaryFlightDisplay
│   ├── ECAM
│   └── FlightWarningSystem
├── 34 — Navigation (ATA 34)
│   ├── AirDataReference (ADR 1..3)
│   ├── InertialReference (IR 1..3)
│   ├── AngleOfAttackSensors (AOA 1..3)
│   └── PitotStaticSystem
├── Behaviour
│   ├── Activities (NormalLawTransition, AutopilotEngage, SidestickPriority, AOAProtection)
│   ├── StateMachines (FlightControlLaw, AutopilotMode, HydraulicSystem)
│   └── UseCases (NormalApproach, EmergencyDescent, MaintenanceTest, etc.)
└── Requirements
    ├── Safety (DAL-A items)
    ├── Performance
    ├── Functional
    └── Operational
```

The architect refines this as walks reveal what the workbench can and cannot represent gracefully. The skeleton is not a script — it is a starting point.

**Behavioural scenarios** the activity and state-machine diagrams must cover (each = one diagram):

- **Activity: Normal-Law Transition** — pilot sidestick input → ADIRU/ADR feed → PRIM law selection → elevator actuator command → THS coordination → surface deflection → flight envelope feedback.
- **Activity: Autopilot Engage** — pilot AP engage button → PRIM/AP handshake → control law switch → autopilot mode annunciation.
- **Activity: Sidestick Priority Resolution** — both pilots input → priority logic → annunciation → command output.
- **Activity: AOA Protection Activation** — AOA sensor exceeds threshold → PRIM detects → alpha-prot triggers → elevator command modified → ECAM warning.
- **State Machine: FlightControlLaw** — Normal / Alternate / Direct / Mechanical Backup, with entry conditions, internal transitions for sub-modes (alpha-prot, alpha-floor), and history pseudostate for re-engage.
- **State Machine: AutopilotMode** — Off / Engaged / Approach / Land, with entry/exit actions and self-transitions for capture.
- **State Machine: HydraulicSystem** — Off / Pressurised / Low Pressure / Failed, per system (Green/Blue/Yellow), with cross-system fallback transitions.

**Parametric diagram** at minimum: control-surface deflection as a function of sidestick input, with constraint blocks for gain scheduling and stop limits.

**Use cases** must include `include`, `extend`, generalization between use cases, generalization between actors, and `<<system>>` boundary semantics.

### A.7 Issue filing standard

Every finding becomes a GitHub issue. Issues are the source of work for engineer batches.

**Title format.** `[<area>] <imperative short description>`, e.g. `[area:ports] Ports render as circles instead of squares on block edges`. The bracketed area label aids batch-grouping.

**Labels (mandatory).**
- `phase:15`
- One of `type:bug`, `type:feature`, `type:design`, `type:chore`.
- One of `p0`, `p1`, `p2`, `p3` (severity guide below).
- One or more `area:*` labels (the new area taxonomy in A.13).
- `status:ready` when filed.

**Severity guide.**
- `p0` — blocks an architect walk (cannot model a required element kind, application crashes, persistence loss).
- `p1` — degrades the rubric meaningfully (broken convention, missing standard relationship, severe UX deficiency).
- `p2` — visible defect not blocking modelling (cosmetic, minor convention drift, polish).
- `p3` — nice-to-have, will not block production-quality declaration.

**Body template.**

```markdown
## Context
<which walk, walk number, which viewpoint, which subsystem>

## Steps to reproduce
1. ...
2. ...

## Expected (per SysML convention / UX standard)
<what should happen, citing docs/architect/diagram-types/<type>.md or a primary source>

## Actual
<what happens, with screenshot at artifacts/phase-15/walk-<n>/<file>.png>

## Severity rationale
<why this is pX>

## Proposed resolution sketch (optional)
<one or two lines; the implementing engineer is free to disagree>

## Citation
<URL or doc reference for the convention being violated, if any>
```

**One issue per defect.** Compound findings ("ports look wrong and routing is bad") are split. The agent never files an issue containing the word "and" describing two distinct defects.

**Duplicate prevention.** Before filing, the agent searches open issues by area label (`gh issue list --label area:ports --state open --json number,title --jq '.'`) and updates an existing issue with new evidence rather than filing a duplicate.

**Closing condition.** Each issue's acceptance criteria are explicit and testable. An issue that cannot be acceptance-tested is rewritten until it can.

### A.8 PR batching protocol

Phase 15 PRs are *batched*: each PR closes multiple related issues. This is the only place Phase 15 departs from the existing `AGENT.md` rule of "one issue per PR" — and the departure is governed:

**Theme labels.** The agent groups open `status:ready` issues by `area:*` label into batches. A batch is a coherent unit of work — usually all issues sharing a single `area:*` label, or a small set of compatible `area:*` labels with overlapping touched files.

**Branch naming.** `phase-15/<theme>-<short-slug>`, e.g. `phase-15/visual-fidelity-card-token`, `phase-15/interaction-drag-coords`, `phase-15/usecase-relationships`.

**PR body.** Lists each closed issue with `Closes #N` — one line per issue. The body's `## Why` section explains the theme; `## How tested` lists the new tests per issue.

**Soft cap of 5 in-flight branches.** The agent may have at most five `phase-15/*` branches open with PRs unmerged at any time. Lower is fine; higher requires opening a `type:design` issue and resolving it via ADR. The cap exists to bound merge-conflict risk.

**The claim board.** `docs/architect/in-flight.md` is the live registry of in-flight branches. Each in-flight branch occupies one row:

```markdown
| Branch | Lead engineer (subagent) | Theme | Issues | Files touched (paths) | Started | Status |
|--------|-------------------------|-------|--------|----------------------|---------|--------|
```

Before dispatching a parallel subagent to open a new branch, the main agent reads the claim board and refuses to dispatch if the new branch's touched-files set overlaps with an open branch's. Overlapping work is queued.

**Parallel subagent dispatch.** When opening a new themed branch, the main agent dispatches a subagent (Sonnet by default; Opus for cross-cutting refactors per the existing model-effort rule) with a tightly scoped prompt: branch name, issues to close, files in scope, tests to write, visual baseline policy. The subagent works the branch to ready-to-merge state, then returns; the main agent reviews the diff via a pre-PR code-review subagent before opening the PR.

**Grouping heuristic (best-judgement, but written down).** When choosing the next batch, the agent applies in order:

1. **Foundational/schema work first.** Anything that other PRs would depend on (data model changes, registry changes, command-bus changes, viewpoint registration changes) is sequenced before features that consume it.
2. **Visual-fidelity batch next when high-value.** Fixes that unblock visual review of subsequent walks (e.g., a transparent-card fix that lets every diagram be screenshotted meaningfully) come before deeper features.
3. **Interaction & affordance batches.** Drag-from-palette consistency, drag coordinate display, resize handles, routing-style controls — these often share infrastructure and are grouped per shared infrastructure file.
4. **Per-viewpoint correctness batches.** Use-case relationship set, activity pin notation, state-machine pseudostate visuals, etc.
5. **Cross-cutting polish.** Search palette, keyboard shortcuts, accessibility, performance, empty-state copy.

When two candidate batches are tied in priority, the agent picks the one whose issues are best-defined (clearer acceptance criteria, smaller diff estimate) to maximise throughput.

**Conflict resolution.** Merge conflicts on `main` are resolved by rebasing the in-flight branch onto the updated `main`, not by merging. If the rebase requires a non-trivial code-level reconciliation, the subagent that owned the original branch resumes work — not a new dispatch — so the original intent is preserved.

**Release cadence.** Each time the rubric advances on at least one dimension by ≥1 point *and* at least 5 batches have merged since the last tag, the agent tags `vphase-15.N` (N starts at 1, increments per release) on `main`. These are intermediate Phase-15 release tags; they do not bump the `v1.X.Y` SemVer line. The release workflow handles deploy. The post-release smoke walk is a regression walk.

**SemVer tagging.** Independent of `vphase-15.N`, the agent bumps the `v1.X.Y` line when the released work warrants it: `v1.X+1.0` (minor) when a Phase-15 batch adds an outward-facing feature visible to a user loading the example (new viewpoint feature, new affordance, the "Load example" entry going live); `v1.X.Y+1` (patch) for releases that are purely bug fixes / visual polish. The agent does not bump `v2.0.0`; nothing in Phase 15 breaks the public model schema beyond what JSON migrations cover.

### A.9 Research protocol & knowledge management

The architect's authority rests on knowing the standards. Phase 15 builds the knowledge tree as it works.

**`docs/architect/` tree:**

```
docs/architect/
├── README.md                          — index, kept current
├── sysml-conventions.md               — SysML v2 visual & semantic conventions, with citations
├── visual-standards.md                — node geometry, port placement, line styles, color semantics
├── quality-rubric.md                  — the rubric of A.10, scores updated each walk
├── in-flight.md                       — claim board of in-flight branches
├── diagram-types/
│   ├── bdd.md
│   ├── ibd.md
│   ├── req.md
│   ├── act.md
│   ├── stm.md
│   ├── uc.md
│   ├── par.md
│   └── pkg.md
└── walks/
    └── walk-<n>.md                    — one per architect walk
```

**Before exercising a viewpoint in depth, the agent populates that viewpoint's `diagram-types/<type>.md`** by dispatching a research subagent (Sonnet, with `WebFetch` / `WebSearch`). The subagent answers, with citations:

- What is the OMG SysML v2 standard graphical notation for this diagram type? (Citation required.)
- What is the standard relationship set, and what is each relationship's visual representation?
- What are the standard node shapes, line styles, and decoration conventions?
- What are the common non-standard but widely-adopted conventions (e.g., from Cameo, Capella, NoMagic, MagicDraw)?
- What are the typical layout conventions (e.g., BDD top-down with composition arrows pointing to whole)?
- What are the common pitfalls and reader-expectation traps?

**Source priority** (research subagents follow this order):

1. **OMG SysML v2** specification documents (highest authority).
2. **OMG SysML 1.x** specification (for visual continuity where v2 leaves notation under-specified).
3. **OMG UML 2.x** for foundational notation (activity, state machine, use case).
4. **ISO/IEC/IEEE 42010** for architecture description conventions.
5. **INCOSE SE Handbook** for systems engineering modelling guidance.
6. **ARP 4754A** and **DO-178C** for FCS-domain context (when modelling FCS-specific constructs).
7. **Vendor documentation** (Cameo / MagicDraw / Capella / Eclipse Papyrus) for widely-adopted-but-non-standard conventions.

Every claim recorded in `docs/architect/` cites at least one source by URL or document name + section.

**Refinement cadence.** The agent re-reads the relevant `diagram-types/<type>.md` before each deep-dive walk on that viewpoint, and updates it with any newly-discovered conventions. The file is append-only with dated sections; older sections are not deleted, only marked superseded if needed.

### A.10 Production-quality rubric

Phase 15 ends only when every rubric dimension is scored **3** in `docs/architect/quality-rubric.md`, every `phase:15` issue is closed (excluding `status:needs-human`), three consecutive architect walks file no new issues, and the FBW example is committed and loadable.

**Scoring scale (uniform across dimensions):**

- **0 — Unmeasured.** No walk has informed this dimension yet.
- **1 — Broken.** Major defects; the dimension blocks an architect's normal flow.
- **2 — Acceptable.** No blocking defects; recognisable rough edges; a competent user can work around them.
- **3 — Production-quality.** No rough edges visible during a normal architect walk; conforms to documented SysML conventions; passes axe; baseline screenshots stable; performant.

**Dimensions:**

| # | Dimension | Score-3 description |
|---|-----------|---------------------|
| 1 | **Visual fidelity — node shapes** | Every node kind matches SysML/UML convention (use-case ellipses, actor stick figures, action rounded rectangles, state rounded rectangles, initial pseudostate filled disc, final bullseye, decision diamond, fork/join bar, block square corners, etc.). No transparent fills. No clipped labels. |
| 2 | **Visual fidelity — edges & routing** | Edge endpoints carry correct arrowheads/decorations per relationship type. Routing styles (orthogonal, straight, spline) selectable per diagram and per edge. Composition diamonds filled; aggregation diamonds open; generalization triangles. Item-flow arrows have flow direction notation. |
| 3 | **Visual fidelity — ports** | Ports render as small squares on block edges, positioned at user-set locations or sensible defaults. Conjugate ports indicated. Direction (in/out/inout) visible. |
| 4 | **Visual fidelity — colors & typography** | Color tokens consistent across diagrams. Text readable in light and dark theme. No accidental transparency. Selection state and hover state distinct. |
| 5 | **SysML conformance — BDD** | Composition, aggregation, generalization, association, dependency all supported with correct notation and semantics. Cardinality on associations. Block compartments (properties, operations, ports). |
| 6 | **SysML conformance — IBD** | Parts as nested blocks within an enclosing block context. Ports on parts, connected via `ConnectionUsage`. Item flows along connections. Proxy ports vs full ports distinguished where applicable. |
| 7 | **SysML conformance — Requirements** | Requirement nodes with ID, text, type. `derive`, `satisfy`, `verify`, `refine`, `containment` all supported. Requirement-to-element linking from any other viewpoint. |
| 8 | **SysML conformance — Activity** | Action nodes, control flow, object flow with pins, fork/join, decision/merge with guards, initial/final nodes, send/receive signal actions, swimlanes (partitions). |
| 9 | **SysML conformance — State machine** | States with entry/exit/do, internal transitions, transitions with triggers/guards/effects, initial/final/history pseudostates, junction/choice pseudostates, composite states. |
| 10 | **SysML conformance — Use case** | Use case ellipses, actor stick figures, association, `include`, `extend`, generalization between use cases, generalization between actors, system boundary rectangle with system name. |
| 11 | **SysML conformance — Parametric** | Constraint blocks with parameters, parameter bindings, value properties bound to parameters. |
| 12 | **SysML conformance — Package** | Package containment, namespace organisation, `import` directive visible, package merge if supported. |
| 13 | **Cross-diagram coherence** | Same element across viewpoints stays in sync. Cross-diagram navigation (right-click → show in X) works both directions. Renaming in one place reflects everywhere. Element registry integrity holds. |
| 14 | **Round-trip integrity** | Project → JSON → project is lossless. Project → SysML v2 text → project is structurally identical modulo IDs. The FBW model survives both. |
| 15 | **Palette & creation affordances** | Every element kind creatable from a palette. All palette items behave the same (all draggable to canvas — no click-only mix). Palette grouped by viewpoint applicability. Drag preview during drag. |
| 16 | **Direct-manipulation affordances** | Element resize handles on every shape kind. Element position visible during drag. Snap-to-grid optional. Alignment guides on drag. Rubber-band multi-select. Keyboard nudge with arrow keys. |
| 17 | **Edge editing affordances** | Reconnect either endpoint by drag. Add/remove waypoints. Change routing style per edge. Label drag/placement. Edge style selection (line type, color where semantically appropriate). |
| 18 | **Project tree / explorer** | Containment hierarchy reflects the metamodel. Representations nest under their owning element. Bidirectional selection sync with canvas. Context menu per node. Filter bar. Drag-drop move semantics for any container. |
| 19 | **Inspector** | Reflects current selection in the canvas. All editable properties present. Updates push to the command bus. Inline error feedback on invalid input. |
| 20 | **Search & navigation** | Cmd-K palette searches across all elements by name, ID, type. Recent-elements list. Jump-to-element from any context. |
| 21 | **Undo / redo** | Every command undoable. Redo restores exactly. Visible undo stack depth. Keyboard shortcuts. |
| 22 | **Import / export** | JSON import/export round-trips. SysML v2 text export pretty-printed. Import of a hand-authored SysML file works. PNG/SVG export per diagram. |
| 23 | **LLM integration** | Chat sidebar opens, streams, retains history. API key entry flow obvious. Tool dispatch with diff preview works for create/modify tools. No hallucinated SysML conventions in LLM output (validate against `docs/architect/sysml-conventions.md`). |
| 24 | **Empty states & error UX** | Every empty state is intentional. Error boundaries are explanatory. Loading states present where async happens. No raw stack traces. |
| 25 | **Accessibility** | Zero `serious`/`critical` axe violations on every screen. Keyboard-only operation possible for core flows. Focus visible. Screen-reader labels on icon buttons. |
| 26 | **Performance** | A 100-block diagram pans/zooms at 60fps. Initial load < 3s on Pages. Auto-layout converges within 1s on representative diagrams. |
| 27 | **Persistence** | Reload recovers session state. Multi-project switching preserves state. No data loss on browser refresh. |
| 28 | **Help / discoverability** | First-run guidance. Keyboard shortcuts discoverable. Empty-state action affordances. "Load example" entry visible (see A.11). |

The agent may **add** dimensions discovered during walks (with justification in `docs/architect/quality-rubric.md`). The agent may not **remove** dimensions without a `type:design` issue and ADR.

### A.11 The FBW example model deliverable

When the FBW model satisfies the coverage targets in A.6, the agent ships it as a checked-in example:

**Build & validate.** The architect completes the model in the running application. The agent verifies via UI:
- Every required element count from the A.6 table is met or exceeded.
- All eight viewpoints contain at least one populated diagram.
- The model passes round-trip via the application's own export → import flow (no command-bus shortcuts).
- The model loads cleanly on a freshly opened Pages tab.

**Export.** Using the application's export UI (Cmd-S / menu / button — whichever the application offers):
- `examples/flight-control-system/fbw-airliner.json` — workbench JSON.
- `examples/flight-control-system/fbw-airliner.sysml` — SysML v2 textual notation, pretty-printed.

**Commit.** Under `examples/flight-control-system/`:
- `README.md` — what the model is, which subsystems it covers, which viewpoints to look at first, how to load it.
- `screenshots/` — one PNG per diagram in the model, at high resolution.
- The JSON and SysML files above.
- `model-coverage.md` — a generated table showing actual counts against A.6 targets (verifying the deliverable meets the bar).

**Wire.** The empty-state screen and the file menu both gain a **"Load example: FBW Airliner FCS"** entry that imports the example JSON. This wiring is itself a Phase 15 feature; the issue and PR for it are part of the regular flow. The example is committed *before* the wiring PR; the wiring PR's tests assert the example loads and renders without console errors.

**Maintenance.** When a Phase 15 PR changes the JSON or SysML schema, the example is re-exported as part of that PR. The example file is therefore always loadable by the head of `main`. A CI check enforces this: a Playwright test loads the example and asserts the project tree shows the expected counts.

### A.12 Termination conditions for Phase 15

Phase 15 is **COMPLETE** when, simultaneously:

1. **Rubric saturation.** Every dimension in `docs/architect/quality-rubric.md` is scored **3**.
2. **Zero open work.** Zero open `phase:15` issues labelled `type:bug`, `type:feature`, or `type:design`, excluding any labelled `status:needs-human`.
3. **Convergence walks.** Three consecutive architect walks (any types) complete with no new issues filed and no rubric degradation.
4. **Example shipped.** `examples/flight-control-system/` is committed; the "Load example" entry works on the deployed Pages URL; the loaded example renders without console errors.
5. **Release tagged.** A final `v1.X.Y` tag is pushed reflecting the cumulative Phase 15 work (per the SemVer tagging rule in A.8), AND a final `vphase-15.N` tag is pushed marking the close of Phase 15.
6. **CI green.** The most recent five `main` builds are green; release workflow has deployed; Pages reachable HTTP 200.

When all six hold, the agent writes `PHASE 15 COMPLETE` as the final line of STATUS.md (replacing any prior `COMPLETE`), appends a JOURNAL entry (`event: complete`), and exits.

**Manual-intervention halt** during Phase 15:
- `status:needs-human` accumulates ≥3 issues AND no actionable `status:ready` work remains.

**Operator halt** during Phase 15 — unchanged from `AGENT.md`: `STOP` file or `status:emergency-stop` label, append a `halt` journal entry, exit.

**Soft churn ceiling.** If iter-count for Phase 15 exceeds **300 iterations** without termination, the agent opens a `p0`, `type:design` issue with the rubric snapshot and an analysis of *why convergence is not occurring*. New feature work halts until the design issue is resolved.

### A.13 Phase 15 label taxonomy additions

The bootstrap PR creates the following labels via `gh label create`:

- `phase:15` — Phase 15 marker.
- `area:visual-fidelity` — node shapes, edges, colors, typography.
- `area:routing` — edge routing styles, waypoints, edge labels.
- `area:ports` — port rendering, port connections, port semantics.
- `area:palette` — element palette, drag-from-palette, viewpoint applicability.
- `area:interaction` — drag, resize, multi-select, keyboard, snap, alignment.
- `area:viewpoint:bdd`, `area:viewpoint:ibd`, `area:viewpoint:req`, `area:viewpoint:act`, `area:viewpoint:stm`, `area:viewpoint:uc`, `area:viewpoint:par`, `area:viewpoint:pkg` — per-viewpoint correctness and conformance.
- `area:explorer` — project tree, containment, drag-move.
- `area:inspector` — inspector reflection, property editing.
- `area:search` — Cmd-K palette, jump-to.
- `area:undo` — undo/redo correctness.
- `area:import-export` — JSON / SysML text round-trip, PNG/SVG export.
- `area:llm` — chat, tool dispatch, diff preview.
- `area:empty-state` — first-run, help, error boundaries.
- `area:a11y` — accessibility.
- `area:perf` — performance.
- `area:persistence` — session state, multi-project.
- `area:cross-cutting` — anything that spans multiple areas.

Each `area:*` label has a colour matching its semantic category (visual = a warm tone, viewpoint = a cool tone, etc. — the bootstrap agent chooses, recording its mapping in `docs/architect/README.md`).

### A.14 JOURNAL entry triggers for Phase 15

In addition to the existing notable-moment list, Phase 15 adds:

- **Phase 15 begun** (`event: phase-completion`, title format "Phase 15 begun — architect-driven hardening").
- **First rubric dimension at 3** (`event: design-decision`, capturing the moment a dimension first hits production quality, with the walk number that informed it).
- **FBW example committed** (`event: release`, title format "FBW airliner example committed at <commit>").
- **Convergence-walk milestone** (`event: design-decision`, when three consecutive walks file no issues — the convergence trigger).
- **Phase 15 COMPLETE** (`event: complete`).

JOURNAL entries remain narrative — what was at stake, what happened, what was learned. Not a status dump.

### A.15 Phase 15 anti-patterns

- **Silent fixes during walks.** If during an architect walk the agent notices a defect, it files an issue and continues. It does not switch hats mid-walk.
- **Lowering rubric targets to terminate.** Every rubric change requires a `type:design` issue and ADR.
- **Building the FBW model via fixtures.** The model must be authored via UI.
- **Skipping round-trip verification.** Every JSON/SysML schema change re-exports the FBW example.
- **Visual baselines updated without justification.** The PR body must explain why a baseline changed (intent vs regression).
- **Exceeding 5 in-flight branches.** Soft cap; breaches require an ADR.
- **Overlapping branches.** Two open branches must not modify the same files. The claim board enforces this.
- **LLM hallucination of SysML conventions.** Conventions cited in code, tests, or documentation must trace to `docs/architect/`, which itself cites primary sources.
- **Re-reading the kickoff prompt every iteration.** Once the bootstrap PR lands, `AGENT.md` carries Phase 15 (Section A is verbatim inside it). This kickoff prompt under `docs/superpowers/specs/` is the historical record of how Phase 15 began; it is **explicitly excluded** from the Ralph-loop reading list (alongside other design specs per `AGENT.md`'s context-discipline rule). Iter-794+ reads `AGENT.md`, `STATUS.md`, `docs/CONTEXT.md`, `docs/adr/README.md`, and the relevant `docs/architect/*.md` files. The kickoff prompt is only re-read by a human auditing how the phase started.
- **Treating COMPLETE as immutable.** STATUS.md transitions from `COMPLETE` (v1.0.0 / vphase-14 end-state) to active Phase 15 work; this is explicit in the bootstrap PR.

### A.16 Risk register & mitigations

| Risk | Mitigation |
|------|------------|
| Infinite churn — agent keeps finding minor issues forever | Convergence requires *three consecutive walks with zero findings*. Soft iter ceiling at 300 triggers a design issue. |
| Cosmetic-only fixes — rubric scored 3 on visuals but app still unusable | Rubric explicitly includes interaction, behaviour, accessibility, performance, cross-diagram coherence; visual is only 4 of 28 dimensions. |
| LLM hallucination of "the SysML standard" | Research subagents required for first-time claims; citations mandatory; primary-source priority list. |
| Merge-conflict storms from parallel branches | Soft cap of 5; claim board with file-touched registry; rebase rather than merge; subagents that owned branches resume their own work. |
| Visual-baseline drift hiding regressions | Baselines updated only with justification paragraph; Phase 13 gate spec and Phase 14 round-trip spec must continue to pass. |
| Example model becomes stale with each schema change | CI test loads the example and asserts coverage counts; every schema-touching PR re-exports it. |
| Architect walks become rote and stop finding things | Three walk types (broad sweep / deep dive / regression) keep coverage broad and depth meaningful. Convergence is the explicit signal that walks have done their job. |
| Pages deploy lags fixes the architect needs | Architect may use `pnpm dev` with explicit commit-SHA tagging; findings re-verified on next deploy. |
| Agent prioritises throughput over rubric coverage | Termination requires rubric saturation; throughput alone does not terminate. |

### A.17 First action — bootstrap

On iter-793 (first invocation after the kickoff prompt is pasted into a fresh session):

1. Verify `gh auth status`, `git status` (clean), and Pages URL HTTP 200.
2. Confirm `STATUS.md` final line is `COMPLETE` (the iter-792 end-state); if it is not, the agent is on the wrong branch — abort and diagnose.
3. Create the bootstrap issue: title "[phase-15] Bootstrap Phase 15 constitution, knowledge tree, and labels". Labels: `phase:15`, `type:chore`, `p0`, `status:in-progress`.
4. Create branch `phase-15/bootstrap-architect-kickoff` from `main`.
5. Apply Section 0's five bootstrap actions in commits of the form described in A.4. The kickoff prompt itself lives at `docs/superpowers/specs/2026-05-16-phase-15-architect-kickoff.md`; the agent verifies it is committed (the human may have already added it; if so, skip that commit).
6. Open the bootstrap PR. Auto-merge with `--squash`.
7. After merge, append a JOURNAL entry: `## Iteration 793 — 2026-05-16 — Phase 15 begun`, `event: phase-completion`, narrative explaining the mission shift.
8. Iter-794 begins the first architect walk: a broad-sweep walk titled "Walk 1 — broad sweep: every viewpoint, empty-project baseline." That walk's `## Plan` is written before any browser is opened, per A.5.

Once iter-794 begins, normal Ralph-loop operation under the extended `AGENT.md` resumes. No further prompting from the operator is required.

---

## Section B — Appendix: initial seed of known gaps (operator-supplied + obvious-from-Phase-13)

The agent **does not** import this list as pre-filed issues. Instead, it confirms or refutes each via architect walks and files issues as they are observed. The seed exists so the agent's first walks know where to look.

**Operator-supplied (from the kickoff conversation, 2026-05-16):**

- Limited control over line routing styles.
- Ports not visualised as boxes on the edge of blocks.
- Use-case diagrams not supporting standard relationship types (`include`, `extend`, generalization, association with multiplicities).
- No ability to resize block elements.
- Inconsistent "add element" controls — some are click-buttons, some are drag-from-palette. They should all be draggable onto diagrams.
- Element positions not visible while dragging on the canvas.

**Likely (from Phase 13 history — see JOURNAL iter-528..530):**

- Project tree containment fidelity may have regressions across viewpoints added post-Phase-13.
- Use Case node shape may not be an SVG ellipse on every render path.
- Card-token visibility — known fixed in T-13.16 — should be regression-checked across new code added since.

**Almost certain (from the rubric, conventional MBSE-tool expectations):**

- Edge style customisation per edge (line type, color where semantic).
- Inline edit of element name everywhere — not just on initial create.
- Snap-to-grid / alignment guides during drag.
- Multi-select rubber band.
- Cross-viewpoint navigation in both directions (currently only one direction may be wired).
- Loading the example FBW model from an empty state (the feature does not exist yet).
- Recent-projects list.
- Search palette (Cmd-K) coverage across element kinds.

This list is **suggestive, not exhaustive**. The architect walks own discovery.

---

## Section C — Appendix: authoritative source list for SysML conventions

Research subagents start here, in order:

1. **OMG SysML v2 specification** — https://www.omg.org/spec/SysML/2.0/Beta2 (or current beta/release). Primary authority for the v2 textual and graphical notation.
2. **OMG SysML v1.6 specification** — https://www.omg.org/spec/SysML/1.6 — fallback for visual conventions that v2 leaves under-specified.
3. **OMG UML 2.5.1** — https://www.omg.org/spec/UML/2.5.1 — activity, state machine, use case foundational notation.
4. **ISO/IEC/IEEE 42010:2011** — Architecture description.
5. **INCOSE Systems Engineering Handbook** — Modelling guidance; viewpoint conventions.
6. **ARP 4754A** — Civil aircraft systems development; FCS context.
7. **DO-178C** — Software considerations in airborne systems; relevant to PRIM/SEC modelling fidelity.
8. **Vendor reference manuals** — Cameo Systems Modeler, MagicDraw, Capella, Eclipse Papyrus — for widely-adopted-but-non-standard conventions.

Every claim in `docs/architect/*.md` cites at least one of the above by document name and section, or a URL.

---

## Section D — Appendix: agent self-checks at the start of each iteration

Existing AGENT.md halt-check rules apply. Additionally, for Phase 15:

1. Is `docs/architect/in-flight.md` consistent with `gh pr list --state open --label phase:15`? If not, reconcile.
2. Is the most recent `vphase-15.N` Pages deploy live? If not, prioritise unblocking the release.
3. Are any of my in-flight branches stale (no commit in >5 iterations)? If so, decide: resume or abandon (with issue close note).
4. Does `docs/architect/quality-rubric.md` show any dimension still at 0 after iter-N where N > 20? If so, the next walk targets that dimension specifically.
5. Are there `phase:15` issues unassigned to any in-flight branch and older than 10 iterations? If so, batch them into the next engineer iteration.

---

## Section E — Closing note to the operator

Once you paste this document into a fresh session, the agent will:

1. Read `AGENT.md`.
2. Apply Section A as the Phase 15 constitution amendment to `AGENT.md`.
3. Scaffold `docs/architect/`.
4. Overwrite `STATUS.md`.
5. Append the first Phase 15 JOURNAL entry.
6. Begin iter-793 (bootstrap PR) → iter-794 (first architect walk) → … until termination per A.12.

You do not need to intervene. The existing halt-safety mechanisms (`STOP` file, `status:emergency-stop` label) remain. If the rubric stalls — a dimension stuck at 1 or 2 for many iterations — that surfaces as a `type:design` issue per A.12's soft churn ceiling, not as a silent failure.

The Pages URL is the live witness. Open it whenever you want to see where the architect is.

— end of kickoff prompt —
