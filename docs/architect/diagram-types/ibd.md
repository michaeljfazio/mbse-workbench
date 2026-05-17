# IBD — Internal Block Diagram

## TBD — populated by a research subagent before the first IBD deep-dive walk

Per A.9, this file answers (with citations from the source priority list in `../README.md`):

- OMG SysML v2 standard graphical notation for IBD.
- Parts as nested blocks within an enclosing block context.
- Port rendering (squares on block edges), placement conventions, conjugate ports, direction (in/out/inout).
- `ConnectionUsage` rendering between ports; item-flow notation along connections.
- Proxy ports vs full ports — when each is appropriate, how each is visually distinguished.
- Common non-standard but widely-adopted conventions (Cameo / Capella / MagicDraw / Papyrus).
- Common pitfalls and reader-expectation traps.

Append-only with dated sections; older sections are not deleted, only marked superseded.

## 2026-05-17 — Owner creation for Package-level "Create representation…" entries

### A. Ownership rule per SysML v2

- An **Internal Block Diagram** (SysML 1.x term) renders the internal structure of a `Block`; in SysML v2 the analogous view is the **Interconnection View** rendering a `PartDefinition` or `PartUsage`. ([sysml.org FAQ — IBD: "owned by a particular Block"](https://sysml.org/sysml-faq/what-is-internal-block-diagram.html); [SysON — Interconnection view](https://doc.mbse-syson.org/syson/main/user-manual/features/interconnection-view.html))
- `PartDefinition` specializes `ItemDefinition` (a `Definition`) and may be owned by a `Package`. ([Systems-Modeling/SysML-v2-Release `SysML.sysml`](https://github.com/Systems-Modeling/SysML-v2-Release/blob/master/sysml.library/Systems%20Library/SysML.sysml); [OMG SysML v2 spec Part 2 §Parts](https://www.omg.org/spec/SysML/2.0/Beta1/Language/PDF))
- SysON: *"User can create Interconnection view on any **Usage or Definition** element."* — i.e. on a `PartDefinition` or `PartUsage`; **also** allowed on a `Package` since 2025.12 (*"In the Explorer view, allow the creation of `InterconnectionView` diagrams from Packages elements."*). ([SysON Interconnection view](https://doc.mbse-syson.org/syson/main/user-manual/features/interconnection-view.html); [SysON 2025.12 release notes](https://blog.obeosoft.com/prepare-christmas-with-syson-2025-12))
- The diagram **frame** in UML 2.x carries the owning element's kind+name as its heading. ([uml-diagrams.org — frame notation](https://www.uml-diagrams.org/frame.html))

### B. Comparable-tool behaviour from a Package context

- **Cameo / MagicDraw:** documented verbatim — *"When creating a new SysML Internal Block diagram for an element which cannot be the context of this diagram (such as a Package), the new context element (which is a **Block**) is created automatically."* The Block-context behavior is controlled by `Project > Options > Diagram Context`. ([Cameo SysML Plugin — Internal Block Diagram context, mirrored at Parametric Diagram context](https://docs.nomagic.com/spaces/SYSMLP2024xR2/pages/189146962/SysML+Parametric+Diagram+context))
- **SysON:** Package-rooted Interconnection View added in 2025.12; the Package itself is exposed as the diagram root (no `PartDefinition` auto-created). ([SysON 2025.12 release notes](https://blog.obeosoft.com/prepare-christmas-with-syson-2025-12))
- **Eclipse Papyrus (SysML 1.x):** owner must be a Block; "right-click on the model element that should be the owner of the diagram and select New Diagram." No auto-Block-creation. ([Papyrus Starter Guide](https://wiki.eclipse.org/Papyrus_Starter_Guide))
- **Capella:** PAB/PCD diagrams are rooted on a PhysicalArchitecture / PhysicalComponent; package-level creation is not a Capella idiom — diagrams are associated with model elements, with an optional `Package` *property* used only to organize them in the Project Explorer. ([Capella diagram concepts](https://github.com/eclipse-capella/capella/blob/master/doc/plugins/org.polarsys.capella.ui.doc/html/05.%20Diagram%20Management/5.1.%20Diagram%20concepts.mediawiki))

### C. Implicit-owner-creation precedent

- **Yes — Cameo / MagicDraw is the canonical precedent**: auto-creates a Block when the user invokes IBD from a Package or other non-context element. The behavior is toggled per project; when off, a *Select Diagram Context* dialog appears with three options (select existing / create new in creation mode / cancel). ([Cameo Plugin 2024x R2 — Parametric/IBD context](https://docs.nomagic.com/spaces/SYSMLP2024xR2/pages/189146962/SysML+Parametric+Diagram+context))
- **SysON's path** is different: rather than auto-creating a `PartDefinition`, SysON treats the Package itself as the diagram's root namespace and wraps the rendering in a `ViewUsage` typed by `InterconnectionView`. ([SysON 2025.6 — ViewUsage support](https://blog.obeosoft.com/syson-2025-6))

### D. Naming convention for auto-created owners

- Cameo: bare metaclass name — `Block`, `Block1`, `Block2`, … "The newly created diagram is automatically named after the owner." ([MagicDraw 2024x — Creating diagrams](https://docs.nomagic.com/spaces/MD2024x/pages/136710445/Creating+diagrams))
- SysML v2 textual convention: `part def <Name>` — PascalCase noun, no leading `"New"`. ([Intro to the SysML v2 Language — Textual Notation](https://raw.githubusercontent.com/Systems-Modeling/SysML-v2-Release/master/doc/Intro%20to%20the%20SysML%20v2%20Language-Textual%20Notation.pdf))

### E. Recommendation for our workbench

**Option (a) — auto-create a `PartDefinition` named `"Part Definition"` under the Package and own the IBD with it** — exactly aligned with the long-standing Cameo / MagicDraw precedent of auto-creating a `Block` context for an IBD invoked from a Package, and consistent with SysML v2's `PartDefinition` ownership rule. ([Cameo SysML Plugin — IBD/Parametric auto-context rule](https://docs.nomagic.com/spaces/SYSMLP2024xR2/pages/189146962/SysML+Parametric+Diagram+context); [sysml.org FAQ — IBD owned by a Block](https://sysml.org/sysml-faq/what-is-internal-block-diagram.html))
