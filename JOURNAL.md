# MBSE Workbench — Demo Journal

An append-only narrative record of building the MBSE Workbench through a
fully autonomous, GitHub-native Ralph loop. The endeavour's purpose is to
demonstrate how powerful a single well-crafted one-shot prompt can be when
paired with an agentic development process. This journal is the raw material
for a future presentation about that demonstration.

The prologue below is human-authored, written before the agent begins.
Everything after is written by the agent at notable moments (phase
completions, design decisions, escalations, recoveries, releases, and the
final `COMPLETE`). The format is defined in `AGENT.md`.

---

## Prologue — 2026-05-11 — The prompt is written

**Event:** project-inception

**Author:** Michael Fazio (human)

**Narrative:**

The premise was to build a non-trivial engineering tool — a browser-based
MBSE workbench backed by SysMLv2 semantics — from a single one-shot prompt,
with the agent operating its own GitHub repo, CI pipeline, issue board,
releases, and Pages deployment. Zero human intervention after bootstrap.
The bar: at the end, the only thing a human did was paste the prompt.

We spent a session refining the prompt itself, since prompt quality is the
single biggest determinant of whether a long-horizon Ralph loop converges or
thrashes. The shape we landed on:

- A typed JSON SysMLv2 metamodel mirroring the official metamodel (not a
  textual-notation parser, not a stripped-down subset) so the demo is
  credibly "real SysMLv2" without taking on a parser project.
- All major SysMLv2 viewpoints: BDD, IBD, Requirements, Activity, State
  Machine, Use Case, Parametric, Package — eight in total. Ambitious for a
  one-shot, mitigated by a vertical-slice approach: Phase 2 builds BDD
  end-to-end (canvas, palette, inspector, tests, persistence) as the
  template; phases 3–9 each add one viewpoint reusing that slice.
- LLM integration as a chat sidebar with model-aware tool use and a
  diff-preview gate before any mutation. The LLM helps build the system;
  it doesn't autonomously rewrite it.
- Persistence and collaboration both **designed-in but deferred** — the
  repository and command bus are shaped so a real backend or a CRDT
  transport can drop in later with zero UI changes. Designing for the
  full topology from day one is what makes the demo a credible tool, not
  a toy.
- A 13-phase plan with explicit CI gates per phase. The agent cannot
  advance until the current phase's tests are green. This is the gradient
  the Ralph loop climbs.

Then we escalated. The agent should run a full DevOps lifecycle, not just
a code loop. GitHub Issues become the canonical task list (the agent
queries open issues live each iteration). GitHub Actions runs CI on every
PR. Auto-merge fires on green — no human reviews are required, but
branch protection ensures the quality bar holds. Each phase completion
tags a release and deploys to GitHub Pages, so a live URL grows alongside
the demo. The agent self-files bug issues from CI failures, opens
`type:design` issues when it hits an architectural fork, opens release
issues at phase boundaries, and escalates to `status:needs-human` only
after three consecutive failed attempts on the same issue.

We added one more layer at the end: this journal. The agent's `STATUS.md`
is its working memory — overwritten each iteration — but a presentation
needs a story arc, not a snapshot. So the agent will append narrative
entries to this file at notable moments only. The journal, combined with
GitHub stats queried at the end (issue counts, PR counts, commit counts,
CI runtime, lines changed) and screenshots of the live Pages deploy at
each release tag, gives us the slide-deck raw material.

The prompt itself sits in `docs/superpowers/specs/2026-05-11-mbse-demo-design.md`
and will be committed to the repo as `AGENT.md` on iteration 1 so the
agent's own constitution is part of the build's history.

The moment that makes this convincing: tabbing through GitHub during the
run and watching the agent's issue board, PR queue, CI runs, releases,
and live app advance under its own power. If it works, it will not feel
like a tool being built — it will feel like a team being watched.

**Links:**
- Design doc: `docs/superpowers/specs/2026-05-11-mbse-demo-design.md`
- The prompt: same file, embedded fenced block titled "The one-shot prompt"
- Session transcript that produced the prompt:
  `docs/superpowers/specs/2026-05-11-session-transcript.md`
- Runner script: `run-agent.sh`
- Status convention: `STATUS.md` (created in Phase 0 by the agent)
- This journal: `JOURNAL.md`

---

## Iteration 1 — 2026-05-11 — First commit, project online

**Event:** first-commit

**Phase:** phase:0 — Bootstrap

**Narrative:** I started from a directory containing only the prompt and the
human-authored prologue, and ended the iteration with a live GitHub repo,
green CI, branch protection, GitHub Pages enabled, all 13 phase epics filed,
and an app shell that renders "MBSE Workbench". The deliberate choice was to
do the bootstrap as a single big commit on `main` rather than open a PR
against an empty repo with no CI yet — the spec recognises iteration 1 as
the only iteration where direct-on-main scaffolding is correct, because
branch protection and the `check` status both have to *exist* before any
later PR can ride them. I skipped the interactive `pnpm create vite` and
`shadcn init` scaffolders entirely and wrote the config files directly,
which is what the AGENT.md "stack landmines" section explicitly warns is
the safer path. The one surprise was Playwright's `webServer` health check
timing out against `127.0.0.1:5173` while Vite happily bound `localhost` —
swapping the base URL to `localhost` resolved it locally and on CI. CI took
1m22s end-to-end (typecheck + lint + unit + build + Playwright on Chromium
and WebKit including an axe accessibility scan), which is a good sign for
how fast the inner loop will feel during the phases ahead.

**Links:**
- Repo: https://github.com/michaeljfazio/mbse-workbench
- Bootstrap commit: 13fdf00
- CI run: https://github.com/michaeljfazio/mbse-workbench/actions/runs/25668487160
- Phase 0 epic: https://github.com/michaeljfazio/mbse-workbench/issues/1
- All 13 phase epics: https://github.com/michaeljfazio/mbse-workbench/issues?q=is%3Aissue+label%3Aepic
- Future live deploy: https://michaeljfazio.github.io/mbse-workbench/ (lands on `vphase-0`)

---
