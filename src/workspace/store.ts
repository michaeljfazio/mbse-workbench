import { create } from 'zustand';

import type { ElementId, ElementRegistry } from '@/model';
import { createElementRegistry, createProjectId } from '@/model';
import type { CommandBus } from '@/commands';
import { createCommandBus } from '@/commands';
import type { CollaborationProvider, User } from '@/collab';
import { NoopCollaborationProvider } from '@/collab';
import type { ModelRepository, Project } from '@/repository';
import {
  bddViewpoint,
  createViewpointRegistry,
  type Viewpoint,
  type ViewpointRegistry,
} from '@/viewpoints';

import {
  createDiagramId,
  type Diagram,
  type DiagramId,
} from './diagram';

export const LAYOUT_STORAGE_KEY = 'mbse:v1:workspace:layout';

export const DEFAULT_LEFT_PANE_WIDTH = 256;
export const DEFAULT_RIGHT_PANE_WIDTH = 360;
export const MIN_PANE_WIDTH = 200;
export const MAX_PANE_WIDTH = 600;

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
  readonly selectedElementIds: readonly ElementId[];
  readonly leftPaneWidth: number;
  readonly rightPaneWidth: number;
  readonly inspectorTab: InspectorTab;
  readonly storage: Storage | null;
}

export interface WorkspaceActions {
  bootstrap(deps: BootstrapDeps): Promise<void>;
  setActiveDiagram(id: DiagramId): void;
  setSelection(ids: readonly ElementId[]): void;
  setLeftPaneWidth(px: number): void;
  setRightPaneWidth(px: number): void;
  setInspectorTab(tab: InspectorTab): void;
  saveProject(): Promise<void>;
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
  selectedElementIds: [],
  leftPaneWidth: DEFAULT_LEFT_PANE_WIDTH,
  rightPaneWidth: DEFAULT_RIGHT_PANE_WIDTH,
  inspectorTab: 'inspector',
  storage: null,
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
  };
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
      await repository.save(project);
    }

    const registry = createElementRegistry();
    for (const element of project.elements) registry.add(element);
    for (const edge of project.edges) registry.addEdge(edge);

    const bus = createCommandBus({
      registry,
      provider: collaborationProvider,
    });

    const diagram: Diagram = {
      id: createDiagramId(),
      viewpointId: bddViewpoint.id,
      name: 'Main BDD',
    };

    set({
      initialized: true,
      user,
      repository,
      registry,
      bus,
      provider: collaborationProvider,
      project,
      diagrams: [diagram],
      activeDiagramId: diagram.id,
      selectedElementIds: [],
      leftPaneWidth: layout.leftPaneWidth,
      rightPaneWidth: layout.rightPaneWidth,
      storage: storageInst,
    });
  },

  setActiveDiagram(id) {
    if (!get().diagrams.some((d) => d.id === id)) return;
    set({ activeDiagramId: id });
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
    const { repository, project, registry } = get();
    if (!repository || !project || !registry) return;
    const updated: Project = {
      ...project,
      modifiedAt: new Date().toISOString(),
      elements: registry.elements(),
      edges: registry.edges(),
    };
    await repository.save(updated);
    set({ project: updated });
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
