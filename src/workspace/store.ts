import { create } from 'zustand';

import type {
  ActionNodeType,
  ActionUsageElement,
  ActorElement,
  ConnectionUsageElement,
  ConstraintDefinitionElement,
  ConstraintUsageElement,
  ControlFlowEdge,
  EdgeId,
  EdgePatch,
  ElementId,
  ElementPatch,
  ElementRegistry,
  ExtendEdge,
  GeneralizationEdge,
  IncludeEdge,
  ItemFlowElement,
  ModelEdge,
  ModelElement,
  ObjectFlowEdge,
  PackageElement,
  ParameterBindingEdge,
  PartDefinitionElement,
  PartUsageElement,
  PortDefinitionElement,
  PortDirection,
  PortUsageElement,
  RequirementElement,
  RequirementPriority,
  RequirementStatus,
  RequirementTraceEdge,
  RequirementTraceKind,
  StateNodeType,
  StateUsageElement,
  TransitionElement,
  UseCaseElement,
  ValueLiteral,
  ValuePropertyElement,
  ValueType,
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
  activityViewpoint,
  BDD_BLOCK_HEIGHT,
  BDD_BLOCK_WIDTH,
  BDD_VIEWPOINT_ID,
  bddViewpoint,
  canonicalizeIbdConnection,
  createViewpointRegistry,
  dagreLayout,
  IBD_VIEWPOINT_ID,
  ibdViewpoint,
  isValidActivityConnection,
  isValidParametricConnection,
  isValidStateMachineConnection,
  canonicalizeParametricConnection,
  packageViewpoint,
  parametricViewpoint,
  REQUIREMENTS_VIEWPOINT_ID,
  requirementsViewpoint,
  stateMachineViewpoint,
  useCaseViewpoint,
  type BddEdgeKind,
  type UseCaseEdgeKind,
  type Viewpoint,
  type ViewpointId,
  type ViewpointRegistry,
} from '@/viewpoints';
import type { Connection } from '@xyflow/react';

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
  registry.register(requirementsViewpoint);
  registry.register(activityViewpoint);
  registry.register(stateMachineViewpoint);
  registry.register(useCaseViewpoint);
  registry.register(parametricViewpoint);
  registry.register(packageViewpoint);
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
  showDefinitionOnBdd(partUsageId: ElementId): DiagramId | null;
  navigateToElementOnDiagram(
    elementId: ElementId,
    diagramId: DiagramId,
  ): void;
  showRequirementTracesFor(elementId: ElementId): DiagramId | null;
  connectPorts(connection: Connection): ElementId | null;
  connectItemFlow(connection: Connection): ElementId | null;
  setItemFlowType(id: ElementId, itemType: string): void;
  createRequirement(
    diagramId: DiagramId,
    position: NodePosition,
    options?: CreateRequirementOptions,
  ): ElementId | null;
  createActionUsage(
    diagramId: DiagramId,
    position: NodePosition,
    nodeType: ActionNodeType,
    options?: CreateActionUsageOptions,
  ): ElementId | null;
  createStateUsage(
    diagramId: DiagramId,
    position: NodePosition,
    stateType: StateNodeType,
    options?: CreateStateUsageOptions,
  ): ElementId | null;
  createActor(
    diagramId: DiagramId,
    position: NodePosition,
    options?: CreateActorOptions,
  ): ElementId | null;
  createPackage(
    diagramId: DiagramId,
    position: NodePosition,
    options?: CreatePackageOptions,
  ): ElementId | null;
  addPackageMember(packageId: ElementId, memberId: ElementId): void;
  removePackageMember(packageId: ElementId, memberId: ElementId): void;
  createUseCase(
    diagramId: DiagramId,
    position: NodePosition,
    options?: CreateUseCaseOptions,
  ): ElementId | null;
  createConstraintUsage(
    diagramId: DiagramId,
    position: NodePosition,
    options?: CreateConstraintUsageOptions,
  ): ElementId | null;
  createValueProperty(
    diagramId: DiagramId,
    position: NodePosition,
    options?: CreateValuePropertyOptions,
  ): ElementId | null;
  setConstraintExpression(constraintUsageId: ElementId, expression: string): void;
  setValuePropertyType(id: ElementId, valueType: ValueType): void;
  setValuePropertyDefault(
    id: ElementId,
    defaultValue: ValueLiteral | undefined,
  ): void;
  setUseCaseText(id: ElementId, value: string): void;
  setStateEntryAction(id: ElementId, value: string): void;
  setStateExitAction(id: ElementId, value: string): void;
  setStateDoAction(id: ElementId, value: string): void;
  setActionDefinition(
    id: ElementId,
    definitionId: ElementId | null,
  ): void;
  addActionDefinitionParameter(
    actionDefinitionId: ElementId,
    valuePropertyId: ElementId,
  ): void;
  removeActionDefinitionParameter(
    actionDefinitionId: ElementId,
    valuePropertyId: ElementId,
  ): void;
  setRequirementReqId(id: ElementId, reqId: string): void;
  setRequirementText(id: ElementId, text: string): void;
  setRequirementPriority(id: ElementId, priority: RequirementPriority): void;
  setRequirementStatus(id: ElementId, status: RequirementStatus): void;
  setRequirementRationale(id: ElementId, rationale: string): void;
  linkRequirementTrace(
    source: ElementId,
    target: ElementId,
    traceKind: RequirementTraceKind,
  ): EdgeId | null;
  setRequirementTraceLabel(id: EdgeId, label: string): void;
  connectControlFlow(connection: Connection): EdgeId | null;
  connectObjectFlow(connection: Connection): EdgeId | null;
  setControlFlowGuard(id: EdgeId, guard: string): void;
  setObjectFlowItemType(id: EdgeId, itemType: string): void;
  connectStateTransition(connection: Connection): ElementId | null;
  setTransitionTrigger(id: ElementId, value: string): void;
  setTransitionGuard(id: ElementId, value: string): void;
  setTransitionEffect(id: ElementId, value: string): void;
  linkUseCaseEdge(
    source: ElementId,
    target: ElementId,
    kind: UseCaseEdgeKind,
  ): EdgeId | null;
  setExtendExtensionPoint(id: EdgeId, extensionPoint: string): void;
  linkParameterBinding(connection: Connection): EdgeId | null;
  setParameterBindingLabel(id: EdgeId, label: string): void;
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

