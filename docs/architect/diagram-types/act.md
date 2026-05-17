# Activity Diagram

## TBD — populated by a research subagent before the first Activity deep-dive walk

Per A.9, this file answers (with citations from the source priority list in `../README.md`):

- OMG SysML v2 standard graphical notation for Activity diagrams (rooted in UML 2.x).
- Action node shapes (rounded rectangles); control flow vs object flow notation; pin notation on actions for object flow.
- Fork/join bars; decision/merge diamonds with guard expressions; initial node (filled disc) and final nodes (bullseye for activity-final, X for flow-final).
- Send/receive signal action shapes.
- Swimlanes (partitions) for actor/responsibility assignment.
- Common non-standard but widely-adopted conventions (Cameo / Capella / MagicDraw / Papyrus).
- Common pitfalls and reader-expectation traps.

Append-only with dated sections; older sections are not deleted, only marked superseded.

## 2026-05-17 — Owner creation for Package-level "Create representation…" entries

### A. Ownership rule per SysML v2

- An **Activity Diagram in SysML v2 renders an `ActionDefinition`** (or `ActionUsage`). In the v1→v2 mapping, `action def` corresponds to v1 `Activity`; `action` corresponds to v1 `Action`. ([DoD SysML v2 Transition TR, Mar 2024, Table mapping](https://www.cto.mil/wp-content/uploads/2025/02/SysML-v2-TransitionApproach-1.3.pdf))
- `ActionDefinition` specializes `Behavior, OccurrenceDefinition` (KerML/SysML library) and is itself a `Member` of a `Namespace`; a `Package` is a `Namespace`, so an `ActionDefinition` **may be owned directly by a Package**. ([Systems-Modeling/SysML-v2-Release `SysML.sysml`](https://github.com/Systems-Modeling/SysML-v2-Release/blob/master/sysml.library/Systems%20Library/SysML.sysml); [OMG SysML v2 spec, Part 2 §Namespace, Package](https://www.omg.org/spec/SysML/2.0/Beta1/Language/PDF))
- SysML v2 itself does not yet normatively standardize a single "Activity Diagram" notation — the Action Flow View is the closest published view definition. ([SysON Action Flow View docs](https://doc.mbse-syson.org/syson/v2025.2.0/user-manual/features/action-flow-view.html); [PTC: SysML v2 graphical syntax is being added later](https://support.ptc.com/help/modeler/r10.1/en/Modeler/sysml2/overview_of_sysml2.html))
- SysML 1.x: an Activity diagram's frame heading is the owning `Activity` (a `Behavior`); a `Package` may own `Activity` directly per UML 2.x. ([sysml.org FAQ — Activity diagram](https://sysml.org/sysml-faq/what-is-activity-diagram.html); [uml-diagrams.org frame notation](https://www.uml-diagrams.org/frame.html))

### B. Comparable-tool behaviour from a Package context

- **SysON (Eclipse, SysML v2):** since release 2024.9.0 — "Allow to create an **Action Flow View** diagram on an ActionDefinition or ActionUsage **in addition to Package**" (the Package case auto-exposes the package contents; an explicit owner is not auto-created — the `ViewUsage` itself becomes the owner). ([SysON 2025.8 release notes](https://doc.mbse-syson.org/syson/v2025.8.0/user-manual/release-notes/release-notes.html))
- **Cameo / MagicDraw (SysML 1.x):** the diagram is created from the Containment-tree right-click; "The newly created diagram is automatically named after the owner." For Behavior diagrams the rule mirrors the IBD/Parametric rule (see C). ([MagicDraw 2024x — Creating diagrams](https://docs.nomagic.com/spaces/MD2024x/pages/136710445/Creating+diagrams); [MagicDraw 2024x — Working with Activity diagram](https://docs.nomagic.com/spaces/MD2024x/pages/136709798/Working+with+Activity+diagram))
- **Eclipse Papyrus (UML/SysML 1.x):** "right-click on the model element that should be the **owner** of the diagram and select New Diagram." Owner is mandatory; a Package may own a UML Activity. ([Papyrus Starter Guide](https://wiki.eclipse.org/Papyrus_Starter_Guide))

### C. Implicit-owner-creation precedent

- **Cameo IBD/Parametric rule (applies by analogy to Activity in the same plugin family):** *"When creating a new SysML Internal Block Diagram for an element which cannot be the context of this diagram (e.g. Package), the new context element (which is a Block) is created automatically."* This auto-creation is a project-level option (`Project Options > Diagram Context = Do Not Create` disables it and pops a `Select Diagram Context` dialog instead). ([Cameo SysML Plugin 2024x — Parametric Diagram context](https://docs.nomagic.com/spaces/SYSMLP2024xR2/pages/189146962/SysML+Parametric+Diagram+context))
- **SysON:** does not auto-create an `ActionDefinition` for an Action Flow View on a Package — the Package itself is the exposed root; the diagram is rendered as the contents of an auto-created `ViewUsage : ActionFlowView`. ([SysON release notes 2024.9.0 / 2025.6.0](https://doc.mbse-syson.org/syson/v2025.8.0/user-manual/release-notes/release-notes.html))

### D. Naming convention for auto-created owners

- Cameo: *"The newly created diagram is automatically named after the owner."* (auto-created Block / Activity inherits the default unnamed-classifier name e.g. `Activity` / `Block`, indexed). ([MagicDraw 2024x — Creating diagrams](https://docs.nomagic.com/spaces/MD2024x/pages/136710445/Creating+diagrams))
- SysML v2 (SysON ViewUsage path): default ViewUsage name follows the view definition (`"General View"`, `"Action Flow View"`); no separate ActionDefinition is created — no naming question arises. ([SysON 2025.6 — ViewUsage typed by default with General View](https://blog.obeosoft.com/syson-2025-6))

### E. Recommendation for our workbench

**Option (a) — auto-create an `ActionDefinition` named `"Action Definition"` (or `"Activity"` matching the SysML 1.x convention) under the Package and own the Activity Diagram with it** — matches the long-standing Cameo/MagicDraw precedent for diagrams whose context element cannot be the Package itself, and stays compatible with SysML v2 where `ActionDefinition` is the formal owner of action-flow content. ([Cameo IBD/Parametric auto-context rule](https://docs.nomagic.com/spaces/SYSMLP2024xR2/pages/189146962/SysML+Parametric+Diagram+context))
