import type { CommandHistory } from '@/commands';
import type { ModelEdge, ModelElement, ProjectId } from '@/model';
import type { Diagram } from '@/workspace/diagram';

export interface Project {
  readonly id: ProjectId;
  name: string;
  readonly createdAt: string;
  modifiedAt: string;
  elements: readonly ModelElement[];
  edges: readonly ModelEdge[];
  diagrams: readonly Diagram[];
  // Persisted command-bus undo/redo stacks. Empty by default; allows the
  // workspace bootstrap to rehydrate operation history after a page reload.
  history: CommandHistory;
}

export type ProjectMetadata = Omit<
  Project,
  'elements' | 'edges' | 'diagrams' | 'history'
>;

export const EMPTY_COMMAND_HISTORY: CommandHistory = { undo: [], redo: [] };

export interface ModelRepository {
  load(projectId: string): Promise<Project>;
  save(project: Project): Promise<void>;
  list(): Promise<ProjectMetadata[]>;
}

export class ProjectNotFoundError extends Error {
  readonly projectId: string;
  constructor(projectId: string) {
    super(`project not found: ${projectId}`);
    this.name = 'ProjectNotFoundError';
    this.projectId = projectId;
  }
}

export class StorageQuotaError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageQuotaError';
    if (cause !== undefined) this.cause = cause;
  }
}
