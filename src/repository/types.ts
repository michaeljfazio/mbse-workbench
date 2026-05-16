import type { CommandHistory } from '@/commands';
import type { Conversation } from '@/llm/types';
import type { ElementId, ModelEdge, ModelElement, ProjectId } from '@/model';
import type { Diagram } from '@/workspace/diagram';

export interface Project {
  readonly id: ProjectId;
  name: string;
  readonly createdAt: string;
  modifiedAt: string;
  /**
   * Containment root. Always points to an existing Package element in
   * `elements` whose `ownerId === null`. Synthesized at load time for
   * legacy projects that predate the explicit-root invariant. See ADR 0011.
   */
  rootId: ElementId;
  /**
   * Phase 14 hook. Element IDs of read-only library root Packages
   * (standard KerML / SysML libraries) that the explorer renders as
   * siblings of `rootId` under a "Libraries" header. Undefined or
   * empty means no libraries. ADR 0011 §Consequences reserved the
   * field name; T-14.01 lands the schema; T-14.03 lands the
   * explorer surface; T-14.04 lands the seeded library content.
   */
  libraryRootIds?: readonly ElementId[];
  elements: readonly ModelElement[];
  edges: readonly ModelEdge[];
  diagrams: readonly Diagram[];
  // Persisted command-bus undo/redo stacks. Empty by default; allows the
  // workspace bootstrap to rehydrate operation history after a page reload.
  history: CommandHistory;
  conversations: readonly Conversation[];
}

export type ProjectMetadata = Omit<
  Project,
  'elements' | 'edges' | 'diagrams' | 'history' | 'conversations'
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
