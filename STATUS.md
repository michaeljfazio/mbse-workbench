# STATUS

## Current phase
phase:9 — Package Diagram. Children: #154 (closed), #155 (PR #163 open, fix pushed), #156 (PackageImport edge + cross-package import), #157 (move-between-packages compound).

## Current iteration
- Iteration #: 79
- Started: 2026-05-13
- Branch: issue/155-package-node-palette-inspector → PR #163.
- Working on: Cleared PR #163's `DIRTY/CONFLICTING` mergeStateStatus by merging `origin/main` into the branch and taking main's STATUS.md verbatim (main carried iter-77 + iter-78 STATUS commits #164/#165 that landed via the status PRs while #163 was idle waiting on its first CI cycle). Auto-merge --squash is still armed; merging main in (rather than rebasing locally then force-pushing) honors the AGENT.md hard-constraint ban on `--force` to push, per the iter-46 lesson on `mergeStateStatus: BEHIND/DIRTY` recovery. The merge commit is the only new content this iteration — every functional/baseline file on the branch is unchanged. CI will now re-run against the merged tip; iter-80 will diagnose whatever remains red (expected: package-one baselines green after fix-1, plus shared-tree-chrome baseline drift across context-menu / ibd-parts / ibd-connection per iter-78 — those baselines were already CI-extracted on cc31135 and bf61668, so the extractions may now be self-sufficient).

## Last test run
- Command: `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm build` (local, on fix branch)
- Result: PASS — 575 unit tests / 53 files; tsc clean; eslint 0 errors (4 pre-existing react-refresh warnings); vite build 599 kB.
- One unit test required adjustment in lock-step with fix-1: `tests/unit/viewpoints/package.test.ts:18` asserted the wide `acceptedElementKinds`. Updated to assert `['Package']` only.

## Known issues / blockers
- PR #163 CI re-run pending after the merge-main commit. Expected outcome: package-one baselines green (extracted at cc31135 + bf61668 from run 25758491542), shared-tree-chrome baseline drift on context-menu / ibd-parts / ibd-connection still TBD if it persists past the merge.

