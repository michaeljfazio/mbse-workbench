import type { ElementId, ModelElement } from '@/model';

export const KERML_CORE_LIBRARY_ROOT_ID = 'kerml.core.Base' as ElementId;

export const KERML_CORE_ELEMENT_IDS = {
  Base: KERML_CORE_LIBRARY_ROOT_ID,
  Anything: 'kerml.core.Base.Anything' as ElementId,
  Item: 'kerml.core.Base.Item' as ElementId,
  Part: 'kerml.core.Base.Part' as ElementId,
  Port: 'kerml.core.Base.Port' as ElementId,
  Connection: 'kerml.core.Base.Connection' as ElementId,
  Action: 'kerml.core.Base.Action' as ElementId,
  Performance: 'kerml.core.Base.Performance' as ElementId,
  Definition: 'kerml.core.Base.Definition' as ElementId,
  Usage: 'kerml.core.Base.Usage' as ElementId,
} as const;

export function kermlCoreElements(): ModelElement[] {
  return [
    {
      id: KERML_CORE_ELEMENT_IDS.Base,
      kind: 'Package',
      name: 'Base',
      ownerId: null,
      ownerRole: 'member',
      ownerIndex: 0,
      isReadOnly: true,
      documentation:
        'KerML core library package. Root namespace for the foundation kernel — provides the universal supertype `Anything` and the primitive meta-concepts (`Part`, `Port`, `Connection`, `Action`, `Performance`, `Definition`, `Usage`). Read-only.',
    },
    {
      id: KERML_CORE_ELEMENT_IDS.Anything,
      kind: 'PartDefinition',
      name: 'Anything',
      ownerId: KERML_CORE_LIBRARY_ROOT_ID,
      ownerRole: 'member',
      ownerIndex: 0,
      isAbstract: true,
      documentation:
        'KerML `Anything` — the universal supertype. Every classifier in KerML/SysML transitively specialises Anything.',
    },
    {
      id: KERML_CORE_ELEMENT_IDS.Item,
      kind: 'PartDefinition',
      name: 'Item',
      ownerId: KERML_CORE_LIBRARY_ROOT_ID,
      ownerRole: 'member',
      ownerIndex: 1,
      isAbstract: false,
      documentation:
        'KerML `Item` — base classifier for things that can be referenced or flow through a model. SysML `Part` is a kind of Item.',
    },
    {
      id: KERML_CORE_ELEMENT_IDS.Part,
      kind: 'PartDefinition',
      name: 'Part',
      ownerId: KERML_CORE_LIBRARY_ROOT_ID,
      ownerRole: 'member',
      ownerIndex: 2,
      isAbstract: false,
      documentation:
        'KerML `Part` — base classifier for system components. The supertype of every user-defined PartDefinition.',
    },
    {
      id: KERML_CORE_ELEMENT_IDS.Port,
      kind: 'PortDefinition',
      name: 'Port',
      ownerId: KERML_CORE_LIBRARY_ROOT_ID,
      ownerRole: 'member',
      ownerIndex: 3,
      direction: 'inout',
      documentation:
        'KerML `Port` — the supertype of every PortDefinition. Default direction `inout`; user-defined ports refine this.',
    },
    {
      id: KERML_CORE_ELEMENT_IDS.Connection,
      kind: 'InterfaceDefinition',
      name: 'Connection',
      ownerId: KERML_CORE_LIBRARY_ROOT_ID,
      ownerRole: 'member',
      ownerIndex: 4,
      documentation:
        'KerML `Connection` — base classifier for connections between parts. Modeled here as an InterfaceDefinition (the closest defining kind in the v1 metamodel); SysML `ConnectionUsage` edges target instances of this concept.',
    },
    {
      id: KERML_CORE_ELEMENT_IDS.Action,
      kind: 'ActionDefinition',
      name: 'Action',
      ownerId: KERML_CORE_LIBRARY_ROOT_ID,
      ownerRole: 'member',
      ownerIndex: 5,
      documentation:
        'KerML `Action` — base classifier for behaviour. Every ActionDefinition transitively specialises Action.',
    },
    {
      id: KERML_CORE_ELEMENT_IDS.Performance,
      kind: 'ActionDefinition',
      name: 'Performance',
      ownerId: KERML_CORE_LIBRARY_ROOT_ID,
      ownerRole: 'member',
      ownerIndex: 6,
      documentation:
        'KerML `Performance` — specialisation of Action representing a behaviour performed by an Item. Distinct from Action only by intent in v1; reified once specialisation edges land.',
    },
    {
      id: KERML_CORE_ELEMENT_IDS.Definition,
      kind: 'PartDefinition',
      name: 'Definition',
      ownerId: KERML_CORE_LIBRARY_ROOT_ID,
      ownerRole: 'member',
      ownerIndex: 7,
      isAbstract: true,
      documentation:
        'KerML `Definition` — meta-classifier for every `*Definition` element. Abstract placeholder; KerML treats Definition as a reflective concept, the v1 metamodel exposes it as a named library element so `import` directives can reference it.',
    },
    {
      id: KERML_CORE_ELEMENT_IDS.Usage,
      kind: 'PartDefinition',
      name: 'Usage',
      ownerId: KERML_CORE_LIBRARY_ROOT_ID,
      ownerRole: 'member',
      ownerIndex: 8,
      isAbstract: true,
      documentation:
        'KerML `Usage` — meta-classifier for every `*Usage` element. Abstract placeholder, see `Definition`.',
    },
  ];
}
