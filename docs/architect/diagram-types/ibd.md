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

---

## 2026-05-19 — Deep-dive conventions (walk-27 prereq)

Primary sources consulted: OMG SysML v2.0 formal spec (`formal/2026-03-02`, Part 1: Language Specification; cited as **SysML v2 §X**), and OMG SysML 1.5 spec (`formal/2017-05-01`; cited as **SysML 1.5 §X**).

### A. Port rendering

**Shape and placement**

- Both SysML 1.x and v2 define a port as a **small rectangle (square) overlapping the boundary** of its owning block or part node. The spec text: *"Ports are notated by rectangles overlapping the boundary of their owning blocks or properties (parts or ports) typed by the owning block."* ([SysML 1.5 §9.3.1.6 Port](https://www.omg.org/spec/SysML/1.5/PDF))
- In SysML v2 the grammar uses `port-l`, `port-r`, `port-t`, `port-b` productions — i.e. Left / Right / Top / Bottom positions on the containing part node's edge. Placement is therefore **anywhere on the four edges** of the containing node; the spec does not snap ports to compass midpoints or corners. ([SysML v2 §8.2.3.12 Ports Graphical Notation](https://www.omg.org/spec/SysML/2.0/))
- SysML v2 spec also states: *"Definition and usage nodes can include symbols on the boundary of the node to represent ports and parameters."* ([SysML v2 §7.26.5, p. 154](https://www.omg.org/spec/SysML/2.0/)) — no size prescription is given; conventional practice in tools (Cameo, SysON) renders them as ~10-12 px squares.
- Ports on nested parts (proxy mode) use a **dotted outline** rectangle per SysML v2 §8.2.3.12: *"Dotted line port productions (references) are only possible for nested ports."* The proxy-v / proxy-h alternatives in the grammar produce a smaller proxy symbol attached to the part boundary. ([SysML v2 §8.2.3.12](https://www.omg.org/spec/SysML/2.0/))

**Direction visualisation (in / out / inout)**

- SysML 1.5: *"Ports with types that have flow properties all in the same direction, either all in or all out, can have an arrow inside them indicating the direction … The arrows are perpendicular to the boundary lines they overlap."* For `inout` or mixed-direction ports: *"two open arrow heads inside them facing away from each other `<>`."* ([SysML 1.5 §9.3.1.6](https://www.omg.org/spec/SysML/1.5/PDF))
- SysML v2 replaces flow-property direction with **feature direction keywords** (`in`, `out`, `inout`) declared inside a port definition's `directed features` compartment. The graphical grammar's `pdh` / `pdv` symbols (horizontal / vertical port-direction indicators) encode direction into the port shape itself, with the arrow perpendicular to the edge. ([SysML v2 §8.2.3.12](https://www.omg.org/spec/SysML/2.0/))
- Ports appearing in **compartments** (not as boundary symbols) can carry a textual `in`, `out`, or `inout` prefix before the port name — same information, alternative rendering. ([SysML 1.5 §9.3.1.6](https://www.omg.org/spec/SysML/1.5/PDF); [SysML v2 §7.26.5](https://www.omg.org/spec/SysML/2.0/))
- Cameo/MagicDraw: direction arrows on proxy and flow ports are **shown by default**; full ports hide the direction arrow by default (configurable via Symbol Properties → "Show Port Direction"). ([Cameo SysML Plugin 2024x R2 — Hiding direction arrow on port shape](https://docs.nomagic.com/display/SYSMLP2024xR2/Hiding+direction+arrow+on+port+shape))

**Conjugate-port notation**

- SysML 1.5: conjugate ports are shown by **reversing** the direction arrow inside the port rectangle. In compartment notation the `~` prefix appears before the type name, e.g. `p2 : ~T2`. ([SysML 1.5 §9.2.2, Table 9.2 — Conjugated Ports](https://www.omg.org/spec/SysML/1.5/PDF))
- SysML v2: a conjugated port usage is declared `port p : ~P;` — the `~` character is prepended to the port definition name. The spec states: *"the name of the conjugated port definition is always given by the name of the original port definition with the character ~ prepended."* In graphical notation, the `~` appears in the port label inside the boundary symbol, e.g. `drivePort : ~DrivePort`. ([SysML v2 §7.12.3 Conjugated Port Definitions and Usages](https://www.omg.org/spec/SysML/2.0/); [SysML v2 Graphical Notation intro — Module 5, p. 14](https://raw.githubusercontent.com/Systems-Modeling/SysML-v2-Release/master/doc/Intro%20to%20the%20SysML%20v2%20Language-Graphical%20Notation.pdf))
- **v1 vs v2 difference:** SysML 1.5 showed conjugation visually via a reversed direction arrow; SysML v2 makes it explicit textually with `~` in the label. Workbench convention: **use the `~TypeName` label form** (v2 style), as it is unambiguous even when the direction arrow is suppressed.

---

### B. `ConnectionUsage` rendering

**Line style and endpoints**

- SysML 1.5 Table 8.4 "Graphical paths defined in Internal Block diagrams" shows `BidirectionalConnector` as a **plain solid line with no arrowheads** at either end; `UnidirectionalConnector` adds an **open arrowhead** at the target end. ([SysML 1.5 §8.2.2 / Table 8.4](https://www.omg.org/spec/SysML/1.5/PDF))
- SysML v2 Table 11 "Connections — Representative Notation": a plain `connection` is drawn as a **solid line with no terminal arrowheads** between the two connected nodes (or ports). The `Connection (with direction indication)` variant adds an **open arrowhead** at one end to indicate source→target. ([SysML v2 §7.13 / Table 11](https://www.omg.org/spec/SysML/2.0/))
- The `connection-graphical` grammar production shows optional `rolename`, `multiplicity`, and `c-adornment` fields at each end. The adornment `a-direction` (`in` | `out` | `inout`) governs whether an arrowhead decoration appears. No arrowhead is the default for undirected connections. ([SysML v2 §8.2.3.13](https://www.omg.org/spec/SysML/2.0/))
- A **`BindingConnection`** (`=` symbol) is a distinct form: a solid line with an `=` sign mid-edge, no arrowhead, asserting the two ends are always equal. ([SysML 1.5 Table 8.4](https://www.omg.org/spec/SysML/1.5/PDF); [SysML v2 §7.13 / Table 11](https://www.omg.org/spec/SysML/2.0/))

**Label placement**

- The `connection-label` production is `UsageDeclaration` (i.e. `name : Type` or just `: Type`) placed **mid-edge**, optionally with `«connection»` keyword prefix. If the connection is anonymous with a known type, only `: TypeName` appears. ([SysML v2 §8.2.3.13](https://www.omg.org/spec/SysML/2.0/))
- End labels (rolename + multiplicity) sit **near the respective endpoint**, consistent with UML association-end notation. Default multiplicity on each connector end in SysML 1.5 is `1..1` (may be omitted). ([SysML 1.5 §8.3.1.2.9](https://www.omg.org/spec/SysML/1.5/PDF))

**v1 vs v2 difference:** SysML 1.5 distinguishes `BidirectionalConnector` vs `UnidirectionalConnector` as two concrete notations; SysML v2 unifies them into `connection-graphical` with an optional direction adornment. The solid-line-no-arrowhead baseline is the same in both versions.

---

### C. `ItemFlow` / `FlowConnectionUsage` notation

**SysML 1.5 item flow**

- *"The notation of an item flow is a **black arrowhead** on the connector or association. The arrowhead is towards the target element."* ([SysML 1.5 §9.3.1.5 ItemFlow](https://www.omg.org/spec/SysML/1.5/PDF)) — the arrowhead is a **filled (solid) triangle**, not open.
- Label format: *"For an item flow with an item property, the label shows the name and type of the item property (in `name: type` format). Otherwise the item flow is labeled with the name of the classifier of the conveyed items."* ([SysML 1.5 §9.3.1.5](https://www.omg.org/spec/SysML/1.5/PDF))
- Multiple item flows in the same direction: *"only one triangle is shown, and the list of item flows, separated by a comma is presented."* ([SysML 1.5 §9.3.1.5](https://www.omg.org/spec/SysML/1.5/PDF))
- The arrowhead rides **on the connector line** itself (not a separate parallel edge). ([SysML 1.5 Table 9.2 — ItemFlow concrete syntax](https://www.omg.org/spec/SysML/1.5/PDF))

**SysML v2 flow on connection**

- The v2 equivalent is `flow-on-connection` in the interconnection view: a flow node (small labeled arrow) decorates an existing connection edge between two port-nodes. Grammar: `flow-on-connection = &port-node flow-node* &port-node`. ([SysML v2 §8.2.3.16 Flows Graphical Notation](https://www.omg.org/spec/SysML/2.0/))
- The spec's Annex A example states: *"This flow can be shown as a **solid arrowhead** on the connection between the ports."* ([SysML v2 Annex A §A.5 Parts Interconnection, p. 642](https://www.omg.org/spec/SysML/2.0/))
- `flow-node-r` / `flow-node-l` productions show a small `«flow»` optional keyword plus `flow-label` (= `Identification | FlowPayloadFeatureMember`). The label format is `name of ItemType` or `name : ItemType`. ([SysML v2 §8.2.3.16](https://www.omg.org/spec/SysML/2.0/))
- A standalone `flow` edge (not on a connection) uses `«flow»? flow-label —▶ flow-end-node`; the arrowhead is an **open (hollow) arrowhead** in the graphical grammar context distinct from the solid-triangle-on-connector form. ([SysML v2 §8.2.3.16](https://www.omg.org/spec/SysML/2.0/))

**Nested / decomposed flows**

- Flow decomposition into sub-flows is shown by elaborating the flow node with nested flow-edges attached via dashed lines, per SysML v2 §7.26.5: *"An edge in a graphical view can be attached via a dashed line to a node that elaborates the features of the edge."* ([SysML v2 §7.26.5](https://www.omg.org/spec/SysML/2.0/))

**v1 vs v2 difference:** SysML 1.5 uses `ItemFlow` stereotype with a filled-triangle arrowhead directly on the connector. SysML v2 uses `FlowConnectionUsage` rendered as a `flow-node` (small labeled directional annotation) on a `connection` edge, or as an independent `flow` edge with an open arrowhead. Workbench convention: **render flows as `flow-node` decorations on connection edges** (IBD-style) rather than as independent flow edges, consistent with the interconnection-view idiom.

---

### D. Proxy port vs. full port

**Definitions and semantics**

- **Proxy port** — *"Proxy ports identify features of the owning block or its internal parts that are available to external blocks through external connectors to the ports. They do not specify a separate element of the system."* Proxy ports must be typed by `InterfaceBlock`; their nested ports must also be proxy ports. ([SysML 1.5 §9.3.2.12 ProxyPort](https://www.omg.org/spec/SysML/1.5/PDF))
- **Full port** — *"a port which is considered as a separate element of owning Blocks. It may have internal parts or behaviors that support interactions with owning Blocks."* Full ports can hold their own internal structure. ([Cameo SysML Plugin — Full Port](https://docs.nomagic.com/display/SYSMLP2024xR2/Full+Port); [SysML 1.5 §9.3.1.3 FullPort](https://www.omg.org/spec/SysML/1.5/PDF))

**Visual distinction**

- SysML 1.5 notation (Table 9.2): both proxy port and full port are rendered as **small squares on the block boundary**, but are differentiated by a **keyword inside or near the symbol**: `«proxy»` for proxy ports and `«full»` for full ports. ([SysML 1.5 Table 9.2 — ProxyPort / FullPort](https://www.omg.org/spec/SysML/1.5/PDF))
- In compartment notation: proxy ports appear in a compartment labeled `proxy ports`; full ports appear in a compartment labeled `full ports`. ([SysML 1.5 §9.3.1.3, §9.3.1.7](https://www.omg.org/spec/SysML/1.5/PDF))
- The direction arrow is **shown by default on proxy ports** and **hidden by default on full ports** in Cameo/MagicDraw. ([Cameo SysML Plugin 2024x R2 — Hiding direction arrow on port shape](https://docs.nomagic.com/display/SYSMLP2024xR2/Hiding+direction+arrow+on+port+shape))

**SysML v2 mapping**

- SysML v2 consolidates the two port kinds: a plain `port` usage corresponds to the v1 proxy-port pattern (exposes features of its owner; typed by a `PortDefinition`, which plays the role of `InterfaceBlock`). The spec's terminology mapping table states: *"port / port def → proxy port / interface block."* ([SysML v2 Graphical Notation intro — SysML v2 to v1 Terminology Mapping, p. 119](https://raw.githubusercontent.com/Systems-Modeling/SysML-v2-Release/master/doc/Intro%20to%20the%20SysML%20v2%20Language-Graphical%20Notation.pdf))
- There is no separate `«full»` stereotype in v2; a port that holds its own nested parts is simply a `port` with a composite `PortDefinition`. The visual form in v2 is the same small boundary square with a `port` label and `name : PortDefName`. ([SysML v2 §7.12 Ports; §8.2.3.12](https://www.omg.org/spec/SysML/2.0/))

**When to use each**

- Use a **proxy port** (v1) / plain `port` (v2) when the port only exposes features of the owning block or an internal part — the most common case for interface modelling. No internal structure needed.
- Use a **full port** (v1) / port with composite `PortDefinition` (v2) when the port is itself a system element with its own internal parts, behaviors, and lifecycle — e.g. a physical connector that has mass, pin layout, and behaviors.
- SysML 1.5 constraint: *"Proxy ports shall not also be full ports."* ([SysML 1.5 §9.3.2.12, constraint [1]](https://www.omg.org/spec/SysML/1.5/PDF))

**v1 vs v2 difference:** SysML 1.5 distinguishes proxy and full ports via explicit `«proxy»` / `«full»` keyword stereotypes on the boundary symbol. SysML v2 removes this distinction at the stereotype level; the proxy-like pattern is the default `port`. Workbench rendering should: for SysML 1.x models emit `«proxy»` / `«full»` keywords; for SysML v2 models use plain `«port»` label and rely on the label `name : ~TypeName` to signal conjugation.
