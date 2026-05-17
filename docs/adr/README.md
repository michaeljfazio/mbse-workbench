# Architecture Decision Records

Short (≤300 words) records of decisions that are load-bearing for the
codebase. One file per decision, numbered `NNNN-slug.md`. Add new entries
to the index below in chronological order.

## Index

- [0001 — Metamodel as discriminated unions](0001-metamodel-as-discriminated-unions.md)
- [0002 — Metamodel shape: elements vs. edges, discriminated unions, IDs](0002-metamodel-shape.md)
- [0003 — IBD shape: scope, ports as handles, connection typing, BDD↔IBD coupling](0003-ibd-shape.md)
- [0004 — Requirements Diagram shape: scope, edge model, endpoint typing, cross-diagram visibility](0004-requirements-diagram-shape.md)
- [0005 — Activity Diagram shape: scope, pseudostates, edge model, endpoint typing, onConnect discrimination](0005-activity-diagram-shape.md)
- [0006 — State Machine Diagram shape: scope, pseudostates, edge model, endpoint typing, onConnect discrimination](0006-state-machine-diagram-shape.md)
- [0007 — Use Case Diagram shape: scope, edge model, endpoint typing, onConnect discrimination](0007-use-case-diagram-shape.md)
- [0008 — Parametric Diagram shape: scope, edge model, endpoint typing, equations](0008-parametric-diagram-shape.md)
- [0009 — Package Diagram shape: scope, containment model, import edges, move-between-packages](0009-package-diagram-shape.md)
- [0010 — LLM architecture: provider, dispatcher, tool registry, diff-preview seam](0010-llm-architecture.md)
- [0011 — Explorer foundation: ownerId single source of truth + required DiagramContext](0011-explorer-foundation-ownerid-context.md)
- [0012 — Library seam enforcement: command-bus pre-apply guard + onError surface](0012-library-seam-enforcement.md)
- [0013 — KerML core library: fixture shape, merge semantics, downstream filtering](0013-kerml-core-library-fixture.md)
- [0014 — Package row menu: implicit-owner creation for non-Package diagrams](0014-package-row-implicit-owner.md)
