import {
  EMPTY_COMMAND_HISTORY,
  ProjectNotFoundError,
  StorageQuotaError,
  type ModelRepository,
  type Project,
  type ProjectMetadata,
} from './types';

const KEY_PREFIX = 'mbse:v1:project:';

function projectKey(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

function isQuotaError(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  const name = (err as { name?: unknown }).name;
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

function toMetadata(project: Project): ProjectMetadata {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    modifiedAt: project.modifiedAt,
  };
}

export interface CreateInMemorySessionRepositoryOptions {
  readonly storage?: Storage;
}

function defaultStorage(): Storage {
  if (typeof sessionStorage === 'undefined') {
    throw new Error(
      'sessionStorage is not available in this environment; pass a Storage explicitly',
    );
  }
  return sessionStorage;
}

export function createInMemorySessionRepository(
  options: CreateInMemorySessionRepositoryOptions = {},
): ModelRepository {
  const storage = options.storage ?? defaultStorage();

  function readProject(id: string): Project | undefined {
    const raw = storage.getItem(projectKey(id));
    if (raw === null) return undefined;
    try {
      const parsed = JSON.parse(raw) as Partial<Project> & { id: Project['id'] };
      // Forward-compat: older entries may pre-date the `diagrams` and `history`
      // fields. Default both so the workspace bootstrap can seed safely.
      const diagrams = Array.isArray(parsed.diagrams) ? parsed.diagrams : [];
      const history =
        parsed.history &&
        Array.isArray(parsed.history.undo) &&
        Array.isArray(parsed.history.redo)
          ? parsed.history
          : EMPTY_COMMAND_HISTORY;
      const conversations = Array.isArray(parsed.conversations) ? parsed.conversations : [];
      return { ...(parsed as Project), diagrams, history, conversations };
    } catch {
      return undefined;
    }
  }

  return {
    async load(projectId) {
      const project = readProject(projectId);
      if (!project) throw new ProjectNotFoundError(projectId);
      return project;
    },

    async save(project) {
      const serialized = JSON.stringify(project);
      try {
        storage.setItem(projectKey(project.id), serialized);
      } catch (err) {
        if (isQuotaError(err)) {
          throw new StorageQuotaError(
            `storage quota exceeded while saving project ${project.id}`,
            err,
          );
        }
        throw err;
      }
    },

    async list() {
      const metadata: ProjectMetadata[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key === null || !key.startsWith(KEY_PREFIX)) continue;
        const raw = storage.getItem(key);
        if (raw === null) continue;
        try {
          const project = JSON.parse(raw) as Project;
          metadata.push(toMetadata(project));
        } catch {
          // Corrupt entry — skip; load() will surface the error per-id.
        }
      }
      return metadata;
    },
  };
}