## Decisions log
- 2026-05-11: Bootstrap as a single committed scaffold, not iterative through child PRs. Reason: AGENT.md Phase 0 explicitly lists scaffold steps as the bootstrap and instructs iteration 1 to "run Phase 0 bootstrap" when STATUS.md is missing; opening child issues against an empty repo with no CI yet would be the wrong order. Child issues for any *remaining* Phase 0 polish are opened after the initial commit.
- 2026-05-11: Pinned minor versions per AGENT.md "Version pinning" rule. React 18.3.x, Vite 5.4.x, Tailwind 3.4.x, @xyflow/react 12.3.x, Vitest 2.1.x, Playwright 1.48.x, Anthropic SDK 0.32.x, ESLint 8.57.x. Tailwind 3 (not 4) avoids the PostCSS landmine.
- 2026-05-11: `pnpm run check` composes typecheck + lint + unit + build + e2e in that order; the Playwright suite is the single source of truth for functional, visual (`@visual`-tagged) and accessibility (`@a11y`-tagged) specs across `chromium` and `webkit` projects.
- 2026-05-11: Repo name fixed to `mbse-workbench`; Pages base path `/mbse-workbench/` in production via `vite.config.ts`.
- 2026-05-11: Allow `vphase-*` and `v*.*.*` tags to deploy to the `github-pages` environment via environment deployment-branch-policies (type: tag).
- 2026-05-11: Phase 1 decomposed into 5 child issues (#17–#21); JIT decomposition per AGENT.md Ralph loop step 6.
- 2026-05-11: Metamodel split — 19 element kinds in `ModelElement`; 9 structural relationships in `ModelEdge`. `ConnectionUsage` / `ItemFlow` / `Transition` are elements (named, selectable) with `sourceId`/`targetId` (ADR 0002).
- 2026-05-11: Registry `update<K>` replaces stored element with new object rather than in-place mutation, preserving snapshot stability for undo/redo.
- 2026-05-11: Command bus shape — `Command` is a discriminated union (`create-element` / `update-element` / `delete-element` / `link` / `unlink` / `compound`). ModelEvent payload = inverse command. Extended 2026-05-12 by #72 with `update-edge` for edge-label round-trips.
- 2026-05-11: Repository is a thin async port — one key per project at `mbse:v1:project:<id>`, `ProjectNotFoundError` covers missing-key and malformed-JSON, `StorageQuotaError` wraps `QuotaExceededError`.
- 2026-05-11: Collab module split per responsibility (`user` / `presence` / `provider` / `permissions`). Permissions throw *before* publish so providers only see committed events.
- 2026-05-11: Phase 1 closed and vphase-1 tagged at c1214db.
- 2026-05-11: Phase 2 decomposed into 7 child issues (#30–#36).
- 2026-05-11: `@xyflow/react` v12.3.x research recorded in `docs/CONTEXT.md` ahead of Phase 2.
- 2026-05-11: Visual snapshot baselines pinned to **Linux** renderer. Generation via `mcr.microsoft.com/playwright:v1.48.2-jammy` + `vite preview` (procedure in `docs/CONTEXT.md`).
- 2026-05-11: Custom nodes must NEVER import `@/workspace/store` at module load — callbacks pass through ReactFlow node `data`.
- 2026-05-11: **Position-as-command-bus** (#34) — `update-diagram-position` is a first-class `Command`.
- 2026-05-12: **Phase 2 closed, vphase-2 tagged at 0f93af0.**
- 2026-05-12: **Phase 3 closed, vphase-3 tagged at f14d6a1.**
- 2026-05-12: **Phase 4 closed, vphase-4 tagged at 4b69312.**
- 2026-05-12: **Phase 5 closed, vphase-5 tagged at ea62765.**
- 2026-05-12: **Phase 6 closed, vphase-6 tagged at 845918d.**
- 2026-05-12: **Phase 7 closed, vphase-7 tagged.**
- 2026-05-12: Iter-37 / iter-53 generalised lesson: viewpoint palette declarations live in shared project-tree chrome; any new palette item may stale baselines across ALL viewpoints, not just the one being changed.
- 2026-05-12: Iter-61: keep new tree-group `kindLabel`s single-word so existing tree tests (Home/End regex) stay green; ValueProperty kindLabel singular "Value".
- 2026-05-12: Iter-62 baseline-refresh: new-baseline failures do NOT write `trace.zip` — decode `window.playwrightReportBase64` and scan per-project report JSONs to map sha1→browser.
- 2026-05-13: Iter-63 ParameterBinding edge — `<marker>` defs with `<circle>` glyph for filled binding dot; `linkParameterBinding(connection)` canonicalises by flipping the Connection.
- 2026-05-13: Iter-65 ValueProperty default-name capitalisation lesson — default name is lowercase `value1` while kindLabel is "Value". Grep `name${n}` / `name\${` in `store.ts` rather than infer from chip labels.
- 2026-05-13: Iter-73 STATUS-stacking lesson: stacking one STATUS commit per idle iteration cascades CI cancellations on the status PR. Hold STATUS commits until CI lands or a real signal arrives.
- 2026-05-13: **Iteration 74 — Phase 8 closed, vphase-8 tagged at e5ef448.** Release workflow 25750784828 queued. Stale PR #148 (5-deep STATUS stack) closed as superseded. Live deploy on workflow green demonstrates six viewpoints.
- 2026-05-13: **Iteration 75 — #154 Package viewpoint registered + ADR 0009 published.** PR #159 opened (auto-merge --squash). Eighth viewpoint slot wired into the registry alongside Parametric.
- 2026-05-13: **Iteration 76 — #159 auto-merged green; #155 surface survey recorded.** Implementation landmarks digest produced by Explore subagent for iter-77 pickup (no re-survey needed).
- 2026-05-13: **Iteration 77 — #155 PR #163 opened** with full slice (PackageNode, palette, cascading default name, store actions, canvas-drop wiring, PackageExtras inspector, unit tests, @visual seeded spec).
- 2026-05-13: **Iteration 78 — TWO real bugs uncovered in #163's first CI red, both fixed in 14ef1b3.**
  - **`acceptedElementKinds` overreach landmine.** A viewpoint's `acceptedElementKinds` doubles as the *render set* (CanvasPane filters by it then calls `nodeTypeFor`, which throws for unsupported kinds). It is NOT a drop-affordance list. Future viewpoints with palettes broader than their renderers must keep these two concerns separate — list only renderable kinds in `acceptedElementKinds`, track drop-only kinds in a viewpoint-private constant. ADR 0009 § 1's "accepts the Package element plus every member kind" was the trap.
  - **Roving-tabindex without DOM-focus sync.** ProjectTree's `explicitFocusKey` was only written by `focusItem()` — not by native focus events. Any caller that bypasses React (test `el.focus()`, real Tab from outside the tree) puts DOM and state out of sync, and ArrowDown navigates from the stale state anchor. The fix is a 1-line `onFocus={() => syncFocus(key)}` on every focusable treeitem. Apply this pattern to any new roving-tabindex widget. Sympathetic with iter-37/iter-53 generalised lesson: shared chrome changes (new tree groups) move `visibleKeys[0]`, which is the *implicit* focus default, surfacing latent focus-sync gaps.

- 2026-05-13: **Iteration 79 — PR #163 `DIRTY` → cleared by merging `origin/main` into the feature branch.** Iter-77 + iter-78 STATUS PRs (#164/#165) had landed on main while #163 was idle, conflicting on STATUS.md. Took main's STATUS verbatim (theirs), appended this iter-79 entry, merged forward (no rebase, no `--force`). Per iter-46: clearing `BEHIND`/`DIRTY` on a feature branch under the no-`--force` constraint = merge main IN (or `gh pr update-branch`), not rebase-then-force. The 5 functional commits on the branch (cbef574 + 14ef1b3 + ff7f0ce + bf61668 + cc31135) are unchanged.

## Next action
Await PR #163's next CI cycle (triggered by the merge commit). Expected outcomes: (a) `package-empty.spec.ts` 4 failures → green (cc31135 + bf61668 added the chromium + webkit baselines after fix-1 produced real screenshots); (b) `project-tree.spec.ts` arrow-keys → passes outright (fix-2 in 14ef1b3); (c) `context-menu.spec.ts` / `ibd-parts.spec.ts` / `ibd-connection.spec.ts` baseline drift remains uncertain — if red, run the iter-62 sha1→browser extract on the new run and push the resulting `*-actual.png` payloads. On green, auto-merge --squash lands #155. After #155 closes, JIT-decompose what remains of phase 9 — #156 (PackageImport edge + cross-package drop semantics; this is the slot where `PACKAGE_MEMBER_ELEMENT_KINDS` finally pays off) and #157 (move-between-packages compound command per ADR 0009 § 4). Periodic health check due at iter-80 (next iteration).
