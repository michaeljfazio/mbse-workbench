import { create } from 'zustand';

import type {
  EdgeId,
  ElementId,
  ElementPatch,
  ElementRegistry,
  ModelEdge,
  ModelElement,
  PartDefinitionElement,
  PartUsageElement,
  PortDefinitionElement,
  PortDirection,
  PortUsageElement,
} from '@/model';
import {
  createEdgeId,
  createElementId,
  createElementRegistry,
  createProjectId,
} from '@/model';
import type { Command, CommandBus, DiagramPositionStore } from '@/commands';
import { createCommandBus } from '@/commands';
import type { CollaborationProvider, User } from '@/collab';
import { NoopCollaborationProvider } from '@/collab';
import type { ModelRepository, Project } from '@/repository';
import { EMPTY_COMMAND_HISTORY } from '@/repository';
import {
  BDD_BLOCK_HEIGHT,
  BDD_BLOCK_WIDTH,
  bddViewpoint,
  createViewpointRegistry,
  dagreLayout,
  IBD_VIEWPOINT_ID,
  ibdViewpoint,
  type BddEdgeKind,
  type Viewpoint,
  type ViewpointId,
  type ViewpointRegistry,
} from '@/viewpoints';

import {
  createDiagramId,
  type Diagram,
  type DiagramContext,
  type DiagramId,
  type NodePosition,
} from './diagram';

export const LAYOUT_STORAGE_KEY = 'mbse:v1:workspace:layout';

export const DEFAULT_LEFT_PANE_WIDTH = 256;
export const DEFAULT_RIGHT_PANE_WIDTH = 360;
export const MIN_PANE_WIDTH = 200;
export const MAX_PANE_WIDTH = 600;

const NEW_BLOCK_DEFAULT_POSITION: NodePosition = { x: 80, y: 80 };
const NEW_BLOCK_CASCADE_OFFSET = 48;

const NEW_PORT_DIRECTION_DEFAULT: PortDirection = 'inout';

export type InspectorTab = 'inspector' | 'chat';

interface LayoutSnapshot {
  readonly leftPaneWidth: number;
  readonly rightPaneWidth: number;
}

function clampPaneWidth(px: number): number {
  if (!Number.isFinite(px)) return DEFAULT_LEFT_PANE_WIDTH;
  return Math.min(MAX_PANE_WIDTH, Math.max(MIN_PANE_WIDTH, Math.round(px)));
}

function readLayout(storage: Storage): LayoutSnapshot {
  try {
    const raw = storage.getItem(LAYOUT_STORAGE_KEY);
    if (raw === null) {
      return {
        leftPaneWidth: DEFAULT_LEFT_PANE_WIDTH,
        rightPaneWidth: DEFAULT_RIGHT_PANE_WIDTH,
      };
    }
    const parsed = JSON.parse(raw) as Partial<LayoutSnapshot>;
    return {
      leftPaneWidth: clampPaneWidth(parsed.leftPaneWidth ?? DEFAULT_LEFT_PANE_WIDTH),
      rightPaneWidth: clampPaneWidth(parsed.rightPaneWidth ?? DEFAULT_RIGHT_PANE_WIDTH),
    };
  } catch {
    return {
      leftPaneWidth: DEFAULT_LEFT_PANE_WIDTH,
      rightPaneWidth: DEFAULT_RIGHT_PANE_WIDTH,
    };
  }
}

function writeLayout(storage: Storage, snapshot: LayoutSnapshot): void {
  try {
    storage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota or storage unavailable — layout falls back to defaults next load.
  }
}

function defaultBrowserStorage(): Storage | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage;
}

function buildViewpointSingleton(): ViewpointRegistry {
  const registry = createViewpointRegistry();
  registry.register(bddViewpoint);
  registry.register(ibdViewpoint);
  return registry;
}

const viewpointSingleton = buildViewpointSingleton();

export interface BootstrapDeps {
  readonly repository: ModelRepository;
  readonly user: User;
  readonly provider?: CollaborationProvider;
  readonly storage?: Storage;
}

