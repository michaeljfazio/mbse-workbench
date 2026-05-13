# STATUS

## Current phase
phase:11 — LLM integration (epic #12). Slices A/B/C/D merged. Slice E
(#221) PR #228 in flight on branch `issue/221-mutating-tools-diff-preview`.
Mid-PR: auto-merge armed (SQUASH); iter 404 push fixed two real CI type
errors. Remaining after E: slice F gate (#222).

## Current iteration
- Iteration #: 409
- Started: 2026-05-13T19:15Z
- Branch: issue/221-mutating-tools-diff-preview
- Working on: #221 slice E — idle-wait on CI run 25793603113
  (commit 9f48706, in_progress as of 10:32Z). Auto-merge armed
  (SQUASH). PR mergeable, BLOCKED on check. No action this iteration.

## Last test run
- `pnpm exec tsc -b` (full project-refs build, same as CI's `pnpm
  build`) → clean.
- `pnpm exec vitest run tests/unit/llm/tools/{create-element,
  suggest-missing-elements, generate-requirements-from-text}.test.ts`
  → 34/34 pass.

## What changed this iteration (commits 88a4965 + e1a9e4d)
- Investigated CI run 25793102745 on commit 4cc78f9 (slice E initial
  push). It failed `pnpm build` with 10 TS errors that local
  `tsc --noEmit` had NOT caught.
- Root cause #1: `LLMToolDefinition.input_schema` interface did not
  declare `additionalProperties?: boolean`, but every mutating tool
  sets `additionalProperties: false` at the top level of the schema.
  Fix: widened the interface in `src/llm/types.ts`.
- Root cause #2: `UpdateElementCommand` defaults `K = ElementKind`
  (full union). `Partial<Omit<ElementOfKind<ElementKind>, …>>`
  distributes to common-keys only, so `memberIds` (Package-only)
  isn't assignable. Fix: typed the Package member-list updates as
  `UpdateElementCommand<'Package'>` in `create-element.ts`,
  `generate-requirements-from-text.ts`, and
  `suggest-missing-elements.ts`. Two tests assert the patch via a
  `Partial<PackageElement>` cast.
- Recorded the `tsc -b` vs `tsc --noEmit` divergence in
  `docs/CONTEXT.md` so future iterations stop trusting `--noEmit`
  alone.

## What changed prior iterations (commit 7dba072)
- iter-400: chat-proposal-accept e2e (Accept/Reject/@a11y/@visual)
  for #221 slice E. Fixture `create-element-accept-round-trip.json`.

## Known issues / blockers
- #161 — p2 inspector-transition flake. Deferred.
- Pre-existing `text-muted-foreground` contrast violation on inactive
  sidebar tab button — deferred from slice C.
- Slice E remaining work: wait for new CI run on commit e1a9e4d
  (auto-merge will fire on green). Then extract Linux
  `proposal-card-pending.png` baseline from CI playwright-report and
  decide whether a follow-up commit is needed. Branch is 14 commits
  ahead of main.

## Decisions log
- 2026-05-13 (iter-404): Fix `memberIds` typing by binding the command
  to `UpdateElementCommand<'Package'>` rather than casting the patch.
  Reason: keeps the type narrative at the command boundary (where the
  Package-ness is known) rather than at every push site. Reusable for
  any future kind-specific patches.
- 2026-05-13 (iter-404): Widened `input_schema` to allow
  `additionalProperties?: boolean` rather than removing the flag from
  call sites. Reason: `additionalProperties: false` is the strict-
  schema discipline the LLM dispatcher relies on for argument
  validation; deleting it would silently weaken every mutating tool's
  contract.
- 2026-05-13 (iter-400): Accept-path e2e asserts the new "Pump" leaf
  appears in `project-tree` (not the BDD canvas).
- 2026-05-13 (iter-400): Reject-path e2e asserts dispatcher resumes
  but no `Pump` leaf is created.
- 2026-05-13 (iter-400): `@visual` baseline scoped to the
  `proposal-card` locator.
- 2026-05-13 (iter-399): `suggest_missing_elements` heuristic = parts
  with no incoming RequirementTrace of any kind.
- 2026-05-13 (iter-399): Throws if no candidates rather than empty
  ProposedChange.
- 2026-05-13 (iter-399): Placeholder Requirement text is generic.
- 2026-05-13 (iter-399): Default maxSuggestions = 5, hard max = 20.
- 2026-05-13 (iter-398): `propose_decomposition` rejects child names
  that collide under the same parent only (case-insensitive).
- 2026-05-13 (iter-398): One ProposedChange containing 2N commands.
- 2026-05-13 (iter-398): Decomposition creates BDD-level Composition
  edges, not PartUsages.
- 2026-05-13 (iter-397): `generate_requirements_from_text` returns ONE
  ProposedChange with N create-element commands.
- 2026-05-13 (iter-397): Parsing is server-side.
- 2026-05-13 (iter-397): Minimum line length is 3 chars after bullet
  stripping.
- 2026-05-13 (iter-396): `link_requirement` rejects exact-duplicate
  traces but allows a different kind between the same pair.
- 2026-05-13 (iter-396): Requirement is `sourceId`; element is
  `targetId`.
- 2026-05-13 (iter-395): `ProposalCard` shows command kinds as bullets.
- 2026-05-13 (iter-395): Accept/Reject disabled on click.
- 2026-05-13 (iter-394): Resolvers in a module-level Map.
- 2026-05-13 (iter-394): `acceptProposal` dispatches `compound`.
- 2026-05-13 (iter-355): main may advance faster than CI; rebase as
  needed.
- 2026-05-13 (iter-332): `@visual` baselines from CI: extract Linux
  PNGs from playwright-report base64 blob and commit.

## Next action
1. Wait for CI run on commit e1a9e4d. If green and auto-merge fires,
   inspect the run for the `@visual` first-run baseline behaviour and
   decide whether a follow-up commit is needed to ship the Linux PNG.
2. If CI red on the visual spec only (no baseline yet), extract the
   chromium + webkit `proposal-card-pending.png` from the
   playwright-report base64 blob and commit them.
3. After #228 merges, move to slice F (#222) — phase 11 gate.
