# State Machine Diagram

## TBD — populated by a research subagent before the first State Machine deep-dive walk

Per A.9, this file answers (with citations from the source priority list in `../README.md`):

- OMG SysML v2 standard graphical notation for State Machine diagrams (rooted in UML 2.x).
- State node shape (rounded rectangle); entry/exit/do action compartments; internal transitions.
- Transitions with triggers, guards (in square brackets), and effects.
- Pseudostates: initial (filled disc), final (bullseye), history (H), deep history (H*), junction (filled disc), choice (diamond), entry/exit point, terminate (X).
- Composite states with regions; orthogonal regions separated by dashed line.
- Common non-standard but widely-adopted conventions (Cameo / Capella / MagicDraw / Papyrus).
- Common pitfalls and reader-expectation traps.

Append-only with dated sections; older sections are not deleted, only marked superseded.

## 2026-05-17 — Owner creation for Package-level "Create representation…" entries

### A. Ownership rule per SysML v2

- A **State Machine Diagram in SysML v2 renders a `StateDefinition`** (or `StateUsage`). `StateDefinition` specializes `ActionDefinition` in the standard library — it is a `Behavior` rooted in `OccurrenceDefinition`. ([Systems-Modeling/SysML-v2-Release `SysML.sysml`](https://github.com/Systems-Modeling/SysML-v2-Release/blob/master/sysml.library/Systems%20Library/SysML.sysml); [OMG SysML v2 spec, Part 2 §States](https://www.omg.org/spec/SysML/2.0/Beta1/Language/PDF))
- `StateDefinition`, as a `Definition`, is a `Member` of a `Namespace` and **may be owned directly by a `Package`**. ([OMG SysML v2 Part 2, §7.2 Namespaces / Packages](https://www.omg.org/spec/SysML/2.0/Beta1/Language/PDF))
- However, the State Transition View can also be rooted at a *containing structural element* — SysON 2024.9.0: *"Allow the creation of a `StateTransitionView` diagram on a `PartUsage`/`PartDefinition`"* and *"on a `StateUsage`/`StateDefinition`"*. So either a `StateDefinition` or a `PartDefinition` is a legitimate owner. ([SysON 2025.8 release notes](https://doc.mbse-syson.org/syson/v2025.8.0/user-manual/release-notes/release-notes.html))
- SysML 1.x: a `StateMachine` is a `Behavior` and is typically the *classifier behavior* of a `Block`. ([MagicDraw 2024x — State Machine](https://docs.nomagic.com/spaces/MD2024x/pages/136711317/State+Machine))

### B. Comparable-tool behaviour from a Package context

- **SysON:** allows creating a `StateTransitionView` from a `StateDefinition`/`StateUsage` **or** a `PartDefinition`/`PartUsage`. A Package is **not** in the supported owner list as of 2025.8. ([SysON 2025.8 release notes](https://doc.mbse-syson.org/syson/v2025.8.0/user-manual/release-notes/release-notes.html))
- **Cameo / MagicDraw:** state machine diagrams are created on a State Machine, Block, or Class via the Containment tree right-click; the *Extract State Machine Wizard* "allows you to define the element type, name, and the owner." ([MagicDraw 2021x — Extract State Machine Wizard](https://docs.nomagic.com/spaces/MD2021x/pages/64977025/Extract+State+Machine+Wizard))
- **Eclipse Papyrus (UML/SysML 1.x):** "right click on the owning class and select New Diagram > Create a new UML StateMachine Diagram." Owner must be a `Class`/`Block`, not a `Package`. ([Papyrus SysML book](http://jmbruel.github.io/sysmlpapyrusbook/PapyrusSysMLinAction.pdf))

### C. Implicit-owner-creation precedent

- Cameo's documented auto-context rule applies generically to "an element which cannot be the context of this diagram (e.g. Package)" → "the new context element … is created automatically." Documented for **IBD and Parametric**; the same Project Option (`Diagram Context`) governs the wider class of context-bearing diagrams in the plugin. ([Cameo SysML Plugin 2024x — Parametric Diagram context](https://docs.nomagic.com/spaces/SYSMLP2024xR2/pages/189146962/SysML+Parametric+Diagram+context))
- SysON does **not** auto-create a `StateDefinition` when invoked from a Package — the Package is simply not an offered context. ([SysON 2025.8 release notes](https://doc.mbse-syson.org/syson/v2025.8.0/user-manual/release-notes/release-notes.html))

### D. Naming convention for auto-created owners

- Cameo: *"The newly created diagram is automatically named after the owner"* — auto-created classifiers receive the bare metaclass name (e.g. `StateMachine`, `Block`), indexed if duplicate. ([MagicDraw 2024x — Creating diagrams](https://docs.nomagic.com/spaces/MD2024x/pages/136710445/Creating+diagrams))
- SysML v2 textual notation pattern is `state def <Name>` (PascalCase noun, no leading "New"). ([Intro to the SysML v2 Language — Textual Notation, §State Definitions](https://raw.githubusercontent.com/Systems-Modeling/SysML-v2-Release/master/doc/Intro%20to%20the%20SysML%20v2%20Language-Textual%20Notation.pdf))

### E. Recommendation for our workbench

**Option (a) — auto-create a `StateDefinition` named `"State Definition"` under the Package and own the State Machine Diagram with it** — consistent with Cameo's "context-element-created-automatically" rule and with SysON's permitted owners (which include `StateDefinition` but not `Package`). ([Cameo auto-context rule](https://docs.nomagic.com/spaces/SYSMLP2024xR2/pages/189146962/SysML+Parametric+Diagram+context); [SysON owner list](https://doc.mbse-syson.org/syson/v2025.8.0/user-manual/release-notes/release-notes.html))