export interface WorkspaceState {
  readonly initialized: boolean;
  readonly user: User | null;
  readonly repository: ModelRepository | null;
  readonly registry: ElementRegistry | null;
  readonly bus: CommandBus | null;
  readonly provider: CollaborationProvider | null;
  readonly viewpoints: ViewpointRegistry;
  readonly project: Project | null;
  readonly diagrams: readonly Diagram[];
  readonly activeDiagramId: DiagramId | null;
  readonly elements: readonly ModelElement[];
  readonly edges: readonly ModelEdge[];
  readonly selectedElementIds: readonly ElementId[];
  readonly leftPaneWidth: number;
  readonly rightPaneWidth: number;
  readonly inspectorTab: InspectorTab;
  readonly storage: Storage | null;
  readonly modelVersion: number;
}

export interface CreateDiagramOptions {
  readonly name?: string;
  readonly context?: DiagramContext;
}

export interface WorkspaceActions {
  bootstrap(deps: BootstrapDeps): Promise<void>;
  setActiveDiagram(id: DiagramId): void;
  createDiagram(
    viewpointId: ViewpointId,
    options?: CreateDiagramOptions,
  ): DiagramId | null;
  setSelection(ids: readonly ElementId[]): void;
  setLeftPaneWidth(px: number): void;
  setRightPaneWidth(px: number): void;
  setInspectorTab(tab: InspectorTab): void;
  saveProject(): Promise<void>;
  createBlock(position?: NodePosition): ElementId | null;
  renameElement(id: ElementId, name: string): void;
  setElementDescription(id: ElementId, description: string): void;
  deleteElement(id: ElementId): void;
  deleteSelection(): void;
  unlinkEdge(id: EdgeId): void;
  linkBlocks(
    source: ElementId,
    target: ElementId,
    kind: BddEdgeKind,
  ): EdgeId | null;
  setNodePosition(
    diagramId: DiagramId,
    elementId: ElementId,
    position: NodePosition,
  ): void;
  runAutoLayout(diagramId: DiagramId): void;
  addPortToDefinition(
    definitionId: ElementId,
    options?: { name?: string; direction?: PortDirection },
  ): ElementId | null;
  deletePort(portDefinitionId: ElementId): void;
  setPortDirection(portDefinitionId: ElementId, direction: PortDirection): void;
  createPartUsage(
    diagramId: DiagramId,
    definitionId: ElementId,
    position: NodePosition,
  ): ElementId | null;
  setPartUsageMultiplicity(id: ElementId, multiplicity: string): void;
  openInternalDiagram(partDefinitionId: ElementId): DiagramId | null;
  undo(): void;
  redo(): void;
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

const INITIAL_STATE: WorkspaceState = {
  initialized: false,
  user: null,
  repository: null,
  registry: null,
  bus: null,
  provider: null,
  viewpoints: viewpointSingleton,
  project: null,
  diagrams: [],
  activeDiagramId: null,
  elements: [],
  edges: [],
  selectedElementIds: [],
  leftPaneWidth: DEFAULT_LEFT_PANE_WIDTH,
  rightPaneWidth: DEFAULT_RIGHT_PANE_WIDTH,
  inspectorTab: 'inspector',
  storage: null,
  modelVersion: 0,
};

function newEmptyProject(): Project {
  const now = new Date().toISOString();
  return {
    id: createProjectId(),
    name: 'Untitled Project',
    createdAt: now,
    modifiedAt: now,
    elements: [],
    edges: [],
    diagrams: [],
    history: EMPTY_COMMAND_HISTORY,
  };
}

function newDefaultDiagram(): Diagram {
  return {
    id: createDiagramId(),
    viewpointId: bddViewpoint.id,
    name: 'Main BDD',
    positions: {},
  };
}

function nextBlockName(elements: readonly ModelElement[]): string {
  const blocks = elements.filter((e): e is PartDefinitionElement => e.kind === 'PartDefinition');
  let n = blocks.length + 1;
  const taken = new Set(blocks.map((b) => b.name));
  while (taken.has(`Block ${n}`)) n += 1;
  return `Block ${n}`;
}

function nextBlockPosition(diagram: Diagram | null): NodePosition {
  if (!diagram) return NEW_BLOCK_DEFAULT_POSITION;
  const count = Object.keys(diagram.positions).length;
  return {
    x: NEW_BLOCK_DEFAULT_POSITION.x + count * NEW_BLOCK_CASCADE_OFFSET,
    y: NEW_BLOCK_DEFAULT_POSITION.y + count * NEW_BLOCK_CASCADE_OFFSET,
  };
}

function nextPortName(
  parent: PartDefinitionElement,
  elements: readonly ModelElement[],
): string {
  const portIds = new Set(parent.portIds);
  const taken = new Set(
    elements
      .filter((e): e is PortDefinitionElement => e.kind === 'PortDefinition')
      .filter((e) => portIds.has(e.id))
      .map((e) => e.name),
  );
  let n = taken.size + 1;
  while (taken.has(`port${n}`)) n += 1;
  return `port${n}`;
}

function nextPartUsageName(
  definition: PartDefinitionElement,
  elements: readonly ModelElement[],
): string {
  const base = definition.name.length > 0 ? definition.name : 'part';
  const lowered = base.charAt(0).toLowerCase() + base.slice(1);
  const taken = new Set(
    elements
      .filter((e): e is PartUsageElement => e.kind === 'PartUsage')
      .map((e) => e.name),
  );
  if (!taken.has(lowered)) return lowered;
  let n = 2;
  while (taken.has(`${lowered}${n}`)) n += 1;
  return `${lowered}${n}`;
}

export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => ({
  ...INITIAL_STATE,

  async bootstrap({ repository, user, provider, storage }) {
    const storageInst = storage ?? defaultBrowserStorage();
    const layout = storageInst
      ? readLayout(storageInst)
      : { leftPaneWidth: DEFAULT_LEFT_PANE_WIDTH, rightPaneWidth: DEFAULT_RIGHT_PANE_WIDTH };
    const collaborationProvider = provider ?? new NoopCollaborationProvider();

    const metadata = await repository.list();
    const firstMetadata = metadata[0];
    let project: Project;
    if (firstMetadata) {
      project = await repository.load(firstMetadata.id);
    } else {
      project = newEmptyProject();
    }

    // Ensure the project carries at least one diagram. Older persisted
    // projects (or freshly-minted ones) may have an empty `diagrams` array.
    let diagrams: readonly Diagram[] = project.diagrams;
    if (diagrams.length === 0) {
      diagrams = [newDefaultDiagram()];
      project = { ...project, diagrams };
    }
    await repository.save(project);

    const registry = createElementRegistry();
    for (const element of project.elements) registry.add(element);
    for (const edge of project.edges) registry.addEdge(edge);

    // Position store wired to the (about-to-be-set) workspace state. The bus
    // reads/writes positions via this port so position changes are first-class
    // commands with undo support.
    const positionStore: DiagramPositionStore = {
      getPosition(diagramId, elementId) {
        const diagram = get().diagrams.find((d) => d.id === diagramId);
        return diagram?.positions[elementId];
      },
      setPosition(diagramId, elementId, position) {
        const nextDiagrams = get().diagrams.map((d) => {
          if (d.id !== diagramId) return d;
          const nextPositions: Record<ElementId, NodePosition> = { ...d.positions };
          if (position === undefined) {
            delete nextPositions[elementId];
          } else {
            nextPositions[elementId] = position;
          }
          return { ...d, positions: nextPositions };
        });
        set({ diagrams: nextDiagrams });
      },
    };

    const bus = createCommandBus({
      registry,
      provider: collaborationProvider,
      positions: positionStore,
      initialUndoStack: project.history.undo,
      initialRedoStack: project.history.redo,
    });

    bus.subscribe(() => {
      const r = get().registry;
      if (!r) return;
      set({
        elements: r.elements(),
        edges: r.edges(),
        modelVersion: get().bus?.version() ?? 0,
      });
      // Autosave after every committed dispatch so a page refresh sees the
      // latest model. The repository is sessionStorage-backed; the call is
      // effectively synchronous and any failure is swallowed there.
      void get().saveProject();
    });

    set({
      initialized: true,
      user,
      repository,
      registry,
      bus,
      provider: collaborationProvider,
      project,
      diagrams,
      activeDiagramId: diagrams[0]!.id,
      elements: registry.elements(),
      edges: registry.edges(),
      selectedElementIds: [],
      leftPaneWidth: layout.leftPaneWidth,
      rightPaneWidth: layout.rightPaneWidth,
      storage: storageInst,
      modelVersion: bus.version(),
    });
  },

  setActiveDiagram(id) {
    if (!get().diagrams.some((d) => d.id === id)) return;
    set({ activeDiagramId: id });
  },

  createDiagram(viewpointId, options) {
    const { viewpoints, diagrams } = get();
    if (!viewpoints.has(viewpointId)) return null;
    const id = createDiagramId();
    const fallbackName = viewpoints.get(viewpointId)?.label ?? viewpointId;
    const diagram: Diagram = {
      id,
      viewpointId,
      name: options?.name ?? fallbackName,
      positions: {},
      ...(options?.context !== undefined ? { context: options.context } : {}),
    };
    set({ diagrams: [...diagrams, diagram] });
    void get().saveProject();
    return id;
  },

  setSelection(ids) {
    set({ selectedElementIds: Array.from(ids) });
  },

  setLeftPaneWidth(px) {
    const width = clampPaneWidth(px);
    const { storage, rightPaneWidth } = get();
    set({ leftPaneWidth: width });
    if (storage) {
      writeLayout(storage, { leftPaneWidth: width, rightPaneWidth });
    }
  },

  setRightPaneWidth(px) {
    const width = clampPaneWidth(px);
    const { storage, leftPaneWidth } = get();
    set({ rightPaneWidth: width });
    if (storage) {
      writeLayout(storage, { leftPaneWidth, rightPaneWidth: width });
    }
  },

  setInspectorTab(tab) {
    set({ inspectorTab: tab });
  },

  async saveProject() {
    const { repository, project, registry, diagrams, bus } = get();
    if (!repository || !project || !registry) return;
    const updated: Project = {
      ...project,
      modifiedAt: new Date().toISOString(),
      elements: registry.elements(),
      edges: registry.edges(),
      diagrams,
      history: bus ? bus.getHistory() : project.history,
    };
    await repository.save(updated);
    set({ project: updated });
  },

  createBlock(position) {
    const { bus, user, diagrams, activeDiagramId, elements } = get();
    if (!bus || !user) return null;
    const id = createElementId();
    const block: PartDefinitionElement = {
      id,
      kind: 'PartDefinition',
      name: nextBlockName(elements),
      isAbstract: false,
      propertyIds: [],
      portIds: [],
    };
    const activeDiagram = diagrams.find((d) => d.id === activeDiagramId) ?? null;
    const pos = position ?? nextBlockPosition(activeDiagram);

    // Wrap create-element + initial position in one compound command so the
    // undo stack treats "create-and-place" as a single step.
    const commands: Command[] = [{ kind: 'create-element', element: block }];
    if (activeDiagram) {
      commands.push({
        kind: 'update-diagram-position',
        diagramId: activeDiagram.id,
        elementId: id,
        position: pos,
      });
    }
    bus.dispatch({ kind: 'compound', commands }, user);
    return id;
  },

  renameElement(id, name) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    const existing = registry.get(id);
    if (!existing) return;
    if (existing.name === trimmed) return;
    bus.dispatch(
      {
        kind: 'update-element',
        id,
        patch: { name: trimmed },
      },
      user,
    );
  },

  setElementDescription(id, description) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing) return;
    const next = description.length === 0 ? undefined : description;
    if ((existing.documentation ?? undefined) === next) return;
    bus.dispatch(
      {
        kind: 'update-element',
        id,
        patch: { documentation: next },
      },
      user,
    );
  },

  deleteElement(id) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    if (!registry.get(id)) return;
    bus.dispatch({ kind: 'delete-element', id }, user);
    set({
      selectedElementIds: get().selectedElementIds.filter((s) => s !== id),
    });
  },

  deleteSelection() {
    const { selectedElementIds } = get();
    for (const id of selectedElementIds) {
      get().deleteElement(id);
    }
    set({ selectedElementIds: [] });
  },

  unlinkEdge(id) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    if (!registry.getEdge(id)) return;
    bus.dispatch({ kind: 'unlink', id }, user);
  },

  linkBlocks(source, target, kind) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return null;
    if (source === target) return null;
    const sourceEl = registry.get(source);
    const targetEl = registry.get(target);
    if (!sourceEl || !targetEl) return null;
    if (sourceEl.kind !== 'PartDefinition' || targetEl.kind !== 'PartDefinition') {
      return null;
    }
    const edgeId = createEdgeId();
    const edge: ModelEdge =
      kind === 'Composition'
        ? { id: edgeId, kind: 'Composition', sourceId: source, targetId: target }
        : { id: edgeId, kind: 'Generalization', sourceId: source, targetId: target };
    bus.dispatch({ kind: 'link', edge }, user);
    return edgeId;
  },

  setNodePosition(diagramId, elementId, position) {
    const { bus, user, diagrams } = get();
    if (!bus || !user) return;
    const diagram = diagrams.find((d) => d.id === diagramId);
    if (!diagram) return;
    const existing = diagram.positions[elementId];
    if (existing && existing.x === position.x && existing.y === position.y) return;
    bus.dispatch(
      {
        kind: 'update-diagram-position',
        diagramId,
        elementId,
        position,
      },
      user,
    );
  },

  runAutoLayout(diagramId) {
    const { bus, user, diagrams, elements, edges } = get();
    if (!bus || !user) return;
    const diagram = diagrams.find((d) => d.id === diagramId);
    if (!diagram) return;
    const layout = dagreLayout(elements, edges, {
      nodeWidth: BDD_BLOCK_WIDTH,
      nodeHeight: BDD_BLOCK_HEIGHT,
    });
    if (layout.size === 0) return;
    const commands: Command[] = [];
    for (const [elementId, position] of layout) {
      commands.push({
        kind: 'update-diagram-position',
        diagramId,
        elementId,
        position,
      });
    }
    bus.dispatch({ kind: 'compound', commands }, user);
  },

  addPortToDefinition(definitionId, options) {
    const { bus, user, registry, elements } = get();
    if (!bus || !user || !registry) return null;
    const parent = registry.get(definitionId);
    if (!parent || parent.kind !== 'PartDefinition') return null;
    const direction = options?.direction ?? NEW_PORT_DIRECTION_DEFAULT;
    const portId = createElementId();
    const port: PortDefinitionElement = {
      id: portId,
      kind: 'PortDefinition',
      name: options?.name?.trim() ?? nextPortName(parent, elements),
      direction,
    };
    const portIdsPatch: ElementPatch<'PartDefinition'> = {
      portIds: [...parent.portIds, portId],
    };
    bus.dispatch(
      {
        kind: 'compound',
        commands: [
          { kind: 'create-element', element: port },
          {
            kind: 'update-element',
            id: definitionId,
            patch: portIdsPatch,
          },
        ],
      },
      user,
    );
    return portId;
  },

  deletePort(portDefinitionId) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const port = registry.get(portDefinitionId);
    if (!port || port.kind !== 'PortDefinition') return;
    const parent = registry
      .elements()
      .find(
        (e): e is PartDefinitionElement =>
          e.kind === 'PartDefinition' && e.portIds.includes(portDefinitionId),
      );
    if (!parent) {
      // Orphaned port — just remove it.
      bus.dispatch({ kind: 'delete-element', id: portDefinitionId }, user);
      return;
    }
    const nextPortIds = parent.portIds.filter((id) => id !== portDefinitionId);
    const portIdsPatch: ElementPatch<'PartDefinition'> = { portIds: nextPortIds };
    bus.dispatch(
      {
        kind: 'compound',
        commands: [
          {
            kind: 'update-element',
            id: parent.id,
            patch: portIdsPatch,
          },
          { kind: 'delete-element', id: portDefinitionId },
        ],
      },
      user,
    );
  },

  setPortDirection(portDefinitionId, direction) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(portDefinitionId);
    if (!existing || existing.kind !== 'PortDefinition') return;
    if (existing.direction === direction) return;
    const patch: ElementPatch<'PortDefinition'> = { direction };
    bus.dispatch(
      {
        kind: 'update-element',
        id: portDefinitionId,
        patch,
      },
      user,
    );
  },

  createPartUsage(diagramId, definitionId, position) {
    const { bus, user, registry, diagrams, elements } = get();
    if (!bus || !user || !registry) return null;
    if (!diagrams.some((d) => d.id === diagramId)) return null;
    const definition = registry.get(definitionId);
    if (!definition || definition.kind !== 'PartDefinition') return null;

    // Materialise one PortUsage per PortDefinition on the type so the
    // PartUsage carries a stable list of port endpoints. Skip ports whose
    // PortDefinition is missing from the registry (defensive — should not
    // happen under normal flow).
    const portUsageCreates: Command[] = [];
    const portUsageIds: ElementId[] = [];
    for (const portId of definition.portIds) {
      const portDef = registry.get(portId);
      if (!portDef || portDef.kind !== 'PortDefinition') continue;
      const portUsageId = createElementId();
      portUsageIds.push(portUsageId);
      const portUsage: PortUsageElement = {
        id: portUsageId,
        kind: 'PortUsage',
        name: portDef.name,
        definitionId: portDef.id,
      };
      portUsageCreates.push({ kind: 'create-element', element: portUsage });
    }

    const partUsageId = createElementId();
    const partUsage: PartUsageElement = {
      id: partUsageId,
      kind: 'PartUsage',
      name: nextPartUsageName(definition, elements),
      definitionId,
      portUsageIds,
    };

    const commands: Command[] = [
      ...portUsageCreates,
      { kind: 'create-element', element: partUsage },
      {
        kind: 'update-diagram-position',
        diagramId,
        elementId: partUsageId,
        position,
      },
    ];
    bus.dispatch({ kind: 'compound', commands }, user);
    return partUsageId;
  },

  setPartUsageMultiplicity(id, multiplicity) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'PartUsage') return;
    const trimmed = multiplicity.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.multiplicity ?? undefined) === next) return;
    const patch: ElementPatch<'PartUsage'> = { multiplicity: next };
    bus.dispatch(
      {
        kind: 'update-element',
        id,
        patch,
      },
      user,
    );
  },

  openInternalDiagram(partDefinitionId) {
    const { registry, diagrams, viewpoints } = get();
    if (!registry) return null;
    const partDef = registry.get(partDefinitionId);
    if (!partDef || partDef.kind !== 'PartDefinition') return null;
    if (!viewpoints.has(IBD_VIEWPOINT_ID)) return null;
    const existing = diagrams.find(
      (d) =>
        d.viewpointId === IBD_VIEWPOINT_ID &&
        d.context?.kind === 'partDefinition' &&
        d.context.id === partDefinitionId,
    );
    if (existing) {
      get().setActiveDiagram(existing.id);
      return existing.id;
    }
    const id = get().createDiagram(IBD_VIEWPOINT_ID, {
      name: `${partDef.name} IBD`,
      context: { kind: 'partDefinition', id: partDefinitionId },
    });
    if (id) get().setActiveDiagram(id);
    return id;
  },

  undo() {
    get().bus?.undo();
  },

  redo() {
    get().bus?.redo();
  },
}));

export function resetWorkspaceStoreForTests(): void {
  useWorkspaceStore.setState(INITIAL_STATE, false);
}

export function getActiveViewpoint(state: WorkspaceState): Viewpoint | undefined {
  if (!state.activeDiagramId) return undefined;
  const active = state.diagrams.find((d) => d.id === state.activeDiagramId);
  if (!active) return undefined;
  return state.viewpoints.get(active.viewpointId);
}

export function getActiveDiagram(state: WorkspaceState): Diagram | undefined {
  if (!state.activeDiagramId) return undefined;
  return state.diagrams.find((d) => d.id === state.activeDiagramId);
}
