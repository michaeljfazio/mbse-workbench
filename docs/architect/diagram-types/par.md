# Parametric Diagram

## TBD — populated by a research subagent before the first Parametric deep-dive walk

Per A.9, this file answers (with citations from the source priority list in `../README.md`):

- OMG SysML v2 standard graphical notation for Parametric diagrams.
- Constraint block shape; parameter pins/ports on constraint block.
- Value property to parameter binding notation.
- Equation/expression display conventions inside constraint blocks.
- Common non-standard but widely-adopted conventions (Cameo / Capella / MagicDraw / Papyrus).
- Common pitfalls and reader-expectation traps.

Append-only with dated sections; older sections are not deleted, only marked superseded.

## 2026-05-17 — Owner creation for Package-level "Create representation…" entries

### A. Ownership rule per SysML v2

- In SysML 1.x, a Parametric Diagram is "a specialization of an Internal Block Diagram (IBD) that enforces mathematical rules (Constraints) defined by Constraint Blocks." It may be **owned by a Block** (binding constraint parameters to value properties) **or by a ConstraintBlock** (showing the constraint's internal parameter structure). ([sysml.org FAQ — Parametric diagram](https://sysml.org/sysml-faq/what-is-parametric-diagram.html))
- SysML v2 **does not define a separate Parametric diagram**. The constraint surface is folded into Interconnection View: *"SysML v2 swaps parametric diagrams for Interconnection View diagrams in managing block input parameters."* ([SysON Parametric modeling and constraints docs](https://doc.mbse-syson.org/syson/v2024.7.0/user-manual/features/parametric-modeling.html))
- `ConstraintDefinition` specializes `OccurrenceDefinition, Predicate` and `PartDefinition` specializes `ItemDefinition`; both are `Definition` elements and may be owned by a `Package`. ([Systems-Modeling/SysML-v2-Release `SysML.sysml`](https://github.com/Systems-Modeling/SysML-v2-Release/blob/master/sysml.library/Systems%20Library/SysML.sysml))
- Net: per SysML v2 spec, **the formal owner is the `PartDefinition` whose value bindings are being constrained** — the `ConstraintDefinition` provides the rule, but the parametric view itself is hosted by the part that contains the binding usages. ([sysml.org FAQ — Parametric diagram](https://sysml.org/sysml-faq/what-is-parametric-diagram.html); [SysON Interconnection view](https://doc.mbse-syson.org/syson/main/user-manual/features/interconnection-view.html))

### B. Comparable-tool behaviour from a Package context

- **Cameo / MagicDraw:** *"When creating a new SysML Parametric Diagram for an element which cannot be the context of this diagram (e.g. Package), the new context element (which is a **Block**) is created automatically."* — i.e. a `Block`, **not** a `ConstraintBlock`. ([Cameo SysML Plugin 2024x — Parametric Diagram context](https://docs.nomagic.com/spaces/SYSMLP2024xR2/pages/189146962/SysML+Parametric+Diagram+context))
- **SysON:** no dedicated Parametric View exists — users create an Interconnection View on a `PartDefinition`/`PartUsage`. Package-rooted Interconnection View was added in 2025.12 but does not auto-create a PartDefinition. ([SysON 2025.12 release notes](https://blog.obeosoft.com/prepare-christmas-with-syson-2025-12); [SysON Interconnection view](https://doc.mbse-syson.org/syson/main/user-manual/features/interconnection-view.html))
- **Eclipse Papyrus (SysML 1.x):** owner-selection is mandatory via New Diagram on the owning Block or ConstraintBlock. ([Papyrus Starter Guide](https://wiki.eclipse.org/Papyrus_Starter_Guide))

### C. Implicit-owner-creation precedent

- **Yes — Cameo, since at least SysML Plugin 19.0 LTR.** The "Diagram Context" project option toggles between auto-create-Block and "Select Diagram Context" dialog (lets user pick existing, create-new with named type, or cancel). The auto-created element is **always a Block** even when the user might prefer a ConstraintBlock. ([Cameo SysML Plugin 2024x — Parametric Diagram context](https://docs.nomagic.com/spaces/SYSMLP2024xR2/pages/189146962/SysML+Parametric+Diagram+context))
- **Cameo also has the Parametric Equation Wizard**, which "parses the equation and creates a Constraint Block with named Constraint Parameters" — implicit `ConstraintBlock` creation specifically when starting from an equation expression. ([Cameo SysML Plugin 19.0 LTR — Parametric Equation Wizard](https://docs.nomagic.com/spaces/SYSMLP190/pages/30375207/Parametric+Equation+Wizard))

### D. Naming convention for auto-created owners

- Cameo auto-creates an unnamed `Block`; default name is the bare metaclass `Block` (or `Block1`, `Block2`, …). ([MagicDraw 2024x — Creating diagrams](https://docs.nomagic.com/spaces/MD2024x/pages/136710445/Creating+diagrams))
- Spec-style v2 names: `part def <Name>` and `constraint def <Name>` — PascalCase noun, no `New` prefix. ([Intro to the SysML v2 Language — Textual Notation](https://raw.githubusercontent.com/Systems-Modeling/SysML-v2-Release/master/doc/Intro%20to%20the%20SysML%20v2%20Language-Textual%20Notation.pdf))

### E. Recommendation for our workbench

**Option (b) — prompt the user to pick or create a `PartDefinition` (default) or `ConstraintDefinition` (alternative)**, because the ownership choice carries real semantic meaning in SysML v2 (Part hosts the binding; Constraint hosts the rule) and the long-standing Cameo behavior of silently auto-creating a `Block` is widely cited as a usability foot-gun. ([sysml.org FAQ — Parametric diagram, two-owner pattern](https://sysml.org/sysml-faq/what-is-parametric-diagram.html); [Cameo's two-element ambiguity documented](https://docs.nomagic.com/spaces/SYSMLP2024xR2/pages/189146962/SysML+Parametric+Diagram+context))