function nextConnectionUsageName(elements: readonly ModelElement[]): string {
  const taken = new Set(
    elements
      .filter((e): e is ConnectionUsageElement => e.kind === 'ConnectionUsage')
      .map((e) => e.name),
  );
  let n = taken.size + 1;
  while (taken.has(`connection${n}`)) n += 1;
  return `connection${n}`;
}

function nextItemFlowName(elements: readonly ModelElement[]): string {
  const taken = new Set(
    elements
      .filter((e): e is ItemFlowElement => e.kind === 'ItemFlow')
      .map((e) => e.name),
  );
  let n = taken.size + 1;
  while (taken.has(`flow${n}`)) n += 1;
  return `flow${n}`;
}

function requirementsOf(
  elements: readonly ModelElement[],
): readonly RequirementElement[] {
  return elements.filter(
    (e): e is RequirementElement => e.kind === 'Requirement',
  );
}

function nextRequirementName(elements: readonly ModelElement[]): string {
  const taken = new Set(requirementsOf(elements).map((r) => r.name));
  let n = taken.size + 1;
  while (taken.has(`Req${n}`)) n += 1;
  return `Req${n}`;
}

function nextActionName(elements: readonly ModelElement[]): string {
  const taken = new Set(
    elements
      .filter((e): e is ActionUsageElement => e.kind === 'ActionUsage')
      .map((e) => e.name),
  );
  let n = taken.size + 1;
  while (taken.has(`Action${n}`)) n += 1;
  return `Action${n}`;
}

function nextRequirementReqId(elements: readonly ModelElement[]): string {
  const taken = new Set(
    requirementsOf(elements)
      .map((r) => r.reqId)
      .filter((id): id is string => id !== undefined && id.length > 0),
  );
  // Scan from 1 so cascade fills gaps when reqIds were assigned out of order
  // (custom reqId overrides, deletions, imports).
  let n = 1;
  while (taken.has(`R-${String(n).padStart(3, '0')}`)) n += 1;
  return `R-${String(n).padStart(3, '0')}`;
}

const REQUIREMENT_PRIORITY_DEFAULT: RequirementPriority = 'medium';
const REQUIREMENT_STATUS_DEFAULT: RequirementStatus = 'draft';

export interface CreateRequirementOptions {
  readonly name?: string;
  readonly reqId?: string;
  readonly text?: string;
  readonly priority?: RequirementPriority;
  readonly status?: RequirementStatus;
  readonly rationale?: string;
}

