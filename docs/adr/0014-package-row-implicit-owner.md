# ADR 0014 — Package row menu: implicit-owner creation for non-Package diagrams

Status: accepted (issue #411, iter-806)
Context: Phase 15 — Architect-driven UX & feature hardening (closes the design half of #368 / #369 / #370 / #371)

## Decision

The project-tree row menu's `Create representation…` submenu, **when invoked on a `Package`**, gains four new entries that today only exist on the relevant Definition row:

| Label                                  | Implicit owner created | Diagram viewpoint   |
|----------------------------------------|------------------------|---------------------|
| `Activity (creates Action Definition)` | `ActionDefinition`     | activity            |
| `State Machine (creates State Definition)` | `StateDefinition`  | stateMachine        |
| `IBD (creates Part Definition)`        | `PartDefinition`       | ibd                 |
| `Parametric…`                          | *prompted, see below* | parametric          |

For Activity / State Machine / IBD the click triggers a chained dispatch: the workbench creates a new owning Definition under the Package with a default name (`"Action Definition"`, `"State Definition"`, `"Part Definition"`, indexed if a collision occurs), then creates the diagram with the new Definition as its context, then selects the new Definition and switches to the new diagram tab. The label discloses the implicit creation so the architect is never surprised by an extra tree node.

For Parametric the click opens a small popover with two choices — `"Owned by a new Part Definition"` (current `acceptedContextKinds`) or `"Owned by a new Constraint Definition"` (deferred follow-up; the workbench's Parametric viewpoint accepts `partDefinition` today only, so the second choice is grey-disabled with a `(coming in #NNN)` annotation until the viewpoint config widens). The chosen kind is created, then the diagram, then tab switch.

The existing per-Definition row-menu entries (`PartDefinition → IBD/Parametric`, `ActionDefinition → Activity`, `StateDefinition → State Machine`) stay in place unchanged — they are the metamodel-correct path that an architect who already has a Definition uses. The new Package entries are the shortcut for the "I'm at the project root and want a diagram" case.

## Why option (a) for three of the four, and (b) for Parametric

Recorded in detail in the design issue (#411) and `docs/architect/diagram-types/{act,stm,par,ibd}.md` 2026-05-17 sections. Briefly:

- The SysML v2 spec (OMG Beta1) permits `ActionDefinition` / `StateDefinition` / `PartDefinition` / `ConstraintDefinition` to be owned directly by any `Namespace`, so the Package is a legal owner of the implicit Definition — no metamodel violation.
- SysML v2 itself is graphically under-specified (only the SysON tool publishes operational view definitions, and SysON uses a different `ViewUsage` indirection that this workbench does not implement).
- The Cameo / MagicDraw SysML 1.x convention — *"the new context element (which is a Block) is created automatically"* when a diagram is opened on an element that cannot be its context — is the industry MBSE practice this workbench is benchmarked against. We adopt it for the three diagrams whose owner kind is unambiguous (Activity → ActionDefinition; State Machine → StateDefinition; IBD → PartDefinition).
- For Parametric, Cameo's silent auto-`Block` default is widely cited as a usability pitfall when the user actually wanted a `ConstraintBlock`. The `PartDefinition` vs `ConstraintDefinition` choice is semantically loaded, so we ask once via a popover. This costs one click on the common case but removes the surprise on the uncommon case.

The decision contrasts deliberately with **Eclipse Papyrus**, which mandates that the user pick the owner first ("right-click on the model element that should be the owner of the diagram"). Papyrus's stance is metamodel-pure but discoverability-poor; we side with Cameo's pragmatism for the three unambiguous cases.

## Implementation contract

The implementation PR adds these and only these surfaces:

1. `RepresentationOption` in `src/workspace/tree/representationAcceptance.ts` gains an optional `implicitOwnerKind?: ElementKind`. When set, the row-menu handler creates an element of that kind under the row's owner BEFORE creating the diagram, and uses the new element as the diagram's context.
2. `PACKAGE_REPRESENTATIONS` table gains the four new entries above (Parametric carries `implicitOwnerKind: undefined` and an `implicitOwnerPromptKinds: ['PartDefinition']` for the popover; the second-kind expansion is a follow-up).
3. The row-menu click handler in `src/workspace/tree/ContainmentTree.tsx` (currently calls `createRepresentation(ownerId, option)`) is extended: if `option.implicitOwnerKind` is set, dispatch a `create-element` for the implicit owner under the row's ownerId, then dispatch the existing representation-creation pipeline with the new owner's id as the parent. Both dispatches join into one undoable compound command so a Cmd-Z undoes both.
4. The Parametric prompt is a new component `src/workspace/tree/CreateParametricOwnerPopover.tsx` mirroring the existing `PartTypePopover` shape (popover anchored to the cursor, single button per option, Escape closes).
5. e2e tests cover all four flows (auto-creation × 3 + prompt × 1). The auto-creation flow tests verify the count update in the tree (Action Definitions: 0 → 1, Activity Diagrams: 0 → 1 in a single click) and that Cmd-Z reverses both creations atomically.
6. Closes #368, #369, #370, #371.

## What this ADR does NOT decide

- **Visual prominence.** Where to place the new entries inside the `Create representation…` submenu (above or below the four Package-owned entries; with or without a separator). Implementation defaults to below-with-separator; cosmetic regressions can be filed against the implementation PR.
- **First-run empty-state guidance.** Rubric dim 28 (Help / discoverability) advance requires empty-state hints too — those are a separate batch.
- **`ConstraintDefinition` ownership of Parametric.** Widening `parametric.acceptedContextKinds` to include `constraintDefinition` is a follow-up — it requires lifting the Parametric viewpoint's existing single-owner-kind assumption in the inspector, drop handler, and layout engine. The Parametric prompt's second option is grey-disabled until that lands.

## References

- Issue #411 — design issue this ADR resolves.
- `docs/architect/diagram-types/act.md` — Activity ownership rule + Cameo precedent (2026-05-17 section).
- `docs/architect/diagram-types/stm.md` — State Machine ownership rule (2026-05-17 section).
- `docs/architect/diagram-types/par.md` — Parametric owner-kind ambiguity (2026-05-17 section).
- `docs/architect/diagram-types/ibd.md` — IBD auto-context rule + Cameo precedent (2026-05-17 section).
- `src/workspace/tree/representationAcceptance.ts` — current table.
- `docs/architect/quality-rubric.md` rows 67-70 — iter-797 walk-1 errata that re-scoped #368-371 from p0 to p2 once the per-Definition row-menu entries were verified.