export interface CreateActionUsageOptions {
  readonly name?: string;
  readonly definitionId?: ElementId;
}

export interface CreateStateUsageOptions {
  readonly name?: string;
  readonly definitionId?: ElementId;
}

export interface CreateActorOptions {
  readonly name?: string;
}

export interface CreatePackageOptions {
  readonly name?: string;
  readonly memberIds?: readonly ElementId[];
}

export interface CreateUseCaseOptions {
  readonly name?: string;
  readonly text?: string;
}

export interface CreateConstraintUsageOptions {
  readonly name?: string;
  readonly definitionName?: string;
  readonly expression?: string;
}

export interface CreateValuePropertyOptions {
  readonly name?: string;
  readonly valueType?: ValueType;
  readonly defaultValue?: ValueLiteral;
}

const VALUE_PROPERTY_TYPE_DEFAULT: ValueType = 'number';

function nextPackageName(elements: readonly ModelElement[]): string {
  const taken = new Set(
    elements
      .filter((e): e is PackageElement => e.kind === 'Package')
      .map((e) => e.name),
  );
  let n = 1;
  while (taken.has(`Package${n}`)) n += 1;
  return `Package${n}`;
}

function nextActorName(elements: readonly ModelElement[]): string {
  const taken = new Set(
    elements
      .filter((e): e is ActorElement => e.kind === 'Actor')
      .map((e) => e.name),
  );
  let n = 1;
  while (taken.has(`Actor${n}`)) n += 1;
  return `Actor${n}`;
}

function nextUseCaseName(elements: readonly ModelElement[]): string {
  const taken = new Set(
    elements
      .filter((e): e is UseCaseElement => e.kind === 'UseCase')
      .map((e) => e.name),
  );
  let n = 1;
  while (taken.has(`UC${n}`)) n += 1;
  return `UC${n}`;
}

function nextStateName(elements: readonly ModelElement[]): string {
  const taken = new Set(
    elements
      .filter((e): e is StateUsageElement => e.kind === 'StateUsage')
      .map((e) => e.name),
  );
  let n = taken.size + 1;
  while (taken.has(`State${n}`)) n += 1;
  return `State${n}`;
}

function nextConstraintUsageName(elements: readonly ModelElement[]): string {
  const taken = new Set(
    elements
      .filter((e): e is ConstraintUsageElement => e.kind === 'ConstraintUsage')
      .map((e) => e.name),
  );
  let n = 1;
  while (taken.has(`Constraint${n}`)) n += 1;
  return `Constraint${n}`;
}

function nextConstraintDefinitionName(
  elements: readonly ModelElement[],
): string {
  const taken = new Set(
    elements
      .filter(
        (e): e is ConstraintDefinitionElement =>
          e.kind === 'ConstraintDefinition',
      )
      .map((e) => e.name),
  );
  let n = 1;
  while (taken.has(`ConstraintDef${n}`)) n += 1;
  return `ConstraintDef${n}`;
}

function nextValuePropertyName(elements: readonly ModelElement[]): string {
  const taken = new Set(
    elements
      .filter((e): e is ValuePropertyElement => e.kind === 'ValueProperty')
      .map((e) => e.name),
  );
  let n = 1;
  while (taken.has(`value${n}`)) n += 1;
  return `value${n}`;
}

function nextTransitionName(elements: readonly ModelElement[]): string {
  const taken = new Set(
    elements
      .filter((e): e is TransitionElement => e.kind === 'Transition')
      .map((e) => e.name),
  );
  let n = taken.size + 1;
  while (taken.has(`Transition${n}`)) n += 1;
  return `Transition${n}`;
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

  showDefinitionOnBdd(partUsageId) {
    const { registry, diagrams } = get();
    if (!registry) return null;
    const part = registry.get(partUsageId);
    if (!part || part.kind !== 'PartUsage') return null;
    const definition = registry.get(part.definitionId);
    if (!definition || definition.kind !== 'PartDefinition') return null;
    const bdd = diagrams.find((d) => d.viewpointId === BDD_VIEWPOINT_ID);
    if (!bdd) return null;
    set({
      activeDiagramId: bdd.id,
      selectedElementIds: [part.definitionId],
    });
    return bdd.id;
  },

  navigateToElementOnDiagram(elementId, diagramId) {
    const { diagrams, registry } = get();
    if (!registry || !registry.get(elementId)) return;
    if (!diagrams.some((d) => d.id === diagramId)) return;
    set({
      activeDiagramId: diagramId,
      selectedElementIds: [elementId],
    });
  },

  showRequirementTracesFor(elementId) {
    const { registry, diagrams, edges } = get();
    if (!registry || !registry.get(elementId)) return null;
    const reqDiagram = diagrams.find(
      (d) => d.viewpointId === REQUIREMENTS_VIEWPOINT_ID,
    );
    if (!reqDiagram) return null;
    const trace = edges.find(
      (e) => e.kind === 'RequirementTrace' && e.targetId === elementId,
    );
    if (!trace) return null;
    set({
      activeDiagramId: reqDiagram.id,
      selectedElementIds: [trace.sourceId],
    });
    return reqDiagram.id;
  },

  connectPorts(connection) {
    const { bus, user, registry, elements } = get();
    if (!bus || !user || !registry) return null;
    const canonical = canonicalizeIbdConnection(connection, registry);
    if (!canonical) return null;
    const id = createElementId();
    const element: ConnectionUsageElement = {
      id,
      kind: 'ConnectionUsage',
      name: nextConnectionUsageName(elements),
      sourceId: canonical.sourcePortUsageId,
      targetId: canonical.targetPortUsageId,
    };
    bus.dispatch({ kind: 'create-element', element }, user);
    return id;
  },

  connectItemFlow(connection) {
    const { bus, user, registry, elements } = get();
    if (!bus || !user || !registry) return null;
    const canonical = canonicalizeIbdConnection(connection, registry);
    if (!canonical) return null;
    const id = createElementId();
    const element: ItemFlowElement = {
      id,
      kind: 'ItemFlow',
      name: nextItemFlowName(elements),
      sourceId: canonical.sourcePortUsageId,
      targetId: canonical.targetPortUsageId,
    };
    bus.dispatch({ kind: 'create-element', element }, user);
    return id;
  },

  setItemFlowType(id, itemType) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'ItemFlow') return;
    const trimmed = itemType.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.itemType ?? undefined) === next) return;
    const patch: ElementPatch<'ItemFlow'> = { itemType: next };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  createRequirement(diagramId, position, options) {
    const { bus, user, registry, diagrams, elements } = get();
    if (!bus || !user || !registry) return null;
    if (!diagrams.some((d) => d.id === diagramId)) return null;
    const id = createElementId();
    const requirement: RequirementElement = {
      id,
      kind: 'Requirement',
      name: options?.name?.trim() ?? nextRequirementName(elements),
      text: options?.text ?? '',
      priority: options?.priority ?? REQUIREMENT_PRIORITY_DEFAULT,
      status: options?.status ?? REQUIREMENT_STATUS_DEFAULT,
      reqId: options?.reqId ?? nextRequirementReqId(elements),
      ...(options?.rationale !== undefined && options.rationale.length > 0
        ? { rationale: options.rationale }
        : {}),
    };
    bus.dispatch(
      {
        kind: 'compound',
        commands: [
          { kind: 'create-element', element: requirement },
          {
            kind: 'update-diagram-position',
            diagramId,
            elementId: id,
            position,
          },
        ],
      },
      user,
    );
    return id;
  },

  createActionUsage(diagramId, position, nodeType, options) {
    const { bus, user, registry, diagrams, elements } = get();
    if (!bus || !user || !registry) return null;
    if (!diagrams.some((d) => d.id === diagramId)) return null;
    // Initial / final pseudostates have no displayed name. Skipping the
    // default name keeps the canvas visually clean and the spec's intent
    // — "empty for initial/final" — explicit at creation time.
    const isNameableByDefault =
      nodeType !== 'initial' && nodeType !== 'final';
    const defaultName = isNameableByDefault ? nextActionName(elements) : '';
    const id = createElementId();
    const action: ActionUsageElement = {
      id,
      kind: 'ActionUsage',
      name: options?.name?.trim() ?? defaultName,
      nodeType,
      ...(options?.definitionId !== undefined
        ? { definitionId: options.definitionId }
        : {}),
    };
    bus.dispatch(
      {
        kind: 'compound',
        commands: [
          { kind: 'create-element', element: action },
          {
            kind: 'update-diagram-position',
            diagramId,
            elementId: id,
            position,
          },
        ],
      },
      user,
    );
    return id;
  },

  createStateUsage(diagramId, position, stateType, options) {
    const { bus, user, registry, diagrams, elements } = get();
    if (!bus || !user || !registry) return null;
    if (!diagrams.some((d) => d.id === diagramId)) return null;
    // Initial / final pseudostates have no displayed name. Skipping the
    // default name keeps the canvas visually clean and matches the Activity
    // pattern for the same pseudostates.
    const isNameableByDefault = stateType === 'state';
    const defaultName = isNameableByDefault ? nextStateName(elements) : '';
    const id = createElementId();
    const state: StateUsageElement = {
      id,
      kind: 'StateUsage',
      name: options?.name?.trim() ?? defaultName,
      stateType,
      ...(options?.definitionId !== undefined
        ? { definitionId: options.definitionId }
        : {}),
    };
    bus.dispatch(
      {
        kind: 'compound',
        commands: [
          { kind: 'create-element', element: state },
          {
            kind: 'update-diagram-position',
            diagramId,
            elementId: id,
            position,
          },
        ],
      },
      user,
    );
    return id;
  },

  createActor(diagramId, position, options) {
    const { bus, user, registry, diagrams, elements } = get();
    if (!bus || !user || !registry) return null;
    if (!diagrams.some((d) => d.id === diagramId)) return null;
    const id = createElementId();
    const actor: ActorElement = {
      id,
      kind: 'Actor',
      name: options?.name?.trim() ?? nextActorName(elements),
    };
    bus.dispatch(
      {
        kind: 'compound',
        commands: [
          { kind: 'create-element', element: actor },
          {
            kind: 'update-diagram-position',
            diagramId,
            elementId: id,
            position,
          },
        ],
      },
      user,
    );
    return id;
  },

  createPackage(diagramId, position, options) {
    const { bus, user, registry, diagrams, elements } = get();
    if (!bus || !user || !registry) return null;
    if (!diagrams.some((d) => d.id === diagramId)) return null;
    const id = createElementId();
    const pkg: PackageElement = {
      id,
      kind: 'Package',
      name: options?.name?.trim() ?? nextPackageName(elements),
      memberIds: options?.memberIds ? [...options.memberIds] : [],
    };
    bus.dispatch(
      {
        kind: 'compound',
        commands: [
          { kind: 'create-element', element: pkg },
          {
            kind: 'update-diagram-position',
            diagramId,
            elementId: id,
            position,
          },
        ],
      },
      user,
    );
    return id;
  },

  addPackageMember(packageId, memberId) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const pkg = registry.get(packageId);
    if (!pkg || pkg.kind !== 'Package') return;
    const member = registry.get(memberId);
    if (!member) return;
    if (pkg.memberIds.includes(memberId)) return;
    const patch: ElementPatch<'Package'> = {
      memberIds: [...pkg.memberIds, memberId],
    };
    bus.dispatch(
      { kind: 'update-element', id: packageId, patch },
      user,
    );
  },

  removePackageMember(packageId, memberId) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const pkg = registry.get(packageId);
    if (!pkg || pkg.kind !== 'Package') return;
    if (!pkg.memberIds.includes(memberId)) return;
    const patch: ElementPatch<'Package'> = {
      memberIds: pkg.memberIds.filter((m) => m !== memberId),
    };
    bus.dispatch(
      { kind: 'update-element', id: packageId, patch },
      user,
    );
  },

  createUseCase(diagramId, position, options) {
    const { bus, user, registry, diagrams, elements } = get();
    if (!bus || !user || !registry) return null;
    if (!diagrams.some((d) => d.id === diagramId)) return null;
    const id = createElementId();
    const useCase: UseCaseElement = {
      id,
      kind: 'UseCase',
      name: options?.name?.trim() ?? nextUseCaseName(elements),
      ...(options?.text !== undefined && options.text.length > 0
        ? { text: options.text }
        : {}),
    };
    bus.dispatch(
      {
        kind: 'compound',
        commands: [
          { kind: 'create-element', element: useCase },
          {
            kind: 'update-diagram-position',
            diagramId,
            elementId: id,
            position,
          },
        ],
      },
      user,
    );
    return id;
  },

  setUseCaseText(id, value) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'UseCase') return;
    const trimmed = value.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.text ?? undefined) === next) return;
    const patch: ElementPatch<'UseCase'> = { text: next };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  createConstraintUsage(diagramId, position, options) {
    const { bus, user, registry, diagrams, elements } = get();
    if (!bus || !user || !registry) return null;
    if (!diagrams.some((d) => d.id === diagramId)) return null;
    const usageName = options?.name?.trim() ?? nextConstraintUsageName(elements);
    const definitionName =
      options?.definitionName?.trim() ?? nextConstraintDefinitionName(elements);
    const definitionId = createElementId();
    const definition: ConstraintDefinitionElement = {
      id: definitionId,
      kind: 'ConstraintDefinition',
      name: definitionName,
      expression: options?.expression ?? '',
      parameterIds: [],
    };
    const usageId = createElementId();
    const usage: ConstraintUsageElement = {
      id: usageId,
      kind: 'ConstraintUsage',
      name: usageName,
      definitionId,
    };
    bus.dispatch(
      {
        kind: 'compound',
        commands: [
          { kind: 'create-element', element: definition },
          { kind: 'create-element', element: usage },
          {
            kind: 'update-diagram-position',
            diagramId,
            elementId: usageId,
            position,
          },
        ],
      },
      user,
    );
    return usageId;
  },

  createValueProperty(diagramId, position, options) {
    const { bus, user, registry, diagrams, elements } = get();
    if (!bus || !user || !registry) return null;
    if (!diagrams.some((d) => d.id === diagramId)) return null;
    const id = createElementId();
    const valueProperty: ValuePropertyElement = {
      id,
      kind: 'ValueProperty',
      name: options?.name?.trim() ?? nextValuePropertyName(elements),
      valueType: options?.valueType ?? VALUE_PROPERTY_TYPE_DEFAULT,
      ...(options?.defaultValue !== undefined
        ? { defaultValue: options.defaultValue }
        : {}),
    };
    bus.dispatch(
      {
        kind: 'compound',
        commands: [
          { kind: 'create-element', element: valueProperty },
          {
            kind: 'update-diagram-position',
            diagramId,
            elementId: id,
            position,
          },
        ],
      },
      user,
    );
    return id;
  },

  setConstraintExpression(constraintUsageId, expression) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const usage = registry.get(constraintUsageId);
    if (!usage || usage.kind !== 'ConstraintUsage') return;
    const def = registry.get(usage.definitionId);
    if (!def || def.kind !== 'ConstraintDefinition') return;
    if (def.expression === expression) return;
    const patch: ElementPatch<'ConstraintDefinition'> = { expression };
    bus.dispatch({ kind: 'update-element', id: def.id, patch }, user);
  },

  setValuePropertyType(id, valueType) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'ValueProperty') return;
    if (existing.valueType === valueType) return;
    const patch: ElementPatch<'ValueProperty'> = { valueType };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  setValuePropertyDefault(id, defaultValue) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'ValueProperty') return;
    if ((existing.defaultValue ?? undefined) === defaultValue) return;
    const patch: ElementPatch<'ValueProperty'> = { defaultValue };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  setStateEntryAction(id, value) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'StateUsage') return;
    const trimmed = value.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.entryAction ?? undefined) === next) return;
    const patch: ElementPatch<'StateUsage'> = { entryAction: next };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  setStateExitAction(id, value) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'StateUsage') return;
    const trimmed = value.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.exitAction ?? undefined) === next) return;
    const patch: ElementPatch<'StateUsage'> = { exitAction: next };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  setStateDoAction(id, value) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'StateUsage') return;
    const trimmed = value.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.doAction ?? undefined) === next) return;
    const patch: ElementPatch<'StateUsage'> = { doAction: next };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  setActionDefinition(id, definitionId) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'ActionUsage') return;
    if ((existing.definitionId ?? null) === definitionId) return;
    if (definitionId !== null) {
      const target = registry.get(definitionId);
      if (!target || target.kind !== 'ActionDefinition') return;
    }
    const patch: ElementPatch<'ActionUsage'> = {
      definitionId: definitionId ?? undefined,
    };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  addActionDefinitionParameter(actionDefinitionId, valuePropertyId) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(actionDefinitionId);
    if (!existing || existing.kind !== 'ActionDefinition') return;
    const param = registry.get(valuePropertyId);
    if (!param || param.kind !== 'ValueProperty') return;
    if (existing.parameterIds.includes(valuePropertyId)) return;
    const patch: ElementPatch<'ActionDefinition'> = {
      parameterIds: [...existing.parameterIds, valuePropertyId],
    };
    bus.dispatch(
      { kind: 'update-element', id: actionDefinitionId, patch },
      user,
    );
  },

  removeActionDefinitionParameter(actionDefinitionId, valuePropertyId) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(actionDefinitionId);
    if (!existing || existing.kind !== 'ActionDefinition') return;
    if (!existing.parameterIds.includes(valuePropertyId)) return;
    const patch: ElementPatch<'ActionDefinition'> = {
      parameterIds: existing.parameterIds.filter(
        (pid) => pid !== valuePropertyId,
      ),
    };
    bus.dispatch(
      { kind: 'update-element', id: actionDefinitionId, patch },
      user,
    );
  },

  setRequirementReqId(id, reqId) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'Requirement') return;
    const trimmed = reqId.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.reqId ?? undefined) === next) return;
    const patch: ElementPatch<'Requirement'> = { reqId: next };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  setRequirementText(id, text) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'Requirement') return;
    if (existing.text === text) return;
    const patch: ElementPatch<'Requirement'> = { text };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  setRequirementPriority(id, priority) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'Requirement') return;
    if (existing.priority === priority) return;
    const patch: ElementPatch<'Requirement'> = { priority };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  setRequirementStatus(id, status) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'Requirement') return;
    if (existing.status === status) return;
    const patch: ElementPatch<'Requirement'> = { status };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  setRequirementRationale(id, rationale) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'Requirement') return;
    const trimmed = rationale.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.rationale ?? undefined) === next) return;
    const patch: ElementPatch<'Requirement'> = { rationale: next };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  linkRequirementTrace(source, target, traceKind) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return null;
    if (source === target) return null;
    const sourceEl = registry.get(source);
    const targetEl = registry.get(target);
    if (!sourceEl || !targetEl) return null;
    if (sourceEl.kind !== 'Requirement') return null;
    if (
      (traceKind === 'derive' || traceKind === 'refine') &&
      targetEl.kind !== 'Requirement'
    ) {
      return null;
    }
    const edgeId = createEdgeId();
    const edge: RequirementTraceEdge = {
      id: edgeId,
      kind: 'RequirementTrace',
      sourceId: source,
      targetId: target,
      traceKind,
    };
    bus.dispatch({ kind: 'link', edge }, user);
    return edgeId;
  },

  setRequirementTraceLabel(id, label) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.getEdge(id);
    if (!existing || existing.kind !== 'RequirementTrace') return;
    const trimmed = label.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.label ?? undefined) === next) return;
    const patch: EdgePatch<'RequirementTrace'> = { label: next };
    bus.dispatch({ kind: 'update-edge', id, patch }, user);
  },

  connectControlFlow(connection) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return null;
    if (!isValidActivityConnection(connection, registry)) return null;
    const { source, target } = connection;
    if (!source || !target) return null;
    const edgeId = createEdgeId();
    const edge: ControlFlowEdge = {
      id: edgeId,
      kind: 'ControlFlow',
      sourceId: source as ElementId,
      targetId: target as ElementId,
    };
    bus.dispatch({ kind: 'link', edge }, user);
    return edgeId;
  },

  connectObjectFlow(connection) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return null;
    if (!isValidActivityConnection(connection, registry)) return null;
    const { source, target } = connection;
    if (!source || !target) return null;
    const edgeId = createEdgeId();
    const edge: ObjectFlowEdge = {
      id: edgeId,
      kind: 'ObjectFlow',
      sourceId: source as ElementId,
      targetId: target as ElementId,
    };
    bus.dispatch({ kind: 'link', edge }, user);
    return edgeId;
  },

  setControlFlowGuard(id, guard) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.getEdge(id);
    if (!existing || existing.kind !== 'ControlFlow') return;
    const trimmed = guard.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.guard ?? undefined) === next) return;
    const patch: EdgePatch<'ControlFlow'> = { guard: next };
    bus.dispatch({ kind: 'update-edge', id, patch }, user);
  },

  setObjectFlowItemType(id, itemType) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.getEdge(id);
    if (!existing || existing.kind !== 'ObjectFlow') return;
    const trimmed = itemType.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.itemType ?? undefined) === next) return;
    const patch: EdgePatch<'ObjectFlow'> = { itemType: next };
    bus.dispatch({ kind: 'update-edge', id, patch }, user);
  },

  connectStateTransition(connection) {
    const { bus, user, registry, elements } = get();
    if (!bus || !user || !registry) return null;
    if (!isValidStateMachineConnection(connection, registry)) return null;
    const { source, target } = connection;
    if (!source || !target) return null;
    const id = createElementId();
    const element: TransitionElement = {
      id,
      kind: 'Transition',
      name: nextTransitionName(elements),
      sourceId: source as ElementId,
      targetId: target as ElementId,
    };
    bus.dispatch({ kind: 'create-element', element }, user);
    return id;
  },

  setTransitionTrigger(id, value) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'Transition') return;
    const trimmed = value.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.trigger ?? undefined) === next) return;
    const patch: ElementPatch<'Transition'> = { trigger: next };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  setTransitionGuard(id, value) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'Transition') return;
    const trimmed = value.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.guard ?? undefined) === next) return;
    const patch: ElementPatch<'Transition'> = { guard: next };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  setTransitionEffect(id, value) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.get(id);
    if (!existing || existing.kind !== 'Transition') return;
    const trimmed = value.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.effect ?? undefined) === next) return;
    const patch: ElementPatch<'Transition'> = { effect: next };
    bus.dispatch({ kind: 'update-element', id, patch }, user);
  },

  linkUseCaseEdge(source, target, kind) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return null;
    if (source === target) return null;
    const sourceEl = registry.get(source);
    const targetEl = registry.get(target);
    if (!sourceEl || !targetEl) return null;
    // Per ADR 0007 § 4: UseCase↔UseCase for Include/Extend/Generalization;
    // Actor↔Actor for Generalization only. Reject anything else.
    if (kind === 'Include' || kind === 'Extend') {
      if (sourceEl.kind !== 'UseCase' || targetEl.kind !== 'UseCase') return null;
    } else {
      const bothUseCase =
        sourceEl.kind === 'UseCase' && targetEl.kind === 'UseCase';
      const bothActor = sourceEl.kind === 'Actor' && targetEl.kind === 'Actor';
      if (!bothUseCase && !bothActor) return null;
    }
    const edgeId = createEdgeId();
    let edge: ModelEdge;
    if (kind === 'Include') {
      const e: IncludeEdge = {
        id: edgeId,
        kind: 'Include',
        sourceId: source,
        targetId: target,
      };
      edge = e;
    } else if (kind === 'Extend') {
      const e: ExtendEdge = {
        id: edgeId,
        kind: 'Extend',
        sourceId: source,
        targetId: target,
      };
      edge = e;
    } else {
      const e: GeneralizationEdge = {
        id: edgeId,
        kind: 'Generalization',
        sourceId: source,
        targetId: target,
      };
      edge = e;
    }
    bus.dispatch({ kind: 'link', edge }, user);
    return edgeId;
  },

  setExtendExtensionPoint(id, extensionPoint) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.getEdge(id);
    if (!existing || existing.kind !== 'Extend') return;
    const trimmed = extensionPoint.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.extensionPoint ?? undefined) === next) return;
    const patch: EdgePatch<'Extend'> = { extensionPoint: next };
    bus.dispatch({ kind: 'update-edge', id, patch }, user);
  },

  linkParameterBinding(connection) {
    const { bus, user, registry, edges } = get();
    if (!bus || !user || !registry) return null;
    if (!isValidParametricConnection(connection, registry, edges)) {
      return null;
    }
    const canonical = canonicalizeParametricConnection(connection, registry);
    const source = canonical.source;
    const target = canonical.target;
    if (!source || !target) return null;
    const edgeId = createEdgeId();
    const edge: ParameterBindingEdge = {
      id: edgeId,
      kind: 'ParameterBinding',
      sourceId: source as ElementId,
      targetId: target as ElementId,
    };
    bus.dispatch({ kind: 'link', edge }, user);
    return edgeId;
  },

  setParameterBindingLabel(id, label) {
    const { bus, user, registry } = get();
    if (!bus || !user || !registry) return;
    const existing = registry.getEdge(id);
    if (!existing || existing.kind !== 'ParameterBinding') return;
    const trimmed = label.trim();
    const next = trimmed.length === 0 ? undefined : trimmed;
    if ((existing.label ?? undefined) === next) return;
    const patch: EdgePatch<'ParameterBinding'> = { label: next };
    bus.dispatch({ kind: 'update-edge', id, patch }, user);
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
